import os
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


load_dotenv()

Status = Literal["todo", "doing", "done"]


def get_supabase(request: Request):
    # Cloudflare Workers supplies secrets through request.scope["env"].
    # Local development falls back to values loaded from backend/.env.
    env = request.scope.get("env")
    if env is not None:
        url = getattr(env, "SUPABASE_URL", None)
        key = getattr(env, "SUPABASE_SECRET_KEY", None)
    else:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SECRET_KEY")
    if not url or not key:
        raise HTTPException(
            status_code=503,
            detail="Database is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY.",
        )
    from supabase import create_client
    return create_client(url, key)


app = FastAPI(title="Kanban Board API", version="1.0.0")

origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").split(",")
    if origin.strip()
]
# Production origins are configured below or via FRONTEND_ORIGIN.
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class TaskUpdate(BaseModel):
    status: Status



@app.get("/")
def root():
    return {"message": "Kanban Board API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/cards")
def list_tasks(request: Request):
    result = get_supabase(request).table("cards").select("*").order("created_at").execute()
    return result.data


@app.post("/cards", status_code=201)
def create_task(task: TaskCreate, request: Request):
    title = task.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Task title cannot be blank.")
    result = get_supabase(request).table("cards").insert({"title": title, "status": "todo"}).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Could not create task.")
    return result.data[0]


@app.patch("/cards/{task_id}")
def update_task(task_id: int, task: TaskUpdate, request: Request):
    result = (
        get_supabase(request).table("cards")
        .update({"status": task.status})
        .eq("id", task_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found.")
    return result.data[0]


@app.delete("/cards/{task_id}", status_code=204)
def delete_task(task_id: int, request: Request):
    result = get_supabase(request).table("cards").delete().eq("id", task_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found.")
    return Response(status_code=204)


# Cloudflare Python Workers ASGI entry point
try:
    from workers import asgi
    Default = asgi.entrypoint(app)
except ImportError:
    # Keeps the same app runnable locally and on conventional ASGI hosts.
    pass

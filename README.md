# CU FDE2 — Full-stack Kanban Board

A Kanban board with three columns (To do, Doing, Done), using React + TypeScript + Vite, FastAPI, Supabase Postgres, and Cloudflare Workers.

## Requirements from the course notes
- Table: `cards`
- Valid statuses: `todo`, `doing`, `done`
- Add, move, and delete cards
- Backend API with CORS
- Test local and production behavior, including persistence after refresh
- Deploy backend first, frontend second, then configure CORS and test
- Never commit `.env` or expose `SUPABASE_SECRET_KEY`

## 1. Supabase
1. Create a project at https://supabase.com/ (Southeast Asia/Singapore region is suggested in the course notes).
2. Run `supabase/schema.sql` in SQL Editor.
3. Copy the Project URL and Secret key from Supabase Settings/API Keys.
4. Create `backend/.env` from `.env.example` for local use. Do not paste secrets into chat or commit them.

## 2. Local backend
Use `uv` as recommended in the course notes. Install it using the official instructions at https://docs.astral.sh/uv/getting-started/installation/.

From `backend/`:
```powershell
uv sync
uv run fastapi dev main.py
```
If starting from a folder without `pyproject.toml`, initialize the project and dependencies:
```powershell
uv init
uv add fastapi --extra standard
uv add supabase python-dotenv
uv add workers-py workers-runtime-sdk
```
Set up `.env` with:
```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR_SUPABASE_SECRET_KEY
FRONTEND_ORIGIN=http://localhost:5173
```
Test `http://127.0.0.1:8000/health` and `http://127.0.0.1:8000/docs`.

## 3. Local frontend
Use Node.js 20.19+ or 22.12+.
From `frontend/`:
```powershell
npm install
```
Create `frontend/.env`:
```env
VITE_API_URL=http://127.0.0.1:8000
```
Run:
```powershell
npm run dev
```
Open `http://localhost:5173`. Test add, move, delete, refresh, and check the `cards` table in Supabase.

## 4. Deploy backend to Cloudflare Workers (course-recommended)
The backend includes `wrangler.jsonc` and the Workers ASGI entry point. Cloudflare Python Workers support can evolve; if the worker does not run, use the Cloud Run alternative below.

1. Log in:
```bash
npx wrangler login
uv self update
```
2. In `backend/`, install dependencies with `uv` and test locally:
```bash
uv sync
uv run pywrangler dev
```
Test `http://localhost:8787/health` and `http://localhost:8787/cards`.
3. Deploy:
```bash
uv run pywrangler deploy
```
4. Add secrets (type the values when prompted; never place them in source control):
```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SECRET_KEY
```
5. Copy the backend URL printed by Wrangler, ending in `workers.dev`.

## 5. Deploy frontend to Cloudflare Workers
1. Create `frontend/.env.production`:
```env
VITE_API_URL=https://kanban-api.YOUR-SUBDOMAIN.workers.dev
```
2. From `frontend/`:
```bash
npm install
npm run build
npx wrangler deploy
```
3. Copy the frontend `workers.dev` URL.

## 6. Configure CORS and verify
Set `FRONTEND_ORIGIN` to the exact deployed frontend origin in the backend environment or explicitly add it to the CORS allow-list. Redeploy the backend.
Open the frontend and test:
- Add a card
- Move it across all three statuses
- Delete a card
- Refresh the page and confirm the state persists
- Check Supabase Table Editor for the same rows

## Alternative: Google Cloud Run backend
Use if Python Workers cannot run the backend. The FastAPI app can run as a conventional ASGI service. Deploy the `backend/` folder using the Cloud Run guide from the course notes, and configure `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `FRONTEND_ORIGIN` securely. Then set the deployed API URL as `VITE_API_URL` and test CORS.

## GitHub submission
Create a repository and push the whole project from the root folder:
```bash
git init
git add .
git status
git commit -m "Build full-stack Kanban board"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```
Make sure `.env`, `.dev.vars`, `.venv`, and `node_modules` are not committed. Submit only real links after deployment succeeds.

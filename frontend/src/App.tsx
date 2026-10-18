import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, Circle, ClipboardList, Clock3, LoaderCircle, Plus, Trash2 } from 'lucide-react'

type Status = 'todo' | 'doing' | 'done'
type Task = { id: number; title: string; status: Status; created_at: string }
const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const columns: { id: Status; title: string; hint: string }[] = [
  { id: 'todo', title: 'To do', hint: 'Ready when you are' },
  { id: 'doing', title: 'Doing', hint: 'Work in progress' },
  { id: 'done', title: 'Done', hint: 'Look at you go' },
]

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = await response.json()
      message = body.detail || message
    } catch { /* response may not contain JSON */ }
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      setTasks(await request<Task[]>('/cards'))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect to the API.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadTasks() }, [loadTasks])

  const counts = useMemo(() => ({
    todo: tasks.filter(t => t.status === 'todo').length,
    doing: tasks.filter(t => t.status === 'doing').length,
    done: tasks.filter(t => t.status === 'done').length,
  }), [tasks])

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const task = await request<Task>('/cards', {
        method: 'POST', body: JSON.stringify({ title: title.trim() }),
      })
      setTasks(current => [...current, task])
      setTitle('')
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add task.')
    } finally { setSaving(false) }
  }

  async function moveTask(task: Task, status: Status) {
    if (task.status === status) return
    const previous = tasks
    setTasks(current => current.map(t => t.id === task.id ? { ...t, status } : t))
    try {
      const updated = await request<Task>(`/cards/${task.id}`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      })
      setTasks(current => current.map(t => t.id === task.id ? updated : t))
      setError('')
    } catch (e) {
      setTasks(previous)
      setError(e instanceof Error ? e.message : 'Could not move task.')
    }
  }

  async function deleteTask(task: Task) {
    const previous = tasks
    setTasks(current => current.filter(t => t.id !== task.id))
    try {
      await request<void>(`/cards/${task.id}`, { method: 'DELETE' })
      setError('')
    } catch (e) {
      setTasks(previous)
      setError(e instanceof Error ? e.message : 'Could not delete task.')
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Taskflow home">
          <span className="brand-mark"><ClipboardList size={21} strokeWidth={2.3} /></span>
          <span>taskflow<span className="brand-period">.</span></span>
        </a>
        <div className="topbar-right"><span className="live-dot" /> Your personal workspace</div>
      </header>

      <section className="hero">
        <div className="eyebrow"><span className="eyebrow-line" /> YOUR WORKSPACE</div>
        <div className="hero-row">
          <div>
            <h1>Make progress,<br /><span>one task at a time.</span></h1>
            <p className="subtitle">A little clarity goes a long way. What are you working on?</p>
          </div>
          <div className="progress-card">
            <div className="progress-icon"><Check size={18} /></div>
            <div><strong>{counts.done} completed</strong><span>Every step counts.</span></div>
          </div>
        </div>

        <form className="add-form" onSubmit={addTask}>
          <span className="add-icon"><Plus size={20} /></span>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Add a task to your list..."
            maxLength={200}
            aria-label="New task title"
          />
          <button type="submit" disabled={!title.trim() || saving}>
            {saving ? <LoaderCircle size={17} className="spin" /> : <><span>Add task</span><ArrowRight size={16} /></>}
          </button>
        </form>
        {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => void loadTasks()} type="button">Retry</button></div>}
      </section>

      <section className="board-heading">
        <div><h2>Board overview</h2><p>Keep the important things moving.</p></div>
        <div className="task-total"><span className="total-dot" /> {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} total</div>
      </section>

      <section className="board" aria-label="Kanban board">
        {columns.map((column, index) => {
          const columnTasks = tasks.filter(task => task.status === column.id)
          return (
            <section className={`column column-${column.id}`} key={column.id}>
              <div className="column-header">
                <div className="column-title-wrap">
                  <span className={`status-symbol symbol-${column.id}`}>
                    {column.id === 'todo' ? <Circle size={13} /> : column.id === 'doing' ? <Clock3 size={14} /> : <Check size={14} />}
                  </span>
                  <h3>{column.title}</h3>
                  <span className="count-badge">{columnTasks.length}</span>
                </div>
                <span className="column-index">0{index + 1}</span>
              </div>
              <p className="column-hint">{column.hint}</p>
              <div className="task-list">
                {loading ? (
                  <div className="empty-state"><LoaderCircle className="spin" size={20} /><span>Loading tasks...</span></div>
                ) : columnTasks.length === 0 ? (
                  <div className="empty-state"><span className="empty-icon"><Plus size={17} /></span><span>No tasks here yet</span><small>Tasks will show up here.</small></div>
                ) : columnTasks.map(task => (
                  <article className="task-card" key={task.id}>
                    <div className="task-card-top"><span className={`task-priority priority-${task.status}`}><span /> {task.status === 'done' ? 'COMPLETED' : task.status === 'doing' ? 'IN PROGRESS' : 'TO DO'}</span><button className="icon-button delete-button" type="button" aria-label={`Delete ${task.title}`} title="Delete task" onClick={() => void deleteTask(task)}><Trash2 size={15} /></button></div>
                    <p className={`task-title ${task.status === 'done' ? 'task-done' : ''}`}>{task.title}</p>
                    <div className="task-card-footer">
                      <span className="task-id">TASK-{String(task.id).padStart(3, '0')}</span>
                      <div className="move-actions">
                        {column.id !== 'todo' && <button type="button" onClick={() => void moveTask(task, column.id === 'done' ? 'doing' : 'todo')} title="Move to previous column" aria-label="Move task left">←</button>}
                        {column.id !== 'done' && <button type="button" onClick={() => void moveTask(task, column.id === 'todo' ? 'doing' : 'done')} title="Move to next column" aria-label="Move task right">→</button>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {column.id === 'todo' && <button className="add-another" type="button" onClick={() => document.querySelector<HTMLInputElement>('.add-form input')?.focus()}><Plus size={15} /> Add another task</button>}
            </section>
          )
        })}
      </section>
      <footer className="footer"><span>taskflow<span className="brand-period">.</span></span><span>Small steps. Real progress.</span><span>Built to help you focus <span className="heart">✳</span></span></footer>
    </main>
  )
}

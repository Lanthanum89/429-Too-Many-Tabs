import { useEffect, useState } from 'react'
import { Card } from './Card'

interface Todo {
  id: string
  text: string
  done: boolean
}

const STORAGE_KEY = 'life-dashboard:todos'

function loadTodos(): Todo[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Todo[]) : []
  } catch {
    return []
  }
}

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>(loadTodos)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  function addTodo() {
    const text = draft.trim()
    if (!text) return
    setTodos((prev) => [...prev, { id: crypto.randomUUID(), text, done: false }])
    setDraft('')
  }

  function toggleTodo(id: string) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-3">
      <h2 className="font-display text-sm tracking-wide text-muted uppercase">To-do</h2>
      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {todos.length === 0 && <li className="text-sm text-dim">Nothing here.</li>}
        {todos.map((todo) => (
          <li key={todo.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => toggleTodo(todo.id)}
              className="h-4 w-4 rounded border-line bg-surface-2 accent-accent"
            />
            <span className={todo.done ? 'text-dim line-through' : 'text-ink'}>{todo.text}</span>
          </li>
        ))}
      </ul>
      <div className="mt-1 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          placeholder="Add a task"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm text-ink outline-none placeholder:text-dim focus:border-accent"
        />
        <button
          onClick={addTodo}
          className="shrink-0 rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-void hover:bg-accent-bright"
        >
          Add
        </button>
      </div>
    </Card>
  )
}

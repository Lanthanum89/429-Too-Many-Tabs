import { useEffect, useState } from 'react'
import { Card } from './Card'
import type { WidgetSize } from '../theme/modes'

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

export function TodoList({ size }: { size: Exclude<WidgetSize, 'hidden'> }) {
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

  // At 'sm' there's no room for the input box, so only undone items matter.
  const visible = size === 'sm' ? todos.filter((t) => !t.done) : todos
  const maxItems = size === 'lg' ? undefined : size === 'md' ? 6 : 4
  const items = maxItems === undefined ? visible : visible.slice(0, maxItems)

  return (
    <Card className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-gray-400">To-do</h2>
      <ul className="flex flex-col gap-1 overflow-y-auto">
        {items.length === 0 && <li className="text-sm text-gray-500">Nothing here.</li>}
        {items.map((todo) => (
          <li key={todo.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => toggleTodo(todo.id)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-800"
            />
            <span className={todo.done ? 'text-gray-500 line-through' : ''}>{todo.text}</span>
          </li>
        ))}
      </ul>
      {size !== 'sm' && (
        <div className="mt-1 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            placeholder="Add a task"
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1 text-sm outline-none focus:border-gray-500"
          />
          <button
            onClick={addTodo}
            className="rounded-lg bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600"
          >
            Add
          </button>
        </div>
      )}
    </Card>
  )
}

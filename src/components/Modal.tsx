import { useEffect, type MouseEvent, type ReactNode } from 'react'

export function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    // Lock background scroll while the modal is open - it sits over the
    // whole viewport, so a scrollable dashboard behind it would otherwise
    // keep scrolling underneath.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  function handleBackdropClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/60 p-4 backdrop-blur-md"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div className="modal-panel relative max-h-[85vh] w-full max-w-2xl">
        <button
          onClick={onClose}
          className="theme-toggle absolute right-3 top-3 z-10 bg-surface"
          aria-label="Close"
          title="Close"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
            <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
          </svg>
        </button>
        <div role="dialog" aria-modal="true" className="max-h-[85vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

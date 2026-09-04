// Outline icons for the widgets' empty states, replacing the coloured
// mascots this dashboard used to sit there. Stroked paths on currentColor
// rather than filled shapes with baked-in colours, so they take whatever the
// surrounding text is set to and stay correct in both variants without any
// theme-aware code. aria-hidden throughout: each one sits beside its own
// explanatory sentence, which is what actually carries the message.
export function EnvelopeIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2.5" y="5" width="19" height="14" rx="1.5" />
      <path d="M2.5 7l9.5 6 9.5-6" />
    </svg>
  )
}

export function NoteIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </svg>
  )
}

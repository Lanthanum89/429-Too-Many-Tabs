export function RefreshIcon({ spinning, size = 14 }: { spinning: boolean; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={spinning ? 'animate-spin' : ''}
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" />
      <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Small, unobtrusive per-widget refresh control - deliberately plainer than
// the header's own button (no border box) so it sits next to a card title
// without competing with it, while still using .key-sm for the same sticker
// hover/press affordance every other small control in the dashboard has.
export function RefreshButton({
  onClick,
  refreshing,
  label,
}: {
  onClick: () => void
  refreshing: boolean
  label: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={refreshing}
      aria-label={label}
      aria-busy={refreshing}
      title={label}
      className="key-sm flex h-6 w-6 shrink-0 items-center justify-center rounded-none text-dim hover:text-accent-neon disabled:opacity-50"
    >
      <RefreshIcon spinning={refreshing} size={12} />
    </button>
  )
}

// Small hand-drawn-style mascots for the strawberry/whimsical theme - flat
// shapes, big dot eyes, soft blush, matching the bold-but-cute illustration
// style from the mood board (rounded characters, pastel fills, simple
// faces). Fixed colors rather than theme tokens on purpose: these read as
// printed stickers, not chrome that should recolor with light/dark mode.
// aria-hidden since they're purely decorative, never load-bearing content.

export function Strawberry({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g transform="translate(50 28) rotate(0)">
        <ellipse cx="0" cy="-4" rx="9" ry="5" fill="#8fbf7a" transform="rotate(-40)" />
        <ellipse cx="0" cy="-4" rx="9" ry="5" fill="#8fbf7a" transform="rotate(-15)" />
        <ellipse cx="0" cy="-4" rx="9" ry="5" fill="#8fbf7a" transform="rotate(10)" />
        <ellipse cx="0" cy="-4" rx="9" ry="5" fill="#8fbf7a" transform="rotate(35)" />
        <ellipse cx="0" cy="-4" rx="9" ry="5" fill="#8fbf7a" transform="rotate(58)" />
      </g>
      <path
        d="M50 24 C28 24 12 43 12 63 C12 85 30 97 50 97 C70 97 88 85 88 63 C88 43 72 24 50 24 Z"
        fill="#f28ba0"
      />
      <g fill="#fdf1f0" opacity="0.85">
        <ellipse cx="34" cy="52" rx="2.4" ry="3.4" transform="rotate(-20 34 52)" />
        <ellipse cx="50" cy="46" rx="2.4" ry="3.4" />
        <ellipse cx="66" cy="52" rx="2.4" ry="3.4" transform="rotate(20 66 52)" />
        <ellipse cx="28" cy="68" rx="2.4" ry="3.4" transform="rotate(-25 28 68)" />
        <ellipse cx="50" cy="74" rx="2.4" ry="3.4" />
        <ellipse cx="72" cy="68" rx="2.4" ry="3.4" transform="rotate(25 72 68)" />
        <ellipse cx="41" cy="86" rx="2.2" ry="3" transform="rotate(-15 41 86)" />
        <ellipse cx="59" cy="86" rx="2.2" ry="3" transform="rotate(15 59 86)" />
      </g>
      <circle cx="40" cy="58" r="3.2" fill="#3d1220" />
      <circle cx="60" cy="58" r="3.2" fill="#3d1220" />
      <circle cx="30" cy="65" r="5" fill="#e0435c" opacity="0.35" />
      <circle cx="70" cy="65" r="5" fill="#e0435c" opacity="0.35" />
      <path d="M42 68 Q50 74 58 68" stroke="#3d1220" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function Teddy({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="13" fill="#e0b89a" />
      <circle cx="76" cy="24" r="13" fill="#e0b89a" />
      <circle cx="24" cy="24" r="6.5" fill="#f2d9c4" />
      <circle cx="76" cy="24" r="6.5" fill="#f2d9c4" />
      <circle cx="50" cy="52" r="38" fill="#e0b89a" />
      <ellipse cx="50" cy="62" rx="18" ry="14" fill="#f2d9c4" />
      <circle cx="36" cy="46" r="4.2" fill="#3d1220" />
      <circle cx="64" cy="46" r="4.2" fill="#3d1220" />
      <circle cx="27" cy="58" r="6" fill="#f28ba0" opacity="0.45" />
      <circle cx="73" cy="58" r="6" fill="#f28ba0" opacity="0.45" />
      <ellipse cx="50" cy="58" rx="4.5" ry="3.4" fill="#3d1220" />
      <path d="M50 61 L50 66 M50 66 Q45 71 41 68 M50 66 Q55 71 59 68" stroke="#3d1220" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

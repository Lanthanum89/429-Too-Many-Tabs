// Dark-mode-only backdrop, styled after a pixel-art space illustration:
// a winding two-tone nebula ribbon, a couple of marbled planets, and a
// scatter of sparkle-shaped stars alongside plain dot stars. Fixed and
// behind everything (see .dashboard-galaxy in index.css) - cards stay
// fully opaque on top, so this only actually shows through the grid
// gaps and outer padding, same as the light-mode gingham.

const RIBBON_PATH =
  'M -30 470 L 55 425 L 130 458 L 210 385 L 290 415 L 365 330 L 445 358 L 520 270 L 600 300 L 675 195 L 755 222 L 830 95'

const SPARKLE = 'M 0 -8 C 1 -3 3 -1 8 0 C 3 1 1 3 0 8 C -1 3 -3 1 -8 0 C -3 -1 -1 -3 0 -8 Z'

interface Sparkle {
  x: number
  y: number
  scale: number
  color: string
}

const SPARKLES: Sparkle[] = [
  { x: 60, y: 210, scale: 1.4, color: '#7fe9ff' },
  { x: 90, y: 340, scale: 1, color: '#ff7fd0' },
  { x: 230, y: 300, scale: 1.7, color: '#7fe9ff' },
  { x: 300, y: 120, scale: 0.9, color: '#ff7fd0' },
  { x: 470, y: 60, scale: 1.1, color: '#7fe9ff' },
  { x: 700, y: 300, scale: 1.2, color: '#ff7fd0' },
  { x: 760, y: 400, scale: 0.9, color: '#7fe9ff' },
  { x: 130, y: 60, scale: 0.8, color: '#ff7fd0' },
]

// Deterministic pseudo-random small dot stars (fixed seed via a simple
// LCG) rather than Math.random() - keeps the scene stable across
// re-renders instead of reshuffling every time the component remounts.
function dotStars(count: number, seed: number) {
  let s = seed
  function next() {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
  return Array.from({ length: count }, () => ({
    x: next() * 800,
    y: next() * 500,
    r: 0.6 + next() * 1.1,
    o: 0.3 + next() * 0.6,
  }))
}

const DOTS = dotStars(90, 42)

export function GalaxyBackground() {
  return (
    <svg
      className="dashboard-galaxy"
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <filter id="galaxy-soften" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <radialGradient id="planet-big-shade" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#4d7fb8" />
          <stop offset="55%" stopColor="#1c1430" />
          <stop offset="100%" stopColor="#08060f" />
        </radialGradient>
        <radialGradient id="planet-small-shade" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#4d7fb8" />
          <stop offset="60%" stopColor="#18122a" />
          <stop offset="100%" stopColor="#08060f" />
        </radialGradient>
        <clipPath id="planet-big-clip">
          <circle cx="540" cy="150" r="78" />
        </clipPath>
        <clipPath id="planet-small-clip">
          <circle cx="655" cy="248" r="40" />
        </clipPath>
      </defs>

      <rect width="800" height="500" fill="#0a0714" />

      {/* dim scattered dot stars, drawn first so sparkles/ribbon/planets layer over them */}
      {DOTS.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#e8e0f5" opacity={d.o} />
      ))}

      {/* nebula ribbon - soft blurred glow pass, then a crisp pass on top */}
      <g filter="url(#galaxy-soften)" opacity="0.8">
        <path d={RIBBON_PATH} fill="none" stroke="#1f5f68" strokeWidth="58" strokeLinecap="round" strokeLinejoin="round" />
        <path d={RIBBON_PATH} fill="none" stroke="#c43e97" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <path d={RIBBON_PATH} fill="none" stroke="#2a7a86" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <path d={RIBBON_PATH} fill="none" stroke="#e356ab" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />

      {/* big planet: dark sphere + a couple of marbled "continent" blobs clipped to its disc */}
      <circle cx="540" cy="150" r="78" fill="url(#planet-big-shade)" />
      <g clipPath="url(#planet-big-clip)" opacity="0.85">
        <path
          d="M 470 90 C 500 70 530 85 545 110 C 560 135 555 160 530 175 C 505 190 480 180 470 155 C 462 135 458 105 470 90 Z"
          fill="#3a6a9e"
        />
        <path
          d="M 505 165 C 525 158 545 168 552 190 C 558 210 548 228 528 232 C 510 235 495 222 492 202 C 490 185 492 172 505 165 Z"
          fill="#2d5580"
        />
      </g>

      {/* small planet, same treatment, one continent blob */}
      <circle cx="655" cy="248" r="40" fill="url(#planet-small-shade)" />
      <g clipPath="url(#planet-small-clip)" opacity="0.85">
        <path
          d="M 625 225 C 640 216 658 222 665 236 C 672 250 666 264 650 270 C 636 275 622 266 619 250 C 617 240 617 231 625 225 Z"
          fill="#3a6a9e"
        />
      </g>

      {SPARKLES.map((s, i) => (
        <path key={i} d={SPARKLE} fill={s.color} opacity="0.85" transform={`translate(${s.x} ${s.y}) scale(${s.scale})`} />
      ))}
    </svg>
  )
}

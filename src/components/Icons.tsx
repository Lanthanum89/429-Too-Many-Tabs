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

// The moon's phase, drawn rather than set as an emoji glyph - the emoji this
// replaced was full-colour on every platform, and being a font glyph it sat
// out of reach of the grayscale filters the rest of the app's imported colour
// goes through.
//
// Geometry: the rim is the moon's full disc; inside it the shadowed part and
// the lit part are separated by the terminator, an ellipse seen edge-on whose
// horizontal semi-axis is r·|cos 2πp| - r at new and full (where it meets the
// limb), 0 at the quarters (where it is a straight line). Which side each arc
// bulges toward is what separates a crescent from a gibbous, and a waxing
// moon from a waning one; northern-hemisphere convention throughout, so a
// waxing moon lights from the right.
//
// Which of the two regions gets painted has to flip with the theme, so it is
// left to CSS (see .moon-shadow / .moon-lit in index.css). On a light ground
// the shadow is inked and the lit part is left as paper, the way an almanac
// prints it; on a dark ground that reads as a photographic negative, so the
// two swap and the lit part is the one carrying ink.
export function MoonPhaseIcon({ phase, className = '' }: { phase: number; className?: string }) {
  const r = 7
  const cosine = Math.cos(phase * 2 * Math.PI)
  const waxing = phase < 0.5
  // Rounded away from zero at the quarters: an rx of exactly 0 makes the arc
  // degenerate and some renderers drop the whole subpath rather than drawing
  // the straight terminator it should collapse to.
  const terminatorRx = Math.max(0.01, r * Math.abs(cosine))
  const limbSweep = waxing ? 1 : 0
  const terminatorSweep = (cosine < 0) === waxing ? 1 : 0
  const lit = [
    `M 0 ${-r}`,
    `A ${r} ${r} 0 0 ${limbSweep} 0 ${r}`,
    `A ${terminatorRx} ${r} 0 0 ${terminatorSweep} 0 ${-r}`,
    'Z',
  ].join(' ')

  return (
    <svg viewBox="-8 -8 16 16" className={className} aria-hidden="true">
      <circle className="moon-shadow" cx="0" cy="0" r={r} />
      <path className="moon-lit" d={lit} />
      <circle className="moon-rim" cx="0" cy="0" r={r} fill="none" strokeWidth="1" />
    </svg>
  )
}

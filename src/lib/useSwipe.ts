import { useRef } from 'react'
import type { TouchEvent } from 'react'

const SWIPE_THRESHOLD_PX = 40

// Simple horizontal-swipe detector for touch devices. Mostly-vertical
// drags are ignored so this doesn't fight normal scrolling of a list.
export function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)

  function onTouchStart(e: TouchEvent) {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
  }

  function onTouchEnd(e: TouchEvent) {
    if (startX.current === null || startY.current === null) return
    const dx = e.changedTouches[0].clientX - startX.current
    const dy = e.changedTouches[0].clientY - startY.current
    startX.current = null
    startY.current = null
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0) onSwipeLeft()
    else onSwipeRight()
  }

  return { onTouchStart, onTouchEnd }
}

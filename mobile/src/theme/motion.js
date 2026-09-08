/**
 * Motion (MOTION.md, DS-001): three durations, two easings, one rule for
 * reduced motion.
 *
 * The durations come straight from the shared tokens, so the two clients cannot
 * drift. The easings do not: `cubic-bezier(...)` is a CSS string, and Reanimated
 * wants the four control points, so they are re-expressed as coordinates. The
 * numbers are the same numbers.
 *
 * The reduced-motion rule the standard states is that position and presence
 * motion is REMOVED, not slowed, while a fade may stay at `quick`. That is why
 * `useMotion` returns a duration of 0 for movement and leaves fades alone,
 * rather than multiplying everything by some factor.
 */
import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'
import { DURATION, EASING } from './motionTokens'

export { DURATION, EASING }

export const useReduceMotion = () => {
  const [reduce, setReduce] = useState(false)

  useEffect(() => {
    let alive = true
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (alive) setReduce(on)
    })
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce)
    return () => {
      alive = false
      sub?.remove?.()
    }
  }, [])

  return reduce
}

export const useMotion = () => {
  const reduce = useReduceMotion()
  return {
    reduce,
    easing: EASING,
    duration: DURATION,
    /** For anything that MOVES. Zero under reduced motion, per the standard. */
    move: (name = 'base') => (reduce ? 0 : DURATION[name]),
    /** For a fade, which the standard allows to keep its `quick` duration. */
    fade: (name = 'quick') => DURATION[name]
  }
}

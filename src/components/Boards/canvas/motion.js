import { MOTION } from '@nowry/core/tokens/tokens'

/** Whether the person asked the system for less motion (MOTION.md §4). */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** A zoom or a fit eases over the base duration; under reduced motion it simply lands. */
export const viewDuration = () => (prefersReducedMotion() ? 0 : MOTION.duration.base)

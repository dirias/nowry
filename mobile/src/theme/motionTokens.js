/**
 * Motion values, with no React Native in scope (MOTION.md, DS-001).
 *
 * Split from the hooks deliberately. The durations and easings are data, and
 * data should be testable without a device runtime; `useReduceMotion` needs
 * `AccessibilityInfo` and lives next door in `motion.js`.
 *
 * The durations come straight from the shared tokens so the two clients cannot
 * drift. The easings do not: `cubic-bezier(...)` is a CSS string and Reanimated
 * wants the four control points, so they are re-expressed as coordinates. The
 * numbers are the same numbers.
 */
import { MOTION } from '@nowry/core/tokens/tokens'

export const DURATION = MOTION.duration

export const EASING = {
  standard: [0.2, 0, 0, 1],
  exit: [0.4, 0, 1, 1]
}

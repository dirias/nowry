/**
 * GEN-006 — what a generation on this surface actually takes.
 *
 * The budgets shipped with GEN-002/005 are constants somebody guessed (20s–45s).
 * A guess is a fine starting point and a poor resting point: if this user's
 * portraits reliably take 110 seconds, a 70-second budget is wrong in the same
 * direction every single time, and the bar spends most of every run in the flat
 * tail of the curve.
 *
 * The PRD's original open item said "p50 from telemetry", which reads as a
 * backend pipeline. It does not need to be one (A9). A generation's duration is
 * fully observable in the browser that waited for it, so each client keeps its
 * own median per surface. That needs no endpoint, and it paces on this user's
 * machine, connection and content size rather than on a population average.
 *
 * Everything here is best-effort. `localStorage` is absent in some runtimes,
 * throws in others (Safari private mode, blocked site data), and can hold
 * whatever a previous version or another tab wrote. Nothing in a *progress bar*
 * justifies breaking a generation, so every path degrades to the constant.
 */

const STORAGE_KEY = 'nowry.generationBudgets.v1'

/** Runs kept per surface. Enough to be stable, few enough to track a real change. */
export const SAMPLE_SIZE = 7

/** Below this, a "generation" is a cache hit or an error path, not work worth pacing on. */
const MIN_PLAUSIBLE_MS = 500

/** Above this, the tab was almost certainly backgrounded or suspended mid-run. */
const MAX_PLAUSIBLE_MS = 15 * 60 * 1000

/**
 * How far the learned budget may stray from the shipped constant, as a factor.
 * The constant encodes what the surface *is* — a portrait is not a deck analysis
 * — and a sample can be unrepresentative early on. This keeps learning useful
 * without letting seven unlucky runs redefine the surface.
 */
const MIN_FACTOR = 0.4
const MAX_FACTOR = 3

const clamp = (value, low, high) => Math.min(high, Math.max(low, value))

/** Median. Even samples take the lower of the two middles; the difference never matters here. */
export const median = (values) => {
  if (!values || values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor((sorted.length - 1) / 2)]
}

const readAll = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    // Anything that is not the shape we wrote is treated as absent rather than
    // repaired: this is a cache of guesses, and the constants are right behind it.
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

const writeAll = (all) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Quota, private mode, or blocked site data. The budget simply stops learning.
  }
}

/** Durations recorded for a surface, newest last. Always an array of finite numbers. */
export const samplesFor = (surface) => {
  const stored = readAll()[surface]
  if (!Array.isArray(stored)) return []
  return stored.filter((n) => typeof n === 'number' && Number.isFinite(n) && n > 0).slice(-SAMPLE_SIZE)
}

/**
 * Record one completed run. Only completions reach here — a failed or abandoned
 * run measures the failure, not the work, and would drag the budget toward
 * however long the user waited before giving up.
 */
export const recordDuration = (surface, durationMs) => {
  if (!surface || !Number.isFinite(durationMs)) return
  if (durationMs < MIN_PLAUSIBLE_MS || durationMs > MAX_PLAUSIBLE_MS) return

  const all = readAll()
  const next = [...samplesFor(surface), durationMs].slice(-SAMPLE_SIZE)
  writeAll({ ...all, [surface]: next })
}

/**
 * The budget to pace on: the median of recent runs, held within a factor of the
 * shipped constant, or the constant itself when there is no history.
 *
 * @param {string} surface     Stable key for the generation surface.
 * @param {number} fallbackMs  The hand-set constant for that surface.
 */
export const budgetFor = (surface, fallbackMs) => {
  if (!surface || !Number.isFinite(fallbackMs) || fallbackMs <= 0) return fallbackMs

  const observed = median(samplesFor(surface))
  if (observed === null) return fallbackMs

  return Math.round(clamp(observed, fallbackMs * MIN_FACTOR, fallbackMs * MAX_FACTOR))
}

/** Test seam, and the honest way to let a user reset pacing that has gone strange. */
export const clearBudgets = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do — there was nothing readable to clear either.
  }
}

import { useEffect, useRef, useState } from 'react'

/**
 * GEN-002 — the one progress model behind every AI generation wait.
 *
 * Nowry has two kinds of wait and only ever built indicators for the second one:
 *
 *   - **counted** — card generation streams over SSE and reports `{ index, total }`
 *     per card, so the bar can track something real.
 *   - **estimated** — every other generation is one opaque request. Nothing is
 *     known but how long it has been running.
 *
 * Presenting those identically is the mistake to avoid, so `mode` is part of the
 * return and the caller's copy changes with it. What must never differ is the
 * behaviour of the bar itself: it advances, it does not go backwards, and it does
 * not stop moving while work is still running.
 */

/** Hold at 100% this long after a run finishes, so completion is seen, not inferred. */
export const SETTLE_MS = 500

/** Fallback pacing for a caller that has no measured budget of its own. */
export const DEFAULT_ESTIMATED_MS = 30000

/**
 * Fraction of the bar an estimated run has covered once it reaches its budget.
 * 0.8 is deliberately short of the end: the budget is a guess, and a guess that
 * renders as "nearly done" has nowhere to go when it turns out to be wrong.
 */
const VALUE_AT_BUDGET = 0.8

const TAU_DIVISOR = -Math.log(1 - VALUE_AT_BUDGET)

/** Highest value estimated mode may show. Only a completion reaches 100. */
const CEILING = 99.9

/**
 * Estimated-mode value: `100 * (1 - e^(-t/τ))`.
 *
 * The predecessor of this function was `Math.min(95, elapsed / budget * 100)`
 * (`CompanionTab.js:90`), which hits its ceiling at the budget and then sits
 * there — a companion animation budgets 180s, so a 300s run showed a frozen bar
 * for two minutes and read as a hang. This curve has no ceiling below 100: it
 * reads 80% at the budget, 96% at twice it, 99.2% at three times it, and keeps
 * moving for as long as the work does without ever claiming to be finished.
 */
export const easedValue = (elapsedMs, estimatedMs = DEFAULT_ESTIMATED_MS) => {
  if (!(elapsedMs > 0)) return 0
  const budget = estimatedMs > 0 ? estimatedMs : DEFAULT_ESTIMATED_MS
  const tau = budget / TAU_DIVISOR
  // The curve approaches 100 without reaching it in exact arithmetic, but
  // `Math.exp` underflows to zero around 745 tau, and 100 is a claim this mode
  // is not entitled to make. `CEILING` enforces in float what the curve
  // guarantees on paper. It is not the 95% stall it replaced: at 99.9 there is
  // no perceptible track left to move through, whereas 95 left a twentieth of
  // the bar visibly unused for minutes.
  return Math.min(CEILING, 100 * (1 - Math.exp(-elapsedMs / tau)))
}

/**
 * Counted-mode value. A total of zero is not a total — a caller between "started"
 * and "the first event told me how many" has nothing to count against, and
 * counting anyway is what produced "3 of 0 cards generated" (GEN-001).
 */
export const countedValue = (current, total) => {
  if (!total || total <= 0) return null
  const done = Math.max(0, Math.min(current || 0, total))
  return (done / total) * 100
}

/**
 * The last stage whose `after` (in seconds) has been reached.
 * Stages are authored in ascending order; this does not assume they are sorted.
 */
export const stageAt = (stages, elapsedSeconds) => {
  if (!stages || stages.length === 0) return null
  let found = null
  for (const stage of stages) {
    const after = stage.after ?? 0
    if (elapsedSeconds >= after && (found === null || after >= (found.after ?? 0))) {
      found = stage
    }
  }
  return found ?? stages[0]
}

/**
 * @param {object}  options
 * @param {boolean} options.active        Work is in flight.
 * @param {boolean} [options.failed]      Terminal failure. Suppresses the completion
 *   settle — holding a full bar after a failure would claim a success that did not
 *   happen.
 * @param {number}  [options.current]     Units completed, when they are knowable.
 * @param {number}  [options.total]       Units expected. With `current`, selects counted mode.
 * @param {number}  [options.estimatedMs] Budget for estimated mode. Per surface — see A5.
 * @param {Array}   [options.stages]      `[{ after: seconds, icon, msgKey }]`, per surface.
 * @returns {{
 *   visible: boolean, value: number, mode: 'counted'|'estimated',
 *   stage: object|null, elapsedSeconds: number, isSettling: boolean
 * }}
 */
export default function useGenerationProgress({
  active,
  failed = false,
  current,
  total,
  estimatedMs = DEFAULT_ESTIMATED_MS,
  stages = []
} = {}) {
  const [tick, setTick] = useState(0)
  const [isSettling, setIsSettling] = useState(false)

  // The highest value this run has shown. A bar that goes backwards is worse than
  // no bar, and both inputs can move backwards on their own: a corrected `total`
  // shrinks a counted value, and a new run restarts the clock.
  const ceilingRef = useRef(0)
  const startRef = useRef(null)
  const runningRef = useRef(false)

  // The rising edge is detected during render, not in an effect. An effect runs
  // *after* the render it belongs to, so resetting the ceiling there wiped the
  // value the same render had just recorded, and the first correction after a
  // run started was free to move the bar backwards.
  if (active && !runningRef.current) {
    runningRef.current = true
    startRef.current = Date.now()
    ceilingRef.current = 0
  } else if (!active && runningRef.current) {
    runningRef.current = false
  }

  useEffect(() => {
    if (!active) return undefined
    const id = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])

  // Completion settle. Runs on the falling edge of `active` only, so a component
  // that mounts idle never flashes a finished bar for work it never did.
  const settleArmedRef = useRef(false)
  useEffect(() => {
    if (active) {
      settleArmedRef.current = true
      setIsSettling(false)
      return undefined
    }
    if (!settleArmedRef.current) return undefined
    settleArmedRef.current = false

    if (failed) return undefined

    setIsSettling(true)
    const id = setTimeout(() => setIsSettling(false), SETTLE_MS)
    return () => clearTimeout(id)
  }, [active, failed])

  // A tick left over from a previous run predates this one's start, so the
  // subtraction goes negative and clamps to zero rather than inheriting it.
  const elapsedMs = active && startRef.current ? Math.max(0, tick - startRef.current) : 0

  const counted = countedValue(current, total)
  const mode = counted === null ? 'estimated' : 'counted'
  const raw = counted === null ? easedValue(elapsedMs, estimatedMs) : counted

  let value
  if (isSettling) {
    value = 100
  } else if (!active) {
    value = 0
  } else {
    value = Math.max(raw, ceilingRef.current)
    ceilingRef.current = value
  }

  return {
    visible: active || isSettling,
    value,
    mode,
    stage: stageAt(stages, Math.floor(elapsedMs / 1000)),
    elapsedSeconds: Math.floor(elapsedMs / 1000),
    isSettling
  }
}

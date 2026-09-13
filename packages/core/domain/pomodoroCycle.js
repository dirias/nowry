/**
 * What the focus timer says about itself, for both clients.
 *
 * Two derivations lived inside the web's widget and the phone rewrote one of
 * them and skipped the other (MOB-062):
 *
 *   - **`cycleProgress`** is how far through the four-focus cycle the user is,
 *     as the dots draw it. The phone wrote `completedSessions % total`, which
 *     is right until the long break is earned: at that moment the remainder is
 *     zero, so the screen said "0 of 4 focus sessions before a long break" on
 *     the one screen where the answer is four. The earned case is why the web
 *     has a function here rather than an expression.
 *   - **`statusLine`** is the sentence under the clock, and it has four cases.
 *     The phone showed one of them — the queued-break count — always, so a
 *     paused timer and a running one said the same thing.
 *
 * ADR-031: `statusLine` returns a translation KEY and its parameters, never a
 * string and never a component. Each client calls `t` with what it gets back.
 *
 * **The timer's vocabulary lives here, not in its context.** `MODES`,
 * `durationFor` and `nextModeAfter` were in `PomodoroContext`, and a domain
 * module importing a context pulls a provider, a profile hook and Firebase
 * behind it — which is why a plain-node test of this file died on a missing
 * `fetch` before anything was asserted. The context imports them from here and
 * re-exports them, so every existing call site is unchanged.
 */

/** How many focus sessions a full cycle is. */
export const SESSIONS_BEFORE_LONG_BREAK = 4

export const MODES = Object.freeze({
  WORK: 'work',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak'
})

export const DEFAULT_SETTINGS = Object.freeze({
  work: 25,
  shortBreak: 5,
  longBreak: 15,
  autoStart: false,
  enabled: false
})

export const isMode = (value) => Object.values(MODES).includes(value)

/** Seconds a full session of `mode` lasts under `settings`. */
export const durationFor = (mode, settings) => {
  const minutes = mode === MODES.SHORT_BREAK ? settings.shortBreak : mode === MODES.LONG_BREAK ? settings.longBreak : settings.work
  return Math.max(1, Number(minutes) || DEFAULT_SETTINGS[mode] || DEFAULT_SETTINGS.work) * 60
}

/** Which session follows `mode`, given how many focus sessions are complete. */
export const nextModeAfter = (mode, completedSessions) => {
  if (mode !== MODES.WORK) return MODES.WORK
  return completedSessions > 0 && completedSessions % SESSIONS_BEFORE_LONG_BREAK === 0 ? MODES.LONG_BREAK : MODES.SHORT_BREAK
}

/**
 * How many of the cycle's focus sessions are behind you, 0…total.
 * @returns {number}
 */
export const cycleProgress = (completedSessions, mode, total) => {
  const inCycle = completedSessions % total
  const earnedLongBreak = mode === MODES.LONG_BREAK && completedSessions > 0 && inCycle === 0
  return earnedLongBreak ? total : inCycle
}

/**
 * The line under the clock, as a key and its parameters.
 *
 * `mode` names a mode, so the caller translates `pomodoro.modes.<mode>` itself
 * — a nested lookup is the caller's, not this module's.
 *
 * @returns {{ key: string, params: object }}
 */
export const statusLine = ({ mode, isActive, isPaused, timeLeft, totalSeconds, completedSessions, sessionsBeforeLongBreak, settings }) => {
  const isFocus = mode === MODES.WORK

  if (isPaused) {
    return { key: 'pomodoro.status.paused', params: { minutes: Math.round((totalSeconds - timeLeft) / 60) } }
  }
  if (isFocus) {
    const next = nextModeAfter(mode, completedSessions + 1)
    return { key: 'pomodoro.status.next', params: { mode: next, minutes: durationFor(next, settings) / 60 } }
  }
  if (isActive) {
    return { key: 'pomodoro.status.next', params: { mode: MODES.WORK, minutes: settings.work } }
  }
  if (mode === MODES.LONG_BREAK) {
    return { key: 'pomodoro.status.longBreakEarned', params: { total: sessionsBeforeLongBreak } }
  }
  return {
    key: 'pomodoro.status.breakQueued',
    params: { count: cycleProgress(completedSessions, mode, sessionsBeforeLongBreak), total: sessionsBeforeLongBreak }
  }
}

/** The share of the ring left empty between two sessions of the cycle. */
export const RING_GAP = 0.02

/**
 * The focus dial's ring, as arcs (MOB-104).
 *
 * The cycle IS the ring: during focus it is one arc per session of the cycle,
 * the finished ones full and the one in hand filling as the clock runs, so a
 * single object says both how far through this session and how far through
 * the cycle you are. A break is not a session of the cycle, so during one the
 * ring is a single arc filling with the break.
 *
 * Fractions of the circumference, starting at twelve o'clock and going
 * clockwise; the client turns them into strokes.
 *
 * @returns {Array<{ start: number, length: number, fill: number }>}
 */
export const ringArcs = ({ mode, completedSessions, sessionsBeforeLongBreak, progress }) => {
  const clamped = Math.min(1, Math.max(0, Number(progress) || 0))
  if (mode !== MODES.WORK) return [{ start: 0, length: 1, fill: clamped }]

  const total = Math.max(1, sessionsBeforeLongBreak)
  const done = cycleProgress(completedSessions, mode, total)
  const gap = total > 1 ? RING_GAP : 0
  return Array.from({ length: total }, (_, index) => ({
    start: index / total + gap / 2,
    length: 1 / total - gap,
    fill: index < done ? 1 : index === done ? clamped : 0
  }))
}

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useUserProfile } from '../hooks/useUserProfile'
import { alerts, storage } from '../platform'
import {
  AUTO_START_GRACE_MS,
  DEFAULT_SETTINGS,
  ENDED_TTL_MS,
  EXTEND_MINUTES,
  MODES,
  SESSIONS_BEFORE_LONG_BREAK,
  durationFor,
  isMode,
  nextModeAfter
} from '../domain/pomodoroCycle'

/**
 * PomodoroContext — one timer for the whole app.
 *
 * Design notes (why it looks the way it does):
 * - The clock is `endTime`, a wall-clock timestamp. `timeLeft` is derived from
 *   it on every tick, so a throttled background tab or a full reload never
 *   drifts: the widget shows the same remaining time the user would see on a
 *   kitchen timer.
 * - Persisted state is read synchronously in the `useState` initialisers, so
 *   there is no "restoring" phase to guard and no first paint at 25:00 that
 *   then jumps.
 * - Preferences come from `profile.preferences.pomodoro` — the sub-document
 *   `PUT /users/preferences/general` writes. Older documents that carried the
 *   flat `pomodoro_*` keys under `preferences.general` are still honoured.
 * - **The end of a session is a state, not a tick (ADR-036).** At zero the
 *   timer keeps its mode, sets `ended`, rings once and counts nothing. The
 *   user resolves it: `extendSession` runs the same session on, `startNext`
 *   counts it and runs the next, `stopAfterEnd` counts it and queues the next
 *   idle. With `autoStart` the ended state resolves itself after a ten-second
 *   countdown unless the user acts first. Every one of those calls
 *   `alerts.stop()`, which is what makes the chime stoppable at all.
 * - An ended state older than ten minutes is not a live question: on restore
 *   it moves on silently, exactly as a timer that ran out while the app was
 *   closed always has.
 */

const PomodoroContext = createContext(null)
const STORAGE_KEY = 'NOWRY_POMODORO_STATE'
const STORAGE_VERSION = 2
const TICK_MS = 250

/*
 * The timer's vocabulary is `domain/pomodoroCycle` and is re-exported here.
 *
 * It was defined in this file, which meant a pure derivation over it could not
 * be written without importing a React context — and through it a provider, a
 * profile hook and Firebase. Re-exporting keeps all eight existing call sites
 * importing from where they always have.
 */
export { DEFAULT_SETTINGS, MODES, SESSIONS_BEFORE_LONG_BREAK, durationFor, isMode, nextModeAfter } from '../domain/pomodoroCycle'

/**
 * Map a `/users/profile` response onto timer settings. Returns `null` when the
 * profile carries no preferences yet, so callers can keep the defaults.
 */
export const settingsFromProfile = (profile) => {
  const prefs = profile?.preferences
  if (!prefs) return null
  const nested = prefs.pomodoro || {}
  const general = prefs.general || {}
  const pick = (nestedKey, flatKey, fallback) => nested[nestedKey] ?? general[flatKey] ?? prefs[flatKey] ?? fallback
  return {
    work: pick('work_minutes', 'pomodoro_work_minutes', DEFAULT_SETTINGS.work),
    shortBreak: pick('short_break_minutes', 'pomodoro_short_break_minutes', DEFAULT_SETTINGS.shortBreak),
    longBreak: pick('long_break_minutes', 'pomodoro_long_break_minutes', DEFAULT_SETTINGS.longBreak),
    autoStart: Boolean(pick('auto_start', 'pomodoro_auto_start', DEFAULT_SETTINGS.autoStart)),
    enabled: Boolean(pick('enabled', 'pomodoro_enabled', DEFAULT_SETTINGS.enabled))
  }
}

const isSameDay = (a, b) => {
  const da = new Date(a)
  const db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}

const remainingSeconds = (endTime, now = Date.now()) => Math.max(0, Math.ceil((endTime - now) / 1000))

/** The fields the ended state adds, all at rest. Spread over any resolution. */
const NOT_ENDED = Object.freeze({ ended: false, endedAt: null, autoStartsAt: null, autoStartIn: null })

const freshState = (mode = MODES.WORK, completedSessions = 0) => ({
  mode,
  timeLeft: durationFor(mode, DEFAULT_SETTINGS),
  isActive: false,
  endTime: null,
  // `sessionTouched` is false only while the timer sits untouched at the full
  // duration of its mode. That is the one moment a preference change should
  // move the displayed time.
  sessionTouched: false,
  completedSessions,
  showWidget: false,
  ...NOT_ENDED,
  // `extension` is the length of the current extension while one runs (the
  // progress edge restarts for it); `extendedTotal` is every extension this
  // session has had, so the ended status can say "30 min of focus".
  extension: 0,
  extendedTotal: 0
})

const extensionFields = (parsed) => ({
  extension: Number(parsed.extension) || 0,
  extendedTotal: Number(parsed.extendedTotal) || 0
})

/** The session counted and the next one queued idle — what a stale end resolves to. */
const movedOn = (parsed, completedSessions, showWidget) => {
  const sessions = parsed.mode === MODES.WORK ? completedSessions + 1 : completedSessions
  return { ...freshState(nextModeAfter(parsed.mode, sessions), sessions), showWidget }
}

/** The ended state as restored: in the corner, no countdown — the live moment is over. */
const endedAgain = (parsed, base, endedAt) => ({
  ...base,
  ...extensionFields(parsed),
  timeLeft: 0,
  sessionTouched: true,
  ended: true,
  endedAt
})

/**
 * Rebuild timer state from what the last session left in localStorage. A timer
 * that ran out while the app was closed is completed here (silently — no sound
 * for something that ended an hour ago) so the user lands on the next session;
 * one that ended within the last ten minutes is still a question, and comes
 * back ended (ADR-036).
 */
export const restorePersistedState = (raw, now = Date.now()) => {
  if (!raw) return freshState()
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return freshState()
  }
  if (!parsed || parsed.version !== STORAGE_VERSION || !isMode(parsed.mode)) return freshState()

  const completedSessions = parsed.savedAt && isSameDay(parsed.savedAt, now) ? Number(parsed.completedSessions) || 0 : 0
  const base = { ...freshState(parsed.mode, completedSessions), showWidget: Boolean(parsed.showWidget) }

  if (parsed.ended && typeof parsed.endedAt === 'number') {
    return now - parsed.endedAt <= ENDED_TTL_MS
      ? endedAgain(parsed, base, parsed.endedAt)
      : movedOn(parsed, completedSessions, base.showWidget)
  }

  if (parsed.isActive && typeof parsed.endTime === 'number') {
    const remaining = remainingSeconds(parsed.endTime, now)
    if (remaining > 0) {
      return { ...base, ...extensionFields(parsed), timeLeft: remaining, isActive: true, endTime: parsed.endTime, sessionTouched: true }
    }
    if (now - parsed.endTime <= ENDED_TTL_MS) return endedAgain(parsed, base, parsed.endTime)
    return movedOn(parsed, completedSessions, base.showWidget)
  }

  if (parsed.sessionTouched && typeof parsed.timeLeft === 'number' && parsed.timeLeft > 0) {
    return { ...base, ...extensionFields(parsed), timeLeft: parsed.timeLeft, sessionTouched: true }
  }
  return base
}

const readStorage = () => {
  try {
    return restorePersistedState(storage.get(STORAGE_KEY))
  } catch {
    return freshState()
  }
}

const writeStorage = (state) => {
  try {
    storage.set(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, savedAt: Date.now(), ...state }))
  } catch {
    // Storage can be unavailable (private mode, quota); the timer still works for this tab.
  }
}

export const usePomodoro = () => {
  const context = useContext(PomodoroContext)
  if (!context) {
    throw new Error('usePomodoro must be used within a PomodoroProvider')
  }
  return context
}

export const PomodoroProvider = ({ children }) => {
  const { t } = useTranslation()
  const { profile } = useUserProfile()

  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [timer, setTimer] = useState(readStorage)
  // Mirror of `timer` for callbacks that fire from an interval and need the
  // current mode without waiting on a render.
  const timerRef = useRef(timer)
  timerRef.current = timer

  const {
    mode,
    timeLeft,
    isActive,
    endTime,
    sessionTouched,
    completedSessions,
    showWidget,
    ended,
    autoStartsAt,
    autoStartIn,
    extension,
    extendedTotal
  } = timer

  // Preferences — from the profile query, whenever it (re)loads.
  useEffect(() => {
    const next = settingsFromProfile(profile)
    if (next) setSettings(next)
  }, [profile])

  // An untouched timer follows the preference for its mode.
  useEffect(() => {
    setTimer((prev) => {
      if (prev.isActive || prev.sessionTouched) return prev
      const duration = durationFor(prev.mode, settings)
      return prev.timeLeft === duration ? prev : { ...prev, timeLeft: duration }
    })
  }, [settings])

  // Persist every change. State was restored synchronously, so the first write
  // simply re-saves what was loaded.
  useEffect(() => {
    writeStorage(timer)
  }, [timer])

  /**
   * Zero. The session is shown as ended and nothing is counted yet; the chime
   * plays once and the OS notice goes out, silent when the chime did play so
   * there is one sound source at a time.
   */
  const endSession = useCallback(() => {
    const now = Date.now()
    const finishedMode = timerRef.current.mode
    setTimer((prev) => ({
      ...prev,
      isActive: false,
      endTime: null,
      timeLeft: 0,
      sessionTouched: true,
      ended: true,
      endedAt: now,
      autoStartsAt: settings.autoStart ? now + AUTO_START_GRACE_MS : null,
      autoStartIn: settings.autoStart ? Math.ceil(AUTO_START_GRACE_MS / 1000) : null
    }))
    const played = alerts.play() === true
    const bodyKey = finishedMode === MODES.WORK ? 'pomodoro.notification.workDone' : 'pomodoro.notification.breakDone'
    alerts.announce(t('pomodoro.notification.title'), t(bodyKey), { silent: played })
  }, [settings, t])

  /**
   * Count the session and move to the next one — running or queued. Every path
   * out of the ended state goes through here or `extendSession`, and each
   * stops the chime first.
   */
  const moveOn = useCallback(
    ({ running, closeWidget = false }) => {
      alerts.stop()
      setTimer((prev) => {
        const sessions = prev.mode === MODES.WORK ? prev.completedSessions + 1 : prev.completedSessions
        const next = nextModeAfter(prev.mode, sessions)
        const duration = durationFor(next, settings)
        return {
          ...prev,
          ...NOT_ENDED,
          mode: next,
          completedSessions: sessions,
          timeLeft: duration,
          isActive: running,
          endTime: running ? Date.now() + duration * 1000 : null,
          sessionTouched: running,
          extension: 0,
          extendedTotal: 0,
          showWidget: closeWidget ? false : prev.showWidget
        }
      })
    },
    [settings]
  )

  // The tick. Derives `timeLeft` from `endTime` so it is exact after a
  // throttled background tab or a sleep.
  useEffect(() => {
    if (!isActive || !endTime) return undefined
    let intervalId = null
    const tick = () => {
      const remaining = remainingSeconds(endTime)
      setTimer((prev) => (prev.timeLeft === remaining ? prev : { ...prev, timeLeft: remaining }))
      if (remaining === 0) {
        clearInterval(intervalId)
        intervalId = null
        endSession()
      }
    }
    tick()
    intervalId = setInterval(tick, TICK_MS)
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [isActive, endTime, endSession])

  // The auto-start countdown: the same wall-clock derivation, ten seconds long.
  useEffect(() => {
    if (!ended || !autoStartsAt) return undefined
    let intervalId = null
    const tick = () => {
      const left = remainingSeconds(autoStartsAt)
      setTimer((prev) => (prev.autoStartIn === left ? prev : { ...prev, autoStartIn: left }))
      if (left === 0) {
        clearInterval(intervalId)
        intervalId = null
        moveOn({ running: true })
      }
    }
    tick()
    intervalId = setInterval(tick, TICK_MS)
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [ended, autoStartsAt, moveOn])

  const startTimer = useCallback(() => {
    // Ask once, on the first user gesture; a denial or an unsupported browser is fine.
    Promise.resolve()
      .then(() => alerts.requestPermission())
      .catch(() => false)
    setTimer((prev) => {
      if (prev.isActive || prev.ended) return prev
      const seconds = prev.timeLeft > 0 ? prev.timeLeft : durationFor(prev.mode, settings)
      return { ...prev, timeLeft: seconds, isActive: true, endTime: Date.now() + seconds * 1000, sessionTouched: true }
    })
  }, [settings])

  const pauseTimer = useCallback(() => {
    setTimer((prev) => (prev.isActive ? { ...prev, isActive: false, endTime: null } : prev))
  }, [])

  /** Count the ended session and run the next one. */
  const startNext = useCallback(() => moveOn({ running: true }), [moveOn])

  /** Count the ended session, queue the next one idle, and put the timer away. */
  const stopAfterEnd = useCallback(() => moveOn({ running: false, closeWidget: true }), [moveOn])

  /** Run the ended session on for `minutes` more. Nothing is counted. */
  const extendSession = useCallback((minutes) => {
    const seconds = Math.max(1, Math.round(Number(minutes) || 0)) * 60
    alerts.stop()
    setTimer((prev) =>
      prev.ended
        ? {
            ...prev,
            ...NOT_ENDED,
            isActive: true,
            timeLeft: seconds,
            endTime: Date.now() + seconds * 1000,
            sessionTouched: true,
            extension: seconds,
            extendedTotal: prev.extendedTotal + seconds
          }
        : prev
    )
  }, [])

  const toggleTimer = useCallback(() => {
    if (ended) startNext()
    else if (isActive) pauseTimer()
    else startTimer()
  }, [ended, isActive, pauseTimer, startNext, startTimer])

  const resetTimer = useCallback(() => {
    alerts.stop()
    setTimer((prev) => ({
      ...prev,
      ...NOT_ENDED,
      isActive: false,
      endTime: null,
      sessionTouched: false,
      extension: 0,
      extendedTotal: 0,
      timeLeft: durationFor(prev.mode, settings)
    }))
  }, [settings])

  const changeMode = useCallback(
    (newMode) => {
      if (!isMode(newMode)) return
      alerts.stop()
      setTimer((prev) => ({
        ...prev,
        ...NOT_ENDED,
        mode: newMode,
        isActive: false,
        endTime: null,
        sessionTouched: false,
        extension: 0,
        extendedTotal: 0,
        timeLeft: durationFor(newMode, settings)
      }))
    },
    [settings]
  )

  /** Jump to the next session without waiting (e.g. cut a break short). Never rings. */
  const skipSession = useCallback(() => moveOn({ running: settings.autoStart }), [moveOn, settings.autoStart])

  const setShowWidget = useCallback((value) => {
    setTimer((prev) => {
      const next = typeof value === 'function' ? value(prev.showWidget) : Boolean(value)
      if (prev.showWidget === next) return prev
      // Closing the sheet while it is ended is a demotion: the question stays,
      // the chime does not.
      if (!next && prev.ended) alerts.stop()
      return { ...prev, showWidget: next }
    })
  }, [])

  /**
   * Demote the promoted sheet: silence the chime and put the timer away, the
   * question left standing. Distinct from `setShowWidget(false)` because the
   * sheet may already have been closed when the session ended, and the chime
   * must stop either way.
   */
  const dismissEnd = useCallback(() => {
    alerts.stop()
    setTimer((prev) => (prev.showWidget ? { ...prev, showWidget: false } : prev))
  }, [])

  const baseSeconds = durationFor(mode, settings)
  const totalSeconds = extension || baseSeconds

  const value = useMemo(
    () => ({
      timeLeft,
      totalSeconds,
      /** The whole session so far: its length plus every extension. */
      sessionSeconds: baseSeconds + extendedTotal,
      progress: ended ? 1 : totalSeconds > 0 ? Math.min(1, Math.max(0, (totalSeconds - timeLeft) / totalSeconds)) : 0,
      isActive,
      isPaused: sessionTouched && !isActive && !ended,
      isEnded: ended,
      autoStartIn,
      extension,
      extendMinutes: EXTEND_MINUTES,
      mode,
      completedSessions,
      sessionsBeforeLongBreak: SESSIONS_BEFORE_LONG_BREAK,
      showWidget,
      setShowWidget,
      startTimer,
      pauseTimer,
      toggleTimer,
      resetTimer,
      skipSession,
      changeMode,
      extendSession,
      startNext,
      stopAfterEnd,
      dismissEnd,
      settings
    }),
    [
      timeLeft,
      totalSeconds,
      baseSeconds,
      extendedTotal,
      isActive,
      sessionTouched,
      ended,
      autoStartIn,
      extension,
      mode,
      completedSessions,
      showWidget,
      setShowWidget,
      startTimer,
      pauseTimer,
      toggleTimer,
      resetTimer,
      skipSession,
      changeMode,
      extendSession,
      startNext,
      stopAfterEnd,
      dismissEnd,
      settings
    ]
  )

  // No JSX in @nowry/core (ADR-031).
  return React.createElement(PomodoroContext.Provider, { value }, children)
}

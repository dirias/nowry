import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useUserProfile } from '../hooks/useUserProfile'
import { playPomodoroNotification, showBrowserNotification, requestNotificationPermission } from '../utils/pomodoroSound'

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
 * - A finished session moves to the next one on its own (work → break → work,
 *   long break after every fourth focus). `autoStart` decides whether that next
 *   session also starts running.
 */

const PomodoroContext = createContext(null)
const STORAGE_KEY = 'NOWRY_POMODORO_STATE'
const STORAGE_VERSION = 2
const TICK_MS = 250

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

const isMode = (value) => Object.values(MODES).includes(value)

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
  showWidget: false
})

/**
 * Rebuild timer state from what the last session left in localStorage. A timer
 * that ran out while the app was closed is completed here (silently — no sound
 * for something that ended an hour ago) so the user lands on the next session.
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

  if (parsed.isActive && typeof parsed.endTime === 'number') {
    const remaining = remainingSeconds(parsed.endTime, now)
    if (remaining > 0) {
      return { ...base, timeLeft: remaining, isActive: true, endTime: parsed.endTime, sessionTouched: true }
    }
    const sessions = parsed.mode === MODES.WORK ? completedSessions + 1 : completedSessions
    return { ...freshState(nextModeAfter(parsed.mode, sessions), sessions), showWidget: base.showWidget }
  }

  if (parsed.sessionTouched && typeof parsed.timeLeft === 'number' && parsed.timeLeft > 0) {
    return { ...base, timeLeft: parsed.timeLeft, sessionTouched: true }
  }
  return base
}

const readStorage = () => {
  try {
    return restorePersistedState(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return freshState()
  }
}

const writeStorage = (state) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, savedAt: Date.now(), ...state }))
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

  const { mode, timeLeft, isActive, endTime, sessionTouched, completedSessions, showWidget } = timer

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

  const completeSession = useCallback(
    ({ notify = true } = {}) => {
      const finishedMode = timerRef.current.mode
      setTimer((prev) => {
        const sessions = prev.mode === MODES.WORK ? prev.completedSessions + 1 : prev.completedSessions
        const next = nextModeAfter(prev.mode, sessions)
        const duration = durationFor(next, settings)
        const running = settings.autoStart
        return {
          ...prev,
          mode: next,
          completedSessions: sessions,
          timeLeft: duration,
          isActive: running,
          endTime: running ? Date.now() + duration * 1000 : null,
          sessionTouched: running
        }
      })
      if (!notify) return
      playPomodoroNotification()
      const bodyKey = finishedMode === MODES.WORK ? 'pomodoro.notification.workDone' : 'pomodoro.notification.breakDone'
      showBrowserNotification(t('pomodoro.notification.title'), t(bodyKey))
    },
    [settings, t]
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
        completeSession()
      }
    }
    tick()
    intervalId = setInterval(tick, TICK_MS)
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [isActive, endTime, completeSession])

  const startTimer = useCallback(() => {
    // Ask once, on the first user gesture; a denial or an unsupported browser is fine.
    Promise.resolve()
      .then(() => requestNotificationPermission())
      .catch(() => false)
    setTimer((prev) => {
      if (prev.isActive) return prev
      const seconds = prev.timeLeft > 0 ? prev.timeLeft : durationFor(prev.mode, settings)
      return { ...prev, timeLeft: seconds, isActive: true, endTime: Date.now() + seconds * 1000, sessionTouched: true }
    })
  }, [settings])

  const pauseTimer = useCallback(() => {
    setTimer((prev) => (prev.isActive ? { ...prev, isActive: false, endTime: null } : prev))
  }, [])

  const toggleTimer = useCallback(() => {
    if (isActive) pauseTimer()
    else startTimer()
  }, [isActive, pauseTimer, startTimer])

  const resetTimer = useCallback(() => {
    setTimer((prev) => ({ ...prev, isActive: false, endTime: null, sessionTouched: false, timeLeft: durationFor(prev.mode, settings) }))
  }, [settings])

  const changeMode = useCallback(
    (newMode) => {
      if (!isMode(newMode)) return
      setTimer((prev) => ({
        ...prev,
        mode: newMode,
        isActive: false,
        endTime: null,
        sessionTouched: false,
        timeLeft: durationFor(newMode, settings)
      }))
    },
    [settings]
  )

  /** Jump to the next session without waiting (e.g. cut a break short). Never rings. */
  const skipSession = useCallback(() => completeSession({ notify: false }), [completeSession])

  const setShowWidget = useCallback((value) => {
    setTimer((prev) => {
      const next = typeof value === 'function' ? value(prev.showWidget) : Boolean(value)
      return prev.showWidget === next ? prev : { ...prev, showWidget: next }
    })
  }, [])

  const totalSeconds = durationFor(mode, settings)

  const value = useMemo(
    () => ({
      timeLeft,
      totalSeconds,
      progress: totalSeconds > 0 ? Math.min(1, Math.max(0, (totalSeconds - timeLeft) / totalSeconds)) : 0,
      isActive,
      isPaused: sessionTouched && !isActive,
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
      settings
    }),
    [
      timeLeft,
      totalSeconds,
      isActive,
      sessionTouched,
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
      settings
    ]
  )

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>
}

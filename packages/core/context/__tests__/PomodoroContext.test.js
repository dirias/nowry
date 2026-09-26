/**
 * PomodoroContext — the timer's contract.
 *
 * Covers the failures that made the timer "not work": preferences read from
 * the wrong place, state lost after a reload while running, the displayed
 * duration ignoring the user's setting, and sessions that never moved on.
 * Mirrors AgentContext.test.js's Provider + TestConsumer-via-callback idiom.
 */
import React from 'react'
import { render, act } from '@testing-library/react'

let mockProfile = null
jest.mock('../../hooks/useUserProfile', () => ({
  useUserProfile: () => ({ profile: mockProfile, loading: false, error: null })
}))
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } })
}))

import { PomodoroProvider, usePomodoro, restorePersistedState, nextModeAfter, settingsFromProfile } from '../PomodoroContext'
import { configureTestPlatform, resetPlatform } from '../../platform/testing'

const STORAGE_KEY = 'NOWRY_POMODORO_STATE'
const T0 = new Date('2026-09-05T09:00:00Z').getTime()

const profileWith = (pomodoro) => ({ preferences: { general: { language: 'en' }, pomodoro } })

const TestConsumer = ({ onRender }) => {
  onRender(usePomodoro())
  return null
}

const mount = () => {
  let ctx
  const utils = render(
    <PomodoroProvider>
      <TestConsumer
        onRender={(value) => {
          ctx = value
        }}
      />
    </PomodoroProvider>
  )
  return { get: () => ctx, ...utils }
}

const advance = (ms) => {
  act(() => {
    jest.advanceTimersByTime(ms)
  })
}

let testStorage
let adapters

beforeEach(() => {
  adapters = configureTestPlatform()
  testStorage = adapters.storage
})

afterEach(() => resetPlatform())

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(T0)
  testStorage.clear()
  mockProfile = null
  jest.clearAllMocks()
  // CRA's jest config resets mock implementations between tests.
  adapters.alerts.requestPermission.mockResolvedValue(false)
})

afterEach(() => {
  jest.useRealTimers()
})

describe('preferences', () => {
  test('reads the nested preferences.pomodoro sub-document the API writes', () => {
    mockProfile = profileWith({ enabled: true, work_minutes: 50, short_break_minutes: 10, long_break_minutes: 20, auto_start: true })
    const { get } = mount()
    expect(get().settings).toEqual({ enabled: true, work: 50, shortBreak: 10, longBreak: 20, autoStart: true })
    expect(get().timeLeft).toBe(50 * 60)
  })

  test('still honours legacy flat keys under preferences.general', () => {
    const settings = settingsFromProfile({ preferences: { general: { pomodoro_enabled: true, pomodoro_work_minutes: 30 } } })
    expect(settings.enabled).toBe(true)
    expect(settings.work).toBe(30)
  })

  test('an untouched timer follows a later preference load; a paused one does not', () => {
    const { get, rerender } = mount()
    expect(get().timeLeft).toBe(25 * 60)

    mockProfile = profileWith({ enabled: true, work_minutes: 40 })
    rerender(
      <PomodoroProvider>
        <TestConsumer onRender={() => {}} />
      </PomodoroProvider>
    )
    // Re-mount with the new profile to trigger the effect chain deterministically.
    const second = mount()
    expect(second.get().timeLeft).toBe(40 * 60)

    act(() => second.get().startTimer())
    advance(5000)
    act(() => second.get().pauseTimer())
    const pausedAt = second.get().timeLeft
    expect(pausedAt).toBe(40 * 60 - 5)

    mockProfile = profileWith({ enabled: true, work_minutes: 10 })
    const third = mount()
    expect(third.get().timeLeft).toBe(pausedAt)
  })
})

describe('running and completing sessions', () => {
  test('start counts down from the wall clock and ends — shown, rung once, counted by nobody yet (ADR-036)', () => {
    mockProfile = profileWith({ enabled: true, work_minutes: 1 })
    const { get } = mount()

    act(() => get().startTimer())
    expect(get().isActive).toBe(true)

    advance(30 * 1000)
    expect(get().timeLeft).toBe(30)

    advance(30 * 1000)
    expect(get().isActive).toBe(false)
    expect(get().isEnded).toBe(true)
    expect(get().isPaused).toBe(false)
    expect(get().mode).toBe('work')
    expect(get().completedSessions).toBe(0)
    expect(get().timeLeft).toBe(0)
    expect(get().progress).toBe(1)
    expect(get().autoStartIn).toBeNull()
    expect(adapters.alerts.play).toHaveBeenCalledTimes(1)
    // The chime played, so the OS notice is silent: one sound source at a time.
    expect(adapters.alerts.announce).toHaveBeenCalledWith('pomodoro.notification.title', 'pomodoro.notification.workDone', { silent: true })

    // Nothing rings again while it waits.
    advance(60 * 1000)
    expect(adapters.alerts.play).toHaveBeenCalledTimes(1)
    expect(get().isEnded).toBe(true)
  })

  test('auto-start counts ten seconds down on the ended sheet, then runs the next session', () => {
    mockProfile = profileWith({ enabled: true, work_minutes: 1, short_break_minutes: 1, auto_start: true })
    const { get } = mount()

    act(() => get().startTimer())
    advance(60 * 1000)
    expect(get().isEnded).toBe(true)
    expect(get().mode).toBe('work')
    expect(get().autoStartIn).toBe(10)

    advance(3 * 1000)
    expect(get().autoStartIn).toBe(7)

    advance(7 * 1000)
    expect(get().isEnded).toBe(false)
    expect(get().mode).toBe('shortBreak')
    expect(get().isActive).toBe(true)
    expect(get().completedSessions).toBe(1)
    expect(adapters.alerts.stop).toHaveBeenCalled()

    advance(70 * 1000)
    expect(get().mode).toBe('work')
    expect(get().isActive).toBe(true)
  })

  test('any action cancels the auto-start countdown', () => {
    mockProfile = profileWith({ enabled: true, work_minutes: 1, auto_start: true })
    const { get } = mount()
    act(() => get().startTimer())
    advance(60 * 1000)
    act(() => get().extendSession(5))
    expect(get().autoStartIn).toBeNull()
    advance(15 * 1000)
    expect(get().mode).toBe('work')
    expect(get().isActive).toBe(true)
    expect(get().timeLeft).toBe(5 * 60 - 15)
  })

  test('every fourth focus session earns a long break', () => {
    expect(nextModeAfter('work', 1)).toBe('shortBreak')
    expect(nextModeAfter('work', 3)).toBe('shortBreak')
    expect(nextModeAfter('work', 4)).toBe('longBreak')
    expect(nextModeAfter('work', 8)).toBe('longBreak')
    expect(nextModeAfter('shortBreak', 4)).toBe('work')
    expect(nextModeAfter('longBreak', 4)).toBe('work')
  })

  test('skip moves on without ringing', () => {
    mockProfile = profileWith({ enabled: true })
    const { get } = mount()
    act(() => get().skipSession())
    expect(get().mode).toBe('shortBreak')
    expect(get().completedSessions).toBe(1)
    expect(adapters.alerts.play).not.toHaveBeenCalled()
  })

  test('a silent play (no Web Audio) leaves the notification its own sound', () => {
    adapters.alerts.play.mockReturnValue(false)
    mockProfile = profileWith({ enabled: true, work_minutes: 1 })
    const { get } = mount()
    act(() => get().startTimer())
    advance(60 * 1000)
    expect(adapters.alerts.announce).toHaveBeenCalledWith(expect.any(String), expect.any(String), { silent: false })
  })

  test('reset returns to the full duration of the current mode', () => {
    mockProfile = profileWith({ enabled: true, work_minutes: 2 })
    const { get } = mount()
    act(() => get().startTimer())
    advance(10 * 1000)
    act(() => get().resetTimer())
    expect(get().isActive).toBe(false)
    expect(get().timeLeft).toBe(120)
  })
})

describe('persistence across reloads', () => {
  test('a running timer survives a reload and keeps counting from the wall clock', () => {
    mockProfile = profileWith({ enabled: true, work_minutes: 10 })
    const first = mount()
    act(() => first.get().startTimer())
    advance(60 * 1000)
    first.unmount()

    jest.setSystemTime(T0 + 3 * 60 * 1000)
    const second = mount()
    expect(second.get().isActive).toBe(true)
    expect(second.get().timeLeft).toBe(7 * 60)
  })

  test('pausing after a reload is remembered (the old restore path lost it)', () => {
    mockProfile = profileWith({ enabled: true, work_minutes: 10 })
    const first = mount()
    act(() => first.get().startTimer())
    first.unmount()

    jest.setSystemTime(T0 + 60 * 1000)
    const second = mount()
    expect(second.get().isActive).toBe(true)
    act(() => second.get().pauseTimer())
    second.unmount()

    jest.setSystemTime(T0 + 30 * 60 * 1000)
    const third = mount()
    expect(third.get().isActive).toBe(false)
    expect(third.get().timeLeft).toBe(9 * 60)
  })

  test('a timer that ran out while the app was closed lands on the next session, silently', () => {
    mockProfile = profileWith({ enabled: true, work_minutes: 1 })
    const first = mount()
    act(() => first.get().startTimer())
    first.unmount()

    jest.setSystemTime(T0 + 60 * 60 * 1000)
    const second = mount()
    expect(second.get().mode).toBe('shortBreak')
    expect(second.get().isActive).toBe(false)
    expect(second.get().completedSessions).toBe(1)
    expect(adapters.alerts.play).not.toHaveBeenCalled()
  })

  test('completed sessions reset on a new day; unknown or corrupt state falls back to defaults', () => {
    const yesterday = T0 - 24 * 60 * 60 * 1000
    const saved = JSON.stringify({ version: 2, savedAt: yesterday, mode: 'work', completedSessions: 3, isActive: false })
    expect(restorePersistedState(saved, T0).completedSessions).toBe(0)

    const today = JSON.stringify({ version: 2, savedAt: T0 - 1000, mode: 'work', completedSessions: 3, isActive: false })
    expect(restorePersistedState(today, T0).completedSessions).toBe(3)

    expect(restorePersistedState('{not json', T0).mode).toBe('work')
    expect(restorePersistedState(JSON.stringify({ mode: 'work', isActive: true, endTime: T0 + 5000 }), T0).isActive).toBe(false)
  })

  test('the widget visibility is persisted', () => {
    mockProfile = profileWith({ enabled: true })
    const first = mount()
    act(() => first.get().setShowWidget(true))
    first.unmount()
    expect(JSON.parse(testStorage.get(STORAGE_KEY)).showWidget).toBe(true)
    expect(mount().get().showWidget).toBe(true)
  })
})

describe('the ended state (ADR-036)', () => {
  const endAFocus = (prefs = { enabled: true, work_minutes: 25 }) => {
    mockProfile = profileWith(prefs)
    const mounted = mount()
    act(() => mounted.get().startTimer())
    advance(25 * 60 * 1000)
    expect(mounted.get().isEnded).toBe(true)
    adapters.alerts.stop.mockClear()
    return mounted
  }

  test('extend runs the same session on; nothing is counted; the edge restarts', () => {
    const { get } = endAFocus()
    act(() => get().extendSession(5))
    expect(adapters.alerts.stop).toHaveBeenCalledTimes(1)
    expect(get().isEnded).toBe(false)
    expect(get().isActive).toBe(true)
    expect(get().mode).toBe('work')
    expect(get().completedSessions).toBe(0)
    expect(get().timeLeft).toBe(5 * 60)
    expect(get().totalSeconds).toBe(5 * 60)
    expect(get().sessionSeconds).toBe(30 * 60)
    expect(get().extension).toBe(5 * 60)

    // The extension ends the same way the session did.
    advance(5 * 60 * 1000)
    expect(get().isEnded).toBe(true)
    expect(get().completedSessions).toBe(0)
    expect(adapters.alerts.play).toHaveBeenCalledTimes(2)
  })

  test('start next counts the session and runs the break', () => {
    const { get } = endAFocus()
    act(() => get().startNext())
    expect(adapters.alerts.stop).toHaveBeenCalledTimes(1)
    expect(get().mode).toBe('shortBreak')
    expect(get().isActive).toBe(true)
    expect(get().completedSessions).toBe(1)
    expect(get().isEnded).toBe(false)
    expect(get().extension).toBe(0)
  })

  test('stop counts the session, queues the break idle, and puts the timer away', () => {
    const { get } = endAFocus()
    act(() => get().setShowWidget(true))
    act(() => get().stopAfterEnd())
    expect(adapters.alerts.stop).toHaveBeenCalledTimes(1)
    expect(get().mode).toBe('shortBreak')
    expect(get().isActive).toBe(false)
    expect(get().isPaused).toBe(false)
    expect(get().completedSessions).toBe(1)
    expect(get().timeLeft).toBe(5 * 60)
    expect(get().showWidget).toBe(false)
  })

  test('toggle while ended means start next; start alone does nothing', () => {
    const { get } = endAFocus()
    act(() => get().startTimer())
    expect(get().isEnded).toBe(true)
    act(() => get().toggleTimer())
    expect(get().mode).toBe('shortBreak')
    expect(get().isActive).toBe(true)
  })

  test('closing the sheet while ended silences the chime and keeps the question', () => {
    const { get } = endAFocus()
    act(() => get().setShowWidget(true))
    adapters.alerts.stop.mockClear()
    act(() => get().setShowWidget(false))
    expect(adapters.alerts.stop).toHaveBeenCalledTimes(1)
    expect(get().isEnded).toBe(true)
    expect(get().completedSessions).toBe(0)
  })

  test('dismiss silences the chime even when the sheet was already closed', () => {
    const { get } = endAFocus()
    expect(get().showWidget).toBe(false)
    act(() => get().dismissEnd())
    expect(adapters.alerts.stop).toHaveBeenCalledTimes(1)
    expect(get().isEnded).toBe(true)
    expect(get().showWidget).toBe(false)
  })

  test('reset and a mode change leave the ended state and silence the chime', () => {
    const first = endAFocus()
    act(() => first.get().resetTimer())
    expect(first.get().isEnded).toBe(false)
    expect(first.get().timeLeft).toBe(25 * 60)
    expect(adapters.alerts.stop).toHaveBeenCalledTimes(1)
    first.unmount()
    testStorage.clear()

    const second = endAFocus()
    act(() => second.get().changeMode('shortBreak'))
    expect(second.get().isEnded).toBe(false)
    expect(second.get().mode).toBe('shortBreak')
    expect(adapters.alerts.stop).toHaveBeenCalledTimes(1)
  })

  test('a reload within ten minutes restores the ended state, without ringing', () => {
    const first = endAFocus()
    first.unmount()
    adapters.alerts.play.mockClear()

    jest.setSystemTime(T0 + 25 * 60 * 1000 + 2 * 60 * 1000)
    const second = mount()
    expect(second.get().isEnded).toBe(true)
    expect(second.get().mode).toBe('work')
    expect(second.get().completedSessions).toBe(0)
    expect(second.get().autoStartIn).toBeNull()
    expect(adapters.alerts.play).not.toHaveBeenCalled()
  })

  test('a reload later than that moves on silently, as a closed app always did', () => {
    const first = endAFocus()
    first.unmount()
    adapters.alerts.play.mockClear()

    jest.setSystemTime(T0 + 25 * 60 * 1000 + 11 * 60 * 1000)
    const second = mount()
    expect(second.get().isEnded).toBe(false)
    expect(second.get().mode).toBe('shortBreak')
    expect(second.get().completedSessions).toBe(1)
    expect(adapters.alerts.play).not.toHaveBeenCalled()
  })

  test('a timer that ran out while the tab was closed, two minutes ago, comes back ended', () => {
    mockProfile = profileWith({ enabled: true, work_minutes: 1 })
    const first = mount()
    act(() => first.get().startTimer())
    first.unmount()

    jest.setSystemTime(T0 + 3 * 60 * 1000)
    const second = mount()
    expect(second.get().isEnded).toBe(true)
    expect(second.get().mode).toBe('work')
    expect(adapters.alerts.play).not.toHaveBeenCalled()
  })
})

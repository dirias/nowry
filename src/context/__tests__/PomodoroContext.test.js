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
jest.mock('../../utils/pomodoroSound', () => ({
  playPomodoroNotification: jest.fn(),
  showBrowserNotification: jest.fn(),
  requestNotificationPermission: jest.fn(() => Promise.resolve(false))
}))

import { PomodoroProvider, usePomodoro, restorePersistedState, nextModeAfter, settingsFromProfile } from '../PomodoroContext'
import { playPomodoroNotification, showBrowserNotification, requestNotificationPermission } from '../../utils/pomodoroSound'

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

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(T0)
  window.localStorage.clear()
  mockProfile = null
  jest.clearAllMocks()
  // CRA's jest config resets mock implementations between tests.
  requestNotificationPermission.mockResolvedValue(false)
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
  test('start counts down from the wall clock and completes into a short break', () => {
    mockProfile = profileWith({ enabled: true, work_minutes: 1 })
    const { get } = mount()

    act(() => get().startTimer())
    expect(get().isActive).toBe(true)

    advance(30 * 1000)
    expect(get().timeLeft).toBe(30)

    advance(30 * 1000)
    expect(get().isActive).toBe(false)
    expect(get().mode).toBe('shortBreak')
    expect(get().completedSessions).toBe(1)
    expect(get().timeLeft).toBe(5 * 60)
    expect(playPomodoroNotification).toHaveBeenCalledTimes(1)
    expect(showBrowserNotification).toHaveBeenCalledWith('pomodoro.notification.title', 'pomodoro.notification.workDone')
  })

  test('auto-start rolls straight into the next session', () => {
    mockProfile = profileWith({ enabled: true, work_minutes: 1, short_break_minutes: 1, auto_start: true })
    const { get } = mount()

    act(() => get().startTimer())
    advance(60 * 1000)
    expect(get().mode).toBe('shortBreak')
    expect(get().isActive).toBe(true)

    advance(60 * 1000)
    expect(get().mode).toBe('work')
    expect(get().isActive).toBe(true)
    expect(get().completedSessions).toBe(1)
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
    expect(playPomodoroNotification).not.toHaveBeenCalled()
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
    expect(playPomodoroNotification).not.toHaveBeenCalled()
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
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)).showWidget).toBe(true)
    expect(mount().get().showWidget).toBe(true)
  })
})

import { DEFAULT_SETTINGS } from '../pomodoroCycle'
import { POMODORO_DURATIONS, POMODORO_PREFS, clampMinutes, pomodoroPatch } from '../pomodoroPrefs'

describe('the table', () => {
  it('defaults to the timer´s own defaults rather than to numbers of its own', () => {
    expect(POMODORO_PREFS.work.fallback).toBe(DEFAULT_SETTINGS.work)
    expect(POMODORO_PREFS.shortBreak.fallback).toBe(DEFAULT_SETTINGS.shortBreak)
    expect(POMODORO_PREFS.longBreak.fallback).toBe(DEFAULT_SETTINGS.longBreak)
    expect(POMODORO_PREFS.autoStart.fallback).toBe(DEFAULT_SETTINGS.autoStart)
    expect(POMODORO_PREFS.enabled.fallback).toBe(DEFAULT_SETTINGS.enabled)
  })

  it('names the three durations and only those', () => {
    expect(POMODORO_DURATIONS).toEqual(['work', 'shortBreak', 'longBreak'])
    expect(POMODORO_DURATIONS.every((name) => POMODORO_PREFS[name].min !== undefined)).toBe(true)
    expect(POMODORO_PREFS.enabled.min).toBeUndefined()
  })

  it('keeps every default inside its own bounds', () => {
    for (const name of POMODORO_DURATIONS) {
      const { fallback, min, max } = POMODORO_PREFS[name]
      expect(fallback).toBeGreaterThanOrEqual(min)
      expect(fallback).toBeLessThanOrEqual(max)
    }
  })
})

describe('clampMinutes', () => {
  it('holds a length inside what the timer can run', () => {
    expect(clampMinutes('work', 200)).toBe(60)
    expect(clampMinutes('work', 0)).toBe(1)
    expect(clampMinutes('shortBreak', 90)).toBe(30)
    expect(clampMinutes('longBreak', 1)).toBe(5)
  })

  it('leaves a sensible length alone', () => {
    expect(clampMinutes('work', 25)).toBe(25)
  })

  it('rounds, because half a minute is not a setting', () => {
    expect(clampMinutes('work', 25.6)).toBe(26)
  })

  it('is the default for something that is not a number, never nought', () => {
    expect(clampMinutes('work', '')).toBe(DEFAULT_SETTINGS.work)
    expect(clampMinutes('work', 'abc')).toBe(DEFAULT_SETTINGS.work)
    expect(clampMinutes('shortBreak', null)).toBe(DEFAULT_SETTINGS.shortBreak)
  })

  it('does not touch a setting that is not a duration', () => {
    expect(clampMinutes('autoStart', true)).toBe(true)
  })
})

describe('pomodoroPatch', () => {
  it('sends the server´s key and a held value', () => {
    expect(pomodoroPatch('work', 500)).toEqual({ pomodoro_work_minutes: 60 })
    expect(pomodoroPatch('autoStart', true)).toEqual({ pomodoro_auto_start: true })
    expect(pomodoroPatch('enabled', false)).toEqual({ pomodoro_enabled: false })
  })

  it('sends nothing for a setting it does not carry', () => {
    expect(pomodoroPatch('somethingElse', 1)).toEqual({})
  })
})

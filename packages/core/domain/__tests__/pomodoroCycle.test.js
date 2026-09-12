import { MODES, cycleProgress, statusLine } from '../pomodoroCycle'

const settings = { work: 25, shortBreak: 5, longBreak: 15, sessionsBeforeLongBreak: 4 }

describe('cycleProgress', () => {
  it('counts the focus sessions behind you inside the cycle', () => {
    expect(cycleProgress(0, MODES.WORK, 4)).toBe(0)
    expect(cycleProgress(2, MODES.WORK, 4)).toBe(2)
    expect(cycleProgress(5, MODES.WORK, 4)).toBe(1)
  })

  it('is FULL on the long break the cycle just earned, not empty', () => {
    // The remainder is zero at exactly this moment, which is why `% total`
    // reported "0 of 4" on the one screen where the answer is four.
    expect(cycleProgress(4, MODES.LONG_BREAK, 4)).toBe(4)
    expect(cycleProgress(8, MODES.LONG_BREAK, 4)).toBe(4)
  })

  it('is empty on a long break reached before any session was done', () => {
    expect(cycleProgress(0, MODES.LONG_BREAK, 4)).toBe(0)
  })
})

describe('statusLine', () => {
  const base = {
    mode: MODES.WORK,
    isActive: false,
    isPaused: false,
    timeLeft: 1500,
    totalSeconds: 1500,
    completedSessions: 0,
    sessionsBeforeLongBreak: 4,
    settings
  }

  it('says how far in a paused timer got', () => {
    expect(statusLine({ ...base, isPaused: true, timeLeft: 900 })).toEqual({
      key: 'pomodoro.status.paused',
      params: { minutes: 10 }
    })
  })

  it('names what comes after a focus session, and how long it is', () => {
    expect(statusLine(base)).toEqual({
      key: 'pomodoro.status.next',
      params: { mode: MODES.SHORT_BREAK, minutes: 5 }
    })
  })

  it('names the long break when the cycle has earned one', () => {
    expect(statusLine({ ...base, completedSessions: 3 })).toEqual({
      key: 'pomodoro.status.next',
      params: { mode: MODES.LONG_BREAK, minutes: 15 }
    })
  })

  it('names focus as what comes after a running break', () => {
    expect(statusLine({ ...base, mode: MODES.SHORT_BREAK, isActive: true })).toEqual({
      key: 'pomodoro.status.next',
      params: { mode: MODES.WORK, minutes: 25 }
    })
  })

  it('says the long break is earned when it is sitting unstarted', () => {
    expect(statusLine({ ...base, mode: MODES.LONG_BREAK, completedSessions: 4 })).toEqual({
      key: 'pomodoro.status.longBreakEarned',
      params: { total: 4 }
    })
  })

  it('counts towards the long break when a short one is queued', () => {
    expect(statusLine({ ...base, mode: MODES.SHORT_BREAK, completedSessions: 2 })).toEqual({
      key: 'pomodoro.status.breakQueued',
      params: { count: 2, total: 4 }
    })
  })

  it('returns a mode NAME, never a translated string (ADR-031)', () => {
    expect(statusLine(base).params.mode).toBe(MODES.SHORT_BREAK)
  })
})

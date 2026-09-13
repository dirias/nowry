import { MODES, RING_GAP, cycleProgress, ringArcs, statusLine } from '../pomodoroCycle'

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

describe('ringArcs', () => {
  const focus = { mode: MODES.WORK, completedSessions: 1, sessionsBeforeLongBreak: 4, progress: 0.5 }

  it('draws one arc per session of the cycle during focus', () => {
    const arcs = ringArcs(focus)
    expect(arcs).toHaveLength(4)
    expect(arcs.map((arc) => arc.fill)).toEqual([1, 0.5, 0, 0])
  })

  it('leaves a gap between arcs and stays inside the circle', () => {
    const arcs = ringArcs(focus)
    arcs.forEach((arc, index) => {
      expect(arc.start).toBeCloseTo(index / 4 + RING_GAP / 2)
      expect(arc.length).toBeCloseTo(0.25 - RING_GAP)
    })
    const last = arcs[3]
    expect(last.start + last.length).toBeLessThan(1)
  })

  it('starts a fresh cycle after the long break', () => {
    expect(ringArcs({ ...focus, completedSessions: 4, progress: 0 }).map((arc) => arc.fill)).toEqual([0, 0, 0, 0])
  })

  it('is one arc filling with the break during a break', () => {
    expect(ringArcs({ ...focus, mode: MODES.SHORT_BREAK, progress: 0.3 })).toEqual([{ start: 0, length: 1, fill: 0.3 }])
  })

  it('clamps progress it cannot draw', () => {
    expect(ringArcs({ ...focus, completedSessions: 0, progress: 2 })[0].fill).toBe(1)
    expect(ringArcs({ ...focus, mode: MODES.LONG_BREAK, progress: undefined })[0].fill).toBe(0)
  })
})

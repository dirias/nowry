/**
 * GEN-002 — the shared generation progress model.
 *
 * The pure functions are asserted directly, because the properties worth pinning
 * are properties of the *curve* and are clumsy to observe through a render: that
 * estimated mode keeps moving past its own budget (the stall this hook exists to
 * fix), that it never reaches 100 while work is running, and that a total of zero
 * is not a total.
 *
 * The hook itself is then exercised with fake timers for the two behaviours that
 * only exist over time: monotonicity and the completion settle.
 */
import { act, renderHook } from '@testing-library/react'

import useGenerationProgress, { SETTLE_MS, countedValue, easedValue, stageAt } from './useGenerationProgress'

const STAGES = [
  { after: 0, icon: '🎨', msgKey: 'first' },
  { after: 10, icon: '✨', msgKey: 'second' },
  { after: 30, icon: '⏳', msgKey: 'third' }
]

describe('easedValue — the curve that replaced the 95% ceiling', () => {
  it('starts at zero', () => {
    expect(easedValue(0, 10000)).toBe(0)
    expect(easedValue(-5, 10000)).toBe(0)
  })

  it('reads most of the way, not nearly done, at the budget', () => {
    expect(easedValue(10000, 10000)).toBeCloseTo(80, 5)
  })

  it('keeps advancing past the budget instead of stalling', () => {
    // The predecessor (`Math.min(95, elapsed / budget * 100)`) returned 95 for
    // all three of these. A 180s animation budget that ran 300s froze for two
    // minutes; that is the defect being fixed.
    const atBudget = easedValue(10000, 10000)
    const atDouble = easedValue(20000, 10000)
    const atTriple = easedValue(30000, 10000)

    expect(atDouble).toBeGreaterThan(atBudget)
    expect(atTriple).toBeGreaterThan(atDouble)
  })

  it('saturates only far beyond any real run', () => {
    // The ceiling is a ceiling, so there is a point past which it too stops
    // moving — but it sits at 2.86 budgets with one percent of track left, not
    // at 95% with a twentieth of the bar unused. In the app's own terms: 3m20s
    // for the 70s avatar budget, 8m35s for the 180s animation one, 71s for the
    // 25s card stream. All are past anything a real generation takes.
    expect(easedValue(28000, 10000)).toBeLessThan(99)
    expect(easedValue(29000, 10000)).toBe(99)
  })

  it('never claims to be finished, however long it runs', () => {
    // Not merely below 100: below it once rounded, because Joy rounds for
    // `aria-valuenow` and a screen reader hearing "100%" mid-run is the same
    // false claim as a full bar.
    expect(Math.round(easedValue(10 ** 9, 10000))).toBeLessThan(100)
  })

  it('falls back to the default budget when handed a nonsense one', () => {
    expect(easedValue(5000, 0)).toBe(easedValue(5000, undefined))
  })
})

describe('countedValue', () => {
  it('is a plain fraction of the total', () => {
    expect(countedValue(3, 12)).toBe(25)
    expect(countedValue(12, 12)).toBe(100)
  })

  it('refuses to count against a total of zero or nothing', () => {
    // GEN-001 in numeric form: a caller between "started" and "the first event
    // told me how many" has nothing to count against.
    expect(countedValue(3, 0)).toBeNull()
    expect(countedValue(3, null)).toBeNull()
    expect(countedValue(3, undefined)).toBeNull()
  })

  it('clamps a count that overshoots a corrected total', () => {
    expect(countedValue(15, 12)).toBe(100)
    expect(countedValue(-2, 12)).toBe(0)
  })
})

describe('stageAt', () => {
  it('returns nothing when a surface supplies no stages', () => {
    expect(stageAt([], 42)).toBeNull()
    expect(stageAt(undefined, 42)).toBeNull()
  })

  it('holds the last stage whose threshold has been passed', () => {
    expect(stageAt(STAGES, 0).msgKey).toBe('first')
    expect(stageAt(STAGES, 9).msgKey).toBe('first')
    expect(stageAt(STAGES, 10).msgKey).toBe('second')
    expect(stageAt(STAGES, 29).msgKey).toBe('second')
    expect(stageAt(STAGES, 30).msgKey).toBe('third')
    expect(stageAt(STAGES, 6000).msgKey).toBe('third')
  })
})

describe('useGenerationProgress', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  const advance = (ms) => act(() => { jest.advanceTimersByTime(ms) })

  it('shows nothing at all while idle', () => {
    const { result } = renderHook(() => useGenerationProgress({ active: false, estimatedMs: 10000 }))

    expect(result.current.visible).toBe(false)
    expect(result.current.value).toBe(0)
  })

  it('does not flash a finished bar for work it never did', () => {
    // Mounting idle must not look like a completion — the settle fires on the
    // falling edge of `active`, and there has not been one.
    const { result } = renderHook(() => useGenerationProgress({ active: false }))

    expect(result.current.isSettling).toBe(false)
    expect(result.current.visible).toBe(false)
  })

  it('reports counted mode when a real total is known, estimated otherwise', () => {
    const counted = renderHook(() => useGenerationProgress({ active: true, current: 3, total: 12 }))
    expect(counted.result.current.mode).toBe('counted')
    expect(counted.result.current.value).toBe(25)

    const estimated = renderHook(() => useGenerationProgress({ active: true, current: 3, total: 0 }))
    expect(estimated.result.current.mode).toBe('estimated')
  })

  it('never lets the value fall, even when the total is corrected upwards', () => {
    const { result, rerender } = renderHook((props) => useGenerationProgress(props), {
      initialProps: { active: true, current: 6, total: 6 }
    })
    expect(result.current.value).toBe(100)

    // The stream revises the total: 6 of 12 is arithmetically 50%, but a bar
    // that drops from full to half reads as a failure.
    rerender({ active: true, current: 6, total: 12 })
    expect(result.current.value).toBe(100)
  })

  it('advances the estimated value as time passes', () => {
    const { result } = renderHook(() => useGenerationProgress({ active: true, estimatedMs: 10000 }))
    expect(result.current.value).toBe(0)

    advance(3000)
    const early = result.current.value
    expect(early).toBeGreaterThan(0)

    advance(3000)
    expect(result.current.value).toBeGreaterThan(early)
  })

  it('walks its stages and exposes the elapsed count', () => {
    const { result } = renderHook(() => useGenerationProgress({ active: true, stages: STAGES, estimatedMs: 60000 }))
    expect(result.current.stage.msgKey).toBe('first')

    advance(12000)
    expect(result.current.stage.msgKey).toBe('second')
    expect(result.current.elapsedSeconds).toBe(12)

    advance(20000)
    expect(result.current.stage.msgKey).toBe('third')
  })

  it('settles at 100% and stays visible briefly after finishing', () => {
    const { result, rerender } = renderHook((props) => useGenerationProgress(props), {
      initialProps: { active: true, estimatedMs: 10000 }
    })
    advance(2000)
    expect(result.current.value).toBeLessThan(100)

    rerender({ active: false, estimatedMs: 10000 })
    expect(result.current.value).toBe(100)
    expect(result.current.visible).toBe(true)

    advance(SETTLE_MS)
    expect(result.current.visible).toBe(false)
  })

  it('does not settle after a failure', () => {
    // Holding a full bar after a failed generation would claim a success that
    // did not happen.
    const { result, rerender } = renderHook((props) => useGenerationProgress(props), {
      initialProps: { active: true, estimatedMs: 10000 }
    })
    advance(2000)

    rerender({ active: false, failed: true, estimatedMs: 10000 })
    expect(result.current.visible).toBe(false)
    expect(result.current.value).not.toBe(100)
  })

  it('restarts cleanly for a second run', () => {
    const { result, rerender } = renderHook((props) => useGenerationProgress(props), {
      initialProps: { active: true, estimatedMs: 10000 }
    })
    advance(6000)
    const firstRun = result.current.value

    rerender({ active: false, estimatedMs: 10000 })
    advance(SETTLE_MS)
    rerender({ active: true, estimatedMs: 10000 })

    // The ceiling from the first run must not carry into the second — a
    // regenerate would otherwise open at wherever the last one ended.
    expect(result.current.value).toBeLessThan(firstRun)
    expect(result.current.elapsedSeconds).toBe(0)
  })
})

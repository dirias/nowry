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
import { recordDuration, samplesFor } from '../utils/generationBudget'

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

  const advance = (ms) =>
    act(() => {
      jest.advanceTimersByTime(ms)
    })

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

/**
 * GEN-006 — the hook's half of learned pacing. The arithmetic lives in
 * `generationBudget` and is tested there; what matters here is *which* runs get
 * recorded, and that the budget is resolved once rather than re-read under a bar
 * that is already moving along its curve.
 */
describe('useGenerationProgress — learned pacing', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    window.localStorage.clear()
  })
  afterEach(() => jest.useRealTimers())

  const advance = (ms) => {
    act(() => {
      jest.advanceTimersByTime(ms)
    })
  }

  it('records a completed run against its surface', () => {
    const { rerender } = renderHook((props) => useGenerationProgress(props), {
      initialProps: { active: true, surface: 'avatar', estimatedMs: 70000 }
    })
    advance(90000)
    rerender({ active: false, surface: 'avatar', estimatedMs: 70000 })

    expect(samplesFor('avatar')).toEqual([90000])
  })

  it('does not record a failed run', () => {
    // It would measure how long the user waited for something that went wrong.
    const { rerender } = renderHook((props) => useGenerationProgress(props), {
      initialProps: { active: true, surface: 'avatar', estimatedMs: 70000 }
    })
    advance(90000)
    rerender({ active: false, failed: true, surface: 'avatar', estimatedMs: 70000 })

    expect(samplesFor('avatar')).toEqual([])
  })

  it('records nothing for a caller that names no surface', () => {
    const { rerender } = renderHook((props) => useGenerationProgress(props), {
      initialProps: { active: true, estimatedMs: 70000 }
    })
    advance(90000)
    rerender({ active: false, estimatedMs: 70000 })

    expect(samplesFor('avatar')).toEqual([])
  })

  it('paces the next run on what the last ones took', () => {
    ;[140000, 150000, 145000].forEach((ms) => recordDuration('avatar', ms))

    const learned = renderHook(() => useGenerationProgress({ active: true, surface: 'avatar', estimatedMs: 70000 }))
    const constant = renderHook(() => useGenerationProgress({ active: true, estimatedMs: 70000 }))

    advance(70000)

    // At the shipped budget the constant-paced run reads 80%; the learned one
    // knows this surface really takes ~145s and is only about half way.
    expect(learned.result.current.value).toBeLessThan(constant.result.current.value)
  })

  it('holds the budget steady for the life of a run', () => {
    const { result, rerender } = renderHook((props) => useGenerationProgress(props), {
      initialProps: { active: true, surface: 'avatar', estimatedMs: 70000 }
    })
    advance(30000)
    const beforeWrite = result.current.value

    // Another surface finishing mid-run must not bend this bar's curve.
    ;[600, 700, 650].forEach((ms) => recordDuration('avatar', ms))
    rerender({ active: true, surface: 'avatar', estimatedMs: 70000 })

    expect(result.current.value).toBe(beforeWrite)
  })
})

/**
 * GEN-007 — a run that outlives the screen that started it.
 *
 * `AgentContext` holds the avatar and animation promises above the routes, so
 * navigating away never stopped the work — only the indicator restarted, because
 * it measured from mount. These pin the difference.
 */
describe('useGenerationProgress — resuming a run in flight', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    window.localStorage.clear()
  })
  afterEach(() => jest.useRealTimers())

  const STAGES = [
    { after: 0, msgKey: 'first' },
    { after: 10, msgKey: 'second' },
    { after: 30, msgKey: 'third' }
  ]

  it('measures from when the run began, not from when the screen reopened', () => {
    const startedAt = Date.now() - 60000

    const { result } = renderHook(() => useGenerationProgress({ active: true, startedAt, estimatedMs: 70000 }))

    expect(result.current.elapsedSeconds).toBe(60)
  })

  it('narrates the stage the run has really reached', () => {
    // Mount-relative timing would have re-opened at 'first' and walked the user
    // back through narration they already saw.
    const startedAt = Date.now() - 45000

    const { result } = renderHook(() => useGenerationProgress({ active: true, startedAt, estimatedMs: 70000, stages: STAGES }))

    expect(result.current.stage.msgKey).toBe('third')
  })

  it('resumes at the value the run had reached, not at zero', () => {
    const fresh = renderHook(() => useGenerationProgress({ active: true, estimatedMs: 70000 }))
    const resumed = renderHook(() => useGenerationProgress({ active: true, startedAt: Date.now() - 60000, estimatedMs: 70000 }))

    expect(fresh.result.current.value).toBe(0)
    expect(resumed.result.current.value).toBeGreaterThan(50)
  })

  it('leaves a caller that passes no startedAt exactly as it was', () => {
    const { result } = renderHook(() => useGenerationProgress({ active: true, estimatedMs: 70000 }))

    expect(result.current.elapsedSeconds).toBe(0)
    expect(result.current.value).toBe(0)
  })

  it('ignores a startedAt that is not a timestamp', () => {
    const { result } = renderHook(() => useGenerationProgress({ active: true, startedAt: null, estimatedMs: 70000 }))

    expect(result.current.elapsedSeconds).toBe(0)
  })

  it('still refuses to go backwards across a resume', () => {
    const { result, rerender } = renderHook((props) => useGenerationProgress(props), {
      initialProps: { active: true, startedAt: Date.now() - 60000, estimatedMs: 70000 }
    })
    const resumedAt = result.current.value

    advanceOneSecond()
    rerender({ active: true, startedAt: Date.now() - 60000, estimatedMs: 70000 })

    expect(result.current.value).toBeGreaterThanOrEqual(resumedAt)
  })
})

function advanceOneSecond() {
  act(() => {
    jest.advanceTimersByTime(1000)
  })
}

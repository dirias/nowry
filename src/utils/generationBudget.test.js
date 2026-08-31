/**
 * GEN-006 — learned pacing.
 *
 * The rules worth pinning are the defensive ones. This module sits behind a
 * progress bar and in front of `localStorage`, which is absent in some runtimes,
 * throws in others, and holds whatever a previous version or another tab wrote.
 * Nothing here justifies breaking a generation, so every failure mode has to end
 * at the shipped constant rather than at an exception.
 */
import { SAMPLE_SIZE, budgetFor, clearBudgets, median, recordDuration, samplesFor } from './generationBudget'

const KEY = 'nowry.generationBudgets.v1'
const SURFACE = 'avatar'
const CONSTANT = 70000

const seed = (value) => window.localStorage.setItem(KEY, JSON.stringify(value))

beforeEach(() => window.localStorage.clear())

describe('median', () => {
  it('is null for an empty sample', () => {
    expect(median([])).toBeNull()
    expect(median(undefined)).toBeNull()
  })

  it('ignores the order it is given', () => {
    expect(median([5, 1, 3])).toBe(3)
    expect(median([3, 1, 5])).toBe(3)
  })

  it('is unmoved by an outlier, which is why it is not a mean', () => {
    expect(median([10, 11, 12, 13, 900])).toBe(12)
  })
})

describe('budgetFor', () => {
  it('uses the shipped constant when nothing has been recorded', () => {
    expect(budgetFor(SURFACE, CONSTANT)).toBe(CONSTANT)
  })

  it('paces on observed runs once there are some', () => {
    ;[100000, 110000, 105000].forEach((ms) => recordDuration(SURFACE, ms))

    expect(budgetFor(SURFACE, CONSTANT)).toBe(105000)
  })

  it('keeps surfaces apart', () => {
    recordDuration('avatar', 100000)

    expect(budgetFor('animation', 180000)).toBe(180000)
  })

  it('will not let a sample redefine the surface', () => {
    // The constant encodes what the surface *is*. Seven unlucky runs may move
    // the budget; they may not turn a portrait into a five-hour job.
    ;[600000, 620000, 610000].forEach((ms) => recordDuration(SURFACE, ms))

    expect(budgetFor(SURFACE, CONSTANT)).toBe(CONSTANT * 3)
  })

  it('will not let a run of cache hits collapse it either', () => {
    ;[600, 700, 650].forEach((ms) => recordDuration(SURFACE, ms))

    expect(budgetFor(SURFACE, CONSTANT)).toBe(CONSTANT * 0.4)
  })

  it('falls back when the constant itself is nonsense', () => {
    expect(budgetFor(SURFACE, 0)).toBe(0)
    expect(budgetFor(undefined, CONSTANT)).toBe(CONSTANT)
  })
})

describe('recordDuration', () => {
  it('keeps only the most recent runs, so the budget can still track a change', () => {
    for (let i = 1; i <= SAMPLE_SIZE + 3; i++) recordDuration(SURFACE, i * 1000)

    const samples = samplesFor(SURFACE)
    expect(samples).toHaveLength(SAMPLE_SIZE)
    expect(samples[samples.length - 1]).toBe((SAMPLE_SIZE + 3) * 1000)
  })

  it('ignores implausibly short runs, which are cache hits or error paths', () => {
    recordDuration(SURFACE, 200)

    expect(samplesFor(SURFACE)).toEqual([])
  })

  it('ignores implausibly long ones, where the tab was suspended mid-run', () => {
    recordDuration(SURFACE, 20 * 60 * 1000)

    expect(samplesFor(SURFACE)).toEqual([])
  })

  it('ignores values that are not durations at all', () => {
    recordDuration(SURFACE, NaN)
    recordDuration(SURFACE, Infinity)
    recordDuration(SURFACE, undefined)

    expect(samplesFor(SURFACE)).toEqual([])
  })
})

describe('when storage is hostile', () => {
  it('treats a corrupt payload as no history', () => {
    seed('not json at all'.replace('"', ''))
    window.localStorage.setItem(KEY, '{{{')

    expect(samplesFor(SURFACE)).toEqual([])
    expect(budgetFor(SURFACE, CONSTANT)).toBe(CONSTANT)
  })

  it('treats the wrong shape as no history', () => {
    seed(['an', 'array', 'is', 'not', 'the', 'map'])

    expect(budgetFor(SURFACE, CONSTANT)).toBe(CONSTANT)
  })

  it('drops junk entries inside an otherwise valid sample', () => {
    seed({ [SURFACE]: [100000, null, 'slow', -5, 110000] })

    expect(samplesFor(SURFACE)).toEqual([100000, 110000])
  })

  it('degrades to the constant when reading throws', () => {
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('site data blocked')
    })

    expect(() => budgetFor(SURFACE, CONSTANT)).not.toThrow()
    expect(budgetFor(SURFACE, CONSTANT)).toBe(CONSTANT)

    getItem.mockRestore()
  })

  it('stops learning, silently, when writing throws', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    expect(() => recordDuration(SURFACE, 100000)).not.toThrow()

    setItem.mockRestore()
    expect(budgetFor(SURFACE, CONSTANT)).toBe(CONSTANT)
  })
})

describe('clearBudgets', () => {
  it('puts every surface back on its constant', () => {
    ;[100000, 110000].forEach((ms) => recordDuration(SURFACE, ms))
    clearBudgets()

    expect(budgetFor(SURFACE, CONSTANT)).toBe(CONSTANT)
  })
})

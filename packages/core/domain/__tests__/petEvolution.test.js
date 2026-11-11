import {
  EVOLUTION_DONE,
  EVOLUTION_KIND,
  MOTE_COUNT,
  beatDuration,
  evolutionBeats,
  evolutionDuration,
  evolutionVariant,
  firstBeat,
  formatGenerationReset,
  generationResetAt,
  nextBeat,
  showsGenerationsLeft,
  showsNewForm,
  motePath,
  spiralLength,
  spiralPath,
  spiralPoint
} from '../petEvolution'
import { evolutionFrom } from '../petLevelUp'
import { MOTION } from '../../tokens/tokens'

describe('which variant plays (ADR-075)', () => {
  it('is decided by what happened', () => {
    expect(evolutionVariant(EVOLUTION_KIND.stage)).toBe('full')
    expect(evolutionVariant(EVOLUTION_KIND.generated)).toBe('full')
    expect(evolutionVariant(EVOLUTION_KIND.worn)).toBe('short')
    expect(evolutionVariant(EVOLUTION_KIND.exhausted)).toBe('none')
  })

  it('plays nothing for an event it does not know', () => {
    expect(evolutionVariant('renamed')).toBe('none')
    expect(evolutionVariant(undefined)).toBe('none')
  })

  it('takes no plan: a free account that evolves gets the full sequence', () => {
    // The chooser has no tier parameter on purpose; this pins that.
    expect(evolutionVariant.length).toBe(1)
  })

  it('states the count only after a generation, and only when the server gave one', () => {
    expect(showsGenerationsLeft(EVOLUTION_KIND.generated, 2)).toBe(true)
    expect(showsGenerationsLeft(EVOLUTION_KIND.generated, 0)).toBe(true)
    expect(showsGenerationsLeft(EVOLUTION_KIND.generated, undefined)).toBe(false)
    expect(showsGenerationsLeft(EVOLUTION_KIND.stage, 2)).toBe(false)
    expect(showsGenerationsLeft(EVOLUTION_KIND.worn, 2)).toBe(false)
  })
})

describe('the timeline', () => {
  it('runs the full sequence in about three seconds and the short one in about one', () => {
    expect(evolutionDuration('full')).toBeGreaterThanOrEqual(2500)
    expect(evolutionDuration('full')).toBeLessThanOrEqual(3500)
    expect(evolutionDuration('short')).toBeGreaterThanOrEqual(800)
    expect(evolutionDuration('short')).toBeLessThanOrEqual(1200)
    expect(evolutionDuration('none')).toBe(0)
  })

  it('is made of the motion scale: every beat a whole number of its steps', () => {
    for (const variant of ['full', 'short']) {
      for (const { ms } of evolutionBeats(variant)) {
        expect(ms % MOTION.duration.quick).toBe(0)
      }
    }
  })

  it('walks its beats in order and ends on done', () => {
    const walk = (variant) => {
      const seen = []
      for (let beat = firstBeat(variant); beat !== EVOLUTION_DONE; beat = nextBeat(variant, beat)) seen.push(beat)
      return seen
    }
    expect(walk('full')).toEqual(['anticipation', 'transformation', 'flash', 'reveal'])
    expect(walk('short')).toEqual(['sweep', 'reveal'])
    expect(firstBeat('none')).toBe(EVOLUTION_DONE)
    expect(nextBeat('full', 'no-such-beat')).toBe(EVOLUTION_DONE)
    expect(beatDuration('full', EVOLUTION_DONE)).toBe(0)
  })

  it('swaps the form under the flash: old before it, new after', () => {
    expect(showsNewForm('anticipation')).toBe(false)
    expect(showsNewForm('transformation')).toBe(false)
    expect(showsNewForm('flash')).toBe(false)
    expect(showsNewForm('sweep')).toBe(false)
    expect(showsNewForm('reveal')).toBe(true)
    expect(showsNewForm(EVOLUTION_DONE)).toBe(true)
  })
})

describe('the spiral', () => {
  it('keeps to the standard: at most eight motes', () => {
    expect(MOTE_COUNT).toBeLessThanOrEqual(8)
  })

  it('winds inward inside its frame, whatever the size', () => {
    for (const size of [120, 200, 320]) {
      const centre = size / 2
      let previous = Infinity
      for (let step = 0; step <= 20; step += 1) {
        const { x, y } = spiralPoint(step / 20, { size })
        const radius = Math.hypot(x - centre, y - centre)
        expect(radius).toBeLessThanOrEqual(previous + 1e-9)
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(size)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(size)
        previous = radius
      }
    }
  })

  it('leaves the middle clear, so it wraps a form of any shape rather than covering it', () => {
    const { x, y } = spiralPoint(1, { size: 200 })
    expect(Math.hypot(x - 100, y - 100)).toBeGreaterThanOrEqual(200 * 0.3 - 1e-9)
  })

  it('is one path a stroke can draw', () => {
    const path = spiralPath({ size: 200 })
    expect(path.startsWith('M')).toBe(true)
    expect(path.match(/M/g)).toHaveLength(1)
    expect(path.match(/L/g).length).toBeGreaterThan(40)
    expect(path).not.toMatch(/NaN/)
  })
})

describe('what the phone draws with', () => {
  it('measures the spiral, so a dash can draw it', () => {
    const small = spiralLength({ size: 100 })
    const large = spiralLength({ size: 200 })
    expect(small).toBeGreaterThan(100)
    expect(large / small).toBeCloseTo(2, 5)
  })

  it('sends each mote inward along the spiral, to its centre end', () => {
    const end = spiralPoint(1, { size: 200 })
    for (let index = 0; index < MOTE_COUNT; index += 1) {
      const points = motePath(index, { size: 200 })
      expect(points).toHaveLength(9)
      expect(points[8].x).toBeCloseTo(end.x, 6)
      expect(points[8].y).toBeCloseTo(end.y, 6)
    }
  })
})

describe('an evolution inside a level-up', () => {
  it('is a stage higher than the one held before the grant', () => {
    expect(evolutionFrom(2, { level: 6, stage: 3 })).toEqual({ fromStage: 2, toStage: 3, level: 6 })
  })

  it('is nothing when only the level changed, or when the stage before is unknown', () => {
    expect(evolutionFrom(3, { level: 7, stage: 3 })).toBeNull()
    expect(evolutionFrom(undefined, { level: 6, stage: 3 })).toBeNull()
    expect(evolutionFrom(2, null)).toBeNull()
  })
})

describe("when the month's generations come back", () => {
  it('is the first of next month at 00:00 UTC, as the server keys it', () => {
    expect(generationResetAt(new Date('2026-11-12T10:00:00Z')).toISOString()).toBe('2026-12-01T00:00:00.000Z')
    expect(generationResetAt(new Date('2026-11-30T23:59:59Z')).toISOString()).toBe('2026-12-01T00:00:00.000Z')
    expect(generationResetAt(new Date('2026-12-01T00:00:00Z')).toISOString()).toBe('2027-01-01T00:00:00.000Z')
    expect(generationResetAt(new Date('2027-01-31T12:00:00Z')).toISOString()).toBe('2027-02-01T00:00:00.000Z')
  })

  it('is shown on the learner own clock: the evening before in the Americas, the first elsewhere', () => {
    const reset = generationResetAt(new Date('2026-11-12T10:00:00Z'))
    const losAngeles = formatGenerationReset(reset, 'en-US', 'America/Los_Angeles')
    expect(losAngeles).toMatch(/November 30/)
    expect(losAngeles).toMatch(/4:00/)
    expect(losAngeles).not.toMatch(/December/)

    const costaRica = formatGenerationReset(reset, 'es', 'America/Costa_Rica')
    expect(costaRica).toMatch(/30 de noviembre/)

    expect(formatGenerationReset(reset, 'en-GB', 'Europe/London')).toMatch(/1 December/)
    expect(formatGenerationReset(reset, 'ja', 'Asia/Tokyo')).toMatch(/12月1日/)
    expect(formatGenerationReset(reset, 'de', 'Europe/Berlin')).toMatch(/1\. Dezember/)
  })

  it('follows the device when no zone is given', () => {
    const reset = generationResetAt(new Date('2026-11-12T10:00:00Z'))
    expect(typeof formatGenerationReset(reset, 'en')).toBe('string')
  })
})

/**
 * PET-002 — evolution stage silhouette invariants.
 *
 * The promise of the pet system is that studying visibly changes your
 * companion. Before this, the only thing separating a stage-1 Wisp from a
 * stage-6 Luminary was 24px of diameter and a set of aura rings that never
 * painted at all — they were rendered inside an `overflow: hidden` circle,
 * so the browser clipped them away.
 *
 * These lock the structural promise: every consecutive pair of stages must
 * differ by something the eye can catch at 56–80px, without a portrait, and
 * without needing two stages side by side to compare.
 */
import { STAGE_CONFIG, FORM_BORDER_RADIUS } from '../StudyPet'

const STAGES = [1, 2, 3, 4, 5, 6]
const VALID_MARKS = [null, 'crest', 'halo', 'crown']

/** The features a user can actually perceive without a reference image. */
const structuralSignature = (config) => [config.form, config.mark, config.ringCount, config.orbitCount].join('|')

describe('STAGE_CONFIG', () => {
  it('defines all six evolution stages', () => {
    expect(Object.keys(STAGE_CONFIG).map(Number).sort()).toEqual(STAGES)
  })

  // The core invariant. Size alone does not satisfy it: nobody sees two
  // stages at once, so a 4px diameter step is not a perceivable change.
  it('gives every consecutive pair at least one structural difference', () => {
    for (let i = 1; i < STAGES.length; i++) {
      const previous = structuralSignature(STAGE_CONFIG[STAGES[i - 1]])
      const current = structuralSignature(STAGE_CONFIG[STAGES[i]])
      expect(current).not.toBe(previous)
    }
  })

  it('gives every stage a signature unique across the whole arc', () => {
    const signatures = STAGES.map((stage) => structuralSignature(STAGE_CONFIG[stage]))
    expect(new Set(signatures).size).toBe(STAGES.length)
  })

  it('grows the orb at every step', () => {
    for (let i = 1; i < STAGES.length; i++) {
      expect(STAGE_CONFIG[STAGES[i]].sizePx).toBeGreaterThan(STAGE_CONFIG[STAGES[i - 1]].sizePx)
    }
  })

  it('never takes an adornment away as the pet evolves', () => {
    // Losing rings or motes on level-up would read as regression, not growth.
    for (let i = 1; i < STAGES.length; i++) {
      expect(STAGE_CONFIG[STAGES[i]].ringCount).toBeGreaterThanOrEqual(STAGE_CONFIG[STAGES[i - 1]].ringCount)
      expect(STAGE_CONFIG[STAGES[i]].orbitCount).toBeGreaterThanOrEqual(STAGE_CONFIG[STAGES[i - 1]].orbitCount)
    }
  })

  it('quickens the pulse as the pet matures', () => {
    for (let i = 1; i < STAGES.length; i++) {
      expect(STAGE_CONFIG[STAGES[i]].pulseDuration).toBeLessThanOrEqual(STAGE_CONFIG[STAGES[i - 1]].pulseDuration)
    }
  })

  it('only uses forms the renderer knows how to draw', () => {
    for (const stage of STAGES) {
      expect(FORM_BORDER_RADIUS[STAGE_CONFIG[stage].form]).toBeDefined()
    }
  })

  it('only uses marks the renderer knows how to draw', () => {
    for (const stage of STAGES) {
      expect(VALID_MARKS).toContain(STAGE_CONFIG[stage].mark)
    }
  })

  // Guards the PET-001 contract at this layer too: PetOrb appends a two-digit
  // hex alpha to this value (`${activeColor}55`) to build its glow, which is
  // invalid CSS against any non-hex colour format.
  it('keeps every fallback dominantColor a 6-digit hex', () => {
    for (const stage of STAGES) {
      expect(STAGE_CONFIG[stage].dominantColor).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('starts unformed and ends crowned', () => {
    expect(STAGE_CONFIG[1].form).toBe('egg')
    expect(STAGE_CONFIG[1].mark).toBeNull()
    expect(STAGE_CONFIG[1].ringCount).toBe(0)
    expect(STAGE_CONFIG[6].mark).toBe('crown')
    expect(STAGE_CONFIG[6].orbitCount).toBeGreaterThan(0)
  })

  it('reserves the egg silhouette for the very first stage', () => {
    const eggStages = STAGES.filter((stage) => STAGE_CONFIG[stage].form === 'egg')
    expect(eggStages).toEqual([1])
  })
})

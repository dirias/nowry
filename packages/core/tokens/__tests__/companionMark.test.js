import { COMPANION_MOODS, companionMark } from '../companionMark'
import { STAGES, STAGE_CONFIG } from '../../domain/petStages'
import { DEFAULT_SPECIES, SPECIES_MOTION, companionSpecies } from '../../domain/petMotion'

const numbers = (d) => d.match(/-?\d+(\.\d+)?/g).map(Number)
const MOODS = Object.keys(COMPANION_MOODS)

describe('companionMark (BRAND-007)', () => {
  it.each(STAGES)('draws stage %i as a closed body inside the box, with no NaN', (stage) => {
    const mark = companionMark({ stage })
    expect(mark.viewBox).toBe('0 0 100 100')
    expect(mark.body.startsWith('M')).toBe(true)
    expect(mark.body.endsWith('Z')).toBe(true)
    for (const value of numbers(mark.body)) {
      expect(Number.isFinite(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(-0.5)
      expect(value).toBeLessThanOrEqual(100.5)
    }
  })

  // The canvas's rule, and the stage table's: stages are told apart by
  // structure. Here the structure is the coil itself — every rung adds a turn.
  it('adds to the coil at every stage', () => {
    for (let i = 1; i < STAGES.length; i++) {
      expect(STAGE_CONFIG[STAGES[i]].turns).toBeGreaterThan(STAGE_CONFIG[STAGES[i - 1]].turns)
    }
    expect(companionMark({ stage: 6 }).turns).toBe(2.5)
  })

  it('keeps the first stage inside an egg, and only the first', () => {
    const first = companionMark({ stage: 1 })
    expect(first.egg).toMatch(/^M.*Z$/)
    // The curl sits well inside the shell rather than filling the box.
    expect(Math.hypot(first.head.cx - 50, first.head.cy - 50)).toBeLessThan(30)
    for (const stage of STAGES.slice(1)) {
      expect(companionMark({ stage }).egg).toBeNull()
    }
  })

  it('keeps the face inside the head at every stage and mood', () => {
    for (const stage of STAGES) {
      for (const mood of MOODS) {
        const { head, eye, mouth } = companionMark({ stage, mood })
        expect(Math.hypot(eye.cx - head.cx, eye.cy - head.cy) + eye.r).toBeLessThan(head.r)
        if (mouth) expect(Math.hypot(mouth.cx - head.cx, mouth.cy - head.cy) + mouth.r).toBeLessThanOrEqual(head.r)
      }
    }
  })

  // Mood is where the head points and how the eye is drawn — the two things
  // the canvas said would carry it, since a coil has no limbs to gesture with.
  it('reads each mood from the head and the eye', () => {
    const idle = companionMark({ stage: 3, mood: 'idle' })
    const happy = companionMark({ stage: 3, mood: 'happy' })
    const tired = companionMark({ stage: 3, mood: 'tired' })
    const thinking = companionMark({ stage: 3, mood: 'thinking' })
    const speaking = companionMark({ stage: 3, mood: 'speaking' })

    expect(happy.eye.kind).toBe('arc')
    expect(tired.eye.kind).toBe('line')
    expect(idle.eye.kind).toBe('round')
    expect(happy.eye.d).toMatch(/^M.*Q/)
    expect(tired.eye.d).toMatch(/^M.*L/)
    // A tired head is lowered, a happy one lifted.
    expect(COMPANION_MOODS.tired.headDeg).toBeGreaterThan(COMPANION_MOODS.idle.headDeg)
    expect(COMPANION_MOODS.happy.headDeg).toBeLessThan(COMPANION_MOODS.idle.headDeg)
    // Thinking glances up — the eye sits higher in the head than idle's does,
    // measured from the head's own centre since the two heads point differently.
    const lift = (m) => (m.eye.cy - m.head.cy) / m.head.r
    expect(lift(thinking)).toBeLessThan(lift(idle))
    // Speaking opens a mouth; nobody else does.
    expect(speaking.mouth).not.toBeNull()
    expect(idle.mouth).toBeNull()
  })

  it('never draws a mouth open wider than the eye, so nothing reads as fangs', () => {
    const { eye, mouth } = companionMark({ stage: 6, mood: 'speaking' })
    expect(mouth.r).toBeLessThan(eye.r)
  })

  it('treats an unknown mood as idle and an unknown stage as the first', () => {
    expect(companionMark({ stage: 9, mood: 'ecstatic' })).toEqual(companionMark({ stage: 1, mood: 'idle' }))
  })
})

describe('the default companion moves as the Spiral', () => {
  it('breathes rather than flaps', () => {
    expect(DEFAULT_SPECIES).toBe('spiral')
    expect(companionSpecies({ species: null, isDefaultCompanion: true })).toBe('spiral')
    expect(SPECIES_MOTION.spiral.animate.scale).toBeDefined()
    expect(SPECIES_MOTION.spiral.animate.scaleX).toBeUndefined()
  })

  it('still moves as the species an account chose', () => {
    expect(companionSpecies({ species: 'fox', isDefaultCompanion: true })).toBe('fox')
    expect(companionSpecies({ species: null, isDefaultCompanion: false })).toBeNull()
  })
})

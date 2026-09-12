import { CARD_EVALUATIONS, evaluationOf, sessionCardLine } from '../sessionLog'

describe('evaluationOf', () => {
  it('names the three, and treats anything else as incorrect', () => {
    expect(evaluationOf({ evaluation: 'correct' })).toBe(CARD_EVALUATIONS.correct)
    expect(evaluationOf({ evaluation: 'partial' })).toBe(CARD_EVALUATIONS.partial)
    expect(evaluationOf({ evaluation: 'incorrect' })).toBe(CARD_EVALUATIONS.incorrect)
    expect(evaluationOf({})).toBe(CARD_EVALUATIONS.incorrect)
    expect(evaluationOf(undefined)).toBe(CARD_EVALUATIONS.incorrect)
  })

  it('gives each one a semantic colour and an icon KEY, never a component (ADR-031)', () => {
    Object.values(CARD_EVALUATIONS).forEach((entry) => {
      expect(typeof entry.iconKey).toBe('string')
      expect(entry.color).toMatch(/^(success|warning|danger)\.plainColor$/)
    })
  })
})

describe('sessionCardLine', () => {
  it('reads a quiz card as its question, and its answer only when it was missed', () => {
    expect(sessionCardLine({ question_text: 'Capital of France?', correct_answer: 'Paris', evaluation: 'incorrect' })).toMatchObject({
      question: 'Capital of France?',
      answer: 'Paris',
      title: null,
      ref: null
    })
    expect(sessionCardLine({ question_text: 'Capital of France?', correct_answer: 'Paris', evaluation: 'correct' }).answer).toBeNull()
  })

  it('reads a review card as its title and its grade', () => {
    expect(sessionCardLine({ card_title: '日本', grade: 'good', evaluation: 'correct' })).toMatchObject({
      question: null,
      title: '日本',
      grade: 'good',
      ref: null
    })
  })

  it('prefers the question to the title, and drops the grade with it', () => {
    // The web shows the title only when there is no question text; the grade
    // belongs to the title's row, so it goes when the title does.
    expect(sessionCardLine({ question_text: 'Q', card_title: 'T', grade: 'hard' })).toMatchObject({
      question: 'Q',
      title: null,
      grade: null
    })
  })

  it('falls back to the last six characters of the id, and to nothing at all', () => {
    expect(sessionCardLine({ card_id: 'abcdef0123456789' }).ref).toBe('456789')
    expect(sessionCardLine({})).toMatchObject({ question: null, answer: null, title: null, grade: null, ref: null })
    expect(sessionCardLine(undefined).ref).toBeNull()
  })
})

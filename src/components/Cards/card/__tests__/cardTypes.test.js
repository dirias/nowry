/**
 * FE-C2/C3/C4 — the variant table (CARDS.md §5, §7.1, §7.3, §8).
 *
 * The wire format is the part of this phase that must not move: `CARDS.md` §8
 * rules that no endpoint, no schema and no stored document changes, so the
 * payloads are pinned here field by field. The one deliberate change is
 * `deck_id`, which travelled as `undefined` and therefore never travelled at
 * all.
 */
const { CARD_TYPE_SPECS, cardToFormState, contentPredicatesFor, emptyCardValues, specFor } = require('../cardTypes')

const values = (overrides = {}) => ({ ...emptyCardValues(), ...overrides })

describe('emptyCardValues', () => {
  it('opens the quiz editor on two rows, not four', () => {
    expect(emptyCardValues().options).toEqual(['', ''])
  })

  it('designates no correct answer until the user does', () => {
    expect(emptyCardValues().correctIndex).toBeNull()
  })

  it('accepts a deck the caller pre-supplied', () => {
    expect(emptyCardValues('deck-1').deckId).toBe('deck-1')
  })
})

describe('cardToFormState', () => {
  it('reads deck_id whether the API sent an object or a string', () => {
    expect(cardToFormState({ deck_id: { _id: 'd1' } }).deckId).toBe('d1')
    expect(cardToFormState({ deck_id: 'd2' }).deckId).toBe('d2')
    expect(cardToFormState({}).deckId).toBe('')
  })

  it('resolves the stored correct answer to the index of the option holding it', () => {
    const state = cardToFormState({ options: ['Paris', 'Lyon', 'Nice'], correct_answer: 'Lyon' })
    expect(state.correctIndex).toBe(1)
  })

  it('designates nothing when the stored answer matches no option', () => {
    expect(cardToFormState({ options: ['Paris'], correct_answer: 'Berlin' }).correctIndex).toBeNull()
  })

  it('pads a stored card that has fewer than two options up to the editor floor', () => {
    expect(cardToFormState({ options: ['Paris'] }).options).toEqual(['Paris', ''])
    expect(cardToFormState({}).options).toEqual(['', ''])
  })

  it('keeps every option a card already has, beyond the floor', () => {
    expect(cardToFormState({ options: ['a', 'b', 'c', 'd'] }).options).toEqual(['a', 'b', 'c', 'd'])
  })

  it('normalises tags to an array whichever way they were stored', () => {
    expect(cardToFormState({ tags: ['x', 'y'] }).tags).toEqual(['x', 'y'])
    expect(cardToFormState({ tags: 'x, y' }).tags).toEqual(['x', 'y'])
    expect(cardToFormState({}).tags).toEqual([])
  })
})

describe('buildPayload', () => {
  it('sends a flashcard exactly as the API already expects it', () => {
    const payload = CARD_TYPE_SPECS.flashcard.buildPayload(
      values({ title: ' Capital of France ', content: ' Paris ', tags: ['geo'], deckId: 'd1' })
    )
    expect(payload).toEqual({
      title: 'Capital of France',
      content: 'Paris',
      tags: ['geo'],
      deck_id: 'd1',
      card_type: 'flashcard'
    })
  })

  it('sends correct_answer as the option string, never the index', () => {
    const payload = CARD_TYPE_SPECS.quiz.buildPayload(values({ title: 'Q', options: ['Paris', 'Lyon'], correctIndex: 1 }))
    expect(payload.correct_answer).toBe('Lyon')
    expect(payload.options).toEqual(['Paris', 'Lyon'])
  })

  it('drops the empty option rows the editor keeps for typing into', () => {
    const payload = CARD_TYPE_SPECS.quiz.buildPayload(values({ title: 'Q', options: ['Paris', 'Lyon', '', '  '], correctIndex: 0 }))
    expect(payload.options).toEqual(['Paris', 'Lyon'])
  })

  it('sends the quiz `content` the server model requires and QuizCardModal omitted', () => {
    const payload = CARD_TYPE_SPECS.quiz.buildPayload(values({ title: 'Q', options: ['a', 'b'], correctIndex: 0, explanation: 'Because' }))
    expect(payload.content).toBe('Because')
    expect(payload.explanation).toBe('Because')
  })

  it('still sends a string content when there is no explanation, rather than omitting the field', () => {
    expect(CARD_TYPE_SPECS.quiz.buildPayload(values({ title: 'Q', options: ['a', 'b'], correctIndex: 0 })).content).toBe('')
  })

  it('sends a visual card with its diagram source and description', () => {
    const payload = CARD_TYPE_SPECS.visual.buildPayload(values({ title: 'Flow', diagramCode: 'graph TD', content: 'About it' }))
    expect(payload).toEqual({
      title: 'Flow',
      diagram_code: 'graph TD',
      content: 'About it',
      tags: [],
      deck_id: null,
      card_type: 'visual'
    })
  })

  it('sends deck_id as null rather than undefined, so clearing a deck reaches the server', () => {
    // JSON.stringify drops an undefined value, so the PATCH body lost the key
    // and the server's `if "deck_id" in updates` branch never ran.
    Object.values(CARD_TYPE_SPECS).forEach((spec) => {
      const payload = spec.buildPayload(values({ title: 'T', options: ['a', 'b'], correctIndex: 0 }))
      expect(Object.keys(payload)).toContain('deck_id')
      expect(payload.deck_id).toBeNull()
    })
  })
})

describe('quiz validation — three failures, three fields', () => {
  const validate = CARD_TYPE_SPECS.quiz.validate

  it('asks for a second option when only one is filled', () => {
    expect(validate(values({ options: ['Paris', ''], correctIndex: 0 }))).toEqual({
      field: 'options',
      errorKey: 'cards.quiz.needTwoOptions'
    })
  })

  it('asks which option is correct when none is designated', () => {
    expect(validate(values({ options: ['Paris', 'Lyon'], correctIndex: null }))).toEqual({
      field: 'correctIndex',
      errorKey: 'cards.quiz.needCorrectAnswer'
    })
  })

  it('asks again when the designated option has been emptied', () => {
    expect(validate(values({ options: ['Paris', 'Lyon', ''], correctIndex: 2 }))).toEqual({
      field: 'correctIndex',
      errorKey: 'cards.quiz.needCorrectAnswer'
    })
  })

  it('passes once two options are filled and one of them is designated', () => {
    expect(validate(values({ options: ['Paris', 'Lyon'], correctIndex: 1 }))).toBeNull()
  })

  it('keeps the designation when the designated option is retyped — the binding bug', () => {
    // QuizCardModal bound `<Radio value={option}>` to the option's text, so
    // editing a chosen option silently unset correctness. An index does not
    // move when the text under it changes.
    const before = values({ options: ['Paris', 'Lyon'], correctIndex: 1 })
    const after = { ...before, options: ['Paris', 'Lyons'] }
    expect(validate(after)).toBeNull()
    expect(CARD_TYPE_SPECS.quiz.buildPayload({ ...after, title: 'Q' }).correct_answer).toBe('Lyons')
  })
})

describe('the variant table', () => {
  it('gives each variant the rail its contract specifies', () => {
    expect(CARD_TYPE_SPECS.flashcard.groups).toEqual(['tags', 'deck'])
    expect(CARD_TYPE_SPECS.quiz.groups).toEqual(['explanation', 'tags', 'deck'])
    expect(CARD_TYPE_SPECS.visual.groups).toEqual(['description', 'tags', 'deck'])
  })

  it('widens only the variant with two panes to justify it', () => {
    expect(CARD_TYPE_SPECS.flashcard.width).toBe('standard')
    expect(CARD_TYPE_SPECS.quiz.width).toBe('standard')
    expect(CARD_TYPE_SPECS.visual.width).toBe('wide')
  })

  it('keeps the deck and the tags out of every continue-reset, so the loop stays in one deck', () => {
    Object.values(CARD_TYPE_SPECS).forEach((spec) => {
      expect(spec.continueResets).not.toContain('deckId')
      expect(spec.continueResets).not.toContain('tags')
      expect(spec.continueResets).toContain('title')
    })
  })

  it('names a distinct message per required field, never one generic complaint', () => {
    const keys = Object.values(CARD_TYPE_SPECS).flatMap((spec) => spec.requiredFields.map((rule) => rule.errorKey))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('falls back to the flashcard for an unknown type rather than rendering nothing', () => {
    expect(specFor('nonsense')).toBe(CARD_TYPE_SPECS.flashcard)
    expect(specFor('visual')).toBe(CARD_TYPE_SPECS.visual)
  })
})

describe('contentPredicatesFor', () => {
  it('opens a group whose content the card already holds — edit never hides writing', () => {
    const quiz = contentPredicatesFor('quiz')
    expect(quiz.explanation({ explanation: 'Because' })).toBe(true)
    expect(quiz.explanation({ explanation: '   ' })).toBe(false)
    expect(quiz.tags({ tags: ['a'] })).toBe(true)
    expect(quiz.deck({ deck_id: { _id: 'd1' } })).toBe(true)
  })

  it('covers exactly the groups the variant declares, and no others', () => {
    expect(Object.keys(contentPredicatesFor('visual'))).toEqual(['description', 'tags', 'deck'])
    expect(Object.keys(contentPredicatesFor('flashcard'))).toEqual(['tags', 'deck'])
  })
})

import { readyMessage, readyQuestions, subjectField } from '../readyQuestions'

const card = (over = {}) => ({ page: 'study_session', front: '効果', isFlipped: false, language: 'ja', ...over })
const ids = (subject, state) => readyQuestions(subject, state).map((q) => q.id)

describe('readyQuestions (CHAT-005)', () => {
  it('offers three questions on the front of a language card, none that needs the back', () => {
    expect(ids(card())).toEqual(['hint', 'inSentence', 'breakDown'])
  })

  it('offers the kanji breakdown only when there are kanji', () => {
    expect(ids(card({ front: 'casa', language: 'es' }))).toEqual(['hint', 'inSentence'])
  })

  it('offers examples, a hook and similar words once the answer shows', () => {
    expect(ids(card({ isFlipped: true }))).toEqual(['examples', 'hook', 'similar'])
  })

  it('asks about the miss after Again', () => {
    expect(ids(card({ isFlipped: true, lastGrade: 'again' }))).toEqual(['whyMissing', 'hook', 'similar'])
  })

  it('offers two follow-ups that have not been sent yet', () => {
    expect(ids(card({ isFlipped: true }), { used: ['examples'] })).toEqual(['hook', 'similar'])
    expect(ids(card({ isFlipped: true }), { used: ['examples', 'hook'] })).toEqual(['similar', 'check'])
  })

  it('never offers a back-side move on the front, in any field', () => {
    for (const field of ['language', 'math', 'science', 'certification', 'concept', 'general']) {
      const front = ids(card({ field }))
      expect(front).not.toEqual(expect.arrayContaining(['examples', 'whyCorrect', 'whyNot', 'stepByStep', 'check']))
    }
  })

  it('reads a multiple-choice card as an exam question', () => {
    expect(subjectField({ cardType: 'quiz' })).toBe('certification')
    expect(ids(card({ language: null, cardType: 'quiz', isFlipped: true }))).toEqual(['whyCorrect', 'whyNot', 'examTrap'])
  })

  it('lets the deck field win over the card', () => {
    expect(subjectField({ field: 'math', language: 'ja' })).toBe('math')
    expect(ids(card({ field: 'math', front: 'd/dx x² sin x' }))).toEqual(['whichRule', 'solvedSimilar', 'whereSlip'])
  })

  it('marks the moves that open the composer', () => {
    const check = readyQuestions(card({ isFlipped: true }), { used: ['examples', 'hook'] }).find((q) => q.id === 'check')
    expect(check.compose).toBe(true)
  })

  it('offers nothing in General without Knowledge Access', () => {
    // Other screens have their own questions since CHAT-010 (below).
    expect(readyQuestions(null)).toEqual([])
  })

  it('names the subject in what it sends', () => {
    const t = (key, params) => (key === 'agent.ready.send' ? `${params.question} — ${params.subject}` : 'Give me examples')
    expect(readyMessage(t, { labelKey: 'agent.ready.examples' }, card())).toBe('Give me examples — 効果')
  })
})

describe('subjects beyond the card (CHAT-010)', () => {
  it('offers each screen its own questions', () => {
    expect(ids({ page: 'deck', deckId: 'd1', deckName: 'JPN N3' })).toEqual(['studyFirst', 'summariseDeck'])
    expect(ids({ page: 'book', bookId: 'b1' })).toEqual(['summariseSection', 'explainPassage', 'makeCards'])
    expect(ids({ page: 'today' })).toEqual(['whatNow', 'planToday'])
    expect(ids({ page: 'plans' })).toEqual(['breakGoal'])
  })

  it('offers data-reading questions only with Knowledge Access', () => {
    expect(ids({ page: 'deck', deckId: 'd1' }, { knowledge: true })).toEqual(['studyFirst', 'missing', 'summariseDeck'])
    expect(ids({ page: 'plans' }, { knowledge: true })).toEqual(['onTrack', 'breakGoal'])
    expect(ids(null)).toEqual([])
    expect(ids(null, { knowledge: true })).toEqual(['whatStudy'])
  })

  it('has nothing to explain on a board with no note selected', () => {
    expect(ids({ page: 'board', boardId: 'b1' })).toEqual([])
    expect(ids({ page: 'board', boardId: 'b1', noteText: 'ATP' })).toEqual(['explainNote', 'turnIntoCards'])
  })

  it('names every kind of subject in what it sends', () => {
    const t = (key, params) => (key === 'agent.ready.send' ? `${params.question} — ${params.subject}` : 'Summarise this deck')
    expect(readyMessage(t, { labelKey: 'agent.ready.summariseDeck' }, { page: 'deck', deckName: 'JPN N3' })).toBe(
      'Summarise this deck — JPN N3'
    )
    expect(readyMessage(t, { labelKey: 'x' }, null)).toBe('Summarise this deck')
  })
})

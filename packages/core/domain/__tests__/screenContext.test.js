import { studyCardContext } from '../screenContext'

const card = {
  _id: 'c1',
  title: 'ずいぶん',
  content: 'Bastante / Mucho',
  card_type: 'basic',
  deck_id: { _id: 'd1', name: 'JPN' }
}

describe('studyCardContext', () => {
  it('emits the camelCase wire shape the server aliases', () => {
    expect(studyCardContext(card, { deckId: 'd1', index: 3, total: 25 })).toEqual({
      page: 'study_session',
      deckId: 'd1',
      deckName: 'JPN',
      cardIndex: 4,
      totalCards: 25,
      cardType: 'basic',
      isFlipped: false,
      front: 'ずいぶん',
      back: null,
      isDailyReview: false,
      mode: 'study'
    })
  })

  it('counts the card the way a person does, not the way a list does', () => {
    expect(studyCardContext(card, { index: 0, total: 25 }).cardIndex).toBe(1)
  })

  it('withholds the answer while the question is showing', () => {
    expect(studyCardContext(card, { flipped: false }).back).toBeNull()
    expect(studyCardContext(card, { flipped: true }).back).toBe('Bastante / Mucho')
  })

  it('names the daily review rather than a deck called daily-review', () => {
    const context = studyCardContext(card, { deckId: 'daily-review', index: 0, total: 9 })
    expect(context.isDailyReview).toBe(true)
    // The deck is the CARD's, because a daily review spans several.
    expect(context.deckId).toBe('d1')
    expect(context.deckName).toBe('JPN')
  })

  it('reads a deck id the card carries flat, not only the populated one', () => {
    expect(studyCardContext({ title: 'a', deck_id: 'd9' }, { deckId: 'daily-review' }).deckId).toBe('d9')
  })

  it('has no name for a deck the card never carried', () => {
    expect(studyCardContext({ title: 'a' }, { deckId: 'd1' }).deckName).toBeNull()
  })

  it('reads the three spellings a card front has worn', () => {
    expect(studyCardContext({ question: 'q' }).front).toBe('q')
    expect(studyCardContext({ front: 'f' }).front).toBe('f')
  })

  it('is nothing at all without a card', () => {
    expect(studyCardContext(null, { index: 1 })).toBeNull()
  })
})

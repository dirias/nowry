/** STUDY-014 — one reader titles a finished session on both clients (ADR-058 §1). */
import { sessionLine, sessionTitle } from '../sessionLog'

const t = (key, opts) => (opts ? `${key}:${JSON.stringify(opts)}` : key)

describe('sessionLine', () => {
  it('carries the deck count only for a session across decks', () => {
    expect(sessionLine({ deck_id: null, deck_count: 3 }).deckCount).toBe(3)
    expect(sessionLine({ deck_id: 'd1', deck_name: 'Vocabulary', deck_count: 1 }).deckCount).toBeNull()
    expect(sessionLine({}).deckCount).toBeNull()
  })
})

describe('sessionTitle', () => {
  it('is the deck name when the server named the record', () => {
    expect(sessionTitle(t, sessionLine({ deck_id: 'd1', deck_name: 'Vocabulary' }))).toBe('Vocabulary')
  })

  it('is the topic for an AI quiz', () => {
    expect(sessionTitle(t, sessionLine({ session_type: 'ai_quiz', topic: 'Photosynthesis' }))).toBe('Photosynthesis')
  })

  it('is the translated cross-deck line, pluralised by deck count, for a daily review', () => {
    expect(sessionTitle(t, sessionLine({ deck_id: null, deck_count: 3 }))).toBe('sessions.dailyReview:{"count":3}')
    expect(sessionTitle(t, sessionLine({ deck_id: null, deck_count: 1 }))).toBe('sessions.dailyReview:{"count":1}')
  })

  it('falls back to Unknown topic when nothing names it — an old record, or a review whose cards are gone', () => {
    expect(sessionTitle(t, sessionLine({ deck_id: null, deck_name: null }))).toBe('sessions.unknownTopic')
    expect(sessionTitle(t, sessionLine({ deck_id: null, deck_count: 0 }))).toBe('sessions.unknownTopic')
    expect(sessionTitle(t, null)).toBe('sessions.unknownTopic')
  })
})

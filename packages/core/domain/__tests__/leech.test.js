import { LEECH_THRESHOLD, STRUGGLING_WINDOW_DAYS, lapsesOf, isLeech, leechOffer, leechRestUntil, splitDraft } from '../leech'

const NOW = new Date('2026-10-10T12:00:00Z')
const daysAgo = (days) => new Date(NOW.getTime() - days * 86400000).toISOString()

describe('leech (SR-004)', () => {
  describe('lapsesOf', () => {
    it('counts only the lapses inside the Struggling window', () => {
      const card = { lapses: [daysAgo(1), daysAgo(13), daysAgo(STRUGGLING_WINDOW_DAYS + 1), daysAgo(40)] }
      expect(lapsesOf(card, NOW)).toBe(2)
    })

    it('ignores a missing list, a malformed date and a date in the future', () => {
      expect(lapsesOf(null, NOW)).toBe(0)
      expect(lapsesOf({}, NOW)).toBe(0)
      expect(lapsesOf({ lapses: ['nonsense', daysAgo(-2)] }, NOW)).toBe(0)
    })
  })

  describe('isLeech', () => {
    it('is the fourth Again, the session’s own counted in', () => {
      const three = { lapses: [daysAgo(1), daysAgo(2), daysAgo(3)] }
      expect(isLeech(three, { now: NOW })).toBe(false)
      expect(isLeech(three, { sessionAgains: 1, now: NOW })).toBe(true)
      expect(LEECH_THRESHOLD).toBe(4)
    })
  })

  describe('leechOffer', () => {
    const stuck = { _id: 'c1', title: 'ありがとう', lapses: [daysAgo(1), daysAgo(2), daysAgo(3)] }

    it('offers on an Again that makes the fourth', () => {
      expect(leechOffer(stuck, { grade: 'again', now: NOW })).toEqual({ cardId: 'c1', title: 'ありがとう', lapses: 4 })
    })

    it('offers nothing on any other grade, or before the fourth', () => {
      expect(leechOffer(stuck, { grade: 'hard', now: NOW })).toBeNull()
      expect(leechOffer({ ...stuck, lapses: stuck.lapses.slice(1) }, { grade: 'again', now: NOW })).toBeNull()
      expect(leechOffer(null, { grade: 'again', now: NOW })).toBeNull()
    })

    it('offers once per card per session', () => {
      const offered = new Set(['c1'])
      expect(leechOffer(stuck, { grade: 'again', offered, now: NOW })).toBeNull()
    })

    it('reads the web’s front field when there is no title', () => {
      const card = { id: 'c2', front: 'Q', lapses: [daysAgo(1), daysAgo(2), daysAgo(3)] }
      expect(leechOffer(card, { grade: 'again', now: NOW })?.title).toBe('Q')
    })
  })

  it('rests a week from now', () => {
    expect(leechRestUntil(NOW).toISOString()).toBe('2026-10-17T12:00:00.000Z')
  })

  describe('splitDraft', () => {
    it('copies the card without its identity or schedule', () => {
      const card = {
        _id: 'c1',
        deck_id: 'd1',
        title: 'T',
        content: 'C',
        tags: ['a'],
        card_type: 'flashcard',
        ease_factor: 1.3,
        lapses: [daysAgo(1)],
        rest_until: null
      }
      const draft = splitDraft(card)
      expect(draft).toEqual({
        deck_id: 'd1',
        card_type: 'flashcard',
        title: 'T',
        content: 'C',
        explanation: '',
        options: [],
        correct_answer: null,
        tags: ['a']
      })
      expect(draft).not.toHaveProperty('_id')
      expect(draft.tags).not.toBe(card.tags)
    })

    it('keeps a quiz a quiz and folds anything else to a flashcard', () => {
      expect(splitDraft({ card_type: 'quiz', options: ['a', 'b'], correct_answer: 'a' }).card_type).toBe('quiz')
      expect(splitDraft({ card_type: 'visual' }).card_type).toBe('flashcard')
      expect(splitDraft(null)).toBeNull()
    })
  })
})

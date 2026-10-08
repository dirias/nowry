/**
 * The session's tag filter keeps its footing when the queue narrows (MOB-107).
 *
 * The hook itself is two memos over the shared utilities; what is tested here
 * is the two placements the session relies on, which are the part that can be
 * wrong without anything failing.
 */
const fs = require('fs')
const path = require('path')

const { cardKey, positionAfter, fullQueueIndex } = require('../useSessionTagFilter')

const queue = [{ _id: 'a', tags: ['verbs'] }, { _id: 'b', tags: ['nouns'] }, { id: 'c', tags: ['verbs', 'nouns'] }, { _id: 'd' }]

describe('a card has one key under two spellings', () => {
  it('reads _id first, then id, then nothing', () => {
    expect(cardKey(queue[0])).toBe('a')
    expect(cardKey(queue[2])).toBe('c')
    expect(cardKey({})).toBeNull()
    expect(cardKey(null)).toBeNull()
  })
})

describe('where the card in hand lands after narrowing', () => {
  it('follows the card when it survived', () => {
    const visible = [queue[0], queue[2]]
    expect(positionAfter(visible, 'c')).toBe(1)
  })

  it('goes to the top when it was filtered out', () => {
    const visible = [queue[1]]
    expect(positionAfter(visible, 'a')).toBe(0)
  })

  it('is the top with nothing in hand or nothing visible', () => {
    expect(positionAfter([], 'a')).toBe(0)
    expect(positionAfter(queue, null)).toBe(0)
    expect(positionAfter(null, 'a')).toBe(0)
  })
})

describe('what the resume record stores', () => {
  it('is the full-queue position of the visible card', () => {
    const visible = [queue[0], queue[2]]
    expect(fullQueueIndex(queue, visible, 1)).toBe(2)
  })

  it('is the visible index itself when nothing is narrowed', () => {
    expect(fullQueueIndex(queue, queue, 3)).toBe(3)
  })

  it('is past the end when the session is past its last card', () => {
    expect(fullQueueIndex(queue, [queue[0]], 1)).toBe(queue.length)
  })

  it('leaves the index alone while the queue is still loading', () => {
    expect(fullQueueIndex(null, null, 2)).toBe(2)
  })
})

describe('the mark stays out of the study queue (ADR-010)', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../useSessionTagFilter.js'), 'utf8')

  it('imports the tag utilities only', () => {
    expect(source).toMatch(/import \{ countTags, filterCardsByTags \} from '@nowry\/core\/utils\/tagFilter'/)
    expect(source).not.toMatch(/filterCardsByMark|countMarked/)
  })
})

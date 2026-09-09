/**
 * The outbox's two invariants: order, and losing nothing.
 *
 * A grade that reaches the server out of order schedules the card from the
 * wrong answer, and a grade dropped on a failed drain is a grade the user gave
 * and the app forgot. Both are silent, so both are tested.
 */
// Jest hoists `jest.mock` above every const, so the factory may only reach a
// name it can see there — one prefixed with `mock`.
const mockStore = new Map()

jest.mock('@nowry/core', () => ({
  storage: {
    get: (key) => (mockStore.has(key) ? mockStore.get(key) : null),
    set: (key, value) => mockStore.set(key, String(value)),
    remove: (key) => mockStore.delete(key)
  }
}))

const { clearQueue, drain, enqueue, size } = require('../syncQueue')

beforeEach(() => {
  mockStore.clear()
})

it('sends in the order the grades were given', async () => {
  const seen = []
  enqueue('review', { cardId: 'a', grade: 'again' })
  enqueue('review', { cardId: 'a', grade: 'good' })
  enqueue('review', { cardId: 'b', grade: 'easy' })

  const result = await drain({ review: async (args) => seen.push(`${args.cardId}:${args.grade}`) })

  expect(seen).toEqual(['a:again', 'a:good', 'b:easy'])
  expect(result).toEqual({ sent: 3, remaining: 0 })
  expect(size()).toBe(0)
})

it('stops at the first failure and keeps it and everything after it', async () => {
  enqueue('review', { cardId: 'a' })
  enqueue('review', { cardId: 'b' })
  enqueue('review', { cardId: 'c' })

  const result = await drain({
    review: async ({ cardId }) => {
      if (cardId === 'b') throw new Error('offline')
    }
  })

  expect(result).toEqual({ sent: 1, remaining: 2 })
  // Skipping 'b' to deliver 'c' would put the two grades out of order.
  const rest = []
  await drain({ review: async ({ cardId }) => rest.push(cardId) })
  expect(rest).toEqual(['b', 'c'])
})

it('survives the app dying: the queue is read back from storage, not memory', async () => {
  enqueue('review', { cardId: 'a' })

  jest.resetModules()
  const reloaded = require('../syncQueue')

  expect(reloaded.size()).toBe(1)
})

it('drops an entry no sender claims rather than blocking every grade behind it', async () => {
  enqueue('mystery', {})
  enqueue('review', { cardId: 'a' })
  const seen = []

  const result = await drain({ review: async ({ cardId }) => seen.push(cardId) })

  expect(seen).toEqual(['a'])
  expect(result.remaining).toBe(0)
})

it('reads a corrupted queue as an empty one rather than throwing into a session', async () => {
  mockStore.set('NOWRY_SYNC_QUEUE', '{ not json')
  expect(size()).toBe(0)
  await expect(drain({})).resolves.toEqual({ sent: 0, remaining: 0 })
})

it('clearing leaves nothing behind for the next account', () => {
  enqueue('review', { cardId: 'a' })
  clearQueue()
  expect(size()).toBe(0)
})

/**
 * cardsService — MGMT-002 (PRD FR-009 … FR-011, ADR-023). Pins the query
 * strings and the request bodies the library management verbs send.
 */
const mockGet = jest.fn()
const mockPost = jest.fn()
jest.mock('../client', () => ({
  apiClient: { get: (...args) => mockGet(...args), post: (...args) => mockPost(...args) }
}))

const { cardsService } = require('./cards.service')

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({ data: { cards: [], total: 0, has_more: false } })
  mockPost.mockReset().mockResolvedValue({ data: { updated: 0 } })
})

describe('getAll', () => {
  it('sends untagged=true only when asked, beside the other filters', async () => {
    await cardsService.getAll(0, 50, ['verbs'], '', false, null, true)
    const url = new URL(mockGet.mock.calls[0][0], 'http://x')
    expect(url.searchParams.get('untagged')).toBe('true')
    expect(url.searchParams.getAll('tags')).toEqual(['verbs'])

    await cardsService.getAll(0, 50, [], '', false, null, false)
    expect(mockGet.mock.calls[1][0]).not.toMatch(/untagged/)

    await cardsService.getAll(0, 50)
    expect(mockGet.mock.calls[2][0]).not.toMatch(/untagged/)
  })
})

describe('bulk', () => {
  it('posts ids and the action, and only the fields the action uses', async () => {
    await cardsService.bulk({ ids: ['c1', 'c2'], action: 'move', deckId: 'd2' })
    expect(mockPost).toHaveBeenCalledWith('/study-cards/bulk', { ids: ['c1', 'c2'], action: 'move', deck_id: 'd2' })

    await cardsService.bulk({ ids: ['c1'], action: 'tag', tags: ['verbs'] })
    expect(mockPost).toHaveBeenLastCalledWith('/study-cards/bulk', { ids: ['c1'], action: 'tag', tags: ['verbs'] })

    await cardsService.bulk({ ids: ['c1'], action: 'delete' })
    expect(mockPost).toHaveBeenLastCalledWith('/study-cards/bulk', { ids: ['c1'], action: 'delete' })
  })

  it('returns the server count', async () => {
    mockPost.mockResolvedValue({ data: { updated: 2 } })
    await expect(cardsService.bulk({ ids: ['c1', 'c2'], action: 'mark' })).resolves.toEqual({ updated: 2 })
  })
})

describe('the tag verbs', () => {
  it('renames through one endpoint — a merge is a rename onto an existing tag', async () => {
    mockPost.mockResolvedValue({ data: { cards: 12 } })
    await expect(cardsService.renameTag('verbs', 'verb')).resolves.toEqual({ cards: 12 })
    expect(mockPost).toHaveBeenCalledWith('/study-cards/tags/rename', { from: 'verbs', to: 'verb' })
  })

  it('removes a tag from every card', async () => {
    mockPost.mockResolvedValue({ data: { cards: 3 } })
    await expect(cardsService.removeTag('old')).resolves.toEqual({ cards: 3 })
    expect(mockPost).toHaveBeenCalledWith('/study-cards/tags/remove', { tag: 'old' })
  })
})

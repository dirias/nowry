/**
 * decksService — MGMT-002 (PRD FR-012, ADR-023 point 4). The archived list is
 * its own query; archive and restore are one POST each.
 */
const mockGet = jest.fn()
const mockPost = jest.fn()
jest.mock('../client', () => ({
  apiClient: { get: (...args) => mockGet(...args), post: (...args) => mockPost(...args) }
}))

const { decksService } = require('./decks.service')

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({ data: [] })
  mockPost.mockReset().mockResolvedValue({ data: { _id: 'd1' } })
})

describe('getAll', () => {
  it('asks for the plain list by default and the archived list only when told', async () => {
    await decksService.getAll()
    expect(mockGet).toHaveBeenLastCalledWith('/decks')

    await decksService.getAll('quiz')
    expect(mockGet).toHaveBeenLastCalledWith('/decks?type=quiz')

    await decksService.getAll(undefined, { archived: true })
    expect(mockGet).toHaveBeenLastCalledWith('/decks?archived=true')

    await decksService.getAll('flashcard', { archived: true })
    expect(mockGet).toHaveBeenLastCalledWith('/decks?type=flashcard&archived=true')
  })
})

describe('archive and restore', () => {
  it('posts to the deck’s archive and restore routes and returns the deck', async () => {
    mockPost.mockResolvedValue({ data: { _id: 'd1', archived_at: '2026-09-06T00:00:00Z' } })
    await expect(decksService.archive('d1')).resolves.toEqual(expect.objectContaining({ _id: 'd1' }))
    expect(mockPost).toHaveBeenCalledWith('/decks/d1/archive')

    await decksService.restore('d1')
    expect(mockPost).toHaveBeenLastCalledWith('/decks/d1/restore')
  })
})

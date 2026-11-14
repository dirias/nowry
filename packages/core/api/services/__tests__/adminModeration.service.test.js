/** ADMIN-003 — the admin moderation calls (FR-004, FR-011 Moderation, board B), owning their error UI. */
jest.mock('../../client', () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }))

import { apiClient } from '../../client'
import { MODERATION_QUEUE_LIMIT, adminModerationService } from '../adminModeration.service'

const OWN_ERRORS = { suppressErrorToast: true }

beforeEach(() => {
  apiClient.get.mockResolvedValue({ data: { items: [], totals: { to_review: 0, kept: 0, removed: 0 } } })
  apiClient.post.mockResolvedValue({ data: {} })
})

describe('listQueue', () => {
  it('reads one state of the queue, as many items as the API allows by default', async () => {
    await adminModerationService.listQueue({ state: 'to_review' })
    expect(apiClient.get).toHaveBeenCalledWith('/moderation/admin/queue', {
      ...OWN_ERRORS,
      params: { state: 'to_review', limit: MODERATION_QUEUE_LIMIT }
    })
  })

  it('asks for at most the cap, and leaves out a state not given', async () => {
    await adminModerationService.listQueue({ limit: 1000 })
    expect(apiClient.get).toHaveBeenLastCalledWith('/moderation/admin/queue', { ...OWN_ERRORS, params: { limit: MODERATION_QUEUE_LIMIT } })
    await adminModerationService.listQueue({ state: 'kept', limit: 1 })
    expect(apiClient.get).toHaveBeenLastCalledWith('/moderation/admin/queue', { ...OWN_ERRORS, params: { state: 'kept', limit: 1 } })
    await adminModerationService.listQueue()
    expect(apiClient.get).toHaveBeenLastCalledWith('/moderation/admin/queue', { ...OWN_ERRORS, params: { limit: MODERATION_QUEUE_LIMIT } })
  })

  it('answers the body as it came', async () => {
    const data = { items: [{ content_id: 'd1' }], totals: { to_review: 1, kept: 0, removed: 0 } }
    apiClient.get.mockResolvedValue({ data })
    await expect(adminModerationService.listQueue({ state: 'to_review' })).resolves.toEqual(data)
  })
})

describe('keep', () => {
  it('keeps an item public by its type and id', async () => {
    apiClient.post.mockResolvedValue({ data: { dismissed: 2 } })
    await expect(adminModerationService.keep('deck', 'd1')).resolves.toEqual({ dismissed: 2 })
    expect(apiClient.post).toHaveBeenCalledWith('/moderation/admin/queue/deck/d1/keep', {}, OWN_ERRORS)
  })

  it('escapes an id that is not a plain word', async () => {
    await adminModerationService.keep('book', 'a/b')
    expect(apiClient.post).toHaveBeenCalledWith('/moderation/admin/queue/book/a%2Fb/keep', {}, OWN_ERRORS)
  })
})

describe('remove', () => {
  const ANSWER = {
    removed: [{ content_type: 'deck', content_id: 'd1', title: 'JLPT' }],
    copies_removed: 0,
    owners_told: 1,
    owners_not_told: 0
  }

  it('unpublishes with the reason and the note, trimmed', async () => {
    apiClient.post.mockResolvedValue({ data: ANSWER })
    await expect(adminModerationService.remove('deck', 'd1', { reason: 'copyright', note: '  Copied  ' })).resolves.toEqual(ANSWER)
    expect(apiClient.post).toHaveBeenCalledWith(
      '/moderation/admin/queue/deck/d1/remove',
      { reason: 'copyright', note: 'Copied' },
      OWN_ERRORS
    )
  })

  it('sends no note when there is none, and cuts one past 500 characters', async () => {
    await adminModerationService.remove('book', 'b1', { reason: 'spam', note: '   ' })
    expect(apiClient.post).toHaveBeenLastCalledWith('/moderation/admin/queue/book/b1/remove', { reason: 'spam' }, OWN_ERRORS)
    await adminModerationService.remove('book', 'b1', { reason: 'other' })
    expect(apiClient.post).toHaveBeenLastCalledWith('/moderation/admin/queue/book/b1/remove', { reason: 'other' }, OWN_ERRORS)
    await adminModerationService.remove('book', 'b1', { reason: 'other', note: 'x'.repeat(600) })
    expect(apiClient.post.mock.calls.at(-1)[1].note).toHaveLength(500)
  })
})

/** BUG-001, ADMIN-007b — the bug report calls (FR-007, FR-011 Bug reports), owning their error UI. */
jest.mock('../../client', () => ({ apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }))

import { apiClient } from '../../client'
import { BUG_LIST_LIMIT, bugsService } from '../bugs.service'

const OWN_ERRORS = { suppressErrorToast: true }

beforeEach(() => {
  apiClient.get.mockResolvedValue({ data: [] })
  apiClient.post.mockResolvedValue({ data: { bug_id: 'b1' } })
  apiClient.patch.mockResolvedValue({ data: { id: 'b1', status: 'fixed' } })
})

it('sends a report and answers what the API said', async () => {
  const body = { title: 'Flip', platform: 'web' }
  await expect(bugsService.submit(body)).resolves.toEqual({ bug_id: 'b1' })
  expect(apiClient.post).toHaveBeenCalledWith('/bugs', body, OWN_ERRORS)
})

it('lists one state, as many as the tab allows at most', async () => {
  apiClient.get.mockResolvedValue({ data: [{ id: 'b1' }] })
  await expect(bugsService.list({ status: 'new' })).resolves.toEqual([{ id: 'b1' }])
  expect(apiClient.get).toHaveBeenCalledWith('/bugs/all', { ...OWN_ERRORS, params: { status: 'new', limit: BUG_LIST_LIMIT } })
  await bugsService.list({ limit: 5000 })
  expect(apiClient.get).toHaveBeenLastCalledWith('/bugs/all', { ...OWN_ERRORS, params: { limit: BUG_LIST_LIMIT } })
  await bugsService.list()
  expect(apiClient.get).toHaveBeenLastCalledWith('/bugs/all', { ...OWN_ERRORS, params: { limit: BUG_LIST_LIMIT } })
})

it('reads a list that is not one as empty', async () => {
  apiClient.get.mockResolvedValue({ data: { detail: 'odd' } })
  await expect(bugsService.list({ status: 'fixed', limit: 1 })).resolves.toEqual([])
})

it('reads the counts', async () => {
  apiClient.get.mockResolvedValue({ data: { by_status: { new: 3 } } })
  await expect(bugsService.stats()).resolves.toEqual({ by_status: { new: 3 } })
  expect(apiClient.get).toHaveBeenCalledWith('/bugs/stats', OWN_ERRORS)
})

it('saves a state and a note, escaping the id', async () => {
  await expect(bugsService.updateStatus('a/b', { status: 'fixed', note: 'Done' })).resolves.toEqual({ id: 'b1', status: 'fixed' })
  expect(apiClient.patch).toHaveBeenCalledWith('/bugs/a%2Fb/status', { status: 'fixed', note: 'Done' }, OWN_ERRORS)
})

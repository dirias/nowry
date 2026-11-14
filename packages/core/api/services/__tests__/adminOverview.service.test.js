/** ADMIN-007c — the Overview and the admin log reads (FR-011, boards A and K), owning their error UI. */
jest.mock('../../client', () => ({ apiClient: { get: jest.fn() } }))

import { apiClient } from '../../client'
import { ADMIN_LOG_PAGE, adminOverviewService } from '../adminOverview.service'

const OWN_ERRORS = { suppressErrorToast: true }

beforeEach(() => {
  apiClient.get.mockResolvedValue({ data: {} })
})

it('reads the Overview', async () => {
  const data = { needs: { waiting: { count: 3 } }, emails_today: {}, recent_actions: [] }
  apiClient.get.mockResolvedValue({ data })
  await expect(adminOverviewService.getOverview()).resolves.toEqual(data)
  expect(apiClient.get).toHaveBeenCalledWith('/admin/overview', OWN_ERRORS)
})

it('reads one page of the log, with only the filters given and next_before passed back unchanged', async () => {
  await adminOverviewService.listActions()
  expect(apiClient.get).toHaveBeenLastCalledWith('/admin/actions', { ...OWN_ERRORS, params: { limit: ADMIN_LOG_PAGE } })
  await adminOverviewService.listActions({ kind: 'invitations', before: '2026-11-14T10:00:00Z~a9', limit: 10 })
  expect(apiClient.get).toHaveBeenLastCalledWith('/admin/actions', {
    ...OWN_ERRORS,
    params: { kind: 'invitations', before: '2026-11-14T10:00:00Z~a9', limit: 10 }
  })
})

it('asks only for a kind the log knows, and for at most one page', async () => {
  await adminOverviewService.listActions({ kind: 'everything', limit: 5000 })
  expect(apiClient.get).toHaveBeenLastCalledWith('/admin/actions', { ...OWN_ERRORS, params: { limit: ADMIN_LOG_PAGE } })
})

it('answers the page as it came', async () => {
  const data = { actions: [{ id: 'a1' }], next_before: 'a1' }
  apiClient.get.mockResolvedValue({ data })
  await expect(adminOverviewService.listActions({ kind: 'bugs' })).resolves.toEqual(data)
})

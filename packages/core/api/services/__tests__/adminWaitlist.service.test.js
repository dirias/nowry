/** WAIT-002 — the admin waitlist read (FR-012, board E), owning its error UI. */
jest.mock('../../client', () => ({ apiClient: { get: jest.fn() } }))

import { apiClient } from '../../client'
import { WAITLIST_LIST_LIMIT, adminWaitlistService } from '../adminWaitlist.service'

const OWN_ERRORS = { suppressErrorToast: true }

beforeEach(() => {
  apiClient.get.mockResolvedValue({ data: { rows: [], totals: {}, locales: {}, sources: [] } })
})

it('reads the list with only the filters given', async () => {
  await adminWaitlistService.listWaitlist({ state: 'waiting', locale: 'es', source: '/' })
  expect(apiClient.get).toHaveBeenCalledWith('/beta/admin/waitlist', {
    ...OWN_ERRORS,
    params: { state: 'waiting', locale: 'es', source: '/', limit: 100 }
  })
  await adminWaitlistService.listWaitlist()
  expect(apiClient.get).toHaveBeenLastCalledWith('/beta/admin/waitlist', { ...OWN_ERRORS, params: { limit: 100 } })
})

it('asks for at most 200 rows', async () => {
  expect(WAITLIST_LIST_LIMIT).toBe(200)
  await adminWaitlistService.listWaitlist({ limit: 500 })
  expect(apiClient.get).toHaveBeenLastCalledWith('/beta/admin/waitlist', { ...OWN_ERRORS, params: { limit: 200 } })
  await adminWaitlistService.listWaitlist({ state: 'left', limit: 1 })
  expect(apiClient.get).toHaveBeenLastCalledWith('/beta/admin/waitlist', { ...OWN_ERRORS, params: { state: 'left', limit: 1 } })
})

it('answers the body as it came', async () => {
  const data = { rows: [{ id: 'w1' }], totals: { waiting: 1, invited: 0, joined: 0, left: 0 }, locales: { es: 1 }, sources: ['/'] }
  apiClient.get.mockResolvedValue({ data })
  await expect(adminWaitlistService.listWaitlist({})).resolves.toEqual(data)
})

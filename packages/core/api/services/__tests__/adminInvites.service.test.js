/** ADMIN-007a — the admin invitation calls (FR-012), each owning its error UI. */
jest.mock('../../client', () => ({ apiClient: { post: jest.fn(), get: jest.fn() } }))

import { apiClient } from '../../client'
import { adminInvitesService } from '../adminInvites.service'

const OWN_ERRORS = { suppressErrorToast: true }

beforeEach(() => {
  apiClient.post.mockReset()
  apiClient.get.mockReset()
})

it('reads the cohorts and today’s budget', async () => {
  const data = {
    cohorts: ['c1-waitlist'],
    default_cohort: 'c1-waitlist',
    lifetimes: [7, 14],
    default_lifetime: 14,
    invitations_left_today: 64
  }
  apiClient.get.mockResolvedValue({ data })
  await expect(adminInvitesService.getCohorts()).resolves.toEqual(data)
  expect(apiClient.get).toHaveBeenCalledWith('/beta/admin/cohorts', OWN_ERRORS)
})

it('lists invitations with only the filters given, at most 200', async () => {
  apiClient.get.mockResolvedValue({ data: { invites: [], counts: {}, totals: {} } })
  await adminInvitesService.listInvites({ state: 'open', limit: 500 })
  expect(apiClient.get).toHaveBeenCalledWith('/beta/admin/invites', { ...OWN_ERRORS, params: { state: 'open', limit: 200 } })
  await adminInvitesService.listInvites()
  expect(apiClient.get).toHaveBeenLastCalledWith('/beta/admin/invites', { ...OWN_ERRORS, params: { limit: 200 } })
  await adminInvitesService.listInvites({ cohort: 'friends', limit: 20 })
  expect(apiClient.get).toHaveBeenLastCalledWith('/beta/admin/invites', { ...OWN_ERRORS, params: { cohort: 'friends', limit: 20 } })
})

it('sends a batch as the contract names it', async () => {
  apiClient.post.mockResolvedValue({ data: { dry_run: true, results: [], counts: {}, invitations_left_today: 3 } })
  await adminInvitesService.sendBatch({ addresses: ['a@x.com'], cohort: 'c1-waitlist', expiresInDays: 14, locale: 'es', dryRun: true })
  expect(apiClient.post).toHaveBeenCalledWith(
    '/beta/admin/invites/batch',
    { addresses: ['a@x.com'], cohort: 'c1-waitlist', expires_in_days: 14, locale: 'es', dry_run: true },
    OWN_ERRORS
  )
})

it('resends and revokes one invitation by its id', async () => {
  apiClient.post.mockResolvedValue({ data: { id: 'i/1', state: 'open' } })
  await expect(adminInvitesService.resend('i/1')).resolves.toEqual({ id: 'i/1', state: 'open' })
  expect(apiClient.post).toHaveBeenCalledWith('/beta/admin/invites/i%2F1/resend', null, OWN_ERRORS)
  await adminInvitesService.revoke('abc')
  expect(apiClient.post).toHaveBeenLastCalledWith('/beta/admin/invites/abc/revoke', null, OWN_ERRORS)
})

it('sends waitlist rows by their ids, with no addresses and no language (WAIT-006)', async () => {
  apiClient.post.mockResolvedValue({ data: { dry_run: false, results: [], invitations_left_today: 60 } })
  await adminInvitesService.sendBatch({ waitlistIds: ['w1', 'w2'], cohort: 'c1-waitlist', expiresInDays: 14, dryRun: false })
  const body = apiClient.post.mock.calls[0][1]
  expect(body).toEqual({ waitlist_ids: ['w1', 'w2'], cohort: 'c1-waitlist', expires_in_days: 14, dry_run: false })
  expect(Object.keys(body)).not.toContain('addresses')
  expect(Object.keys(body)).not.toContain('locale')
})

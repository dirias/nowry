/**
 * ADMIN-007a / ADMIN-008b — the Invitations tab (FR-012, boards D, I, J, L):
 * paste and check as a dry run, send with the count, the refusal over today's
 * budget, Resend and Revoke confirmed in place, the hour limit, the list's
 * loading / empty / error states, and every write asking for a recent sign-in
 * and then running again.
 */
import React from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import InvitationsTab from '../invitations/InvitationsTab'

/* The key, then its interpolation values: 'admin.inv.bar.send|count=2'. */
const mockT = (key, options) => {
  const values = Object.entries(options ?? {}).filter(([name]) => name !== 'defaultValue')
  return values.length ? `${key}|${values.map(([name, value]) => `${name}=${value}`).join(',')}` : key
}
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT, i18n: { language: 'en', getFixedT: () => mockT } }) }))

jest.mock('@nowry/core/api/services/adminInvites.service', () => ({
  INVITE_LIST_LIMIT: 200,
  adminInvitesService: { getCohorts: jest.fn(), listInvites: jest.fn(), sendBatch: jest.fn(), resend: jest.fn(), revoke: jest.fn() }
}))
jest.mock('@nowry/core/api/services/auth.service', () => ({
  authService: { signInProviders: jest.fn(), signInTime: jest.fn(), reauthenticate: jest.fn() }
}))
const { adminInvitesService: service } = require('@nowry/core/api/services/adminInvites.service')
const { authService } = require('@nowry/core/api/services/auth.service')

const COHORTS = {
  cohorts: ['c1-waitlist', 'friends'],
  default_cohort: 'c1-waitlist',
  lifetimes: [7, 14, 30, 60, 90],
  default_lifetime: 14,
  invitations_left_today: 64
}
const OPEN = {
  id: 'inv-1',
  email: 'ana.r@example.com',
  cohort: 'c1-waitlist',
  state: 'open',
  created_at: '2026-11-12T10:00:00Z',
  sent_at: '2026-11-12T10:00:00Z',
  expires_at: '2026-11-26T10:00:00Z',
  send_count: 1,
  last_error: null
}
const REVOKED = {
  ...OPEN,
  id: 'inv-2',
  email: 'k.mora@example.org',
  cohort: 'friends',
  state: 'revoked',
  revoked_at: '2026-11-13T10:00:00Z'
}
const FAILED = { ...OPEN, id: 'inv-3', email: 'lost@example.com', last_error: 'smtp 550' }
const LIST = { invites: [OPEN, REVOKED, FAILED], counts: {}, totals: { open: 2, used: 11, expired: 3, revoked: 1 } }
const REAUTH = { response: { status: 401, data: { detail: { code: 'reauth_required' } } } }
const PASTED = 'lucia@example.com\ntom@example.org\nana.r@example.com\npedro@example'
const DRY = {
  dry_run: true,
  results: [
    { input: 'lucia@example.com', email: 'lucia@example.com', outcome: 'will_invite' },
    { input: 'tom@example.org', email: 'tom@example.org', outcome: 'will_invite' },
    { input: 'ana.r@example.com', email: 'ana.r@example.com', outcome: 'open_invite' },
    { input: 'pedro@example', email: null, outcome: 'invalid' }
  ],
  invitations_left_today: 64
}
const SENT = {
  dry_run: false,
  results: [
    { input: 'lucia@example.com', outcome: 'sent' },
    { input: 'tom@example.org', outcome: 'sent' },
    { input: 'ana.r@example.com', outcome: 'open_invite' },
    { input: 'pedro@example', outcome: 'invalid' }
  ],
  invitations_left_today: 62
}

const renderTab = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <InvitationsTab />
    </QueryClientProvider>
  )
}

const addresses = () => screen.getByLabelText('admin.inv.form.addresses')
const paste = async (text = PASTED) => {
  fireEvent.change(addresses(), { target: { value: text } })
  await act(async () => {
    fireEvent.blur(addresses())
  })
}

beforeEach(() => {
  service.getCohorts.mockResolvedValue(COHORTS)
  service.listInvites.mockResolvedValue(LIST)
  service.sendBatch.mockImplementation(async ({ dryRun }) => (dryRun ? DRY : SENT))
  authService.signInProviders.mockReturnValue(['password'])
  authService.signInTime.mockResolvedValue(null)
})

describe('paste and check', () => {
  it('checks the pasted lines as a dry run and says what it found', async () => {
    renderTab()
    await paste()
    await waitFor(() => expect(screen.getByText(/admin\.inv\.check\.outcome\.will_invite/)).toBeInTheDocument())
    expect(service.sendBatch).toHaveBeenCalledWith({
      addresses: ['lucia@example.com', 'tom@example.org', 'ana.r@example.com', 'pedro@example'],
      cohort: 'c1-waitlist',
      expiresInDays: 14,
      locale: 'en',
      dryRun: true
    })
    const summary = screen.getByTestId('invite-check')
    expect(summary).toHaveAttribute('aria-live', 'polite')
    expect(within(summary).getByText(/admin\.inv\.check\.lines\|count=1,lines=4/)).toBeInTheDocument()
    expect(within(summary).getByText(/open_invite/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'admin.inv.bar.send|count=2' })).toBeInTheDocument()
    expect(screen.getByText('admin.inv.bar.left|count=64')).toBeInTheDocument()
  })

  it('refuses more than fifty lines before calling, and asks for one when there is none', async () => {
    renderTab()
    fireEvent.click(await screen.findByRole('button', { name: 'admin.inv.bar.sendNone' }))
    expect(screen.getByText('admin.inv.check.empty')).toBeInTheDocument()
    await paste(Array.from({ length: 51 }, (_, i) => `p${i}@x.com`).join('\n'))
    expect(screen.getByText('admin.inv.check.tooMany|count=51,max=50')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'admin.inv.bar.sendNone' }))
    expect(service.sendBatch).not.toHaveBeenCalled()
  })

  it('previews the email in the chosen language', async () => {
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: 'admin.inv.bar.preview' }))
    expect(screen.getByRole('heading', { name: 'admin.inv.preview.title' })).toBeInTheDocument()
    expect(screen.getByText(/admin\.inv\.email\.body\|date=/)).toBeInTheDocument()
    expect(screen.getByText('admin.inv.email.android')).toBeInTheDocument()
  })
})

describe('send', () => {
  it('sends, says what went, keeps the lines that did not, and reads the list again', async () => {
    renderTab()
    await paste()
    const send = await screen.findByRole('button', { name: 'admin.inv.bar.send|count=2' })
    await waitFor(() => expect(service.listInvites).toHaveBeenCalledTimes(1))
    await act(async () => {
      fireEvent.click(send)
    })
    expect(service.sendBatch).toHaveBeenLastCalledWith(expect.objectContaining({ dryRun: false, cohort: 'c1-waitlist', expiresInDays: 14 }))
    const result = await screen.findByTestId('invite-result')
    expect(result).toHaveTextContent('admin.inv.result.sent|count=2')
    expect(result).toHaveTextContent('admin.inv.result.openInvite|count=1')
    expect(result).toHaveTextContent('admin.inv.result.invalid|count=1,lines=4')
    expect(addresses()).toHaveValue('ana.r@example.com\npedro@example')
    await waitFor(() => expect(service.listInvites.mock.calls.length).toBeGreaterThan(1))
  })

  it('says the batch is over today’s budget and that nothing was sent', async () => {
    service.sendBatch.mockImplementation(async ({ dryRun }) => {
      if (dryRun) return DRY
      throw { response: { status: 409, data: { detail: { code: 'over_budget', needed: 12, left: 8 } } } }
    })
    renderTab()
    await paste()
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'admin.inv.bar.send|count=2' }))
    })
    expect(await screen.findByTestId('invite-result')).toHaveTextContent('admin.inv.result.overBudget|count=12,left=8')
    expect(addresses()).toHaveValue(PASTED)
  })

  it('asks for the sign-in again, then sends what was asked', async () => {
    let sends = 0
    service.sendBatch.mockImplementation(async ({ dryRun }) => {
      if (dryRun) return DRY
      sends += 1
      if (sends === 1) throw REAUTH
      return SENT
    })
    authService.reauthenticate.mockResolvedValue()
    renderTab()
    await paste()
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'admin.inv.bar.send|count=2' }))
    })
    const dialog = await screen.findByRole('dialog', { name: 'admin.reauth.send.title' })
    fireEvent.change(within(dialog).getByLabelText('reauth.passwordLabel', { exact: false }), { target: { value: 'pw' } })
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'admin.reauth.send.confirm' }))
    })
    expect(authService.reauthenticate).toHaveBeenCalledWith({ method: 'password', password: 'pw' })
    expect(await screen.findByTestId('invite-result')).toHaveTextContent('admin.inv.result.sent|count=2')
    expect(sends).toBe(2)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('Cancel in the sign-in leaves the form as it was', async () => {
    service.sendBatch.mockImplementation(async ({ dryRun }) => {
      if (dryRun) return DRY
      throw REAUTH
    })
    renderTab()
    await paste()
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'admin.inv.bar.send|count=2' }))
    })
    const dialog = await screen.findByRole('dialog')
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'common.cancel' }))
    })
    expect(screen.queryByTestId('invite-result')).not.toBeInTheDocument()
    expect(addresses()).toHaveValue(PASTED)
  })
})

describe('the list', () => {
  it('draws skeleton rows while loading, with the form usable at once', async () => {
    service.listInvites.mockReturnValue(new Promise(() => {}))
    renderTab()
    expect(screen.getByTestId('invite-list-loading')).toHaveAttribute('aria-busy', 'true')
    expect(addresses()).toBeEnabled()
  })

  it('says there are none yet', async () => {
    service.listInvites.mockResolvedValue({ invites: [], counts: {}, totals: {} })
    renderTab()
    expect(await screen.findByText('admin.inv.list.empty.title')).toBeInTheDocument()
    expect(screen.getByText('admin.inv.list.empty.body')).toBeInTheDocument()
  })

  it('says it could not load, and Try again reads again', async () => {
    service.listInvites.mockRejectedValueOnce(new Error('down')).mockResolvedValue(LIST)
    renderTab()
    expect(await screen.findByText('admin.inv.list.error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'admin.tryAgain' }))
    expect(await screen.findByText('ana.r@example.com')).toBeInTheDocument()
  })

  it('filters by state with the totals', async () => {
    renderTab()
    await screen.findByText('ana.r@example.com')
    expect(screen.getByRole('button', { name: 'admin.inv.states.all · 17' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'admin.inv.states.open · 2' }))
    await waitFor(() => expect(service.listInvites).toHaveBeenLastCalledWith({ state: 'open', limit: 200 }))
  })

  it('offers what each state allows, and says when an email did not leave', async () => {
    renderTab()
    await screen.findByText('ana.r@example.com')
    expect(screen.getByRole('button', { name: 'admin.inv.actions.resendAria|email=ana.r@example.com' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'admin.inv.actions.revokeAria|email=ana.r@example.com' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'admin.inv.actions.inviteAgainAria|email=k.mora@example.org' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'admin.inv.actions.revokeAria|email=k.mora@example.org' })).not.toBeInTheDocument()
    expect(screen.getByText('admin.inv.list.notSent')).toBeInTheDocument()
  })
})

describe('row actions', () => {
  const openConfirm = async (action, email = 'ana.r@example.com') => {
    renderTab()
    await screen.findByText(email)
    fireEvent.click(screen.getByRole('button', { name: `admin.inv.actions.${action}Aria|email=${email}` }))
    return screen.getByRole('group', { name: new RegExp(`admin\\.inv\\.confirm\\.${action}\\.title`) })
  }

  it('Resend asks in place, then sends a new link', async () => {
    service.resend.mockResolvedValue({ ...OPEN, id: 'inv-9' })
    const confirm = await openConfirm('resend')
    expect(within(confirm).getByText(/admin\.inv\.confirm\.resend\.body/)).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(within(confirm).getByRole('button', { name: 'admin.inv.confirm.resend.confirm' }))
    })
    expect(service.resend).toHaveBeenCalledWith('inv-1')
    expect(await screen.findByText('admin.inv.notice.resent|email=ana.r@example.com')).toBeInTheDocument()
  })

  it('Cancel closes the confirmation and does nothing', async () => {
    const confirm = await openConfirm('revoke')
    fireEvent.click(within(confirm).getByRole('button', { name: 'common.cancel' }))
    expect(screen.queryByRole('group', { name: /confirm\.revoke/ })).not.toBeInTheDocument()
    expect(service.revoke).not.toHaveBeenCalled()
  })

  it('says when another link may be sent, in local time', async () => {
    service.resend.mockRejectedValue({
      response: { status: 429, data: { detail: { code: 'resend_too_soon', retry_at: '2026-11-14T15:40:00Z' } } }
    })
    const confirm = await openConfirm('resend')
    await act(async () => {
      fireEvent.click(within(confirm).getByRole('button', { name: 'admin.inv.confirm.resend.confirm' }))
    })
    expect(await screen.findByText(/admin\.inv\.notice\.tooSoon\|email=ana\.r@example\.com,time=\d\d:\d\d/)).toBeInTheDocument()
  })

  it('Revoke asks in place with the soft danger key, then revokes', async () => {
    service.revoke.mockResolvedValue({ ...OPEN, state: 'revoked' })
    const confirm = await openConfirm('revoke')
    await act(async () => {
      fireEvent.click(within(confirm).getByRole('button', { name: 'admin.inv.confirm.revoke.confirm' }))
    })
    expect(service.revoke).toHaveBeenCalledWith('inv-1')
    expect(await screen.findByText('admin.inv.notice.revoked|email=ana.r@example.com')).toBeInTheDocument()
  })

  it('Invite again on a revoked row makes a new invitation', async () => {
    service.resend.mockResolvedValue({ ...REVOKED, id: 'inv-10', state: 'open' })
    const confirm = await openConfirm('inviteAgain', 'k.mora@example.org')
    await act(async () => {
      fireEvent.click(within(confirm).getByRole('button', { name: 'admin.inv.confirm.inviteAgain.confirm' }))
    })
    expect(service.resend).toHaveBeenCalledWith('inv-2')
    expect(await screen.findByText('admin.inv.notice.invitedAgain|email=k.mora@example.org')).toBeInTheDocument()
  })

  it('a revoke refused for an old sign-in asks for it, then revokes', async () => {
    service.revoke.mockRejectedValueOnce(REAUTH).mockResolvedValueOnce({ ...OPEN, state: 'revoked' })
    authService.reauthenticate.mockResolvedValue()
    const confirm = await openConfirm('revoke')
    await act(async () => {
      fireEvent.click(within(confirm).getByRole('button', { name: 'admin.inv.confirm.revoke.confirm' }))
    })
    const dialog = await screen.findByRole('dialog', { name: 'admin.reauth.revoke.title' })
    fireEvent.change(within(dialog).getByLabelText('reauth.passwordLabel', { exact: false }), { target: { value: 'pw' } })
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'admin.reauth.revoke.confirm' }))
    })
    expect(service.revoke).toHaveBeenCalledTimes(2)
    expect(await screen.findByText('admin.inv.notice.revoked|email=ana.r@example.com')).toBeInTheDocument()
  })
})

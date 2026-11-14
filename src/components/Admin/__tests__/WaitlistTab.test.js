/**
 * WAIT-002 / WAIT-006 — the Waitlist tab (FR-012, boards E, I, J, L): filters
 * by state and language that ask the API for those rows, only waiting rows
 * ticked, the selection bar's wording, inviting the ticked rows by id through
 * the re-sign-in, the refusal over today's budget, and the list's loading /
 * empty / error states.
 */
import React from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import WaitlistTab from '../waitlist/WaitlistTab'

/* The key, then its interpolation values: 'admin.wl.bar.invite|count=2,cohort=c1-waitlist'. */
const mockT = (key, options) => {
  const values = Object.entries(options ?? {}).filter(([name]) => name !== 'defaultValue')
  return values.length ? `${key}|${values.map(([name, value]) => `${name}=${value}`).join(',')}` : key
}
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT, i18n: { language: 'en', getFixedT: () => mockT } }) }))

jest.mock('@nowry/core/api/services/adminWaitlist.service', () => ({
  WAITLIST_LIST_LIMIT: 200,
  adminWaitlistService: { listWaitlist: jest.fn() }
}))
jest.mock('@nowry/core/api/services/adminInvites.service', () => ({
  INVITE_LIST_LIMIT: 200,
  adminInvitesService: { getCohorts: jest.fn(), sendBatch: jest.fn() }
}))
jest.mock('@nowry/core/api/services/auth.service', () => ({
  authService: { signInProviders: jest.fn(), signInTime: jest.fn(), reauthenticate: jest.fn() }
}))
const { adminWaitlistService: waitlist } = require('@nowry/core/api/services/adminWaitlist.service')
const { adminInvitesService: invites } = require('@nowry/core/api/services/adminInvites.service')
const { authService } = require('@nowry/core/api/services/auth.service')

const COHORTS = {
  cohorts: ['c1-waitlist'],
  default_cohort: 'c1-waitlist',
  lifetimes: [7, 14, 30, 60, 90],
  default_lifetime: 14,
  invitations_left_today: 64
}
const row = (id, email, status = 'waiting', extra = {}) => ({
  id,
  email,
  locale: 'es',
  source: '/',
  status,
  created_at: '2026-11-02T10:00:00Z',
  invited_at: null,
  joined_at: null,
  ...extra
})
const LUCIA = row('w1', 'lucia.fernandez@example.com')
const DIEGO = row('w2', 'diego.m@example.org', 'waiting', { source: '/register' })
const ANA = row('w3', 'ana.r@example.com', 'invited', { invited_at: '2026-11-12T10:00:00Z' })
const TOTALS = { waiting: 37, invited: 12, joined: 9, left: 2 }
const LIST = { rows: [LUCIA, DIEGO, ANA], totals: TOTALS, locales: { es: 3 }, sources: ['/', '/register'] }
const SENT = {
  dry_run: false,
  results: [
    { input: LUCIA.email, outcome: 'sent' },
    { input: DIEGO.email, outcome: 'sent' }
  ],
  invitations_left_today: 62
}
const REAUTH = { response: { status: 401, data: { detail: { code: 'reauth_required' } } } }

const renderTab = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <WaitlistTab />
    </QueryClientProvider>
  )
}

const box = (email) => screen.getByRole('checkbox', { name: `admin.wl.list.select|email=${email}` })
const inviteKey = () => screen.getByRole('button', { name: /^admin\.wl\.bar\.invite/ })
const listed = () => screen.findByText(LUCIA.email)

beforeEach(() => {
  invites.getCohorts.mockResolvedValue(COHORTS)
  invites.sendBatch.mockResolvedValue(SENT)
  waitlist.listWaitlist.mockResolvedValue(LIST)
  authService.signInProviders.mockReturnValue(['password'])
  authService.signInTime.mockResolvedValue(null)
})

describe('filters', () => {
  it('opens on Waiting, oldest first, with each state’s count', async () => {
    renderTab()
    await listed()
    expect(waitlist.listWaitlist).toHaveBeenCalledWith({ state: 'waiting', locale: undefined, limit: 200 })
    const states = screen.getByRole('group', { name: 'admin.wl.filters.states' })
    expect(within(states).getByRole('button', { name: 'admin.wl.states.waiting · 37' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(states).getByRole('button', { name: 'admin.wl.states.invited · 12' })).toHaveAttribute('aria-pressed', 'false')
    expect(within(states).getByRole('button', { name: 'admin.wl.states.joined · 9' })).toBeInTheDocument()
    expect(within(states).getByRole('button', { name: 'admin.wl.states.left · 2' })).toBeInTheDocument()
  })

  it('asks the API for the state and the language chosen', async () => {
    renderTab()
    await listed()
    fireEvent.click(screen.getByRole('button', { name: 'admin.wl.states.invited · 12' }))
    await waitFor(() => expect(waitlist.listWaitlist).toHaveBeenLastCalledWith({ state: 'invited', locale: undefined, limit: 200 }))
    const languages = screen.getByRole('group', { name: 'admin.wl.filters.language' })
    expect(
      within(languages)
        .getAllByRole('button')
        .map((action) => action.parentElement.textContent)
    ).toEqual(['admin.wl.filters.allLanguages', 'EN', 'ES', 'FR', 'DE', 'JA'])
    fireEvent.click(within(languages).getByRole('button', { name: 'admin.inv.languages.es' }))
    await waitFor(() => expect(waitlist.listWaitlist).toHaveBeenLastCalledWith({ state: 'invited', locale: 'es', limit: 200 }))
    expect(within(languages).getByRole('button', { name: 'admin.inv.languages.es' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(within(languages).getByRole('button', { name: 'admin.wl.filters.allLanguages' }))
    await waitFor(() => expect(waitlist.listWaitlist).toHaveBeenLastCalledWith({ state: 'invited', locale: undefined, limit: 200 }))
  })
})

describe('rows', () => {
  it('draws each row as the board does: address, language, source, date, state', async () => {
    renderTab()
    await listed()
    const lucia = screen.getByText(LUCIA.email).closest('[role="row"]')
    expect(within(lucia).getAllByText('ES').length).toBeGreaterThan(0)
    expect(within(lucia).getByText('admin.wl.sources.hero')).toBeInTheDocument()
    expect(within(lucia).getByText('admin.wl.states.waiting')).toBeInTheDocument()
    const diego = screen.getByText(DIEGO.email).closest('[role="row"]')
    expect(within(diego).getByText('admin.wl.sources.register')).toBeInTheDocument()
    const ana = screen.getByText(ANA.email).closest('[role="row"]')
    expect(within(ana).getByText('admin.wl.states.invited')).toBeInTheDocument()
    expect(within(ana).getByText(/admin\.wl\.list\.meta\.invited\|date=/)).toBeInTheDocument()
    expect(screen.getByText('admin.wl.caption')).toBeInTheDocument()
  })

  it('lets only waiting rows be ticked', async () => {
    renderTab()
    await listed()
    expect(box(LUCIA.email)).not.toBeDisabled()
    expect(box(ANA.email)).toBeDisabled()
  })

  it('names the selection and the batch on the bar', async () => {
    renderTab()
    await listed()
    expect(inviteKey()).toHaveTextContent('admin.wl.bar.inviteNone|cohort=c1-waitlist')
    fireEvent.click(box(LUCIA.email))
    fireEvent.click(box(DIEGO.email))
    expect(screen.getByText('admin.wl.bar.selected|count=2')).toBeInTheDocument()
    expect(screen.queryByText(/admin\.inv\.languages/)).not.toBeInTheDocument()
    expect(inviteKey()).toHaveTextContent('admin.wl.bar.invite|count=2,cohort=c1-waitlist')
    expect(screen.getByText('admin.inv.bar.left|count=64')).toBeInTheDocument()
    fireEvent.click(box(DIEGO.email))
    expect(screen.getByText('admin.wl.bar.selected|count=1')).toBeInTheDocument()
  })

  it('names the language when one is filtered', async () => {
    renderTab()
    await listed()
    fireEvent.click(screen.getByRole('button', { name: 'admin.inv.languages.es' }))
    await waitFor(() => expect(waitlist.listWaitlist).toHaveBeenLastCalledWith({ state: 'waiting', locale: 'es', limit: 200 }))
    await listed()
    expect(screen.getByText('admin.inv.languages.es')).toBeInTheDocument()
    expect(screen.getByText('admin.wl.bar.oldestFirst')).toBeInTheDocument()
  })

  it('ticks every waiting row at once, and clears them', async () => {
    renderTab()
    await listed()
    const all = screen.getByRole('checkbox', { name: 'admin.wl.bar.selectAll' })
    fireEvent.click(all)
    expect(box(LUCIA.email)).toBeChecked()
    expect(box(DIEGO.email)).toBeChecked()
    expect(box(ANA.email)).not.toBeChecked()
    expect(all).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'admin.wl.bar.clear' }))
    expect(box(LUCIA.email)).not.toBeChecked()
    expect(screen.getByText('admin.wl.bar.selected|count=0')).toBeInTheDocument()
  })

  it('clears the selection when the filter changes', async () => {
    renderTab()
    await listed()
    fireEvent.click(box(LUCIA.email))
    fireEvent.click(screen.getByRole('button', { name: 'admin.wl.states.invited · 12' }))
    expect(screen.getByText('admin.wl.bar.selected|count=0')).toBeInTheDocument()
  })
})

describe('invite', () => {
  it('says what to do when nothing is ticked, and sends nothing', async () => {
    renderTab()
    await listed()
    fireEvent.click(inviteKey())
    expect(screen.getByText('admin.wl.bar.tickFirst')).toBeInTheDocument()
    expect(invites.sendBatch).not.toHaveBeenCalled()
  })

  it('sends the ticked rows by id with the default cohort and lifetime, then reads again', async () => {
    renderTab()
    await listed()
    fireEvent.click(box(LUCIA.email))
    fireEvent.click(box(DIEGO.email))
    const reads = waitlist.listWaitlist.mock.calls.length
    await act(async () => {
      fireEvent.click(inviteKey())
    })
    expect(invites.sendBatch).toHaveBeenCalledWith({ waitlistIds: ['w1', 'w2'], cohort: 'c1-waitlist', expiresInDays: 14, dryRun: false })
    const result = await screen.findByTestId('invite-result')
    expect(result).toHaveTextContent('admin.inv.result.sent|count=2')
    expect(result.closest('[aria-live="polite"]')).not.toBeNull()
    expect(screen.getByText('admin.wl.bar.selected|count=0')).toBeInTheDocument()
    await waitFor(() => expect(waitlist.listWaitlist.mock.calls.length).toBeGreaterThan(reads))
  })

  it('says a row was not found, not that a line is not an address', async () => {
    invites.sendBatch.mockResolvedValue({
      dry_run: false,
      results: [
        { input: 'w1', email: LUCIA.email, outcome: 'sent' },
        { input: 'w2', email: null, outcome: 'invalid' }
      ],
      invitations_left_today: 63
    })
    renderTab()
    await listed()
    fireEvent.click(box(LUCIA.email))
    fireEvent.click(box(DIEGO.email))
    await act(async () => {
      fireEvent.click(inviteKey())
    })
    const result = await screen.findByTestId('invite-result')
    expect(result).toHaveTextContent('admin.wl.result.notFound|count=1')
    expect(result).not.toHaveTextContent('admin.inv.result.invalid')
  })

  it('says nothing went when the batch is over today’s budget', async () => {
    invites.sendBatch.mockRejectedValue({ response: { status: 409, data: { detail: { code: 'over_budget', needed: 2, left: 1 } } } })
    renderTab()
    await listed()
    fireEvent.click(box(LUCIA.email))
    fireEvent.click(box(DIEGO.email))
    await act(async () => {
      fireEvent.click(inviteKey())
    })
    expect(await screen.findByTestId('invite-result')).toHaveTextContent('admin.inv.result.overBudget|count=2,left=1')
    expect(box(LUCIA.email)).toBeChecked()
  })

  it('asks for the sign-in again, then sends once more', async () => {
    invites.sendBatch.mockRejectedValueOnce(REAUTH).mockResolvedValueOnce(SENT)
    authService.reauthenticate.mockResolvedValue()
    renderTab()
    await listed()
    fireEvent.click(box(LUCIA.email))
    await act(async () => {
      fireEvent.click(inviteKey())
    })
    const dialog = await screen.findByRole('dialog', { name: 'admin.reauth.send.title' })
    fireEvent.change(within(dialog).getByLabelText('reauth.passwordLabel', { exact: false }), { target: { value: 'pw' } })
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'admin.reauth.send.confirm' }))
    })
    expect(authService.reauthenticate).toHaveBeenCalledWith({ method: 'password', password: 'pw' })
    expect(invites.sendBatch).toHaveBeenCalledTimes(2)
    expect(await screen.findByTestId('invite-result')).toHaveTextContent('admin.inv.result.sent')
  })
})

describe('states', () => {
  it('shows skeleton rows while loading', async () => {
    waitlist.listWaitlist.mockReturnValue(new Promise(() => {}))
    renderTab()
    expect(await screen.findByTestId('waitlist-loading')).toHaveAttribute('aria-busy', 'true')
  })

  it('says no one is waiting, with the hint', async () => {
    waitlist.listWaitlist.mockResolvedValue({ rows: [], totals: { waiting: 0 }, locales: {}, sources: [] })
    renderTab()
    expect(await screen.findByText('admin.wl.list.empty.title')).toBeInTheDocument()
    expect(screen.getByText('admin.wl.list.empty.body')).toBeInTheDocument()
  })

  it('says no one is in another state', async () => {
    renderTab()
    await listed()
    waitlist.listWaitlist.mockResolvedValue({ rows: [], totals: TOTALS, locales: {}, sources: [] })
    fireEvent.click(screen.getByRole('button', { name: 'admin.wl.states.left · 2' }))
    expect(await screen.findByText('admin.wl.list.filterEmpty')).toBeInTheDocument()
    expect(screen.queryByText('admin.wl.list.empty.body')).not.toBeInTheDocument()
  })

  it('says the list could not be read, and reads again on Try again', async () => {
    waitlist.listWaitlist.mockRejectedValueOnce(new Error('down'))
    renderTab()
    expect(await screen.findByText('admin.wl.list.error')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'admin.tryAgain' }))
    })
    expect(await screen.findByText(LUCIA.email)).toBeInTheDocument()
  })
})

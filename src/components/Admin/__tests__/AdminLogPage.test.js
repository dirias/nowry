/**
 * ADMIN-007c — the admin log (FR-011, boards K and L): the crumb back to the
 * Overview, the kind filters, one row per action with when, who, what and
 * why, Show older with next_before, and loading, empty and error.
 */
import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import AdminLogPage from '../log/AdminLogPage'

const mockT = (key, options) => {
  const values = Object.entries(options ?? {}).filter(([name]) => name !== 'defaultValue')
  return values.length ? `${key}|${values.map(([name, value]) => `${name}=${value}`).join(',')}` : key
}
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT, i18n: { language: 'en' } }) }))

jest.mock('@nowry/core/api/services/adminOverview.service', () => ({
  ADMIN_LOG_PAGE: 50,
  adminOverviewService: { getOverview: jest.fn(), listActions: jest.fn() }
}))
const { adminOverviewService: service } = require('@nowry/core/api/services/adminOverview.service')

const now = new Date()
const todayAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 1).toISOString()
const longAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 20, 22, 41).toISOString()
const REMOVAL = {
  id: 'a1',
  at: todayAt,
  actor: { kind: 'admin', username: 'didier', is_you: true },
  action: 'content.remove',
  target_type: 'deck',
  target_id: 'd1',
  target_title: 'JLPT N5 kanji (copy)',
  reason: 'copyright',
  details: { copies: 1 }
}
const RESEND = {
  id: 'a2',
  at: todayAt,
  actor: { kind: 'admin', username: 'ana', is_you: false },
  action: 'invite.resend',
  target_type: 'invite',
  target_id: 'i1',
  target_title: 'ana.r@example.com',
  reason: null,
  details: {}
}
const GRANT = {
  id: 'a3',
  at: longAgo,
  actor: { kind: 'script', username: null, is_you: false },
  action: 'admin.grant',
  target_type: 'account',
  target_id: 'u1',
  target_title: 'didier@example.com',
  reason: 'set_admin.py',
  details: {}
}
const GONE = { ...RESEND, id: 'a4', actor: { kind: 'admin', username: null, is_you: false } }

const Where = () => {
  const location = useLocation()
  return <div data-testid='where'>{`${location.pathname}${location.search}`}</div>
}

const renderLog = (path = '/admin/log') => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path='/admin/log' element={<AdminLogPage />} />
        </Routes>
        <Routes>
          <Route path='*' element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const rows = () => screen.getAllByRole('row').filter((row) => within(row).queryAllByRole('cell').length)

beforeEach(() => {
  service.listActions.mockResolvedValue({ actions: [REMOVAL, RESEND, GRANT, GONE], next_before: null })
})

it('names itself in a crumb back to the Overview and says how long rows are kept', async () => {
  renderLog()
  const crumb = screen.getByRole('navigation', { name: 'admin.log.crumbLabel' })
  expect(within(crumb).getByRole('link', { name: 'admin.overview.label' })).toHaveAttribute('href', '/admin/overview')
  expect(within(crumb).getByRole('heading', { level: 2, name: 'admin.log.title' })).toBeInTheDocument()
  expect(crumb).toHaveTextContent('admin.log.kept')
  await screen.findByRole('table')
})

it('lists one row per action: when, who, what and why', async () => {
  renderLog()
  await screen.findByRole('table', { name: 'admin.log.title' })
  const [removal, resend, grant, gone] = rows()
  expect(removal).toHaveTextContent(/admin\.log\.when\.today\|time=/)
  expect(removal).toHaveTextContent('admin.log.actor.you')
  expect(removal).toHaveTextContent('admin.log.what.removeDeckCopies|title=JLPT N5 kanji (copy),count=1')
  expect(removal).toHaveTextContent('admin.mod.reasons.copyright')
  expect(resend).toHaveTextContent('ana')
  expect(resend).toHaveTextContent('admin.log.what.inviteResend|email=ana.r@example.com')
  expect(grant).toHaveTextContent('admin.log.actor.script')
  expect(grant).toHaveTextContent('set_admin.py')
  expect(grant).toHaveTextContent('admin.log.what.adminGrant|email=didier@example.com')
  expect(gone).toHaveTextContent('admin.log.actor.someone')
  expect(service.listActions).toHaveBeenCalledWith({ kind: undefined, before: undefined, limit: 50 })
})

it('filters by kind, and the address keeps the kind', async () => {
  renderLog()
  await screen.findByRole('table')
  const filters = screen.getByRole('group', { name: 'admin.log.filtersLabel' })
  expect(
    within(filters)
      .getAllByRole('button')
      .map((chip) => chip.getAttribute('aria-label'))
  ).toEqual([
    'admin.log.kinds.all',
    'admin.log.kinds.invitations',
    'admin.log.kinds.moderation',
    'admin.log.kinds.bugs',
    'admin.log.kinds.access'
  ])
  expect(within(filters).getByRole('button', { name: 'admin.log.kinds.all' })).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(within(filters).getByRole('button', { name: 'admin.log.kinds.invitations' }))
  await waitFor(() => expect(service.listActions).toHaveBeenLastCalledWith({ kind: 'invitations', before: undefined, limit: 50 }))
  expect(within(filters).getByRole('button', { name: 'admin.log.kinds.invitations' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByTestId('where')).toHaveTextContent('/admin/log?kind=invitations')
  fireEvent.click(within(filters).getByRole('button', { name: 'admin.log.kinds.all' }))
  expect(screen.getByTestId('where')).toHaveTextContent(/^\/admin\/log$/)
})

it('opens on the kind the address names', async () => {
  renderLog('/admin/log?kind=access')
  await screen.findByRole('table')
  expect(service.listActions).toHaveBeenCalledWith({ kind: 'access', before: undefined, limit: 50 })
  expect(screen.getByRole('button', { name: 'admin.log.kinds.access' })).toHaveAttribute('aria-pressed', 'true')
})

it('reads older rows with next_before, and hides Show older at the end', async () => {
  service.listActions
    .mockResolvedValueOnce({ actions: [REMOVAL], next_before: '2026-11-14T00:01:00Z~a1' })
    .mockResolvedValueOnce({ actions: [GRANT], next_before: null })
  renderLog()
  fireEvent.click(await screen.findByRole('button', { name: 'admin.log.older' }))
  await waitFor(() => expect(rows()).toHaveLength(2))
  expect(service.listActions).toHaveBeenLastCalledWith({ kind: undefined, before: '2026-11-14T00:01:00Z~a1', limit: 50 })
  expect(screen.queryByRole('button', { name: 'admin.log.older' })).not.toBeInTheDocument()
})

it('draws skeleton rows while it loads', () => {
  service.listActions.mockReturnValue(new Promise(() => {}))
  renderLog()
  expect(screen.getByTestId('admin-log-loading')).toHaveAttribute('aria-busy', 'true')
})

it('says when nothing has happened yet, or nothing of one kind', async () => {
  service.listActions.mockResolvedValue({ actions: [], next_before: null })
  renderLog()
  expect(await screen.findByText('admin.log.empty')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'admin.log.kinds.bugs' }))
  expect(await screen.findByText('admin.log.filterEmpty')).toBeInTheDocument()
})

it('says it could not load (a refused filter too), and Try again reads once more', async () => {
  service.listActions.mockRejectedValueOnce({ response: { status: 422 } })
  renderLog()
  expect(await screen.findByText('admin.log.error')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'admin.tryAgain' }))
  expect(await screen.findByRole('table')).toBeInTheDocument()
})

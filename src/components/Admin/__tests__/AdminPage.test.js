/**
 * ADMIN-007a (FR-011, board A): /admin opens on its first built tab; the page
 * says only its admin sees it; the tab bar lists only the tabs that exist.
 * WAIT-002 (board E): the Waitlist tab follows Invitations with its waiting count.
 * ADMIN-003 (board B): the tabs follow the boards' order — Moderation, with its
 * to-review count, then Invitations, then Waitlist — and /admin still opens on
 * Invitations until the Overview exists (D9).
 * ADMIN-007b (board C): Bug reports follows Moderation with its new count.
 */
import React from 'react'
import { render as rtlRender, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AdminPage from '../AdminPage'
import AdminTabs from '../AdminTabs'
import { ADMIN_HOME, ADMIN_TABS } from '../adminTabList'

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }))
jest.mock('@nowry/core/api/services/adminWaitlist.service', () => ({
  WAITLIST_LIST_LIMIT: 200,
  adminWaitlistService: { listWaitlist: jest.fn() }
}))
jest.mock('@nowry/core/api/services/adminModeration.service', () => ({
  MODERATION_QUEUE_LIMIT: 100,
  adminModerationService: { listQueue: jest.fn() }
}))
jest.mock('@nowry/core/api/services/bugs.service', () => ({
  BUG_LIST_LIMIT: 100,
  bugsService: { stats: jest.fn() }
}))
const { bugsService } = require('@nowry/core/api/services/bugs.service')
const { adminWaitlistService } = require('@nowry/core/api/services/adminWaitlist.service')
const { adminModerationService } = require('@nowry/core/api/services/adminModeration.service')

beforeEach(() => {
  adminWaitlistService.listWaitlist.mockResolvedValue({ rows: [], totals: { waiting: 37, invited: 12, joined: 9, left: 2 } })
  adminModerationService.listQueue.mockResolvedValue({ items: [], totals: { to_review: 2, kept: 5, removed: 1 } })
  bugsService.stats.mockResolvedValue({ total: 20, by_status: { new: 3, in_progress: 1, fixed: 14, wont_fix: 2 } })
})

const render = (ui) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

const Where = () => <div data-testid='where'>{useLocation().pathname}</div>

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path='/admin' element={<AdminPage />}>
          <Route index element={<Navigate to={ADMIN_HOME} replace />} />
          <Route path='invitations' element={<Where />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )

it('opens /admin on Invitations until Overview exists, though Moderation and Bug reports come first', () => {
  expect(ADMIN_TABS.map((tab) => tab.key)).toEqual(['moderation', 'bugs', 'invitations', 'waitlist'])
  expect(ADMIN_HOME).toBe('/admin/invitations')
  renderAt('/admin')
  expect(screen.getByTestId('where')).toHaveTextContent('/admin/invitations')
})

it('names the page, says only its admin sees it, and marks the open tab', () => {
  renderAt('/admin/invitations')
  expect(screen.getByRole('heading', { level: 1, name: 'admin.title' })).toBeInTheDocument()
  expect(screen.getByText('admin.onlyYou')).toBeInTheDocument()
  const nav = screen.getByRole('navigation', { name: 'admin.tabsLabel' })
  expect(nav).toContainElement(screen.getByRole('link', { name: 'admin.tabs.invitations' }))
  expect(screen.getByRole('link', { name: 'admin.tabs.invitations' })).toHaveAttribute('aria-current', 'page')
})

it('lists Moderation with how many wait for review, then Invitations, then Waitlist', async () => {
  renderAt('/admin/invitations')
  const links = screen.getAllByRole('link')
  expect(links.map((link) => link.getAttribute('href'))).toEqual([
    '/admin/moderation',
    '/admin/bugs',
    '/admin/invitations',
    '/admin/waitlist'
  ])
  const moderation = await screen.findByRole('link', { name: 'admin.tabs.moderation 2' })
  expect(moderation).not.toHaveAttribute('aria-current')
  expect(adminModerationService.listQueue).toHaveBeenCalledWith({ state: 'to_review', limit: 1 })
})

it('lists Bug reports after Moderation, with how many are new', async () => {
  renderAt('/admin/invitations')
  const bugs = await screen.findByRole('link', { name: 'admin.tabs.bugs 3' })
  expect(bugs).toHaveAttribute('href', '/admin/bugs')
  expect(bugs).not.toHaveAttribute('aria-current')
  expect(bugsService.stats).toHaveBeenCalled()
})

it('lists Waitlist after Invitations, with how many are waiting', async () => {
  renderAt('/admin/invitations')
  const waitlist = await screen.findByRole('link', { name: 'admin.tabs.waitlist 37' })
  expect(waitlist).toHaveTextContent('admin.tabs.waitlist37')
  expect(waitlist).not.toHaveAttribute('aria-current')
  expect(adminWaitlistService.listWaitlist).toHaveBeenCalledWith({ state: 'waiting', limit: 1 })
})

it('draws the tab without a count until it is known', () => {
  adminWaitlistService.listWaitlist.mockReturnValue(new Promise(() => {}))
  adminModerationService.listQueue.mockReturnValue(new Promise(() => {}))
  bugsService.stats.mockReturnValue(new Promise(() => {}))
  renderAt('/admin/invitations')
  expect(screen.getByRole('link', { name: 'admin.tabs.bugs' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'admin.tabs.waitlist' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'admin.tabs.moderation' })).toBeInTheDocument()
})

it('grows by one entry per tab', () => {
  const tabs = [ADMIN_TABS.find((tab) => tab.key === 'invitations'), { key: 'bugs', path: '/admin/bugs', labelKey: 'admin.tabs.bugs' }]
  render(
    <MemoryRouter initialEntries={['/admin/bugs']}>
      <AdminTabs tabs={tabs} />
    </MemoryRouter>
  )
  expect(screen.getAllByRole('link')).toHaveLength(2)
  expect(screen.getByRole('link', { name: 'admin.tabs.bugs' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: 'admin.tabs.invitations' })).not.toHaveAttribute('aria-current')
})

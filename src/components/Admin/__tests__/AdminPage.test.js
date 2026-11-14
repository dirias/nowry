/**
 * ADMIN-007a (FR-011, board A): /admin opens on its first built tab; the page
 * says only its admin sees it; the tab bar lists only the tabs that exist.
 * WAIT-002 (board E): the Waitlist tab follows Invitations with its waiting count.
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
const { adminWaitlistService } = require('@nowry/core/api/services/adminWaitlist.service')

beforeEach(() => {
  adminWaitlistService.listWaitlist.mockResolvedValue({ rows: [], totals: { waiting: 37, invited: 12, joined: 9, left: 2 } })
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

it('opens /admin on Invitations, the first tab, until Overview exists', () => {
  expect(ADMIN_TABS.map((tab) => tab.key)).toEqual(['invitations', 'waitlist'])
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

it('lists Waitlist after Invitations, with how many are waiting', async () => {
  renderAt('/admin/invitations')
  const links = screen.getAllByRole('link')
  expect(links.map((link) => link.getAttribute('href'))).toEqual(['/admin/invitations', '/admin/waitlist'])
  const waitlist = await screen.findByRole('link', { name: 'admin.tabs.waitlist 37' })
  expect(waitlist).toHaveTextContent('admin.tabs.waitlist37')
  expect(waitlist).not.toHaveAttribute('aria-current')
  expect(adminWaitlistService.listWaitlist).toHaveBeenCalledWith({ state: 'waiting', limit: 1 })
})

it('draws the tab without a count until it is known', () => {
  adminWaitlistService.listWaitlist.mockReturnValue(new Promise(() => {}))
  renderAt('/admin/invitations')
  expect(screen.getByRole('link', { name: 'admin.tabs.waitlist' })).toBeInTheDocument()
})

it('grows by one entry per tab', () => {
  const tabs = [ADMIN_TABS[0], { key: 'moderation', path: '/admin/moderation', labelKey: 'admin.tabs.moderation' }]
  render(
    <MemoryRouter initialEntries={['/admin/moderation']}>
      <AdminTabs tabs={tabs} />
    </MemoryRouter>
  )
  expect(screen.getAllByRole('link')).toHaveLength(2)
  expect(screen.getByRole('link', { name: 'admin.tabs.moderation' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: 'admin.tabs.invitations' })).not.toHaveAttribute('aria-current')
})

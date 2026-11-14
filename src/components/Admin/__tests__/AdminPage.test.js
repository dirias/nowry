/**
 * ADMIN-007a (FR-011, board A): /admin opens on its first built tab; the page
 * says only its admin sees it; the tab bar lists only the tabs that exist.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AdminPage from '../AdminPage'
import AdminTabs from '../AdminTabs'
import { ADMIN_HOME, ADMIN_TABS } from '../adminTabList'

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }))

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

it('opens /admin on Invitations while it is the only tab', () => {
  expect(ADMIN_TABS.map((tab) => tab.key)).toEqual(['invitations'])
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

it('grows by one entry per tab', () => {
  const tabs = [...ADMIN_TABS, { key: 'waitlist', path: '/admin/waitlist', labelKey: 'admin.tabs.waitlist' }]
  render(
    <MemoryRouter initialEntries={['/admin/waitlist']}>
      <AdminTabs tabs={tabs} />
    </MemoryRouter>
  )
  expect(screen.getAllByRole('link')).toHaveLength(2)
  expect(screen.getByRole('link', { name: 'admin.tabs.waitlist' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: 'admin.tabs.invitations' })).not.toHaveAttribute('aria-current')
})

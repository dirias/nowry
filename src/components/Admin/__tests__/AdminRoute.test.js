/**
 * ADMIN-007a (FR-011): /admin and the old bug pages open only for an admin;
 * anyone else is sent Home without a word, and nothing heavy draws while the
 * account is still being read.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdminRoute from '../AdminRoute'

let mockAuth = {}
jest.mock('@nowry/core/context/AuthContext', () => ({ useAuth: () => mockAuth }))
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }))

const renderAt = (path = '/admin') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path='/' element={<div>home page</div>} />
        <Route
          path='/admin'
          element={
            <AdminRoute>
              <div>admin page</div>
            </AdminRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  )

it('opens for an admin', () => {
  mockAuth = { loading: false, isAuthenticated: true, isAdmin: true }
  renderAt()
  expect(screen.getByText('admin page')).toBeInTheDocument()
})

it('sends anyone else Home, with no message', () => {
  mockAuth = { loading: false, isAuthenticated: true, isAdmin: false }
  renderAt()
  expect(screen.getByText('home page')).toBeInTheDocument()
  expect(screen.queryByText('admin page')).not.toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('sends a signed-out visitor Home too', () => {
  mockAuth = { loading: false, isAuthenticated: false, isAdmin: false }
  renderAt()
  expect(screen.getByText('home page')).toBeInTheDocument()
})

it('draws a quiet placeholder while the account is read, never the page or a spinner', () => {
  mockAuth = { loading: true, isAuthenticated: false, isAdmin: false }
  renderAt()
  expect(screen.queryByText('admin page')).not.toBeInTheDocument()
  expect(screen.queryByText('home page')).not.toBeInTheDocument()
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  expect(screen.getByTestId('admin-route-loading')).toHaveAttribute('aria-busy', 'true')
})

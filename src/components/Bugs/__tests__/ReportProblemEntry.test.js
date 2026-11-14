/**
 * BUG-001 (FR-007, board F): "Report a problem" is in the account menu and the
 * phone-width drawer for every signed-in account while the beta is on, and
 * nowhere otherwise. With Admin it shares one group.
 */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { List, Menu } from '@mui/joy'
import { ReportDrawerEntry, ReportMenuEntry } from '../ReportProblemEntry'
import { AdminMenuEntry } from '../../Admin/AdminMenuEntry'

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }))
let mockUser = { id: 'u1' }
let mockBeta = { active: true }
let mockAdmin = false
jest.mock('@nowry/core/context/AuthContext', () => ({ useAuth: () => ({ user: mockUser, isAdmin: mockAdmin }) }))
jest.mock('@nowry/core/context/BetaContext', () => ({ useBeta: () => ({ config: mockBeta }) }))

beforeEach(() => {
  mockUser = { id: 'u1' }
  mockBeta = { active: true }
  mockAdmin = false
})

const renderMenu = (onOpen = jest.fn()) =>
  render(
    <MemoryRouter>
      <Menu open anchorEl={document.body}>
        <ReportMenuEntry onOpen={onOpen} />
        <AdminMenuEntry divider={false} />
      </Menu>
    </MemoryRouter>
  )

it('offers it to a signed-in account while the beta is on, and opens the form', () => {
  const onOpen = jest.fn()
  renderMenu(onOpen)
  fireEvent.click(screen.getByRole('menuitem', { name: 'report.menu' }))
  expect(onOpen).toHaveBeenCalled()
})

it('offers it to an account without the beta stamp too: the beta config is the test', () => {
  mockUser = { id: 'u0', beta: undefined }
  renderMenu()
  expect(screen.getByRole('menuitem', { name: 'report.menu' })).toBeInTheDocument()
})

it('offers nothing once the beta is off, or to a guest', () => {
  mockBeta = { active: false }
  const { unmount } = renderMenu()
  expect(screen.queryByRole('menuitem', { name: 'report.menu' })).not.toBeInTheDocument()
  unmount()
  mockBeta = { active: true }
  mockUser = null
  renderMenu()
  expect(screen.queryByRole('menuitem', { name: 'report.menu' })).not.toBeInTheDocument()
})

it('puts Admin after it in the same group for an admin', () => {
  mockAdmin = true
  renderMenu()
  const items = screen.getAllByRole('menuitem').map((item) => item.getAttribute('aria-label'))
  expect(items).toEqual(['report.menu', 'admin.menu'])
  expect(screen.getAllByRole('separator')).toHaveLength(1)
})

it('is in the drawer too', () => {
  const onOpen = jest.fn()
  render(
    <MemoryRouter>
      <List>
        <ReportDrawerEntry onOpen={onOpen} />
      </List>
    </MemoryRouter>
  )
  fireEvent.click(screen.getByRole('button', { name: 'report.menu' }))
  expect(onOpen).toHaveBeenCalled()
})

it('is not in the drawer once the beta is off', () => {
  mockBeta = { active: false }
  render(
    <List>
      <ReportDrawerEntry onOpen={jest.fn()} />
    </List>
  )
  expect(screen.queryByRole('button', { name: 'report.menu' })).not.toBeInTheDocument()
})

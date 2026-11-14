/** ADMIN-007a (board F): "Admin" in the account menu and the drawer, for admins only. */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Dropdown, List, Menu, MenuButton } from '@mui/joy'
import { AdminDrawerEntry, AdminMenuEntry } from '../AdminMenuEntry'

let mockAuth = {}
jest.mock('@nowry/core/context/AuthContext', () => ({ useAuth: () => mockAuth }))
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }))

const renderMenu = () => {
  render(
    <MemoryRouter>
      <Dropdown>
        <MenuButton>open</MenuButton>
        <Menu>
          <AdminMenuEntry />
        </Menu>
      </Dropdown>
    </MemoryRouter>
  )
  fireEvent.click(screen.getByRole('button', { name: 'open' }))
}

const renderDrawer = (onNavigate = jest.fn()) =>
  render(
    <MemoryRouter>
      <List>
        <AdminDrawerEntry onNavigate={onNavigate} />
      </List>
    </MemoryRouter>
  )

it('shows Admin in the menu for an admin, linking to /admin', () => {
  mockAuth = { isAdmin: true }
  renderMenu()
  expect(screen.getByRole('menuitem', { name: 'admin.menu' })).toHaveAttribute('href', '/admin')
})

it('shows nothing in the menu for anyone else', () => {
  mockAuth = { isAdmin: false }
  renderMenu()
  expect(screen.queryByRole('menuitem', { name: 'admin.menu' })).not.toBeInTheDocument()
})

it('shows Admin in the drawer for an admin and closes the drawer on the way', () => {
  mockAuth = { isAdmin: true }
  const onNavigate = jest.fn()
  renderDrawer(onNavigate)
  const link = screen.getByRole('link', { name: 'admin.menu' })
  expect(link).toHaveAttribute('href', '/admin')
  fireEvent.click(link)
  expect(onNavigate).toHaveBeenCalled()
})

it('shows nothing in the drawer for anyone else', () => {
  mockAuth = { isAdmin: false }
  renderDrawer()
  expect(screen.queryByRole('link', { name: 'admin.menu' })).not.toBeInTheDocument()
})

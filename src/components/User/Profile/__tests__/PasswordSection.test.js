/** ADR-092, FR-045: a Google-only account sets a password after Google; both methods show a line. */
import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }) }))
let mockProviders = ['google.com']
const mockAuth = {
  signInProviders: () => mockProviders,
  reauthenticate: jest.fn(),
  reloadProviders: jest.fn(),
  signInAgainWithPassword: jest.fn()
}
jest.mock('@nowry/core/api/services/auth.service', () => ({ authService: mockAuth }))
const mockUser = { setPassword: jest.fn(), changePassword: jest.fn() }
jest.mock('@nowry/core/api/services/user.service', () => ({ userService: mockUser }))

const PasswordSection = require('../PasswordSection').default

const fillNew = (next, confirmation) => {
  const form = screen.getByTestId('password-section')
  fireEvent.change(form.querySelector('input[name="new-password"]'), { target: { value: next } })
  fireEvent.change(form.querySelector('input[name="confirm-password"]'), { target: { value: confirmation } })
}

beforeEach(() => {
  Object.values(mockAuth).forEach((fn) => fn.mockReset?.())
  Object.values(mockUser).forEach((fn) => fn.mockReset())
  mockProviders = ['google.com']
})

test('a Google-only account sees Set a password, asks no current password, and confirms with Google first', async () => {
  mockAuth.reauthenticate.mockResolvedValue()
  mockUser.setPassword.mockImplementation(async () => {
    mockProviders = ['google.com', 'password']
    return { status: 'set' }
  })
  render(<PasswordSection />)
  expect(screen.getByText('settings.security.setPasswordBody')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'settings.security.setPassword' }))
  expect(screen.getByTestId('password-section').querySelector('input[name="current-password"]')).toBeNull()
  fillNew('long-enough-1', 'long-enough-1')
  fireEvent.click(screen.getByRole('button', { name: 'settings.security.setPasswordGoogle' }))
  expect(await screen.findByText('settings.security.passwordSet')).toBeInTheDocument()
  expect(mockAuth.reauthenticate).toHaveBeenCalledWith({ method: 'google' })
  expect(mockUser.setPassword).toHaveBeenCalledWith('long-enough-1', 'es')
  await waitFor(() => expect(screen.getByText('settings.security.googleConnected')).toBeInTheDocument())
})

test('closing the Google step sets nothing', async () => {
  mockAuth.reauthenticate.mockRejectedValue(Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' }))
  render(<PasswordSection />)
  fireEvent.click(screen.getByRole('button', { name: 'settings.security.setPassword' }))
  fillNew('long-enough-1', 'long-enough-1')
  fireEvent.click(screen.getByRole('button', { name: 'settings.security.setPasswordGoogle' }))
  expect(await screen.findByText('settings.security.reauthGoogle')).toBeInTheDocument()
  expect(mockUser.setPassword).not.toHaveBeenCalled()
})

test('an account with both shows Change password and the Google line', () => {
  mockProviders = ['password', 'google.com']
  render(<PasswordSection />)
  expect(screen.getByText('settings.security.changePassword')).toBeInTheDocument()
  expect(screen.getByText('settings.security.googleConnected')).toBeInTheDocument()
})

test('arriving from the reset email opens the form', () => {
  render(<PasswordSection openOnArrival />)
  expect(screen.getByTestId('password-section').querySelector('input[name="new-password"]')).not.toBeNull()
})

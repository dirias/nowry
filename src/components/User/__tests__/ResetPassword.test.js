/**
 * FR-032 (SIGNIN-003): the screen after a reset is asked for tells everyone,
 * whatever the address, that a Google sign-in has no password, naming the
 * Google button by its own label.
 */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, values) => (values ? `${key}|${JSON.stringify(values)}` : key),
    i18n: { language: 'en' }
  })
}))

const mockResetPassword = jest.fn()
jest.mock('@nowry/core/api/services/auth.service', () => ({
  authService: { resetPassword: (...args) => mockResetPassword(...args) }
}))

const ResetPassword = require('../ResetPassword').default

const ask = (email) => {
  const { container } = render(
    <MemoryRouter>
      <ResetPassword />
    </MemoryRouter>
  )
  fireEvent.change(container.querySelector('input[type="email"]'), { target: { value: email } })
  fireEvent.submit(container.querySelector('form'))
}

beforeEach(() => mockResetPassword.mockReset().mockResolvedValue(undefined))

it.each(['someone@example.com', 'nobody@example.com'])('says the Google line under the confirmation for %s', async (email) => {
  ask(email)
  expect(await screen.findByText('auth.resetPassword.successMsg')).toBeInTheDocument()
  expect(screen.getByText('auth.resetPassword.googleNote|{"button":"auth.signInGoogle"}')).toBeInTheDocument()
  expect(mockResetPassword).toHaveBeenCalledWith(email, 'en')
})

it('does not say it before anything is sent', () => {
  render(
    <MemoryRouter>
      <ResetPassword />
    </MemoryRouter>
  )
  expect(screen.queryByText(/googleNote/)).toBeNull()
})

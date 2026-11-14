/** ADMIN-008b — the re-sign-in dialog worded for the admin write that asked for it (board J). */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import AdminReauthDialog from '../AdminReauthDialog'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, options) => (options?.when ? `${key}:${options.when}` : key), i18n: { language: 'en' } })
}))

const reauth = (overrides = {}) => ({
  pending: { action: 'revoke', lastSignIn: 1763100000 },
  methods: ['password'],
  busy: false,
  error: null,
  signIn: jest.fn(),
  cancel: jest.fn(),
  ...overrides
})

it('names the action in the title and the key, and says when the last sign-in was', () => {
  const state = reauth()
  render(<AdminReauthDialog reauth={state} />)
  expect(screen.getByRole('dialog')).toHaveAccessibleName('admin.reauth.revoke.title')
  expect(screen.getByText(/admin\.reauth\.body admin\.reauth\.lastSignIn:.+ admin\.reauth\.nothingYet/)).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('reauth.passwordLabel', { exact: false }), { target: { value: 'pw' } })
  fireEvent.click(screen.getByRole('button', { name: 'admin.reauth.revoke.confirm' }))
  expect(state.signIn).toHaveBeenCalledWith({ method: 'password', password: 'pw' })
  fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }))
  expect(state.cancel).toHaveBeenCalled()
})

it('is closed while nothing waits, and shows a wrong password under the field', () => {
  const { rerender } = render(<AdminReauthDialog reauth={reauth({ pending: null })} />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  rerender(<AdminReauthDialog reauth={reauth({ error: 'reauth.wrongPassword', pending: { action: 'send', lastSignIn: null } })} />)
  expect(screen.getByText('reauth.wrongPassword')).toBeInTheDocument()
  expect(screen.getByText('admin.reauth.body admin.reauth.nothingYet')).toBeInTheDocument()
})

/**
 * ADMIN-008b — the shared re-sign-in dialog (board J): the account's own ways
 * of signing in, Google first, and Cancel / "Sign in and <action>".
 */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import ReauthDialog from '../ReauthDialog'

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }))

const renderDialog = (props = {}) => {
  const onSubmit = jest.fn()
  const onCancel = jest.fn()
  render(
    <ReauthDialog
      open
      title='Sign in again to send invitations'
      body='Admin changes need a sign-in from the last 12 hours.'
      methods={['google', 'password']}
      confirmLabel='Sign in and send'
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />
  )
  return { onSubmit, onCancel }
}

it('offers Google and the password for an account with both', () => {
  const { onSubmit } = renderDialog()
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Sign in again to send invitations')
  fireEvent.click(screen.getByRole('button', { name: 'reauth.google' }))
  expect(onSubmit).toHaveBeenCalledWith({ method: 'google' })
  expect(screen.getByText('reauth.orPassword')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('reauth.passwordLabel', { exact: false }), { target: { value: 'secret' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in and send' }))
  expect(onSubmit).toHaveBeenLastCalledWith({ method: 'password', password: 'secret' })
})

it('a Google-only account signs in with the action key itself', () => {
  const { onSubmit } = renderDialog({ methods: ['google'] })
  expect(screen.queryByRole('button', { name: 'reauth.google' })).not.toBeInTheDocument()
  expect(screen.queryByLabelText('reauth.passwordLabel', { exact: false })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Sign in and send' }))
  expect(onSubmit).toHaveBeenCalledWith({ method: 'google' })
})

it('a password-only account submits on Enter', () => {
  const { onSubmit } = renderDialog({ methods: ['password'] })
  const field = screen.getByLabelText('reauth.passwordLabel', { exact: false })
  fireEvent.change(field, { target: { value: 'pw' } })
  fireEvent.submit(field.closest('form'))
  expect(onSubmit).toHaveBeenCalledWith({ method: 'password', password: 'pw' })
})

it('Cancel closes, except while signing in', () => {
  const { onCancel } = renderDialog()
  fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }))
  expect(onCancel).toHaveBeenCalledTimes(1)
})

it('says why a sign-in failed, under the field for a wrong password', () => {
  renderDialog({ error: 'That password is not right.', passwordError: true })
  expect(screen.getByText('That password is not right.')).toBeInTheDocument()
})

it('says a general failure as an alert', () => {
  renderDialog({ error: 'We could not confirm it is you.' })
  expect(screen.getByRole('alert')).toHaveTextContent('We could not confirm it is you.')
})

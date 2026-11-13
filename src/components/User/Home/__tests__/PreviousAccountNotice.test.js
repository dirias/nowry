/** ADR-089, FR-041: the re-registration notice on Home — shown from the API's answer, dismissed once. */
import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, values) => (values ? `${key} ${values.deletedOn} ${values.erasedOn}` : key), i18n: { language: 'en' } })
}))
let mockUser
const mockUpdateUser = jest.fn((patch) => {
  mockUser = { ...mockUser, ...patch(mockUser) }
})
jest.mock('@nowry/core/context/AuthContext', () => ({ useAuth: () => ({ user: mockUser, updateUser: mockUpdateUser }) }))
const mockDismiss = jest.fn().mockResolvedValue()
jest.mock('@nowry/core/api/services/user.service', () => ({ userService: { dismissPreviousAccount: () => mockDismiss() } }))

const PreviousAccountNotice = require('../PreviousAccountNotice').default

test('nothing is drawn when the API names no previous account', () => {
  mockUser = { email: 'ana@example.com', previous_account: null }
  render(<PreviousAccountNotice />)
  expect(screen.queryByTestId('previous-account-notice')).toBeNull()
})

test('both dates are drawn, and dismissing hides it and tells the API once', async () => {
  mockUser = {
    email: 'ana@example.com',
    previous_account: { deleted_at: '2026-11-10T09:00:00+00:00', erased_at: '2026-12-10T09:00:00+00:00' }
  }
  render(<PreviousAccountNotice />)
  expect(screen.getByText('previousAccount.body November 10, 2026 December 10, 2026')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'previousAccount.dismissAria' }))
  await waitFor(() => expect(screen.queryByTestId('previous-account-notice')).toBeNull())
  expect(mockDismiss).toHaveBeenCalledTimes(1)
})

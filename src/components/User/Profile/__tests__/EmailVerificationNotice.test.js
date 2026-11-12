/** "Confirm your email" in Settings → Security (ADR-076, FR-018). */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, values) => (values ? `${key}:${values.email}` : key), i18n: { language: 'es' } })
}))
let mockState
jest.mock('@nowry/core/hooks/useEmailVerification', () => ({ useEmailVerification: () => mockState }))

import EmailVerificationNotice from '../EmailVerificationNotice'

const state = (over = {}) => ({ needed: true, email: 'ana@x.io', status: 'idle', send: jest.fn(), check: jest.fn(), ...over })

it('draws nothing for a verified or Google account', () => {
  mockState = state({ needed: false })
  const { container } = render(<EmailVerificationNotice />)
  expect(container).toBeEmptyDOMElement()
})

it('names the address and offers the two actions, neither of them solid', () => {
  mockState = state()
  const { container } = render(<EmailVerificationNotice />)
  expect(screen.getByText('auth.verify.title')).toBeInTheDocument()
  expect(screen.getByText('auth.verify.body:ana@x.io')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'auth.verify.resend' }))
  fireEvent.click(screen.getByRole('button', { name: 'auth.verify.check' }))
  expect(mockState.send).toHaveBeenCalledTimes(1)
  expect(mockState.check).toHaveBeenCalledTimes(1)
  expect(container.querySelectorAll('.MuiButton-variantSolid')).toHaveLength(0)
})

it.each([
  ['sent', 'auth.verify.sent'],
  ['failed', 'auth.verify.failed'],
  ['notYet', 'auth.verify.notYet']
])('says what happened: %s', (status, key) => {
  mockState = state({ status })
  render(<EmailVerificationNotice />)
  expect(screen.getByText(key)).toBeInTheDocument()
})

it('ends on "confirmed" with no actions left', () => {
  mockState = state({ status: 'done' })
  render(<EmailVerificationNotice />)
  expect(screen.getByText('auth.verify.done')).toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

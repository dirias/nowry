/**
 * The waitlist form (ADR-038, FR-004; the purpose line is WAIT-003, FR-014).
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: 'es-MX' } }) }))

const mockJoin = jest.fn()
jest.mock('@nowry/core/api/services/beta.service', () => ({ betaService: { joinWaitlist: (...args) => mockJoin(...args) } }))

import WaitlistForm from '../WaitlistForm'

beforeEach(() => mockJoin.mockReset())

it('says what the email is used for, and the field is described by that line', () => {
  render(<WaitlistForm source='/' />)
  const purpose = screen.getByText('beta.waitlist.purpose')
  expect(screen.getByRole('textbox', { name: 'auth.email' })).toHaveAttribute('aria-describedby', purpose.id)
})

it('sends the email, the language and the page, then acknowledges and clears the field', async () => {
  mockJoin.mockResolvedValue({ message: 'ok' })
  render(<WaitlistForm source='/register' />)
  await userEvent.type(screen.getByRole('textbox', { name: 'auth.email' }), ' ana@example.com ')
  await userEvent.click(screen.getByRole('button', { name: 'beta.waitlist.cta' }))

  expect(await screen.findByText('beta.waitlist.sent')).toBeInTheDocument()
  expect(mockJoin).toHaveBeenCalledWith({ email: 'ana@example.com', locale: 'es', source: '/register' })
  expect(screen.getByRole('textbox', { name: 'auth.email' })).toHaveValue('')
})

it('keeps the email when the request fails, so it can be sent again', async () => {
  mockJoin.mockRejectedValue(new Error('offline'))
  render(<WaitlistForm source='/' />)
  await userEvent.type(screen.getByRole('textbox', { name: 'auth.email' }), 'ana@example.com')
  await userEvent.click(screen.getByRole('button', { name: 'beta.waitlist.cta' }))

  expect(await screen.findByText('beta.waitlist.failed')).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'auth.email' })).toHaveValue('ana@example.com')
})

it('does not call the server for an empty field', async () => {
  render(<WaitlistForm source='/' />)
  screen.getByRole('form', { name: 'beta.waitlist.title' }).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await waitFor(() => expect(mockJoin).not.toHaveBeenCalled())
})

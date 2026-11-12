/**
 * The leave page (MAIL-008, FR-026, ADR-080; Design H): opening it removes no
 * one, one press leaves, and an unknown link reads the same without an address.
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import WaitlistLeave from '../WaitlistLeave'

const mockT = jest.fn()
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT, i18n: { language: 'en' } }) }))

const mockRead = jest.fn()
const mockLeave = jest.fn()
jest.mock('@nowry/core/api/services/beta.service', () => ({
  betaService: { readWaitlistLeave: (...args) => mockRead(...args), leaveWaitlist: (...args) => mockLeave(...args) }
}))

const open = () =>
  render(
    <MemoryRouter initialEntries={['/waitlist/leave/tok-123']}>
      <Routes>
        <Route path='/waitlist/leave/:token' element={<WaitlistLeave />} />
        <Route path='/' element={<p>home</p>} />
      </Routes>
    </MemoryRouter>
  )

beforeEach(() => {
  // CRA resets mocks before each test, so the stand-in for `t` is given its words here.
  mockT.mockReset().mockImplementation((key, options) => (options?.email ? `${key}:${options.email}` : key))
  mockRead.mockReset().mockResolvedValue({ email_hint: 'm•••@example.com', locale: 'ja' })
  mockLeave.mockReset().mockResolvedValue({ left: true })
})

it('asks before removing anyone, naming the masked address in the language of the row', async () => {
  open()
  expect(await screen.findByRole('heading', { name: 'beta.waitlist.leave.title' })).toBeInTheDocument()
  expect(screen.getByText('beta.waitlist.leave.body:m•••@example.com')).toBeInTheDocument()
  expect(mockRead).toHaveBeenCalledWith('tok-123')
  expect(mockLeave).not.toHaveBeenCalled()
  expect(mockT).toHaveBeenCalledWith('beta.waitlist.leave.title', expect.objectContaining({ lng: 'ja' }))
})

it('leaves on one press and says so', async () => {
  open()
  await userEvent.click(await screen.findByRole('button', { name: 'beta.waitlist.leave.confirm' }))
  expect(await screen.findByRole('heading', { name: 'beta.waitlist.leave.doneTitle' })).toBeInTheDocument()
  expect(mockLeave).toHaveBeenCalledWith('tok-123')
  expect(screen.getByRole('link', { name: 'beta.waitlist.leave.back' })).toHaveAttribute('href', '/')
})

it('shows the same page without an address for an unknown link, in the page language', async () => {
  mockRead.mockResolvedValue({ email_hint: null, locale: null })
  open()
  expect(await screen.findByText('beta.waitlist.leave.bodyNoEmail')).toBeInTheDocument()
  expect(mockT).toHaveBeenCalledWith('beta.waitlist.leave.title', expect.objectContaining({ lng: 'en' }))
  expect(screen.getByRole('button', { name: 'beta.waitlist.leave.confirm' })).toBeInTheDocument()
})

it('still asks when the link could not be read', async () => {
  mockRead.mockRejectedValue(new Error('offline'))
  open()
  expect(await screen.findByText('beta.waitlist.leave.bodyNoEmail')).toBeInTheDocument()
})

it('keeps the question and says so when the press fails', async () => {
  mockLeave.mockRejectedValue(new Error('offline'))
  open()
  await userEvent.click(await screen.findByRole('button', { name: 'beta.waitlist.leave.confirm' }))
  expect(await screen.findByText('beta.waitlist.failed')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'beta.waitlist.leave.title' })).toBeInTheDocument()
})

it('lets the person stay', async () => {
  open()
  await userEvent.click(await screen.findByRole('link', { name: 'beta.waitlist.leave.stay' }))
  await waitFor(() => expect(screen.getByText('home')).toBeInTheDocument())
  expect(mockLeave).not.toHaveBeenCalled()
})

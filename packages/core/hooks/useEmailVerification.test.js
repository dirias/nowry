/**
 * The address proves itself (ADR-076, FR-018): who is asked, and what the two
 * actions report.
 */
import React from 'react'
import { render, screen, act } from '@testing-library/react'

let mockListener
const mockFirebaseUser = (over = {}) => ({ email: 'ana@x.io', emailVerified: false, providerData: [{ providerId: 'password' }], ...over })
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (auth, listener) => {
    mockListener = listener
    return () => {}
  }
}))
jest.mock('../platform', () => ({ auth: { instance: () => ({}) } }))
const mockSend = jest.fn()
const mockConfirm = jest.fn()
jest.mock('../api/services', () => ({
  authService: { requestVerification: (...args) => mockSend(...args), confirmVerification: (...args) => mockConfirm(...args) }
}))

import { needsVerification, useEmailVerification } from './useEmailVerification'

let hook
const Probe = () => {
  hook = useEmailVerification('es-MX')
  return React.createElement('output', null, JSON.stringify({ needed: hook.needed, email: hook.email, status: hook.status }))
}
const read = () => JSON.parse(screen.getByRole('status').textContent)
const mount = (firebaseUser) => {
  render(React.createElement(Probe))
  act(() => mockListener(firebaseUser))
}

beforeEach(() => {
  mockSend.mockReset()
  mockConfirm.mockReset()
})

it('asks only a password account whose email is unverified', () => {
  expect(needsVerification(mockFirebaseUser())).toBe(true)
  expect(needsVerification(mockFirebaseUser({ emailVerified: true }))).toBe(false)
  expect(needsVerification(mockFirebaseUser({ providerData: [{ providerId: 'google.com' }] }))).toBe(false)
  expect(needsVerification(null)).toBe(false)
})

it('reports the address and sends in the app language', async () => {
  mockSend.mockResolvedValue({ status: 'sent' })
  mount(mockFirebaseUser())
  expect(read()).toEqual({ needed: true, email: 'ana@x.io', status: 'idle' })
  await act(() => hook.send())
  expect(mockSend).toHaveBeenCalledWith('es-MX')
  expect(read().status).toBe('sent')
  expect(hook.wait).toBe(60)
})

it('rests the key for as long as the API says when one was sent a moment ago (ADR-078)', async () => {
  mockSend.mockResolvedValue({ status: 'wait', retryAfter: 42 })
  mount(mockFirebaseUser())
  await act(() => hook.send())
  expect(read().status).toBe('wait')
  expect(hook.wait).toBe(42)
})

it('says so when the send fails, and when the link was not opened yet', async () => {
  mockSend.mockRejectedValue(new Error('auth/too-many-requests'))
  mockConfirm.mockResolvedValue(false)
  mount(mockFirebaseUser())
  await act(() => hook.send())
  expect(read().status).toBe('failed')
  await act(() => hook.check())
  expect(read().status).toBe('notYet')
})

it('keeps the line for its last word once confirmed', async () => {
  mockConfirm.mockResolvedValue(true)
  mount(mockFirebaseUser())
  await act(() => hook.check())
  act(() => mockListener(mockFirebaseUser({ emailVerified: true })))
  expect(read()).toEqual({ needed: true, email: 'ana@x.io', status: 'done' })
})

it('is absent for a Google account', () => {
  mount(mockFirebaseUser({ emailVerified: true, providerData: [{ providerId: 'google.com' }] }))
  expect(read().needed).toBe(false)
})

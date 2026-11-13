/**
 * ADR-089, FR-038: the email confirms; an old sign-in is asked for again
 * before the delete call; the API's refusal leads to the same step.
 */
import React from 'react'
import { render, act } from '@testing-library/react'

const mockSignInTime = jest.fn()
const mockReauth = jest.fn()
const mockDelete = jest.fn()
let mockProviders = ['password']
jest.mock('../api/services/auth.service', () => ({
  authService: {
    signInTime: (...a) => mockSignInTime(...a),
    signInProviders: () => mockProviders,
    reauthenticate: (...a) => mockReauth(...a)
  }
}))
jest.mock('../api/services/user.service', () => ({ userService: { deleteAccount: (...a) => mockDelete(...a) } }))

import { useAccountDeletion } from './useAccountDeletion'

let hook
const onDeleted = jest.fn()
const Probe = () => {
  hook = useAccountDeletion({ email: 'ana@example.com', language: 'es', onDeleted })
  return null
}
const now = () => Math.floor(Date.now() / 1000)
const refusal = { response: { status: 401, data: { detail: { code: 'reauth_required' } } } }

beforeEach(() => {
  ;[mockSignInTime, mockReauth, mockDelete, onDeleted].forEach((fn) => fn.mockReset())
  mockProviders = ['password']
  render(React.createElement(Probe))
})

test('a fresh sign-in deletes at once, in the reader language', async () => {
  mockSignInTime.mockResolvedValue(now() - 30)
  mockDelete.mockResolvedValue({})
  await act(() => hook.confirm('ana@example.com'))
  expect(mockDelete).toHaveBeenCalledWith('es')
  expect(hook.step).toBe('done')
  expect(onDeleted).toHaveBeenCalledTimes(1)
})

test('a wrong email does nothing', async () => {
  await act(() => hook.confirm('other@example.com'))
  expect(mockSignInTime).not.toHaveBeenCalled()
  expect(mockDelete).not.toHaveBeenCalled()
})

test('an old sign-in is asked for again before anything is deleted, then the deletion goes through', async () => {
  mockSignInTime.mockResolvedValue(now() - 3600)
  await act(() => hook.confirm('ana@example.com'))
  expect(hook.step).toBe('reauth')
  expect(hook.method).toBe('password')
  expect(mockDelete).not.toHaveBeenCalled()
  mockReauth.mockResolvedValue()
  mockDelete.mockResolvedValue({})
  await act(() => hook.reauthenticateAndDelete('Str0ng-enough!'))
  expect(mockReauth).toHaveBeenCalledWith({ method: 'password', password: 'Str0ng-enough!' })
  expect(hook.step).toBe('done')
})

test('a wrong password says so and deletes nothing', async () => {
  mockSignInTime.mockResolvedValue(now() - 3600)
  await act(() => hook.confirm('ana@example.com'))
  mockReauth.mockRejectedValue(Object.assign(new Error('x'), { code: 'auth/invalid-credential' }))
  await act(() => hook.reauthenticateAndDelete('nope'))
  expect(hook.error).toBe('settings.deleteAccount.reauth.wrongPassword')
  expect(mockDelete).not.toHaveBeenCalled()
})

test('the API refusing an old sign-in opens the same step', async () => {
  mockSignInTime.mockResolvedValue(now() - 10)
  mockDelete.mockRejectedValue(refusal)
  await act(() => hook.confirm('ana@example.com'))
  expect(hook.step).toBe('reauth')
})

test('a Google-only account proves it with Google', async () => {
  mockProviders = ['google.com']
  render(React.createElement(Probe))
  expect(hook.method).toBe('google')
})

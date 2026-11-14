/**
 * ADMIN-008b — an admin write refused for an old sign-in asks for the sign-in
 * again, then runs once more by itself (FR-010, board J).
 */
import { renderHook, act, waitFor } from '@testing-library/react'

import { useReauthRetry } from './useReauthRetry'
import { isReauthCancelled } from '../domain/recentSignIn'

jest.mock('../api/services/auth.service', () => ({
  authService: { signInProviders: jest.fn(), signInTime: jest.fn(), reauthenticate: jest.fn() }
}))
const { authService } = require('../api/services/auth.service')

const REFUSED = { response: { status: 401, data: { detail: { code: 'reauth_required' } } } }

beforeEach(() => {
  authService.signInProviders.mockReturnValue(['google.com', 'password'])
  authService.signInTime.mockResolvedValue(1763100000)
})

it('passes an answer straight through when the sign-in is recent', async () => {
  const { result } = renderHook(() => useReauthRetry())
  const call = jest.fn().mockResolvedValue('done')
  await expect(result.current.run('send', call)).resolves.toBe('done')
  expect(call).toHaveBeenCalledTimes(1)
  expect(result.current.pending).toBeNull()
})

it('passes any other refusal straight through', async () => {
  const { result } = renderHook(() => useReauthRetry())
  const refusal = { response: { status: 409, data: { detail: { code: 'over_budget' } } } }
  await expect(result.current.run('send', () => Promise.reject(refusal))).rejects.toBe(refusal)
  expect(result.current.pending).toBeNull()
})

it('asks for the sign-in on reauth_required, then retries the same call once', async () => {
  authService.reauthenticate.mockResolvedValue()
  const call = jest.fn().mockRejectedValueOnce(REFUSED).mockResolvedValueOnce('sent')
  const { result } = renderHook(() => useReauthRetry())

  let outcome
  act(() => {
    outcome = result.current.run('send', call)
  })
  await waitFor(() => expect(result.current.pending).toEqual({ action: 'send', lastSignIn: 1763100000 }))
  expect(result.current.methods).toEqual(['google', 'password'])

  await act(async () => {
    await result.current.signIn({ method: 'password', password: 'secret' })
  })
  await expect(outcome).resolves.toBe('sent')
  expect(authService.reauthenticate).toHaveBeenCalledWith({ method: 'password', password: 'secret' })
  expect(call).toHaveBeenCalledTimes(2)
  expect(result.current.pending).toBeNull()
})

it('retries only once: a second refusal is the caller’s', async () => {
  authService.reauthenticate.mockResolvedValue()
  const call = jest.fn().mockRejectedValue(REFUSED)
  const { result } = renderHook(() => useReauthRetry())
  let outcome
  act(() => {
    outcome = result.current.run('revoke', call)
    outcome.catch(() => {}) // asserted below; settled inside act
  })
  await waitFor(() => expect(result.current.pending?.action).toBe('revoke'))
  await act(async () => {
    await result.current.signIn({ method: 'google' })
  })
  await expect(outcome).rejects.toBe(REFUSED)
  expect(call).toHaveBeenCalledTimes(2)
})

it('keeps the dialog open with the reason when the sign-in fails', async () => {
  authService.reauthenticate.mockRejectedValue({ code: 'auth/wrong-password' })
  const call = jest.fn().mockRejectedValue(REFUSED)
  const { result } = renderHook(() => useReauthRetry())
  act(() => {
    result.current.run('send', call)
  })
  await waitFor(() => expect(result.current.pending).not.toBeNull())
  await act(async () => {
    await result.current.signIn({ method: 'password', password: 'wrong' })
  })
  expect(result.current.error).toBe('reauth.wrongPassword')
  expect(result.current.pending).not.toBeNull()
  expect(result.current.busy).toBe(false)
  expect(call).toHaveBeenCalledTimes(1)
})

it('cancel rejects as cancelled and leaves the call unrun', async () => {
  const call = jest.fn().mockRejectedValue(REFUSED)
  const { result } = renderHook(() => useReauthRetry())
  let outcome
  act(() => {
    outcome = result.current.run('send', call)
    outcome.catch(() => {}) // asserted below; settled inside act
  })
  await waitFor(() => expect(result.current.pending).not.toBeNull())
  act(() => result.current.cancel())
  await outcome.catch((error) => expect(isReauthCancelled(error)).toBe(true))
  expect(result.current.pending).toBeNull()
  expect(call).toHaveBeenCalledTimes(1)
})

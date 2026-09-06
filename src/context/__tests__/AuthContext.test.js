/**
 * AuthContext — `updateUser` merges a saved profile field into the cached
 * `user` so readers (the Home greeting) follow a username change without a
 * reload. Before it existed, Account Settings and the profile page saved via
 * PATCH /users/profile and only refreshed their own local state, so
 * "Welcome back, {name}" kept the sign-in snapshot until /users/me was
 * re-fetched on a hard refresh.
 */
import React from 'react'
import { render, act, waitFor } from '@testing-library/react'

let mockAuthCallback = null
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth, cb) => {
    mockAuthCallback = cb
    return () => {}
  }
}))
jest.mock('../../config/firebase.config', () => ({ auth: { currentUser: null } }))
jest.mock('../../api/client', () => ({ apiClient: { get: jest.fn() } }))
jest.mock('../../api/services', () => ({ authService: {} }))
jest.mock('../../api/queryClient', () => ({ queryClient: { clear: jest.fn() } }))
jest.mock('../../i18n', () => ({ changeLanguage: jest.fn() }))

import { AuthProvider, useAuth } from '../AuthContext'
import { apiClient } from '../../api/client'

const renderWithConsumer = () => {
  let latest = null
  const Consumer = () => {
    latest = useAuth()
    return null
  }
  render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>
  )
  return () => latest
}

beforeEach(() => {
  mockAuthCallback = null
  apiClient.get.mockReset()
})

test('updateUser merges a patch into the cached user', async () => {
  apiClient.get.mockResolvedValue({ data: { username: 'old-name', email: 'a@b.c' } })
  const ctx = renderWithConsumer()

  await act(async () => {
    await mockAuthCallback({ uid: 'u1' })
  })
  await waitFor(() => expect(ctx().user?.username).toBe('old-name'))

  act(() => {
    ctx().updateUser({ username: 'new-name' })
  })

  expect(ctx().user).toEqual({ username: 'new-name', email: 'a@b.c' })
})

test('updateUser is a no-op while no user is signed in', async () => {
  const ctx = renderWithConsumer()

  await act(async () => {
    await mockAuthCallback(null)
  })

  act(() => {
    ctx().updateUser({ username: 'ghost' })
  })

  expect(ctx().user).toBeNull()
  expect(ctx().isAuthenticated).toBe(false)
})

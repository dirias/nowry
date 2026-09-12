/**
 * AuthContext — `updateUser` merges a saved profile field into the cached
 * `user` so readers (the Home greeting) follow a username change without a
 * reload. Before it existed, Account Settings and the profile page saved via
 * PATCH /users/profile and only refreshed their own local state, so
 * "Welcome back, {name}" kept the sign-in snapshot until /users/me was
 * re-fetched on a hard refresh.
 */
import { configureTestPlatform, resetPlatform } from '../../platform/testing'
import React from 'react'
import { render, act, waitFor } from '@testing-library/react'

let mockAuthCallback = null
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth, cb) => {
    mockAuthCallback = cb
    return () => {}
  }
}))
jest.mock('../../api/client', () => ({ apiClient: { get: jest.fn() } }))
jest.mock('../../api/services', () => ({ authService: {} }))
jest.mock('../../api/queryClient', () => ({ queryClient: { clear: jest.fn() } }))
jest.mock('i18next', () => ({ changeLanguage: jest.fn() }))

import { AuthProvider, useAuth } from '../AuthContext'
import { apiClient } from '../../api/client'

/*
 * AuthContext reads the Firebase instance, the stored token and the session
 * lifecycle through the platform port now (MOB-003, MOB-004), so the test
 * configures the port instead of mocking the web client's firebase.config.
 */
/* The port is configured once per test; `platform.storage` is the inspectable
   adapter those tests read back from (ADR-027). */
let platform = null
beforeEach(() => {
  platform = configureTestPlatform()
})
afterEach(() => resetPlatform())

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

/*
 * A COLD start with no network (MOB-069).
 *
 * Firebase restores its own session from disk without a network, so
 * `onAuthStateChanged` fires with a user and `/users/me` is then attempted and
 * fails. Keeping "whatever profile was last known" keeps nothing when the app
 * has only just launched — which put the login screen in front of someone on a
 * plane whose session was perfectly valid.
 */
const networkError = () => Object.assign(new Error('Network Error'), { response: undefined })
const refused = (status) => Object.assign(new Error('no'), { response: { status } })

test('a cold start with no network restores the last profile this device saw', async () => {
  const { storage } = platform
  apiClient.get.mockResolvedValue({ data: { username: 'didier', email: 'a@b.c' } })
  let read = renderWithConsumer()
  await act(async () => {
    await mockAuthCallback({ uid: 'u1' })
  })
  expect(read().user.username).toBe('didier')

  // Same device, next launch, no network at all.
  apiClient.get.mockRejectedValue(networkError())
  read = renderWithConsumer()
  await act(async () => {
    await mockAuthCallback({ uid: 'u1' })
  })
  expect(read().user.username).toBe('didier')
  expect(read().loading).toBe(false)
  expect(storage.get('NOWRY_LAST_PROFILE')).toContain('didier')
})

test('a fresh device with no network and no stored profile stays signed out', async () => {
  apiClient.get.mockRejectedValue(networkError())
  const read = renderWithConsumer()
  await act(async () => {
    await mockAuthCallback({ uid: 'u1' })
  })
  expect(read().user).toBeNull()
})

test('the server saying the session is invalid erases the stored profile', async () => {
  const { storage } = platform
  apiClient.get.mockResolvedValue({ data: { username: 'didier' } })
  let read = renderWithConsumer()
  await act(async () => {
    await mockAuthCallback({ uid: 'u1' })
  })
  expect(storage.get('NOWRY_LAST_PROFILE')).toBeTruthy()

  apiClient.get.mockRejectedValue(refused(401))
  read = renderWithConsumer()
  await act(async () => {
    await mockAuthCallback({ uid: 'u1' })
  })
  expect(read().user).toBeNull()
  expect(storage.get('NOWRY_LAST_PROFILE')).toBeFalsy()
})

test('no Firebase session erases it too, so the next person sees their own name', async () => {
  const { storage } = platform
  apiClient.get.mockResolvedValue({ data: { username: 'didier' } })
  renderWithConsumer()
  await act(async () => {
    await mockAuthCallback({ uid: 'u1' })
  })
  expect(storage.get('NOWRY_LAST_PROFILE')).toBeTruthy()

  const read = renderWithConsumer()
  await act(async () => {
    await mockAuthCallback(null)
  })
  expect(read().user).toBeNull()
  expect(storage.get('NOWRY_LAST_PROFILE')).toBeFalsy()
})

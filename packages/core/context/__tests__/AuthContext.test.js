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
const mockSignOut = jest.fn(async () => {})
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth, cb) => {
    mockAuthCallback = cb
    return () => {}
  },
  signOut: (...args) => mockSignOut(...args)
}))
let mockNoAccountListener = null
jest.mock('../../api/client', () => ({
  apiClient: { get: jest.fn() },
  onNoAccount: (listener) => {
    mockNoAccountListener = listener
    return () => {}
  }
}))
const mockHeldSignUp = jest.fn(() => null)
jest.mock('../../api/services', () => ({ authService: { heldSignUp: () => mockHeldSignUp() }, registration: { pending: null } }))
jest.mock('../../api/queryClient', () => ({ queryClient: { clear: jest.fn() } }))
jest.mock('i18next', () => ({ changeLanguage: jest.fn() }))

import { AuthProvider, useAuth } from '../AuthContext'
import { apiClient } from '../../api/client'
// The mocked holder above, so a test can put a sign-up in flight.
import { registration as mockRegistration } from '../../api/services'

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
  mockNoAccountListener = null
  mockSignOut.mockClear()
  mockHeldSignUp.mockReset().mockReturnValue(null)
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

/*
 * QA-024: creating the Firebase account fires the listener before
 * /auth/register has carried the invite code; while a sign-up is in flight
 * the first profile read waits for it, or the beta gate refuses a uid it has
 * never seen and the phone stays on the form it just submitted.
 */
test('the first profile read waits for a sign-up in flight', async () => {
  apiClient.get.mockResolvedValue({ data: { username: 'brand-new' } })
  let finishSignup
  mockRegistration.pending = new Promise((resolve) => {
    finishSignup = resolve
  })
  const ctx = renderWithConsumer()

  let listener
  await act(async () => {
    listener = mockAuthCallback({ uid: 'u-new' })
    await Promise.resolve()
  })
  expect(apiClient.get).not.toHaveBeenCalled()

  await act(async () => {
    finishSignup()
    await listener
  })
  mockRegistration.pending = null
  expect(apiClient.get).toHaveBeenCalledWith('/users/me')
  await waitFor(() => expect(ctx().user?.username).toBe('brand-new'))
})

/*
 * ADR-077 — a profile belongs to the Firebase identity it was read for.
 *
 * Found on dev, 12 November 2026: someone signed up with an address the invite
 * was not for, confirmed it, was refused by the server, and was shown
 * onboarding anyway. The app's only proof that someone is in is the profile it
 * holds, so a profile must never be held for an identity it was not read for,
 * and an identity the server says has no account must hold none.
 */
const gateRefusal = (code) => Object.assign(new Error('no'), { response: { status: 403, data: { detail: { code } } } })

test('a profile kept for one identity is never restored for another', async () => {
  const { storage } = platform
  apiClient.get.mockResolvedValue({ data: { username: 'ana' } })
  renderWithConsumer()
  await act(async () => {
    await mockAuthCallback({ uid: 'uid-ana' })
  })
  expect(JSON.parse(storage.get('NOWRY_LAST_PROFILE'))).toEqual({ uid: 'uid-ana', profile: { username: 'ana' } })

  // Same device, a different identity, and the profile read cannot reach the server.
  apiClient.get.mockRejectedValue(networkError())
  const read = renderWithConsumer()
  await act(async () => {
    await mockAuthCallback({ uid: 'uid-other' })
  })
  expect(read().user).toBeNull()
  expect(read().isAuthenticated).toBe(false)
})

test('when the identity changes under a live session, the earlier profile goes before anything is read', async () => {
  apiClient.get.mockResolvedValue({ data: { username: 'ana' } })
  const read = renderWithConsumer()
  await act(async () => {
    await mockAuthCallback({ uid: 'uid-ana' })
  })
  expect(read().user.username).toBe('ana')

  apiClient.get.mockRejectedValue(networkError())
  await act(async () => {
    await mockAuthCallback({ uid: 'uid-other' })
  })
  expect(read().user).toBeNull()
})

test('a stored profile in the old shape, with no identity, is not restored', async () => {
  platform.storage.set('NOWRY_LAST_PROFILE', JSON.stringify({ username: 'someone' }))
  apiClient.get.mockRejectedValue(networkError())
  const read = renderWithConsumer()
  await act(async () => {
    await mockAuthCallback({ uid: 'u1' })
  })
  expect(read().user).toBeNull()
})

test.each(['beta_invite_required', 'invite_verify_email'])(
  'an identity the server says has no account (%s) holds no profile and is signed out',
  async (code) => {
    apiClient.get.mockRejectedValue(gateRefusal(code))
    const read = renderWithConsumer()
    await act(async () => {
      await mockAuthCallback({ uid: 'uid-orphan' })
    })
    expect(read().user).toBeNull()
    expect(read().loading).toBe(false)
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(platform.session.onSignedOut).not.toHaveBeenCalled()
  }
)

test('a sign-up waiting on its email keeps its identity, and still holds no profile', async () => {
  mockHeldSignUp.mockReturnValue({ inviteCode: 'nwi_x', username: 'yo', email: 'yo@example.com' })
  apiClient.get.mockRejectedValue(gateRefusal('beta_invite_required'))
  const read = renderWithConsumer()
  await act(async () => {
    await mockAuthCallback({ uid: 'uid-waiting' })
  })
  expect(read().user).toBeNull()
  expect(mockSignOut).not.toHaveBeenCalled()
})

test('any other 403 ends the profile and leaves the Firebase session alone', async () => {
  apiClient.get.mockRejectedValue(refused(403))
  const read = renderWithConsumer()
  await act(async () => {
    await mockAuthCallback({ uid: 'u1' })
  })
  expect(read().user).toBeNull()
  expect(mockSignOut).not.toHaveBeenCalled()
})

test('a gate refusal on any later request drops a profile that was being held', async () => {
  const { storage } = platform
  apiClient.get.mockResolvedValue({ data: { username: 'ana' } })
  const read = renderWithConsumer()
  await act(async () => {
    await mockAuthCallback({ uid: 'uid-ana' })
  })
  expect(read().isAuthenticated).toBe(true)

  act(() => mockNoAccountListener())
  expect(read().user).toBeNull()
  expect(read().isAuthenticated).toBe(false)
  expect(storage.get('NOWRY_LAST_PROFILE')).toBeFalsy()
})

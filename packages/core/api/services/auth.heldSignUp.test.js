/**
 * A sign-up with a personal invitation waits for its email (ADR-077, FR-019).
 *
 * The server refuses to create the account until the address is confirmed.
 * The service keeps the invite and the username, sends the link, and finishes
 * the sign-up when asked, once Firebase says the address is verified.
 */
const mockUser = { uid: 'u1', email: 'ana@x.io', displayName: 'ana', emailVerified: false, getIdToken: jest.fn(), reload: jest.fn() }
const mockAuth = { currentUser: mockUser, languageCode: null }
const mockSendEmailVerification = jest.fn()
const mockSignOut = jest.fn()
jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: async () => ({ user: mockUser }),
  updateProfile: async () => {},
  sendEmailVerification: (...args) => mockSendEmailVerification(...args),
  signInWithEmailAndPassword: jest.fn(),
  signOut: (...args) => mockSignOut(...args),
  sendPasswordResetEmail: jest.fn()
}))
const mockStore = new Map()
const mockOnSignedOut = jest.fn()
jest.mock('../../platform', () => ({
  auth: { instance: () => mockAuth },
  session: { onSignedOut: (...args) => mockOnSignedOut(...args) },
  storage: {
    set: (key, value) => mockStore.set(key, value),
    get: (key) => (mockStore.has(key) ? mockStore.get(key) : null),
    remove: (key) => mockStore.delete(key)
  }
}))
const mockPost = jest.fn()
jest.mock('../client', () => ({ apiClient: { post: (...args) => mockPost(...args) } }))

import { authService } from './auth.service'

const TOKEN = 'nwi_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG'
const refusal = (code) => ({ response: { status: 403, data: { detail: { code } } } })
const HELD_KEY = 'NOWRY_HELD_SIGN_UP'

beforeEach(() => {
  mockStore.clear()
  mockSendEmailVerification.mockReset().mockResolvedValue(undefined)
  mockSignOut.mockReset().mockResolvedValue(undefined)
  mockPost.mockReset()
  mockUser.getIdToken.mockReset().mockResolvedValue('fresh-token')
  mockUser.reload.mockReset().mockResolvedValue(undefined)
  mockUser.emailVerified = false
  mockAuth.currentUser = mockUser
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => console.error.mockRestore())

const refusedSignUp = async () => {
  mockPost.mockRejectedValueOnce(refusal('invite_verify_email'))
  await expect(authService.register('ana@x.io', 'secret-pass', 'ana_typed', TOKEN, 'es-MX')).rejects.toEqual(refusal('invite_verify_email'))
}

it('keeps the invite and the username, and sends the link, when the server waits for the email', async () => {
  await refusedSignUp()
  expect(JSON.parse(mockStore.get(HELD_KEY))).toEqual({ inviteCode: TOKEN, username: 'ana_typed' })
  expect(mockSendEmailVerification).toHaveBeenCalledWith(mockUser)
  expect(mockAuth.languageCode).toBe('es')
  expect(authService.heldSignUp()).toEqual({ inviteCode: TOKEN, username: 'ana_typed', email: 'ana@x.io' })
})

it('keeps the sign-up held even when the link could not be sent', async () => {
  mockSendEmailVerification.mockRejectedValue(new Error('quota'))
  await refusedSignUp()
  expect(authService.heldSignUp()).not.toBeNull()
})

it('keeps nothing for any other refusal', async () => {
  mockPost.mockRejectedValueOnce(refusal('beta_invite_required'))
  await expect(authService.register('ana@x.io', 'secret-pass', 'ana', TOKEN)).rejects.toBeDefined()
  expect(mockStore.has(HELD_KEY)).toBe(false)
  expect(mockSendEmailVerification).not.toHaveBeenCalled()
})

it('says "unverified" and asks the server nothing until the link is opened', async () => {
  await refusedSignUp()
  mockPost.mockClear()
  expect(await authService.finishHeldSignUp()).toEqual({ status: 'unverified' })
  expect(mockUser.reload).toHaveBeenCalled()
  expect(mockPost).not.toHaveBeenCalled()
  expect(authService.heldSignUp()).not.toBeNull()
})

it('finishes with a fresh token, the held invite and the typed username once verified', async () => {
  await refusedSignUp()
  mockUser.emailVerified = true
  mockPost.mockResolvedValueOnce({ data: { user_id: 'm1', wizard_completed: false } })

  expect(await authService.finishHeldSignUp()).toEqual({ status: 'done', backendUser: { user_id: 'm1', wizard_completed: false } })

  expect(mockUser.getIdToken).toHaveBeenLastCalledWith(true)
  const [path, body, config] = mockPost.mock.calls[mockPost.mock.calls.length - 1]
  expect(path).toBe('/auth/register')
  expect(body).toEqual({ firebase_uid: 'u1', email: 'ana@x.io', username: 'ana_typed' })
  expect(config.headers).toEqual({ Authorization: 'Bearer fresh-token', 'X-Invite-Code': TOKEN })
  expect(mockStore.has(HELD_KEY)).toBe(false)
  expect(mockStore.get('firebase_token')).toBe('fresh-token')
})

it('keeps the held sign-up when the server refuses the invite, and lets the refusal through', async () => {
  await refusedSignUp()
  mockUser.emailVerified = true
  mockPost.mockRejectedValueOnce(refusal('beta_invite_required'))
  await expect(authService.finishHeldSignUp()).rejects.toEqual(refusal('beta_invite_required'))
  expect(mockStore.has(HELD_KEY)).toBe(true)
})

it('has nothing to finish without a held invite or without an identity', async () => {
  expect(await authService.finishHeldSignUp()).toEqual({ status: 'none' })
  expect(authService.heldSignUp()).toBeNull()
  await refusedSignUp()
  mockAuth.currentUser = null
  expect(authService.heldSignUp()).toBeNull()
  expect(await authService.finishHeldSignUp()).toEqual({ status: 'none' })
})

it('holds a link opened by an identity that has no account yet', () => {
  expect(authService.holdInviteForCurrentUser(TOKEN)).toBe(true)
  expect(authService.heldSignUp()).toEqual({ inviteCode: TOKEN, username: 'ana', email: 'ana@x.io' })
  mockStore.clear()
  expect(authService.holdInviteForCurrentUser('')).toBe(false)
  mockAuth.currentUser = null
  expect(authService.holdInviteForCurrentUser(TOKEN)).toBe(false)
  expect(mockStore.has(HELD_KEY)).toBe(false)
})

it('walking away forgets the invite and signs out, without announcing an ended session', async () => {
  await refusedSignUp()
  mockStore.set('firebase_token', 'stale')
  await authService.abandonHeldSignUp()
  expect(mockStore.has(HELD_KEY)).toBe(false)
  expect(mockStore.has('firebase_token')).toBe(false)
  expect(mockSignOut).toHaveBeenCalled()
  expect(mockOnSignedOut).not.toHaveBeenCalled()
})

it('reads a corrupt held value as nothing', () => {
  mockStore.set(HELD_KEY, '{not json')
  expect(authService.heldSignUp()).toBeNull()
})

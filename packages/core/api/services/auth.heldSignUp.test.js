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
const mockSignIn = jest.fn()
const mockCreateUser = jest.fn()
jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...args) => mockCreateUser(...args),
  updateProfile: async () => {},
  sendEmailVerification: (...args) => mockSendEmailVerification(...args),
  signInWithEmailAndPassword: (...args) => mockSignIn(...args),
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
  mockSignIn.mockReset()
  mockCreateUser.mockReset().mockResolvedValue({ user: mockUser })
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

/*
 * The identity a refused sign-up leaves behind (ADR-077). Found on dev: an
 * address that signed up with someone else's invite keeps a Firebase identity
 * and no Nowry account. Invited later, Firebase says its email is in use.
 */
const inUse = () => Object.assign(new Error('Firebase: Error (auth/email-already-in-use).'), { code: 'auth/email-already-in-use' })

it('lets a left-behind identity sign up again with an invite, when the password is its own', async () => {
  mockCreateUser.mockRejectedValue(inUse())
  mockSignIn.mockResolvedValue({ user: mockUser })
  mockPost.mockResolvedValueOnce({ data: { user_id: 'm1' } })

  const result = await authService.register('ana@x.io', 'secret-pass', 'ana_typed', TOKEN, 'es')

  expect(mockSignIn).toHaveBeenCalledWith(mockAuth, 'ana@x.io', 'secret-pass')
  expect(result.backendUser).toEqual({ user_id: 'm1' })
  expect(mockPost.mock.calls[0][2].headers['X-Invite-Code']).toBe(TOKEN)
})

it('a left-behind identity whose address is still unconfirmed lands on the same waiting step', async () => {
  mockCreateUser.mockRejectedValue(inUse())
  mockSignIn.mockResolvedValue({ user: mockUser })
  mockPost.mockRejectedValueOnce(refusal('invite_verify_email'))
  await expect(authService.register('ana@x.io', 'secret-pass', 'ana_typed', TOKEN)).rejects.toEqual(refusal('invite_verify_email'))
  expect(authService.heldSignUp()).toEqual({ inviteCode: TOKEN, username: 'ana_typed', email: 'ana@x.io' })
})

it("says the address is in use when the password is not that identity's", async () => {
  mockCreateUser.mockRejectedValue(inUse())
  mockSignIn.mockRejectedValue(Object.assign(new Error('wrong'), { code: 'auth/wrong-password' }))
  await expect(authService.register('ana@x.io', 'not-the-password', 'ana', TOKEN)).rejects.toMatchObject({
    code: 'auth/email-already-in-use'
  })
  expect(mockPost).not.toHaveBeenCalled()
})

it('does not try the password when there is no invite to use', async () => {
  mockCreateUser.mockRejectedValue(inUse())
  await expect(authService.register('ana@x.io', 'secret-pass', 'ana', '')).rejects.toMatchObject({ code: 'auth/email-already-in-use' })
  expect(mockSignIn).not.toHaveBeenCalled()
})

/*
 * ADR-083: a password sign-up for an address an account already has. The new
 * identity has not proved the address, so the server answers 409
 * email_unverified before the gate. The link goes to the address, nothing is
 * held, and the identity is closed only after the send.
 */
it('sends the link and signs the identity out, holding nothing, when the address already has an account', async () => {
  const unverified = { response: { status: 409, data: { detail: { code: 'email_unverified' } } } }
  const order = []
  mockSendEmailVerification.mockImplementation(async () => order.push('send'))
  mockSignOut.mockImplementation(async () => order.push('signOut'))
  mockStore.set('firebase_token', 'stale')
  mockPost.mockRejectedValueOnce(unverified)

  await expect(authService.register('ana@x.io', 'secret-pass', 'ana', '', 'fr')).rejects.toEqual(unverified)

  expect(order).toEqual(['send', 'signOut'])
  expect(mockSendEmailVerification).toHaveBeenCalledWith(mockUser)
  expect(mockStore.has(HELD_KEY)).toBe(false)
  expect(mockStore.has('firebase_token')).toBe(false)
  expect(authService.heldSignUp()).toBeNull()
})

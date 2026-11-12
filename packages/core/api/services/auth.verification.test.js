/**
 * Sign-up asks the address to prove itself, and never waits on the answer
 * (ADR-076, FR-018).
 */
const mockUser = { uid: 'u1', email: 'ana@x.io', displayName: 'ana', emailVerified: false, getIdToken: jest.fn(), reload: jest.fn() }
const mockAuth = { currentUser: mockUser, languageCode: null }
const mockSendEmailVerification = jest.fn()
jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: async () => ({ user: mockUser }),
  updateProfile: async () => {},
  sendEmailVerification: (...args) => mockSendEmailVerification(...args),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn()
}))
const mockStorageSet = jest.fn()
jest.mock('../../platform', () => ({
  auth: { instance: () => mockAuth },
  session: { onSignedOut: jest.fn() },
  storage: { set: (...args) => mockStorageSet(...args), get: jest.fn(), remove: jest.fn() }
}))
const mockPost = jest.fn()
jest.mock('../client', () => ({ apiClient: { post: (...args) => mockPost(...args) } }))

import { authService } from './auth.service'

beforeEach(() => {
  mockSendEmailVerification.mockReset()
  mockPost.mockReset().mockResolvedValue({ data: { user_id: 'm1' } })
  mockUser.getIdToken.mockReset().mockResolvedValue('token')
  mockUser.reload.mockReset().mockResolvedValue(undefined)
  mockStorageSet.mockClear()
  mockUser.emailVerified = false
  mockAuth.currentUser = mockUser
  mockAuth.languageCode = null
})

it('sends the verification after the account is synced, in the app language', async () => {
  mockSendEmailVerification.mockResolvedValue(undefined)
  await authService.register('ana@x.io', 'secret-pass', 'ana', 'code', 'es-MX')
  expect(mockPost).toHaveBeenCalledTimes(1)
  expect(mockSendEmailVerification).toHaveBeenCalledWith(mockUser)
  expect(mockAuth.languageCode).toBe('es')
  expect(mockPost.mock.invocationCallOrder[0]).toBeLessThan(mockSendEmailVerification.mock.invocationCallOrder[0])
})

it('does not fail the sign-up when the email cannot be sent', async () => {
  const quiet = jest.spyOn(console, 'warn').mockImplementation(() => {})
  mockSendEmailVerification.mockRejectedValue(Object.assign(new Error('x'), { code: 'auth/too-many-requests' }))
  const result = await authService.register('ana@x.io', 'secret-pass', 'ana')
  expect(result.user.email).toBe('ana@x.io')
  await Promise.resolve()
  quiet.mockRestore()
})

it('sends nothing when there is no one to ask or nothing to prove', async () => {
  mockUser.emailVerified = true
  expect(await authService.sendVerification('en')).toBe(false)
  mockAuth.currentUser = null
  expect(await authService.sendVerification('en')).toBe(false)
  expect(mockSendEmailVerification).not.toHaveBeenCalled()
})

it('refreshes the token only once Firebase says the email is verified', async () => {
  expect(await authService.confirmVerification()).toBe(false)
  expect(mockUser.reload).toHaveBeenCalled()
  expect(mockUser.getIdToken).not.toHaveBeenCalled()
  mockUser.emailVerified = true
  expect(await authService.confirmVerification()).toBe(true)
  expect(mockUser.getIdToken).toHaveBeenCalledWith(true)
  expect(mockStorageSet).toHaveBeenCalledWith('firebase_token', 'token')
})

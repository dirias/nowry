/**
 * The account emails are asked of the API first, and of Firebase when the API
 * cannot be asked (MAIL-006, MAIL-007; ADR-078, FR-022 to FR-024).
 */
const mockUser = { uid: 'u1', email: 'ana@x.io', emailVerified: false, getIdToken: jest.fn(), reload: jest.fn() }
const mockAuth = { currentUser: mockUser, languageCode: null, authStateReady: jest.fn() }
const mockSendEmailVerification = jest.fn()
const mockSendPasswordResetEmail = jest.fn()
const mockApplyActionCode = jest.fn()
const mockVerifyPasswordResetCode = jest.fn()
const mockConfirmPasswordReset = jest.fn()
jest.mock('firebase/auth', () => ({
  sendEmailVerification: (...args) => mockSendEmailVerification(...args),
  sendPasswordResetEmail: (...args) => mockSendPasswordResetEmail(...args),
  applyActionCode: (...args) => mockApplyActionCode(...args),
  verifyPasswordResetCode: (...args) => mockVerifyPasswordResetCode(...args),
  confirmPasswordReset: (...args) => mockConfirmPasswordReset(...args)
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

const answered = (status, data = {}) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } })

beforeEach(() => {
  jest.clearAllMocks()
  mockUser.emailVerified = false
  mockUser.getIdToken.mockResolvedValue('token')
  mockUser.reload.mockResolvedValue(undefined)
  mockAuth.currentUser = mockUser
  mockAuth.languageCode = null
})

describe('the verification email', () => {
  it('is asked of the API, with the identity and the two-letter language, and Firebase is left alone', async () => {
    mockPost.mockResolvedValue({ data: { status: 'sent' } })
    expect(await authService.requestVerification('es-MX')).toEqual({ status: 'sent' })
    expect(mockPost).toHaveBeenCalledWith(
      '/auth/email/verification',
      { language: 'es' },
      { headers: { Authorization: 'Bearer token' }, suppressErrorToast: true }
    )
    expect(mockSendEmailVerification).not.toHaveBeenCalled()
  })

  it('passes on a wait and an already-verified answer without sending', async () => {
    mockPost.mockResolvedValueOnce({ data: { status: 'wait', retry_after: 37 } })
    expect(await authService.requestVerification('en')).toEqual({ status: 'wait', retryAfter: 37 })
    mockPost.mockResolvedValueOnce({ data: { status: 'verified' } })
    expect(await authService.requestVerification('en')).toEqual({ status: 'verified' })
    expect(mockSendEmailVerification).not.toHaveBeenCalled()
  })

  it.each([
    ['the API says fallback', () => mockPost.mockResolvedValue({ data: { status: 'fallback' } })],
    ['the network is down', () => mockPost.mockRejectedValue(new Error('Network Error'))],
    ['the API is older than the route', () => mockPost.mockRejectedValue(answered(404))],
    ['the API has a fault', () => mockPost.mockRejectedValue(answered(503))]
  ])('is sent by Firebase when %s', async (_name, arrange) => {
    arrange()
    expect(await authService.requestVerification('ja-JP')).toEqual({ status: 'sent' })
    expect(mockSendEmailVerification).toHaveBeenCalledWith(mockUser)
    expect(mockAuth.languageCode).toBe('ja')
  })

  it('does not fall back on a refusal the API meant', async () => {
    mockPost.mockRejectedValue(answered(401))
    await expect(authService.requestVerification('en')).rejects.toThrow('HTTP 401')
    expect(mockSendEmailVerification).not.toHaveBeenCalled()
  })

  it('asks nobody when no one is signed in or the address is already proved', async () => {
    mockUser.emailVerified = true
    expect(await authService.requestVerification('en')).toEqual({ status: 'verified' })
    mockAuth.currentUser = null
    expect(await authService.requestVerification('en')).toEqual({ status: 'none' })
    expect(mockPost).not.toHaveBeenCalled()
  })
})

describe('the reset email', () => {
  it('is asked of the API and resolves the same whatever the address', async () => {
    mockPost.mockResolvedValue({ data: { message: 'x' } })
    await expect(authService.resetPassword('ana@x.io', 'es-MX')).resolves.toEqual({ message: 'Password reset email sent' })
    expect(mockPost).toHaveBeenCalledWith('/auth/email/password-reset', { email: 'ana@x.io', language: 'es' }, { suppressErrorToast: true })
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('is sent by Firebase, in two letters, when the API cannot be asked', async () => {
    mockPost.mockRejectedValue(new Error('Network Error'))
    await authService.resetPassword('ana@x.io', 'es-MX')
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(mockAuth, 'ana@x.io')
    expect(mockAuth.languageCode).toBe('es')
  })

  it('fails on an address the API will not take', async () => {
    mockPost.mockRejectedValue(answered(422))
    await expect(authService.resetPassword('nope', 'en')).rejects.toThrow('HTTP 422')
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled()
  })
})

describe('a code from an email link', () => {
  it('is handed to Firebase, and a signed-in session is refreshed so the server sees it', async () => {
    mockApplyActionCode.mockImplementation(async () => {
      mockUser.emailVerified = true
    })
    await authService.applyEmailCode('CODE')
    expect(mockApplyActionCode).toHaveBeenCalledWith(mockAuth, 'CODE')
    expect(mockUser.getIdToken).toHaveBeenCalledWith(true)
    expect(mockStorageSet).toHaveBeenCalledWith('firebase_token', 'token')
  })

  it('works signed out, and a spent code is an error', async () => {
    mockAuth.currentUser = null
    mockApplyActionCode.mockResolvedValue(undefined)
    await authService.applyEmailCode('CODE')
    mockApplyActionCode.mockRejectedValue(Object.assign(new Error('x'), { code: 'auth/invalid-action-code' }))
    await expect(authService.applyEmailCode('CODE')).rejects.toThrow()
  })

  it('names whose password a reset code is for, and changes it only when told', async () => {
    mockVerifyPasswordResetCode.mockResolvedValue('ana@x.io')
    expect(await authService.checkResetCode('CODE')).toBe('ana@x.io')
    expect(mockConfirmPasswordReset).not.toHaveBeenCalled()
    await authService.confirmReset('CODE', 'new-secret')
    expect(mockConfirmPasswordReset).toHaveBeenCalledWith(mockAuth, 'CODE', 'new-secret')
  })

  it('waits for Firebase to restore the session before saying who is signed in', async () => {
    mockAuth.authStateReady.mockResolvedValue(undefined)
    expect(await authService.whenReady()).toBe(mockUser)
    expect(mockAuth.authStateReady).toHaveBeenCalled()
    mockAuth.currentUser = null
    expect(await authService.whenReady()).toBeNull()
  })
})

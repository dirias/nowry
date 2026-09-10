/**
 * The two rules that are Google's, not ours.
 *
 * Both were wrong in the first draft, and neither fails until a real client ID
 * is in place — at which point both surface as `redirect_uri_mismatch`, which
 * reads like a typo in the ID rather than a wrong flow. So they are asserted
 * against the request this builds rather than discovered in a browser.
 */
const mockPromptAsync = jest.fn()
const mockExchange = jest.fn()
const mockCredential = jest.fn()
const mockSignIn = jest.fn()

class MockAuthRequest {
  constructor(config) {
    MockAuthRequest.lastConfig = config
    this.codeVerifier = 'verifier-123'
  }

  promptAsync(...args) {
    return mockPromptAsync(...args)
  }
}

jest.mock('expo-auth-session', () => ({
  AuthRequest: MockAuthRequest,
  ResponseType: { Code: 'code', IdToken: 'id_token' },
  makeRedirectUri: ({ native }) => native,
  exchangeCodeAsync: (...args) => mockExchange(...args)
}))
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }))
jest.mock('expo-application', () => ({ applicationId: 'com.nowry.app' }))
jest.mock('expo-constants', () => ({ expoConfig: { extra: { googleClientIdAndroid: 'android-id.apps.googleusercontent.com' } } }))
jest.mock('react-native', () => ({ Platform: { OS: 'android', select: (map) => map.android } }))
jest.mock('firebase/auth', () => ({
  GoogleAuthProvider: { credential: (...args) => mockCredential(...args) },
  signInWithCredential: (...args) => mockSignIn(...args)
}))

const { redirectUriFor, signInWithGoogle } = require('../googleSignIn')

beforeEach(() => {
  MockAuthRequest.lastConfig = null
  mockPromptAsync.mockReset().mockResolvedValue({ type: 'success', params: { code: 'auth-code' } })
  mockExchange.mockReset().mockResolvedValue({ idToken: 'the-id-token' })
  mockCredential.mockReset().mockReturnValue('the-credential')
  mockSignIn.mockReset().mockResolvedValue({ user: { uid: 'u1' } })
})

it('redirects to the app id, never to our own scheme', () => {
  // Google's installed-app clients accept `<applicationId>:/oauthredirect` and
  // the reverse-DNS scheme they issue. `nowry://` is neither.
  expect(redirectUriFor()).toBe('com.nowry.app:/oauthredirect')
})

it('asks for a code with PKCE, because Google will not hand an installed app an id_token', async () => {
  await signInWithGoogle({})

  expect(MockAuthRequest.lastConfig.responseType).toBe('code')
  expect(MockAuthRequest.lastConfig.usePKCE).toBe(true)
  expect(MockAuthRequest.lastConfig.redirectUri).toBe('com.nowry.app:/oauthredirect')
  // openid is what makes Google issue an id_token at the exchange.
  expect(MockAuthRequest.lastConfig.scopes).toContain('openid')
})

it('exchanges the code with the verifier, which is what stands in for a secret', async () => {
  await signInWithGoogle({})

  const [request] = mockExchange.mock.calls[0]
  expect(request.code).toBe('auth-code')
  expect(request.extraParams.code_verifier).toBe('verifier-123')
  expect(request.redirectUri).toBe('com.nowry.app:/oauthredirect')
  // A public client has no secret, and sending one would be the bug.
  expect(request.clientSecret).toBeUndefined()
})

it('hands Firebase the id_token from the exchange', async () => {
  await signInWithGoogle({ instance: true })

  expect(mockCredential).toHaveBeenCalledWith('the-id-token')
  expect(mockSignIn).toHaveBeenCalledWith({ instance: true }, 'the-credential')
})

it('treats a dismissed browser as a decision, not a failure', async () => {
  mockPromptAsync.mockResolvedValue({ type: 'dismiss' })
  await expect(signInWithGoogle({})).resolves.toBeNull()

  mockPromptAsync.mockResolvedValue({ type: 'cancel' })
  await expect(signInWithGoogle({})).resolves.toBeNull()
  expect(mockExchange).not.toHaveBeenCalled()
})

it('says an exchange that returns no id_token is a credential problem', async () => {
  mockExchange.mockResolvedValue({ accessToken: 'a' })
  await expect(signInWithGoogle({})).rejects.toMatchObject({ code: 'auth/invalid-credential' })
})

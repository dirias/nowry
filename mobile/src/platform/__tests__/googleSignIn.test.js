/**
 * Google sign-in, which failed five different ways before it worked.
 *
 * The shape is unusual and the reason is in `googleSignIn.js`: the callback is
 * not caught by the browser helper on Android, it is delivered to the app as a
 * deep link and arrives at the router. So the flow is split — one call starts
 * it and returns a promise, and the `/oauthredirect` route settles that promise
 * once the callback lands.
 *
 * What is worth testing here is what the earlier attempts got wrong: the exact
 * redirect, the exchange, and the state check that stops a callback from
 * somewhere else signing anybody in.
 */
const mockExchange = jest.fn()
const mockOpen = jest.fn()
const mockDismiss = jest.fn()
const mockCredential = jest.fn()
const mockSignIn = jest.fn()

class MockAuthRequest {
  constructor(config) {
    MockAuthRequest.lastConfig = config
    this.codeVerifier = 'verifier-123'
    this.state = 'state-abc'
  }

  async makeAuthUrlAsync() {
    return 'https://accounts.google.com/o/oauth2/v2/auth?built'
  }
}

jest.mock('expo-auth-session', () => ({
  AuthRequest: MockAuthRequest,
  ResponseType: { Code: 'code', IdToken: 'id_token' },
  exchangeCodeAsync: (...args) => mockExchange(...args)
}))
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: (...args) => mockOpen(...args),
  dismissBrowser: (...args) => mockDismiss(...args)
}))
jest.mock('expo-application', () => ({ applicationId: 'com.nowry.app' }))
jest.mock('expo-constants', () => ({
  expoConfig: { scheme: ['com.nowry.app', 'nowry'], extra: { googleClientIdAndroid: 'android-id.apps.googleusercontent.com' } }
}))
jest.mock('react-native', () => ({ Platform: { OS: 'android', select: (map) => map.android } }))
jest.mock('firebase/auth', () => ({
  GoogleAuthProvider: { credential: (...args) => mockCredential(...args) },
  signInWithCredential: (...args) => mockSignIn(...args)
}))

const { cancelGoogleSignIn, completeGoogleSignIn, redirectUriFor, signInWithGoogle } = require('../googleSignIn')

const CALLBACK = { state: 'state-abc', code: 'auth-code' }

/** Let the URL get built and the browser opened before asserting on either. */
const started = () => new Promise((resolve) => setImmediate(resolve))

beforeEach(() => {
  MockAuthRequest.lastConfig = null
  mockOpen.mockReset().mockResolvedValue({ type: 'dismiss' })
  mockDismiss.mockReset()
  mockExchange.mockReset().mockResolvedValue({ idToken: 'the-id-token' })
  mockCredential.mockReset().mockReturnValue('the-credential')
  mockSignIn.mockReset().mockResolvedValue({ user: { uid: 'u1' } })
})

describe('the redirect', () => {
  it('is the package scheme with ONE slash', () => {
    // Every other form was refused by Google against the real client:
    // `nowry://oauthredirect` and `com.nowry.app://oauthredirect` both.
    expect(redirectUriFor()).toBe('com.nowry.app:/oauthredirect')
    expect(redirectUriFor()).not.toContain('://')
  })

  it('comes from the config rather than a constant', () => {
    jest.resetModules()
    jest.doMock('expo-constants', () => ({ expoConfig: { scheme: 'renamed', extra: {} } }))
    const { redirectUriFor: rebuilt } = require('../googleSignIn')
    expect(rebuilt()).toBe('renamed:/oauthredirect')
    jest.dontMock('expo-constants')
    jest.resetModules()
  })

  it('is not built by makeRedirectUri, which is conditional on how the app launched', () => {
    // Comments here NAME the helper, to record why it is avoided. Counting
    // those would let the explanation fail the rule it explains.
    const source = require('fs')
      .readFileSync(require('path').resolve(__dirname, '../googleSignIn.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    expect(source).not.toMatch(/makeRedirectUri/)
  })
})

describe('starting a sign-in', () => {
  it('asks for a code with PKCE, because Google will not hand an installed app an id_token', async () => {
    const promise = signInWithGoogle({})
    cancelGoogleSignIn()
    await promise

    expect(MockAuthRequest.lastConfig.responseType).toBe('code')
    expect(MockAuthRequest.lastConfig.usePKCE).toBe(true)
    expect(MockAuthRequest.lastConfig.redirectUri).toBe('com.nowry.app:/oauthredirect')
    // openid is what makes Google issue an id_token at the exchange.
    expect(MockAuthRequest.lastConfig.scopes).toContain('openid')
  })

  it('opens the built authorization URL', async () => {
    const promise = signInWithGoogle({})
    await started()

    expect(mockOpen.mock.calls[0][0]).toBe('https://accounts.google.com/o/oauth2/v2/auth?built')

    cancelGoogleSignIn()
    await promise
  })

  it('does not open a browser for a sign-in already cancelled', async () => {
    // Cancelling during the URL build must not leave a tab open behind it.
    const promise = signInWithGoogle({})
    cancelGoogleSignIn()
    await promise
    await started()

    expect(mockOpen).not.toHaveBeenCalled()
  })

  it('refuses to be configured away', async () => {
    jest.resetModules()
    jest.doMock('expo-constants', () => ({ expoConfig: { scheme: 'nowry', extra: {} } }))
    const { signInWithGoogle: unconfigured } = require('../googleSignIn')
    await expect(unconfigured({})).rejects.toThrow(/not configured/)
    jest.dontMock('expo-constants')
    jest.resetModules()
  })
})

describe('completing it from the callback', () => {
  it('exchanges the code with the verifier and hands Firebase the id_token', async () => {
    const promise = signInWithGoogle({ instance: true })
    await completeGoogleSignIn(CALLBACK)

    await expect(promise).resolves.toEqual({ user: { uid: 'u1' } })

    const [request] = mockExchange.mock.calls[0]
    expect(request.code).toBe('auth-code')
    expect(request.extraParams.code_verifier).toBe('verifier-123')
    expect(request.redirectUri).toBe('com.nowry.app:/oauthredirect')
    // A public client has no secret, and sending one would be the bug.
    expect(request.clientSecret).toBeUndefined()
    expect(mockCredential).toHaveBeenCalledWith('the-id-token')
    expect(mockSignIn).toHaveBeenCalledWith({ instance: true }, 'the-credential')
  })

  it('closes the browser tab behind it', async () => {
    const promise = signInWithGoogle({})
    await completeGoogleSignIn(CALLBACK)
    await promise

    expect(mockDismiss).toHaveBeenCalled()
  })

  it('refuses a callback whose state is not the one it started', async () => {
    // The CSRF guard: a callback from somewhere else must not sign anybody in.
    const promise = signInWithGoogle({})
    await completeGoogleSignIn({ state: 'somebody-elses', code: 'auth-code' })

    await expect(promise).rejects.toMatchObject({ code: 'auth/state-mismatch' })
    expect(mockExchange).not.toHaveBeenCalled()
  })

  it('reports what Google said when it refused', async () => {
    const promise = signInWithGoogle({})
    await completeGoogleSignIn({ state: 'state-abc', error: 'invalid_request' })

    await expect(promise).rejects.toMatchObject({ code: 'auth/invalid_request' })
  })

  it('treats an exchange with no id_token as a credential problem', async () => {
    mockExchange.mockResolvedValue({ accessToken: 'a' })
    const promise = signInWithGoogle({})
    await completeGoogleSignIn(CALLBACK)

    await expect(promise).rejects.toMatchObject({ code: 'auth/invalid-credential' })
  })

  it('does nothing at all when no sign-in is in flight', async () => {
    // The route runs on every delivery; a stray one must not throw.
    await expect(completeGoogleSignIn(CALLBACK)).resolves.toBeUndefined()
    expect(mockExchange).not.toHaveBeenCalled()
  })

  it('settles the first promise when a second sign-in starts', async () => {
    const first = signInWithGoogle({})
    const second = signInWithGoogle({})

    // Otherwise the first caller waits forever behind a browser it cannot see.
    await expect(first).rejects.toThrow(/restarted/)
    cancelGoogleSignIn()
    await second
  })
})

describe('cancelling', () => {
  it('is a decision, not a failure', async () => {
    const promise = signInWithGoogle({})
    cancelGoogleSignIn()

    await expect(promise).resolves.toBeNull()
    expect(mockExchange).not.toHaveBeenCalled()
  })
})

describe('the app config', () => {
  it('declares the package name FIRST', () => {
    const config = require('../../../app.config.js')().expo
    const schemes = [].concat(config.scheme)

    // Expo delivers every callback on the first declared scheme, so this is
    // what decides where the redirect lands. Getting it backwards fails
    // silently, which is why it is asserted.
    expect(schemes[0]).toBe(config.android.package)
    expect(schemes).toContain('nowry')
  })
})

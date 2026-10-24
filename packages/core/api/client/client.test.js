/**
 * The API client every request goes through (QA-009): the token, the base URL
 * and timeout, and what each failure does for the user. Real axios, real
 * interceptors; only the transport is a stub, given per request as `adapter`.
 */
import i18n from 'i18next'
import { AxiosError } from 'axios'
import { configureTestPlatform } from '../../platform/testing'
import { resetPlatform } from '../../platform'
import { apiClient } from './index'

let platform

beforeAll(async () => {
  await i18n.init({
    lng: 'ja',
    resources: {
      ja: { translation: { errors: { api: { timeout: 'タイムアウト', forbidden: '権限なし', server: 'サーバーエラー' } } } }
    }
  })
})

beforeEach(() => {
  platform = configureTestPlatform()
})

afterEach(() => resetPlatform())

/** A transport that records the request and answers with `status`, or fails as `code`. */
const transport = ({ status, code, data = {} } = {}) => {
  const seen = {}
  const adapter = async (config) => {
    seen.config = config
    if (code) throw new AxiosError('transport failed', code, config)
    const response = { status, statusText: '', data, headers: {}, config }
    if (status >= 400) throw new AxiosError(`status ${status}`, 'ERR_BAD_RESPONSE', config, null, response)
    return response
  }
  return { adapter, seen }
}

const request = (url, options) => apiClient.get(url, options).catch((error) => error)

describe('every request', () => {
  it('carries the base URL, the default timeout and a fresh token', async () => {
    platform.auth.currentUser.mockReturnValue({ uid: 'u1' })
    platform.auth.getIdToken.mockResolvedValue('token-1')
    const { adapter, seen } = transport({ status: 200 })

    await apiClient.get('/decks', { adapter })

    expect(seen.config.baseURL).toBe('http://api.test')
    expect(seen.config.timeout).toBe(10000)
    expect(seen.config.headers.Authorization).toBe('Bearer token-1')
    expect(platform.storage.get('firebase_token')).toBe('token-1')
  })

  it("keeps a call's own timeout: a model reply waits longer than the default (MOB-060)", async () => {
    const { adapter, seen } = transport({ status: 200 })
    await apiClient.get('/agent/chat', { adapter, timeout: 60000 })
    expect(seen.config.timeout).toBe(60000)
  })

  it('falls back to the stored token when Firebase cannot give one', async () => {
    platform.auth.currentUser.mockReturnValue({ uid: 'u1' })
    platform.auth.getIdToken.mockRejectedValue(new Error('network'))
    platform.storage.set('firebase_token', 'cached-token')
    const { adapter, seen } = transport({ status: 200 })

    await apiClient.get('/decks', { adapter })
    expect(seen.config.headers.Authorization).toBe('Bearer cached-token')
  })

  it('sends no token when nobody is signed in', async () => {
    const { adapter, seen } = transport({ status: 200 })
    await apiClient.get('/public/books', { adapter })
    expect(seen.config.headers.Authorization).toBeUndefined()
  })
})

describe('a 401', () => {
  it('signs the user out and clears the stored credentials', async () => {
    platform.storage.set('firebase_token', 'stale')
    platform.storage.set('firebase_user', '{}')
    const error = await request('/decks', { adapter: transport({ status: 401 }).adapter })

    expect(error.response.status).toBe(401)
    expect(platform.session.onUnauthorized).toHaveBeenCalledWith({ redirect: true })
    expect(platform.storage.get('firebase_token')).toBeNull()
    expect(platform.storage.get('firebase_user')).toBeNull()
  })

  it('on the startup probe /users/me is only an answer: nobody was signed in', async () => {
    platform.storage.set('firebase_token', 'kept')
    await request('/users/me', { adapter: transport({ status: 401 }).adapter })
    expect(platform.session.onUnauthorized).not.toHaveBeenCalled()
    expect(platform.storage.get('firebase_token')).toBe('kept')
  })
})

describe('what the user is told, in their language', () => {
  it.each([
    [{ status: 403 }, '権限なし', 'warning'],
    [{ status: 500 }, 'サーバーエラー', 'error'],
    [{ status: 503 }, 'サーバーエラー', 'error'],
    [{ code: 'ECONNABORTED' }, 'タイムアウト', 'warning']
  ])('%j → %s', async (answer, message, severity) => {
    await request('/decks', { adapter: transport(answer).adapter })
    expect(platform.notify).toHaveBeenCalledWith(message, severity)
  })

  it('says nothing for a 404: an empty state is not an error', async () => {
    await request('/annual-plan', { adapter: transport({ status: 404 }).adapter })
    expect(platform.notify).not.toHaveBeenCalled()
  })

  it('stays quiet where the caller shows its own error', async () => {
    await request('/users/preferences/general', { adapter: transport({ status: 500 }).adapter, suppressErrorToast: true })
    await request('/agent/generate-avatar', { adapter: transport({ status: 403 }).adapter })
    await request('/goal-ai/plan', { adapter: transport({ code: 'ECONNABORTED' }).adapter })
    expect(platform.notify).not.toHaveBeenCalled()
  })
})

describe('telemetry', () => {
  it('reports a failure with its route and status, never its body', async () => {
    await request('/decks', { adapter: transport({ status: 500, data: { secret: 'user text' } }).adapter })
    const [, context] = platform.telemetry.captureException.mock.calls[0]
    expect(context.contexts.api).toMatchObject({ url: '/decks', method: 'get', status: 500 })
    expect(JSON.stringify(context)).not.toContain('user text')
  })

  it('does not report a request the user cancelled', async () => {
    await request('/decks', { adapter: transport({ code: 'ERR_CANCELED' }).adapter })
    expect(platform.telemetry.captureException).not.toHaveBeenCalled()
  })
})

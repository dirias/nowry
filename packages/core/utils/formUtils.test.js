/**
 * `isOfflineError` — the difference between "the server said no" and "there was
 * no server to ask". The two deserve different words in front of a user.
 */
import { isOfflineError } from './formUtils'

describe('isOfflineError', () => {
  it('is false for anything the server answered, including a rejection', () => {
    expect(isOfflineError({ response: { status: 422, data: { detail: 'bad' } } })).toBe(false)
    expect(isOfflineError({ response: { status: 500 }, request: {} })).toBe(false)
  })

  it('is true when the request never reached a server', () => {
    expect(isOfflineError({ code: 'ERR_NETWORK', message: 'Network Error' })).toBe(true)
    expect(isOfflineError({ code: 'ECONNABORTED', message: 'timeout of 10000ms exceeded' })).toBe(true)
    // Axios attaches the request it sent even when nothing came back.
    expect(isOfflineError({ request: {}, message: 'Network Error' })).toBe(true)
  })

  it('is false for a thrown value that is not a request failure at all', () => {
    expect(isOfflineError(null)).toBe(false)
    expect(isOfflineError(undefined)).toBe(false)
    expect(isOfflineError(new TypeError('x is not a function'))).toBe(false)
  })
})

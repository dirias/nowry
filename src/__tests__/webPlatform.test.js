/**
 * The web adapter's contract with the shared port.
 *
 * These assertions are the reason wiring the port is a no-op for the web app:
 * each adapter does exactly what the call sites it will replace already do, and
 * `notify` emits precisely the event NotificationContext is listening for.
 */
import { configurePlatform, resetPlatform, storage, notify, env } from '@nowry/core'
import { webPlatform } from '../platform/webPlatform'

describe('webPlatform', () => {
  beforeEach(() => {
    resetPlatform()
    configurePlatform(webPlatform)
  })
  afterEach(() => {
    resetPlatform()
    localStorage.clear()
  })

  it('satisfies the port, which validates its shape at configure time', () => {
    // configurePlatform in beforeEach would have thrown PlatformAdapterError.
    expect(env.apiUrl).toEqual(expect.any(String))
    expect(env.apiTimeout).toEqual(expect.any(Number))
  })

  it('reads and writes localStorage synchronously', () => {
    storage.set('firebase_token', 'abc')
    expect(localStorage.getItem('firebase_token')).toBe('abc')
    expect(storage.get('firebase_token')).toBe('abc')
    storage.remove('firebase_token')
    expect(storage.get('firebase_token')).toBeNull()
  })

  it('emits the api:notify event NotificationContext listens for', () => {
    const heard = []
    const listener = (event) => heard.push(event.detail)
    window.addEventListener('api:notify', listener)

    notify('Something failed')
    notify('Saved', 'success')

    window.removeEventListener('api:notify', listener)
    expect(heard).toEqual([
      { message: 'Something failed', severity: 'error' },
      { message: 'Saved', severity: 'success' }
    ])
  })

  it('resolves the id token to null when nobody is signed in', async () => {
    await expect(webPlatform.auth.getIdToken()).resolves.toBeNull()
    expect(webPlatform.auth.currentUser()).toBeNull()
  })
})

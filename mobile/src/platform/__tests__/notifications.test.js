import { publishNotification, subscribeToNotifications, publishUnauthorized, subscribeToUnauthorized } from '../notifications'

describe('the mobile notification sink', () => {
  it('delivers a message to every subscriber, with the default severity', () => {
    const heard = []
    const off = subscribeToNotifications((n) => heard.push(n))
    publishNotification('Saved', 'success')
    publishNotification('Something failed')
    off()
    expect(heard).toEqual([
      { message: 'Saved', severity: 'success' },
      { message: 'Something failed', severity: 'error' }
    ])
  })

  it('stops delivering after unsubscribe', () => {
    const heard = []
    subscribeToNotifications((n) => heard.push(n))()
    publishNotification('ignored')
    expect(heard).toEqual([])
  })

  it('one bad subscriber does not stop the others hearing about it', () => {
    const heard = []
    const offBad = subscribeToNotifications(() => {
      throw new Error('subscriber blew up')
    })
    const offGood = subscribeToNotifications((n) => heard.push(n.message))
    expect(() => publishNotification('still delivered')).not.toThrow()
    offBad()
    offGood()
    expect(heard).toEqual(['still delivered'])
  })

  it('carries the unauthorized signal on its own channel', () => {
    const seen = []
    const offNotify = subscribeToNotifications(() => seen.push('notify'))
    const offAuth = subscribeToUnauthorized(() => seen.push('unauthorized'))
    publishUnauthorized()
    offNotify()
    offAuth()
    // A dead session is a signal, not a message the user reads.
    expect(seen).toEqual(['unauthorized'])
  })
})

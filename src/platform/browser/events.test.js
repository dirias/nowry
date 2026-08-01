import { emitAppEvent, subscribeAppEvent } from './events'

describe('browser event adapter', () => {
  it('delivers event details to subscribers', () => {
    const handler = jest.fn()
    const unsubscribe = subscribeAppEvent('test:event', handler)

    emitAppEvent('test:event', { ok: true })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ ok: true })

    unsubscribe()
  })

  it('stops delivering events after unsubscribe', () => {
    const handler = jest.fn()
    const unsubscribe = subscribeAppEvent('test:event', handler)

    unsubscribe()
    emitAppEvent('test:event', { ok: true })

    expect(handler).not.toHaveBeenCalled()
  })
})

import { hasCoarsePointer, shouldSendOnKey } from '../chatSubmitKey'

const press = (overrides = {}) => ({ key: 'Enter', shiftKey: false, ...overrides })

describe('shouldSendOnKey', () => {
  it('sends on Enter', () => {
    expect(shouldSendOnKey(press())).toBe(true)
  })

  it('breaks a line on Shift+Enter', () => {
    expect(shouldSendOnKey(press({ shiftKey: true }))).toBe(false)
  })

  it('ignores every other key', () => {
    expect(shouldSendOnKey(press({ key: 'a' }))).toBe(false)
    expect(shouldSendOnKey(press({ key: 'Tab' }))).toBe(false)
    expect(shouldSendOnKey(null)).toBe(false)
  })

  it('leaves the return key alone on a touch keyboard, which has no Shift+Enter', () => {
    expect(shouldSendOnKey(press(), { coarsePointer: true })).toBe(false)
  })

  describe('an IME mid-word', () => {
    it('does not send while a candidate is being composed', () => {
      expect(shouldSendOnKey(press({ isComposing: true }))).toBe(false)
    })

    it('reads composition off the native event too', () => {
      expect(shouldSendOnKey(press({ nativeEvent: { isComposing: true } }))).toBe(false)
    })

    it('honours the legacy keyCode 229 that older engines send instead', () => {
      expect(shouldSendOnKey(press({ keyCode: 229 }))).toBe(false)
    })
  })
})

describe('hasCoarsePointer', () => {
  const original = window.matchMedia

  afterEach(() => {
    window.matchMedia = original
  })

  it('is true when the primary pointer is a finger', () => {
    window.matchMedia = jest.fn(() => ({ matches: true }))
    expect(hasCoarsePointer()).toBe(true)
    expect(window.matchMedia).toHaveBeenCalledWith('(pointer: coarse)')
  })

  it('is false on a mouse', () => {
    window.matchMedia = jest.fn(() => ({ matches: false }))
    expect(hasCoarsePointer()).toBe(false)
  })

  it('is false where matchMedia does not exist, rather than throwing', () => {
    window.matchMedia = undefined
    expect(hasCoarsePointer()).toBe(false)
  })
})

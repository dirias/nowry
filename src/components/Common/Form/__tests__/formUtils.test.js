import { scrollBehavior, scrollIntoViewSafely } from '../formUtils'

describe('scroll helpers', () => {
  const setReducedMotion = (matches) => {
    window.matchMedia = jest.fn().mockReturnValue({ matches })
  }

  afterEach(() => {
    delete window.matchMedia
  })

  it('uses `auto` under prefers-reduced-motion and `smooth` otherwise', () => {
    setReducedMotion(true)
    expect(scrollBehavior()).toBe('auto')
    setReducedMotion(false)
    expect(scrollBehavior()).toBe('smooth')
  })

  it('defaults to block:"nearest" so a visible field is not re-scrolled under the keyboard', () => {
    setReducedMotion(false)
    const scrollIntoView = jest.fn()
    scrollIntoViewSafely({ scrollIntoView })
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' })
  })

  it('honours an explicit block for a freshly revealed section', () => {
    setReducedMotion(true)
    const scrollIntoView = jest.fn()
    scrollIntoViewSafely({ scrollIntoView }, 'start')
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
  })

  it('is a no-op when the ref never attached', () => {
    setReducedMotion(false)
    expect(() => scrollIntoViewSafely(null)).not.toThrow()
    expect(() => scrollIntoViewSafely({})).not.toThrow()
  })
})

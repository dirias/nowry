/**
 * Phase 17 — useIsMobile tests (MOB-01).
 */

import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from './useIsMobile'

// Mock window.matchMedia (not available in jsdom by default)
function setupMatchMedia(matches) {
  const listeners = []
  const mq = {
    matches,
    addEventListener: jest.fn((event, handler) => listeners.push(handler)),
    removeEventListener: jest.fn((event, handler) => {
      const idx = listeners.indexOf(handler)
      if (idx !== -1) listeners.splice(idx, 1)
    }),
    _trigger: (newMatches) => listeners.forEach((h) => h({ matches: newMatches })),
  }
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockReturnValue(mq),
  })
  return mq
}

describe('MOB-01: useIsMobile hook', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns true when matchMedia matches (max-width: 599px)', () => {
    setupMatchMedia(true)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('returns false when matchMedia does not match', () => {
    setupMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('updates to true when change event fires with matches=true', () => {
    const mq = setupMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())
    act(() => { mq._trigger(true) })
    expect(result.current).toBe(true)
  })

  it('updates to false when change event fires with matches=false', () => {
    const mq = setupMatchMedia(true)
    const { result } = renderHook(() => useIsMobile())
    act(() => { mq._trigger(false) })
    expect(result.current).toBe(false)
  })

  it('removes event listener on unmount (cleanup)', () => {
    const mq = setupMatchMedia(false)
    const { unmount } = renderHook(() => useIsMobile())
    unmount()
    expect(mq.removeEventListener).toHaveBeenCalledTimes(1)
  })
})

/**
 * useCardSelection — the selection set behind the bar (PRD D16, MGMT-004).
 */
import { act, renderHook } from '@testing-library/react'

let mockMobile = false
jest.mock('../../../hooks/useIsMobile', () => ({ useIsMobile: () => mockMobile }))

const { useCardSelection, LONG_PRESS_MS } = require('../useCardSelection')

beforeEach(() => {
  mockMobile = false
})

describe('the set', () => {
  it('is empty and not selecting until the first toggle, and clear empties it again', () => {
    const { result } = renderHook(() => useCardSelection())
    expect(result.current.selecting).toBe(false)
    act(() => result.current.toggle('c1'))
    expect(result.current.selecting).toBe(true)
    expect(result.current.isSelected('c1')).toBe(true)
    act(() => result.current.toggle('c1'))
    expect(result.current.selecting).toBe(false)
    act(() => result.current.selectAll(['c1', 'c2']))
    expect(result.current.selected.size).toBe(2)
    act(() => result.current.clear())
    expect(result.current.selecting).toBe(false)
  })

  it('retains only the ids still listed', () => {
    const { result } = renderHook(() => useCardSelection())
    act(() => result.current.selectAll(['c1', 'c2', 'c3']))
    act(() => result.current.retain(['c2']))
    expect([...result.current.selected]).toEqual(['c2'])
  })

  it('clears on Escape while selecting, but not from inside a menu or a sheet', () => {
    const { result } = renderHook(() => useCardSelection())
    act(() => result.current.toggle('c1'))
    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    document.body.appendChild(menu)
    act(() => {
      menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(result.current.selecting).toBe(true)
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(result.current.selecting).toBe(false)
    menu.remove()
  })
})

describe('a long press on a phone', () => {
  it('starts the selection after 500ms and swallows the click that follows', () => {
    jest.useFakeTimers()
    mockMobile = true
    const { result } = renderHook(() => useCardSelection())
    const handlers = result.current.longPressHandlers('c1')
    act(() => handlers.onPointerDown())
    act(() => jest.advanceTimersByTime(LONG_PRESS_MS))
    expect(result.current.isSelected('c1')).toBe(true)
    const click = { stopPropagation: jest.fn(), preventDefault: jest.fn() }
    act(() => handlers.onClickCapture(click))
    expect(click.stopPropagation).toHaveBeenCalled()
    jest.useRealTimers()
  })

  it('does nothing when the press is released early, and offers no handlers off a phone', () => {
    jest.useFakeTimers()
    mockMobile = true
    const { result } = renderHook(() => useCardSelection())
    const handlers = result.current.longPressHandlers('c1')
    act(() => handlers.onPointerDown())
    act(() => handlers.onPointerUp())
    act(() => jest.advanceTimersByTime(LONG_PRESS_MS))
    expect(result.current.selecting).toBe(false)
    jest.useRealTimers()

    mockMobile = false
    const desktop = renderHook(() => useCardSelection())
    expect(desktop.result.current.longPressHandlers('c1')).toEqual({})
  })
})

/**
 * The selection's rules, which two clients now share.
 *
 * `retain` is the one worth testing hardest: a card that leaves the list after
 * a filter change or a bulk verb must leave the selection with it. If it does
 * not, the next verb silently includes a card the user can no longer see.
 */
import { act, renderHook } from '@testing-library/react'
import { useCardSelection } from './useCardSelection'

describe('useCardSelection', () => {
  it('starts empty and is not selecting', () => {
    const { result } = renderHook(() => useCardSelection())
    expect(result.current.selecting).toBe(false)
    expect(result.current.selected.size).toBe(0)
  })

  it('toggles one id on and off', () => {
    const { result } = renderHook(() => useCardSelection())

    act(() => result.current.toggle('a'))
    expect(result.current.isSelected('a')).toBe(true)
    expect(result.current.selecting).toBe(true)

    act(() => result.current.toggle('a'))
    expect(result.current.isSelected('a')).toBe(false)
    expect(result.current.selecting).toBe(false)
  })

  it('replaces the set on selectAll rather than adding to it', () => {
    const { result } = renderHook(() => useCardSelection())

    act(() => result.current.toggle('a'))
    act(() => result.current.selectAll(['b', 'c']))

    expect([...result.current.selected].sort()).toEqual(['b', 'c'])
  })

  it('drops selected cards that are no longer listed', () => {
    const { result } = renderHook(() => useCardSelection())

    act(() => result.current.selectAll(['a', 'b', 'c']))
    // A filter change leaves only two of them on screen.
    act(() => result.current.retain(['a', 'c']))

    expect([...result.current.selected].sort()).toEqual(['a', 'c'])
  })

  it('keeps the same set object when retain changes nothing', () => {
    // Identity matters: `retain` runs in an effect on every list change, and a
    // new Set each time would re-render every row for nothing.
    const { result } = renderHook(() => useCardSelection())
    act(() => result.current.selectAll(['a', 'b']))
    const before = result.current.selected

    act(() => result.current.retain(['a', 'b', 'c']))

    expect(result.current.selected).toBe(before)
  })

  it('retain on an empty selection is a no-op', () => {
    const { result } = renderHook(() => useCardSelection())
    const before = result.current.selected

    act(() => result.current.retain(['a']))

    expect(result.current.selected).toBe(before)
  })

  it('clearing an already-empty selection changes nothing', () => {
    const { result } = renderHook(() => useCardSelection())
    const before = result.current.selected

    act(() => result.current.clear())

    expect(result.current.selected).toBe(before)
  })

  it('clear ends the selection', () => {
    const { result } = renderHook(() => useCardSelection())
    act(() => result.current.selectAll(['a', 'b']))

    act(() => result.current.clear())

    expect(result.current.selecting).toBe(false)
    expect(result.current.selected.size).toBe(0)
  })
})

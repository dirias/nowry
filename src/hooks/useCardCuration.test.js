/**
 * CURATE-001 — the generated-card draft model.
 *
 * The rules worth pinning here are the ones that used to be impossible to get
 * wrong and now are: curation is keyed by card, not by position, so a card
 * arriving mid-stream must not move anybody's kept flag, and "Generate again"
 * must not carry curation over onto cards the user has never seen.
 *
 * `syncEntries` is asserted directly rather than through the dialog, because
 * the interesting inputs are prop *identities* — a fresh array holding the same
 * card objects means "appended nothing", a fresh array holding fresh objects
 * means "regenerated" — and those are clumsy to express through a render.
 */
import { act, renderHook } from '@testing-library/react'

import useCardCuration, { entryFrom, isEdited, syncEntries } from './useCardCuration'

const card = (title) => ({ title, content: `${title} — back` })

const A = card('Mitosis')
const B = card('Osmosis')
const C = card('Diffusion')

const EMPTY = { entries: [], source: [], nextId: 0 }

const titlesOf = (state) => state.entries.map((entry) => entry.title)

describe('syncEntries — append vs reset', () => {
  it('builds an entry per card on the first arrival, every one kept', () => {
    const state = syncEntries(EMPTY, [A, B])

    expect(titlesOf(state)).toEqual(['Mitosis', 'Osmosis'])
    expect(state.entries.every((entry) => entry.kept)).toBe(true)
  })

  it('treats a longer array with the same card objects as an append', () => {
    const first = syncEntries(EMPTY, [A, B])
    const second = syncEntries(first, [A, B, C])

    expect(titlesOf(second)).toEqual(['Mitosis', 'Osmosis', 'Diffusion'])
    // The existing entries are carried over by reference, so nothing about them
    // can have been rebuilt behind the user's back.
    expect(second.entries[0]).toBe(first.entries[0])
    expect(second.entries[1]).toBe(first.entries[1])
  })

  it('keeps a discard attached to its card when another card streams in', () => {
    const first = syncEntries(EMPTY, [A, B])
    const discarded = {
      ...first,
      entries: first.entries.map((entry) => (entry.id === first.entries[0].id ? { ...entry, kept: false } : entry))
    }

    const second = syncEntries(discarded, [A, B, C])

    expect(second.entries.map((entry) => entry.kept)).toEqual([false, true, true])
  })

  it('rebuilds from scratch when the cards are replaced', () => {
    const first = syncEntries(EMPTY, [A, B])
    // "Generate again" hands back freshly parsed objects, so no element matches.
    const regenerated = syncEntries(first, [card('Meiosis'), card('Osmosis')])

    expect(titlesOf(regenerated)).toEqual(['Meiosis', 'Osmosis'])
    expect(regenerated.entries.every((entry) => entry.kept)).toBe(true)
  })

  it('rebuilds when the replacement batch is shorter', () => {
    const first = syncEntries(EMPTY, [A, B, C])
    const regenerated = syncEntries(first, [card('Meiosis')])

    expect(titlesOf(regenerated)).toEqual(['Meiosis'])
  })

  it('never reuses an id across a reset', () => {
    const first = syncEntries(EMPTY, [A, B])
    const regenerated = syncEntries(first, [card('Meiosis'), card('Mitochondria')])

    const before = first.entries.map((entry) => entry.id)
    const after = regenerated.entries.map((entry) => entry.id)
    expect(after.filter((id) => before.includes(id))).toEqual([])
  })

  it('returns the same state object when an equivalent array arrives', () => {
    const first = syncEntries(EMPTY, [A, B])

    // A parent that rebuilds the array but not the cards — `cards ?? []`, an
    // unmemoised `.filter()`. Returning fresh state here would loop the render.
    expect(syncEntries(first, [A, B])).toBe(first)
    expect(syncEntries(first, first.source)).toBe(first)
  })

  it('tolerates a missing or malformed card list', () => {
    expect(syncEntries(EMPTY, undefined).entries).toEqual([])
    expect(entryFrom(undefined, 'gc-0')).toMatchObject({ title: '', content: '' })
  })

  it('keeps the generated original beside the working text', () => {
    const state = syncEntries(EMPTY, [A])

    expect(state.entries[0].original).toEqual({ title: A.title, content: A.content })
  })
})

describe('isEdited — derived, never a flag', () => {
  const entry = () => syncEntries(EMPTY, [A]).entries[0]

  it('is false for an untouched card and true once either half changes', () => {
    expect(isEdited(entry())).toBe(false)
    expect(isEdited({ ...entry(), title: 'Meiosis' })).toBe(true)
    expect(isEdited({ ...entry(), content: 'something else' })).toBe(true)
  })

  it('clears itself when the card is typed back to the generated wording', () => {
    // The reason this is a comparison and not a `wasEdited` flag: a flag would
    // stay raised here and offer a revert that does nothing.
    const edited = { ...entry(), content: 'something else' }
    expect(isEdited({ ...edited, content: A.content })).toBe(false)
  })
})

describe('useCardCuration', () => {
  it('opens with every card kept', () => {
    const { result } = renderHook(() => useCardCuration([A, B]))

    expect(result.current.keptCount).toBe(2)
    expect(result.current.discardedCount).toBe(0)
  })

  it('discards and restores a single card without touching the others', () => {
    const { result } = renderHook(() => useCardCuration([A, B]))
    const [first, second] = result.current.entries

    act(() => result.current.setKept(first.id, false))
    expect(result.current.keptCount).toBe(1)
    expect(result.current.keptEntries[0].id).toBe(second.id)

    act(() => result.current.setKept(first.id, true))
    expect(result.current.keptCount).toBe(2)
  })

  it('discards everything, then restores everything, from one control', () => {
    const { result } = renderHook(() => useCardCuration([A, B]))

    act(() => result.current.toggleAllKept())
    expect(result.current.keptCount).toBe(0)
    expect(result.current.discardedCount).toBe(2)

    act(() => result.current.toggleAllKept())
    expect(result.current.keptCount).toBe(2)
  })

  it('reverts a card to exactly what the generator produced', () => {
    const { result } = renderHook(() => useCardCuration([A, B]))
    const { id } = result.current.entries[0]

    act(() => result.current.setField(id, 'content', 'rewritten'))
    expect(isEdited(result.current.entries[0])).toBe(true)

    act(() => result.current.revert(id))
    expect(result.current.entries[0]).toMatchObject({ title: A.title, content: A.content })
    expect(isEdited(result.current.entries[0])).toBe(false)
  })

  it('keeps an edit through a discard and a restore', () => {
    const { result } = renderHook(() => useCardCuration([A, B]))
    const { id } = result.current.entries[0]

    act(() => result.current.setField(id, 'content', 'rewritten'))
    act(() => result.current.setKept(id, false))
    act(() => result.current.setKept(id, true))

    expect(result.current.entries[0].content).toBe('rewritten')
    expect(isEdited(result.current.entries[0])).toBe(true)
  })

  it('carries curation across a re-render with an equivalent array', () => {
    const { result, rerender } = renderHook(({ cards }) => useCardCuration(cards), {
      initialProps: { cards: [A, B] }
    })

    act(() => result.current.setKept(result.current.entries[0].id, false))
    rerender({ cards: [A, B] })

    expect(result.current.keptCount).toBe(1)
  })

  it('drops curation when the batch is regenerated', () => {
    const { result, rerender } = renderHook(({ cards }) => useCardCuration(cards), {
      initialProps: { cards: [A, B] }
    })

    act(() => result.current.setKept(result.current.entries[0].id, false))
    rerender({ cards: [card('Meiosis'), card('Osmosis')] })

    expect(result.current.keptCount).toBe(2)
  })
})

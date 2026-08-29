import { useCallback, useMemo, useState } from 'react'

/**
 * The draft model behind the generated-card curation step (CURATE-001).
 *
 * `GeneratedCards` used to hold `selectedCards` as an array of **array indices**
 * into its `cards` prop. That was already fragile — the array grows while cards
 * stream in and again on "Generate more" — and it becomes incorrect the moment
 * per-card edits exist, because an index follows a *position*, not a card. So
 * an edit made to the third card would silently reattach itself to whatever
 * card arrived third later on (PRD `docs/prd-card-curation.md`, E5).
 *
 * This hook replaces it with one entry per card, keyed by an id assigned on
 * arrival and never reused. Each entry carries the working text, the text the
 * generator produced, and whether the user is keeping it.
 *
 * **Cards arrive kept** (PRD A1). The user asked for these cards; consent is
 * expressed by requesting generation, so the verb here is *discard*, not
 * *select*.
 *
 * ## Syncing against a prop the parent owns
 *
 * The `cards` prop changes in two ways that mean opposite things, and telling
 * them apart is this hook's whole job:
 *
 * - **Append** — streaming delivers another card, or "Generate more" adds to
 *   the batch. Existing curation must survive untouched. Recognised by the new
 *   array starting with exactly the same card *objects*, in order.
 * - **Reset** — "Generate again" replaces the batch. Curation of cards that no
 *   longer exist must not survive. Anything that is not an append.
 *
 * Identity comparison is what distinguishes them, which is why the parent
 * appending with `setCards(prev => [...prev, ...more])` works: the spread makes
 * a new array but keeps the element references. A parent that rebuilt every
 * card object on every render would read as a reset each time — today both
 * callers hold the array in state or `useMemo`, so neither does.
 */

/** Reads the wire shape (`{ title, content }`) into an entry's fields. */
const fieldsOf = (card) => ({
  title: card?.title ?? '',
  content: card?.content ?? ''
})

/**
 * One card's working state. `original` is what the generator produced and is
 * never written to again, so "revert to generated" stays available for as long
 * as the dialog is open (PRD A5).
 */
export const entryFrom = (card, id) => {
  const fields = fieldsOf(card)
  return { id, ...fields, original: fields, kept: true }
}

/** Whether `next` extends `prev` rather than replacing it. */
const isAppendOf = (prev, next) => next.length >= prev.length && prev.every((card, i) => card === next[i])

/**
 * Fold a new `cards` prop into the draft state.
 *
 * Pure and exported so the append-vs-reset rules can be asserted directly,
 * without rendering the dialog or simulating a stream.
 *
 * Returning the **same state object** when nothing observably changed is
 * load-bearing, not an optimisation: the hook syncs during render, and a
 * caller that passes a fresh-but-equivalent array on every render would
 * otherwise loop forever.
 */
export const syncEntries = (state, cards) => {
  const next = Array.isArray(cards) ? cards : []
  if (next === state.source) return state

  const append = isAppendOf(state.source, next)
  if (append && next.length === state.source.length) return state

  let nextId = state.nextId
  const added = next.slice(append ? state.source.length : 0).map((card) => entryFrom(card, `gc-${nextId++}`))

  return {
    entries: (append ? state.entries : []).concat(added),
    source: next,
    // Ids are never recycled across a reset, so a stale React key from the
    // previous batch can never collide with a new entry.
    nextId
  }
}

const EMPTY = { entries: [], source: [], nextId: 0 }

export default function useCardCuration(cards) {
  const [state, setState] = useState(EMPTY)

  // Derived from props during render rather than in an effect: an effect would
  // paint one frame of an empty grid before the cards appeared, and would show
  // a briefly-disabled primary action on every open.
  const synced = syncEntries(state, cards)
  if (synced !== state) setState(synced)

  const { entries } = synced

  const setKept = useCallback((id, kept) => {
    setState((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) => (entry.id === id ? { ...entry, kept } : entry))
    }))
  }, [])

  const setAllKept = useCallback((kept) => {
    setState((prev) => ({ ...prev, entries: prev.entries.map((entry) => ({ ...entry, kept })) }))
  }, [])

  const keptEntries = useMemo(() => entries.filter((entry) => entry.kept), [entries])

  return {
    entries,
    keptEntries,
    keptCount: keptEntries.length,
    discardedCount: entries.length - keptEntries.length,
    setKept,
    /**
     * One control, two directions: it discards everything while anything is
     * kept, and restores everything once nothing is. A separate "restore all"
     * button would sit disabled almost permanently.
     */
    toggleAllKept: useCallback(() => setAllKept(keptEntries.length === 0), [setAllKept, keptEntries.length])
  }
}

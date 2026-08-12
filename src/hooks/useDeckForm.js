import { useCallback, useEffect, useRef, useState } from 'react'

import { decksService } from '../api/services'
import { focusFirstControl, parseTagInput } from '../components/Common/Form/formUtils'
import useFormCore from './useFormCore'

/**
 * Deck creation — Variant A, and create-only.
 *
 * `CreateDeckModal` used to serve both creation and editing, while deck
 * settings edited the *same* object through a disjoint set of fields: a user
 * renaming a deck opened one modal and a user changing its pace opened a
 * different one, with no route between them and publish/unpublish implemented
 * in both. The ruling (DECKS.md §1.1) split them by job rather than by object:
 * this hook creates decks, and every edit path goes to settings.
 *
 * So there is no `isEdit` branch here, no `initialData`, and no publish call.
 * What is left is one required field and three offers.
 *
 * The one piece of state beyond `useFormCore` is `createdDeck`, and it is the
 * activation change (§9.2): a deck's value moment is its first card, not its
 * existence, so a successful create does not drop the user back onto a list
 * holding an empty deck.
 */

/** Named for their payload, never for the control that holds it (§S2). */
const GROUPS = ['description', 'tags', 'image']

const emptyDeck = () => ({ name: '', description: '', imageUrl: '', tags: [] })

const useDeckForm = ({ open, onSaved, onClose }) => {
  const [limitReached, setLimitReached] = useState(false)
  const [createdDeck, setCreatedDeck] = useState(null)

  const nodes = useRef({})
  const refCallbacks = useRef({})
  const tagInputRef = useRef(null)

  const refFor = useCallback((name) => {
    if (!refCallbacks.current[name]) {
      refCallbacks.current[name] = (node) => {
        nodes.current[name] = node
      }
    }
    return refCallbacks.current[name]
  }, [])

  const focusGroup = useCallback((name) => focusFirstControl(nodes.current[name]), [])

  /** 403 is the plan limit, and it wants an Upgrade action rather than a sentence. */
  const persist = useCallback(async (payload) => {
    setLimitReached(false)
    try {
      return await decksService.create(payload)
    } catch (error) {
      if (error?.response?.status === 403) setLimitReached(true)
      throw error
    }
  }, [])

  // A tag typed but never Entered is still a tag the user meant. Read from the
  // input rather than from `values`, which has not seen the commit yet.
  const buildPayload = useCallback(
    (values) => ({
      name: values.name.trim(),
      description: values.description,
      image_url: values.imageUrl || null,
      tags: parseTagInput([...values.tags, tagInputRef.current?.pendingTag?.() || ''])
    }),
    []
  )

  const core = useFormCore({
    open,
    entity: null,
    initialValues: emptyDeck,
    groups: GROUPS,
    requiredFields: [{ field: 'name', errorKey: 'cards.create.nameRequired' }],
    buildPayload,
    persist
  })

  const { reveal: coreReveal, errorAt, firstErrorField, submit } = core

  useEffect(() => {
    if (!open) return
    setCreatedDeck(null)
    setLimitReached(false)
  }, [open])

  const reveal = useCallback(
    (group) => {
      coreReveal(group)
      // Blocking, not a nicety: the chip is gone from the DOM the moment it is
      // used, so without this focus falls to <body>.
      setTimeout(() => focusGroup(group), 0)
    },
    [coreReveal, focusGroup]
  )

  // A rejected save moves focus to what it complained about. `errorAt` counts
  // rejections so a *second* Create re-focuses even though the flag is set.
  useEffect(() => {
    if (!errorAt || !firstErrorField) return
    focusGroup(firstErrorField)
  }, [errorAt, firstErrorField, focusGroup])

  const create = useCallback(() => {
    tagInputRef.current?.commitPending()
    // No onClose: the sheet stays open on success and offers the next step.
    return submit((saved) => {
      onSaved?.(saved)
      setCreatedDeck(saved)
    })
  }, [submit, onSaved])

  const dismiss = useCallback(() => {
    setCreatedDeck(null)
    onClose?.()
  }, [onClose])

  return { ...core, reveal, refFor, tagInputRef, createdDeck, limitReached, create, dismiss }
}

export default useDeckForm

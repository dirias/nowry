import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { cardsService } from '../api/services'
import { extractDeckId, scrollIntoViewSafely } from '../components/Common/Form/formUtils'
import { cardToFormState, contentPredicatesFor, emptyCardValues, specFor } from '../components/Cards/card/cardTypes'
import useFormCore from './useFormCore'

/**
 * The card-authoring loop.
 *
 * Composes `useFormCore` and adds the three things card authoring needs and a
 * goal does not: a type that can change while the sheet is open, a focus table
 * that covers a relational error, and `Save & next` — because nobody creates
 * one flashcard. Ten in a row, one-handed, is the workflow, and two of the
 * three modals closed on every save, so ten quiz cards meant ten open/close
 * cycles and ten trips through the deck picker.
 *
 * The first control of each revealed group, and the group's own container,
 * are addressed by name through `refFor`, so the focus table is data rather
 * than a chain of special cases.
 */

/** Where focus lands when a chip is used — the chip itself unmounts (§8.6). */
const GROUP_FOCUS = { tags: 'tags', deck: 'deck', explanation: 'explanation', description: 'content' }

const hasWriting = (values, fields) =>
  fields.some((field) => {
    const value = values[field]
    if (Array.isArray(value)) return value.some((item) => String(item ?? '').trim() !== '')
    if (typeof value === 'number') return false
    return String(value ?? '').trim() !== ''
  })

/**
 * Focus whatever a name points at: a field, a group container, or an object
 * exposing `focus` (the option list, whose target depends on its contents).
 */
const focusTarget = (node) => {
  if (!node) return
  const selector = 'input, textarea, select, button, [tabindex]'
  const target = node.matches?.(selector) ? node : node.querySelector?.(selector) || node
  target?.focus?.()
  scrollIntoViewSafely(target)
}

const useCardForm = ({ open, card = null, onSaved, onClose }) => {
  const [cardType, setCardType] = useState(() => card?.card_type || 'flashcard')
  const [pendingType, setPendingType] = useState(null)
  // Groups the user revealed under a type they have since switched away from.
  // `useFormCore` keeps one revealed set for the sheet's whole life, which is
  // right for tags and deck and wrong for a discarded explanation.
  const [suppressedGroups, setSuppressedGroups] = useState(() => new Set())
  const [limitReached, setLimitReached] = useState(false)

  const spec = specFor(cardType)
  const entity = card && (card._id || card.id) ? card : null
  const cardId = entity?._id || entity?.id
  const presetDeckId = extractDeckId(card?.deck_id)

  const nodes = useRef({})
  const refCallbacks = useRef({})
  const tagInputRef = useRef(null)
  // Read by an effect that must key off `open` alone — a dependency on the
  // card or the deck list is how QuizCardModal wiped typed input whenever the
  // decks were refetched.
  const openState = useRef({})
  openState.current = { cardType: card?.card_type || 'flashcard', presetDeckId, isEdit: Boolean(entity) }

  const refFor = useCallback((name) => {
    if (!refCallbacks.current[name]) {
      refCallbacks.current[name] = (node) => {
        nodes.current[name] = node
      }
    }
    return refCallbacks.current[name]
  }, [])

  const focusField = useCallback((name) => focusTarget(nodes.current[name]), [])

  /** 403 is the plan limit, and it wants an Upgrade action rather than a sentence. */
  const persist = useCallback(
    async (payload, isEdit) => {
      setLimitReached(false)
      try {
        return isEdit ? await cardsService.update(cardId, payload) : await cardsService.create(payload)
      } catch (error) {
        if (error?.response?.status === 403) setLimitReached(true)
        throw error
      }
    },
    [cardId]
  )

  const initialValues = useCallback(() => emptyCardValues(presetDeckId), [presetDeckId])
  const hasContent = useMemo(() => contentPredicatesFor(cardType), [cardType])

  const core = useFormCore({
    open,
    entity,
    initialValues,
    toFormState: cardToFormState,
    groups: spec.groups,
    hasContent,
    requiredFields: spec.requiredFields,
    validate: spec.validate,
    continueResets: spec.continueResets,
    buildPayload: spec.buildPayload,
    persist
  })

  const { reveal: coreReveal, setField, savedCount, errorAt, firstErrorField, submit, submitAndContinue } = core

  // Read by effects that must not re-run because the spec object was rebuilt.
  const firstRequired = useRef(spec.firstRequired)
  firstRequired.current = spec.firstRequired

  // Re-initialise the type on the rising edge of `open`, and at no other time.
  useEffect(() => {
    if (!open) return
    setCardType(openState.current.cardType)
    setPendingType(null)
    setSuppressedGroups(new Set())
    setLimitReached(false)
    // A caller that pre-supplied a deck has already made the choice the chip
    // offers, so the group opens showing it — without taking the focus that
    // belongs to the first required field.
    if (!openState.current.isEdit && openState.current.presetDeckId) coreReveal('deck')
  }, [open, coreReveal])

  const revealed = useMemo(
    () => new Set([...core.revealed].filter((group) => !suppressedGroups.has(group))),
    [core.revealed, suppressedGroups]
  )

  const availableChips = useMemo(() => spec.groups.filter((group) => !revealed.has(group)), [spec.groups, revealed])

  const reveal = useCallback(
    (group) => {
      setSuppressedGroups((previous) => {
        if (!previous.has(group)) return previous
        const next = new Set(previous)
        next.delete(group)
        return next
      })
      coreReveal(group)
      // Blocking, not a nicety: the chip is gone from the DOM the moment it is
      // used, so without this focus falls to <body> and a keyboard user is
      // ejected from the form they were filling in.
      setTimeout(() => focusField(GROUP_FOCUS[group]), 0)
    },
    [coreReveal, focusField]
  )

  // A rejected save moves focus to what it complained about. `errorAt` counts
  // rejections so a *second* Save re-focuses even though the flag is already set.
  useEffect(() => {
    if (!errorAt || !firstErrorField) return
    focusField(firstErrorField)
  }, [errorAt, firstErrorField, focusField])

  // Save & next: the sheet stays open, so something has to say where to type.
  const countedSaves = useRef(0)
  useEffect(() => {
    if (savedCount === countedSaves.current) return
    countedSaves.current = savedCount
    if (savedCount > 0) focusField(firstRequired.current)
  }, [savedCount, focusField])

  const applyType = useCallback(
    (next) => {
      const outgoing = specFor(cardType)
      const incoming = specFor(next)
      const blank = emptyCardValues()
      // Title, tags and deck survive; what has no counterpart in the new type
      // does not. setField rather than setValues, so each discarded field's
      // error goes with it.
      new Set([...outgoing.ownFields, ...incoming.ownFields]).forEach((field) => setField(field, blank[field]))
      setSuppressedGroups((previous) => {
        const merged = new Set(previous)
        outgoing.groups.filter((group) => !incoming.groups.includes(group)).forEach((group) => merged.add(group))
        return merged
      })
      setCardType(next)
      setPendingType(null)
    },
    [cardType, setField]
  )

  const requestType = useCallback(
    (next) => {
      if (next === cardType) return
      // Only ask when there is something to lose.
      if (hasWriting(core.values, specFor(cardType).ownFields)) setPendingType(next)
      else applyType(next)
    },
    [cardType, core.values, applyType]
  )

  const saveAndClose = useCallback(() => submit(onSaved, onClose), [submit, onSaved, onClose])
  const saveAndNext = useCallback(() => submitAndContinue(onSaved), [submitAndContinue, onSaved])
  const primaryAction = core.isEdit ? saveAndClose : saveAndNext

  // Cmd/Ctrl+Enter, from anywhere in the form. Deliberately not bare Enter:
  // there is no <form> element precisely so Enter cannot save a half-composed
  // card from the tags field. A field that has already claimed this chord —
  // the tag input commits a tag with it — marks the event handled.
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey) || event.defaultPrevented) return
      event.preventDefault()
      primaryAction()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, primaryAction])

  return {
    ...core,
    revealed,
    availableChips,
    reveal,
    cardType,
    spec,
    pendingType,
    requestType,
    confirmTypeChange: useCallback(() => applyType(pendingType), [applyType, pendingType]),
    cancelTypeChange: useCallback(() => setPendingType(null), []),
    limitReached,
    refFor,
    tagInputRef,
    saveAndClose,
    saveAndNext,
    primaryAction
  }
}

export default useCardForm

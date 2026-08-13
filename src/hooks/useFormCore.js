import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { describeApiError } from '../components/Common/Form/formUtils'

/**
 * useFormCore — the state and persistence behind every form surface.
 *
 * The generalization of useGoalForm, whose 241 lines were read in full to
 * separate what is reusable from what is the goal feature's own. What survived
 * is the structure: an open-only reset, one reveal rule covering both add and
 * edit, per-field errors that re-fire on a second rejected save, and a submit
 * that keeps every field intact when the API says no.
 *
 * Constraint, carried over unchanged: no JSX, no Joy import, no t(). This
 * module returns values and translation *keys*, never rendered strings.
 *
 * @param open              the sheet's open flag; the reset keys off its rising edge
 * @param entity            null in add mode, the object in edit mode
 * @param initialValues     () => ({...})            add-mode state
 * @param toFormState       (entity) => ({...})      edit-mode state
 * @param groups            disclosure group names, in body order
 * @param overrideGroups    chips that swap a control rather than add one; always last
 * @param hasContent        { [group]: (entity) => boolean }
 * @param onReveal          { [group]: (values) => partial }  e.g. seed a blank row
 * @param requiredFields    [{ field, errorKey, valid?: (value, values) => boolean }]
 * @param validate          (values) => ({ field, errorKey }) | null — relational rules (§8.3)
 * @param continueResets    field names cleared by submitAndContinue; everything else persists
 * @param buildPayload      (values) => payload
 * @param persist           (payload, isEdit) => Promise
 * @param initialSection    null | group name — reveal, seed, and focus it on open
 */

/** Non-empty after trim. The default for a field that declares no rule of its own. */
const isFilled = (value) => (typeof value === 'string' ? value.trim() !== '' : value !== null && value !== undefined && value !== '')

/** §S3 — a group is open if it already holds content, or the caller asked for it. */
const revealedAtOpen = (entity, groups, hasContent, initialSection) =>
  new Set(groups.filter((group) => Boolean(entity && hasContent[group]?.(entity)) || initialSection === group))

const useFormCore = ({
  open,
  entity = null,
  initialValues = () => ({}),
  toFormState = () => ({}),
  groups = [],
  overrideGroups = [],
  hasContent = {},
  onReveal = {},
  requiredFields = [],
  validate = null,
  continueResets = [],
  buildPayload = (values) => values,
  persist,
  initialSection = null
}) => {
  const [values, setValues] = useState(() => initialValues())
  const [revealed, setRevealed] = useState(() => new Set())
  const [lastRevealed, setLastRevealed] = useState(null)
  const [errors, setErrors] = useState({})
  // Bumped on every rejected submit so a *second* Save still re-focuses the
  // offending field even though the error flag is already set.
  const [errorAt, setErrorAt] = useState(0)
  const [firstErrorField, setFirstErrorField] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  const isEdit = Boolean(entity?._id || entity?.id)
  const wasOpen = useRef(false)
  // The reset reads these, but must never re-run because one changed identity.
  const config = useRef({})
  config.current = { entity, initialValues, toFormState, groups, hasContent, onReveal, isEdit, initialSection }

  /**
   * Re-initialise on the rising edge of `open`, and at no other time.
   *
   * This is the fix for a real data-loss bug, not a tidy-up: QuizCardModal's
   * reset effect lists `decks` in its dependencies, so the form wipes every
   * typed field whenever the deck list is refetched and comes back as a new
   * array reference.
   */
  useEffect(() => {
    if (!open) {
      wasOpen.current = false
      return
    }
    if (wasOpen.current) return
    wasOpen.current = true

    const current = config.current
    const base = current.isEdit ? current.toFormState(current.entity) : current.initialValues()
    const seeded = current.initialSection ? current.onReveal[current.initialSection]?.(base) : null

    setValues(seeded ? { ...base, ...seeded } : base)
    setRevealed(revealedAtOpen(current.isEdit ? current.entity : null, current.groups, current.hasContent, current.initialSection))
    setLastRevealed(null)
    setErrors({})
    setFirstErrorField(null)
    setSaveError(null)
    setSavedCount(0)
  }, [open])

  const setField = useCallback((field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    // An error that persists while the user fixes it is noise. Only the field
    // that owns the error clears it — never the whole form.
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }, [])

  const reveal = useCallback((group) => {
    setRevealed((prev) => (prev.has(group) ? prev : new Set(prev).add(group)))
    setLastRevealed(group)
    // Revealing "Add options" must add an option. Without this the chip
    // resolves to an empty state plus a second Add button — the double
    // affordance this pattern exists to remove.
    setValues((prev) => {
      const seeded = config.current.onReveal[group]?.(prev)
      return seeded ? { ...prev, ...seeded } : prev
    })
  }, [])

  /** Override chips are offers to change a value, not to add one, so they sort last. */
  const availableChips = useMemo(
    () => [...groups.filter((group) => !revealed.has(group)), ...overrideGroups.filter((group) => !revealed.has(group))],
    [groups, overrideGroups, revealed]
  )

  // One computed target, so a required field's autoFocus and a section's focus
  // can never both fire (§8.6).
  const autoFocusTarget = initialSection ? 'section' : 'firstRequired'

  /**
   * @returns the first failure as { field, errorKey }, or null.
   * Never a generic "fill in all required fields": one message, one field, one
   * focus target.
   */
  const findFailure = useCallback(
    (state) => {
      const failed = requiredFields.find(({ field, valid }) => !(valid ? valid(state[field], state) : isFilled(state[field])))
      if (failed) return { field: failed.field, errorKey: failed.errorKey }
      return validate ? validate(state) : null
    },
    [requiredFields, validate]
  )

  const reject = useCallback((failure) => {
    setErrors((prev) => ({ ...prev, [failure.field]: failure.errorKey }))
    setFirstErrorField(failure.field)
    setErrorAt((count) => count + 1)
  }, [])

  /**
   * Runs the shared save path and hands the result back, or null if it did not
   * happen. A failed save keeps the sheet open with every field intact — it
   * must never cost the user their typing.
   */
  const runSave = useCallback(async () => {
    if (saving) return null
    const failure = findFailure(values)
    if (failure) {
      reject(failure)
      // The primary action is never disabled for validation; it explains
      // itself instead, and fires no request.
      return null
    }

    setSaving(true)
    setSaveError(null)
    try {
      return { saved: await persist(buildPayload(values), isEdit) }
    } catch (error) {
      setSaveError(describeApiError(error))
      return null
    } finally {
      setSaving(false)
    }
  }, [saving, values, findFailure, reject, persist, buildPayload, isEdit])

  const submit = useCallback(
    async (onSuccess, onClose) => {
      const result = await runSave()
      if (!result) return
      onSuccess?.(result.saved)
      onClose?.()
    },
    [runSave]
  )

  /**
   * §9.4 — save and stay. Clears only what the caller listed, so the deck and
   * tags someone chose once survive all ten cards. The sheet does not close;
   * `savedCount` is the signal a surface re-focuses and counts on.
   */
  const submitAndContinue = useCallback(
    async (onSaved) => {
      const result = await runSave()
      if (!result) return
      onSaved?.(result.saved)
      const fresh = initialValues()
      setValues((prev) => {
        const cleared = {}
        continueResets.forEach((field) => {
          cleared[field] = fresh[field]
        })
        return { ...prev, ...cleared }
      })
      setSavedCount((count) => count + 1)
    },
    [runSave, initialValues, continueResets]
  )

  return {
    values,
    setField,
    setValues,
    revealed,
    reveal,
    lastRevealed,
    availableChips,
    errors,
    errorAt,
    firstErrorField,
    saveError,
    saving,
    savedCount,
    isEdit,
    autoFocusTarget,
    submit,
    submitAndContinue
  }
}

export default useFormCore

import { useCallback, useEffect, useMemo, useState } from 'react'
import { annualPlanningService } from '../api/services'
import { blankMilestone } from '../components/AnnualPlanning/goalDerivation'

/**
 * useGoalForm — all state and persistence behind the Add/Edit Goal form.
 *
 * Lifted out of GoalDialog.js, which held ~110 lines of form state inside a
 * JSX component. Constraint: no JSX, no Joy import, no t() — this module
 * returns values and translation *keys*, never rendered strings, the same rule
 * goalDerivation.js follows.
 */

// The native date input and the timeframe Select both use '' as their "empty"
// value. The API's Goal model types these as Optional[datetime] / Optional[int]
// and Pydantic v2 does not coerce '' to null — it rejects the request with 422.
// Anything the user left blank must therefore travel as an explicit null.
export const emptyToNull = (value) => (value === '' || value === undefined ? null : value)

// FastAPI returns `detail` as an array of {loc, msg} objects for a 422 and as a
// plain string for handled HTTPExceptions. Flatten both into one readable line
// so the user sees which field was rejected instead of a bare "AxiosError".
export const describeApiError = (error) => {
  const detail = error?.response?.data?.detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const field = (item?.loc || []).filter((part) => part !== 'body').join('.')
        return field ? `${field}: ${item?.msg}` : item?.msg
      })
      .filter(Boolean)
      .join(' · ')
  }
  if (typeof detail === 'string') return detail
  return error?.message || ''
}

/** Body order, and therefore rail order. One order, no mapping to learn. */
export const DETAIL_GROUPS = ['milestones', 'description', 'targetDate', 'image']

/** The timeframe override chip. Not a DETAIL_GROUP — it swaps a control rather than adding one. */
export const TIMEFRAME_GROUP = 'timeframe'

const emptyForm = (focusAreaId) => ({
  title: '',
  description: '',
  focus_area_id: focusAreaId,
  target_date: '',
  image_url: '',
  type: 'yearly',
  quarter: '',
  parent_id: '',
  year: new Date().getFullYear(),
  status: 'not_started'
})

/** §4.3 — a group is revealed at open if it already holds content. */
const hasContent = (goal, group) => {
  if (!goal) return false
  if (group === 'milestones') return (goal.milestones ?? []).length > 0
  if (group === 'description') return Boolean(goal.description?.trim())
  if (group === 'targetDate') return Boolean(goal.target_date)
  if (group === 'image') return Boolean(goal.image_url?.trim())
  return false
}

/**
 * §4.3's one rule, covering both modes:
 *   revealed at open  =  hasContent(group)  ||  initialSection === group
 *
 * Add mode collapses because every predicate is false, not because Add mode is
 * special-cased. Editing a goal with milestones and a description opens with
 * both expanded — nothing the user already wrote is ever hidden behind a click.
 */
const revealedAtOpen = (goal, initialSection) =>
  new Set(DETAIL_GROUPS.filter((group) => hasContent(goal, group) || initialSection === group))

/** Normalises stored milestones, which may be bare strings on older documents. */
const normaliseMilestones = (goal) =>
  (goal?.milestones || []).map((m) =>
    typeof m === 'string'
      ? { title: m, completed: false, due_date: '' }
      : { title: m.title || '', completed: m.completed || false, due_date: m.due_date ? m.due_date.split('T')[0] : '' }
  )

const useGoalForm = ({ open, goal, focusAreaId, initialSection = null }) => {
  const [formData, setFormData] = useState(() => emptyForm(focusAreaId))
  const [milestones, setMilestones] = useState([])
  const [revealed, setRevealed] = useState(() => new Set())
  const [lastRevealed, setLastRevealed] = useState(null)
  const [titleError, setTitleError] = useState(false)
  // Bumped on every rejected submit so the dialog can re-focus the title even
  // when titleError was already true — a second Save must not be a no-op.
  const [titleErrorAt, setTitleErrorAt] = useState(0)
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)

  const isEdit = Boolean(goal?._id)
  // Every path except FocusAreaView's context-free "Add goal" supplies scope.
  const hasContext = Boolean(goal && (goal._id || goal.type || goal.quarter || goal.parent_id))

  // Reset on open only. Never recomputed while the modal is open: a group must
  // not vanish because the user cleared the field that revealed it (§4.4).
  useEffect(() => {
    if (!open) return

    if (isEdit) {
      setFormData({
        title: goal.title || '',
        description: goal.description || '',
        focus_area_id: goal.focus_area_id,
        target_date: goal.target_date ? goal.target_date.split('T')[0] : '',
        image_url: goal.image_url || '',
        type: goal.type || 'yearly',
        quarter: goal.quarter || '',
        parent_id: goal.parent_id || '',
        year: goal.year || new Date().getFullYear(),
        status: goal.status || 'not_started'
      })
    } else {
      setFormData({
        ...emptyForm(focusAreaId),
        type: goal?.type || 'yearly',
        quarter: goal?.quarter || '',
        parent_id: goal?.parent_id || ''
      })
    }

    const initial = normaliseMilestones(isEdit ? goal : null)
    // §5.1 effect 2 — rung 5 only fires on a goal with no milestones, so in
    // practice this always seeds. If the card's data was stale and the goal
    // does have milestones, leave the list exactly as it is.
    setMilestones(initialSection === 'milestones' && initial.length === 0 ? [blankMilestone()] : initial)

    setRevealed(revealedAtOpen(isEdit ? goal : null, initialSection))
    setLastRevealed(null)
    setTitleError(false)
    setSaveError(null)
  }, [open, goal, focusAreaId, initialSection, isEdit])

  const setField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // An error that persists while the user fixes it is noise.
    if (field === 'title') setTitleError(false)
  }, [])

  const reveal = useCallback((group) => {
    setRevealed((prev) => (prev.has(group) ? prev : new Set(prev).add(group)))
    setLastRevealed(group)
    // Revealing "Add milestones" must add a milestone. Without this the chip
    // resolves to an empty state plus a second Add button — the double
    // affordance this redesign exists to remove. It also keeps the editor's
    // empty state reachable only by deleting the last row (§8).
    if (group === 'milestones') setMilestones((prev) => (prev.length === 0 ? [blankMilestone()] : prev))
  }, [])

  /**
   * §4.5 — what is left to offer. Edit mode never offers a timeframe change:
   * a goal's quarter cannot be edited today and this phase does not add it.
   */
  const availableChips = useMemo(() => {
    const chips = DETAIL_GROUPS.filter((group) => !revealed.has(group))
    if (!isEdit && hasContext && !revealed.has(TIMEFRAME_GROUP)) chips.push(TIMEFRAME_GROUP)
    return chips
  }, [revealed, isEdit, hasContext])

  // §5.2 — one computed target, so the title's autoFocus and the milestone
  // focus can never both fire.
  const autoFocusTarget = initialSection === 'milestones' ? 'firstMilestone' : 'title'

  // The scope chip is read-only unless the user asked to override it, or the
  // caller supplied no context at all (§3.4).
  const showTimeframeSelect = !hasContext || revealed.has(TIMEFRAME_GROUP)

  const submit = useCallback(
    async (onSuccess, onClose) => {
      if (saving) return
      // §7.2 — exactly one rule blocks Save, and it explains itself rather
      // than returning silently the way this used to.
      if (!formData.title?.trim()) {
        setTitleError(true)
        setTitleErrorAt((n) => n + 1)
        return
      }

      setSaving(true)
      setSaveError(null)
      try {
        // Blank rows are dropped silently — the user never typed in them.
        const validMilestones = milestones
          .filter((m) => m.title && m.title.trim() !== '')
          .map((m) => ({ title: m.title.trim(), completed: m.completed || false, due_date: m.due_date || null }))

        const payload = {
          ...formData,
          title: formData.title.trim(),
          target_date: emptyToNull(formData.target_date),
          // A yearly objective has no quarter; the Select stores '' for that case.
          quarter: emptyToNull(formData.quarter) === null ? null : Number(formData.quarter),
          parent_id: emptyToNull(formData.parent_id),
          milestones: validMilestones
        }

        if (isEdit) await annualPlanningService.updateGoal(goal._id, payload)
        else await annualPlanningService.createGoal(payload)

        onSuccess?.()
        onClose?.()
      } catch (error) {
        // Keep the modal open with every field intact — a failed save must not
        // cost the user their typing.
        setSaveError(describeApiError(error))
      } finally {
        setSaving(false)
      }
    },
    [saving, formData, milestones, isEdit, goal]
  )

  return {
    formData,
    setField,
    milestones,
    setMilestones,
    revealed,
    reveal,
    availableChips,
    titleError,
    titleErrorAt,
    saveError,
    saving,
    isEdit,
    hasContext,
    showTimeframeSelect,
    lastRevealed,
    autoFocusTarget,
    submit
  }
}

export default useGoalForm

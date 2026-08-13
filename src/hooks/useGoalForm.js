import { useCallback, useEffect, useMemo, useRef } from 'react'
import { annualPlanningService } from '../api/services'
import { blankMilestone } from '../components/AnnualPlanning/goalDerivation'
import { describeApiError, emptyToNull, focusFirstControl } from '../components/Common/Form/formUtils'
import useFormCore from './useFormCore'

/**
 * useGoalForm — the goal feature's adapter over `useFormCore`.
 *
 * Everything generic moved out (FE-S9 / UX-CONTRACT §7.1): the open-only reset,
 * the reveal rule, per-field errors that re-fire on a second rejected Save, and
 * the submit that keeps every field intact when the API says no all live in
 * `useFormCore` now, shared with the card, deck and book surfaces. What is left
 * here is the goal domain: milestone normalisation, the quarter/objective scope
 * rules, and the payload the Goal model expects.
 *
 * The public shape is unchanged on purpose. This is a migration of a shipped,
 * user-facing form, so every name `GoalDialog` and the suite already use —
 * `formData`, `milestones`, `titleError`, `titleErrorAt`, `showTimeframeSelect`
 * — is kept, mapped onto the core's generic equivalents.
 *
 * Constraint, unchanged: no JSX, no Joy import, no t(). This module returns
 * values and translation *keys*, never rendered strings.
 */

/**
 * Relocated to `Common/Form/formUtils` so the seven form surfaces share one
 * definition; re-exported here because they were this module's API first
 * (UX-CONTRACT §12 — `describeApiError` must have exactly one definition).
 */
export { describeApiError, emptyToNull }

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
  status: 'not_started',
  milestones: []
})

/** Normalises stored milestones, which may be bare strings on older documents. */
const normaliseMilestones = (goal) =>
  (goal?.milestones || []).map((m) =>
    typeof m === 'string'
      ? { title: m, completed: false, due_date: '' }
      : { title: m.title || '', completed: m.completed || false, due_date: m.due_date ? m.due_date.split('T')[0] : '' }
  )

/**
 * §4.3 — a group is revealed at open if it already holds content. The core
 * applies the same predicate in Add mode, where every one of them is false, so
 * Add collapses by the rule rather than by a special case.
 */
const HAS_CONTENT = {
  milestones: (goal) => (goal.milestones ?? []).length > 0,
  description: (goal) => Boolean(goal.description?.trim()),
  targetDate: (goal) => Boolean(goal.target_date),
  image: (goal) => Boolean(goal.image_url?.trim())
}

/**
 * Revealing "Add milestones" must add a milestone. Without this the chip
 * resolves to an empty state plus a second Add button — the double affordance
 * this redesign exists to remove.
 *
 * The core runs this both on the chip and on `initialSection`, which is what
 * keeps the goal card's rung 5 seeding a blank row. If the card's data was
 * stale and the goal does have milestones, the list is left exactly as it is.
 */
const ON_REVEAL = {
  milestones: (values) => ((values.milestones ?? []).length === 0 ? { milestones: [blankMilestone()] } : null)
}

const useGoalForm = ({ open, goal, focusAreaId, initialSection = null }) => {
  // Deliberately the same predicate `useFormCore` applies, so the mode that
  // picks `toFormState` over `initialValues` and the mode that picks update
  // over create can never disagree.
  const isEdit = Boolean(goal?._id || goal?.id)
  // Every path except FocusAreaView's context-free "Add goal" supplies scope.
  const hasContext = Boolean(goal && (goal._id || goal.type || goal.quarter || goal.parent_id))

  const nodes = useRef({})
  const refCallbacks = useRef({})

  const refFor = useCallback((name) => {
    if (!refCallbacks.current[name]) {
      refCallbacks.current[name] = (node) => {
        nodes.current[name] = node
      }
    }
    return refCallbacks.current[name]
  }, [])

  const focusGroup = useCallback((name) => focusFirstControl(nodes.current[name]), [])

  const initialValues = useCallback(
    () => ({
      ...emptyForm(focusAreaId),
      // The caller's scope survives into Add mode; it is what the read-only
      // chip states and what the payload carries.
      type: goal?.type || 'yearly',
      quarter: goal?.quarter || '',
      parent_id: goal?.parent_id || ''
    }),
    [focusAreaId, goal]
  )

  const toFormState = useCallback(
    (entity) => ({
      title: entity.title || '',
      description: entity.description || '',
      focus_area_id: entity.focus_area_id,
      target_date: entity.target_date ? entity.target_date.split('T')[0] : '',
      image_url: entity.image_url || '',
      type: entity.type || 'yearly',
      quarter: entity.quarter || '',
      parent_id: entity.parent_id || '',
      year: entity.year || new Date().getFullYear(),
      status: entity.status || 'not_started',
      milestones: normaliseMilestones(entity)
    }),
    []
  )

  const buildPayload = useCallback((values) => {
    const { milestones, ...fields } = values
    return {
      ...fields,
      title: fields.title.trim(),
      target_date: emptyToNull(fields.target_date),
      // A yearly objective has no quarter; the Select stores '' for that case.
      quarter: emptyToNull(fields.quarter) === null ? null : Number(fields.quarter),
      parent_id: emptyToNull(fields.parent_id),
      // Blank rows are dropped silently — the user never typed in them.
      milestones: milestones
        .filter((m) => m.title && m.title.trim() !== '')
        .map((m) => ({ title: m.title.trim(), completed: m.completed || false, due_date: m.due_date || null }))
    }
  }, [])

  const persist = useCallback(
    (payload, editing) => (editing ? annualPlanningService.updateGoal(goal._id, payload) : annualPlanningService.createGoal(payload)),
    [goal]
  )

  /**
   * §4.5 — what is left to offer. Edit mode never offers a timeframe change: a
   * goal's quarter cannot be edited today and this phase does not add it. The
   * core sorts override chips after the additive ones, which is the order the
   * rail already shipped.
   */
  const overrideGroups = useMemo(() => (!isEdit && hasContext ? [TIMEFRAME_GROUP] : []), [isEdit, hasContext])

  const core = useFormCore({
    open,
    entity: goal,
    initialValues,
    toFormState,
    groups: DETAIL_GROUPS,
    overrideGroups,
    hasContent: HAS_CONTENT,
    onReveal: ON_REVEAL,
    requiredFields: [{ field: 'title', errorKey: 'annualPlanning.goal.titleRequired' }],
    buildPayload,
    persist,
    initialSection
  })

  const { reveal: coreReveal, errorAt, firstErrorField, setField, submit: coreSubmit, values } = core

  const reveal = useCallback(
    (group) => {
      coreReveal(group)
      // A chip unmounts when activated. Without an explicit move, focus falls
      // to <body> and a keyboard user is ejected from the form. Milestones is
      // absent on purpose — its editor focuses the row it seeds, and a second
      // call here would land on that group's Add button first.
      if (group === 'milestones') return
      setTimeout(() => focusGroup(group), 0)
    },
    [coreReveal, focusGroup]
  )

  // Empty-title Save used to be a silent `return`. The reason is shown and the
  // cursor goes back to the field that needs fixing, on *every* attempt —
  // `errorAt` counts rejections so a second Save is never a no-op.
  useEffect(() => {
    if (!errorAt || !firstErrorField) return
    focusGroup(firstErrorField)
  }, [errorAt, firstErrorField, focusGroup])

  const setMilestones = useCallback((next) => setField('milestones', next), [setField])

  /**
   * The core hands the saved entity to `onSuccess`. This form's callers pass
   * `reload`, whose first parameter is an `isCancelled` predicate — forwarding
   * the goal there would make it call an object. The arity stays at zero.
   */
  const submit = useCallback((onSuccess, onClose) => coreSubmit(() => onSuccess?.(), onClose), [coreSubmit])

  return {
    ...core,
    formData: values,
    milestones: values.milestones,
    setMilestones,
    titleError: Boolean(core.errors.title),
    titleErrorAt: errorAt,
    isEdit,
    hasContext,
    // The scope chip is read-only unless the user asked to override it, or the
    // caller supplied no context at all (§3.4).
    showTimeframeSelect: !hasContext || core.revealed.has(TIMEFRAME_GROUP),
    // §5.2 — one computed target, so the title's autoFocus and the milestone
    // focus can never both fire.
    autoFocusTarget: initialSection === 'milestones' ? 'firstMilestone' : 'title',
    reveal,
    refFor,
    submit
  }
}

export default useGoalForm

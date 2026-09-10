/**
 * Add or change one dated thing, on the phone (MOB-044, PRD FR-020).
 *
 * The web's form and this one make the same four writes, and they make them
 * through the same `calendarService.createEvent` / `updateEvent` — so the
 * quarter a goal lands in, and the fact that a milestone is addressed through
 * its goal, are decided once. What is here is this client's own form.
 *
 * **The web's order, because the order is the design** (ADR-017): what it is,
 * then what it is called, then only what that kind needs, then when. A goal
 * needs a focus area to be filed under; a milestone needs the goal it is a step
 * of. Neither picker appears for a kind that has no use for it, and neither
 * gates the title — the plan loads behind a skeleton while the user is already
 * typing.
 *
 * **The kind cannot be changed while editing.** A task is not a goal with a
 * different label; changing one into the other is a delete and a create, and
 * the form quietly doing that to a thing the user already has would be the
 * worst kind of surprise. The web fixes it the same way.
 *
 * **Habit is not one of the four.** A habit is a schedule, and this form can
 * only write a date. An existing one can still be renamed and moved, which is
 * why `activity` appears in the edit path and not in the chooser.
 *
 * **Nothing is disabled to express an error.** An empty title fails under the
 * field, a missing picker under itself, a refused request at the top of the
 * sheet — a greyed-out key tells the user they are stuck without saying why.
 */
import { useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { calendarService } from '@nowry/core/api/services/calendar.service'
import { useAnnualPlan } from '@nowry/core/hooks/useAnnualPlan'
import { isGoalCompleted } from '@nowry/core/domain/goalDerivation'
import { COMPLETABLE } from '@nowry/core/domain/calendar/eventHelpers'
import { eventType } from '@nowry/core/domain/calendar/eventTypes'
import {
  BottomSheet,
  Button,
  Checkbox,
  DateField,
  FormField,
  Input,
  Segmented,
  Select,
  Skeleton,
  Stack,
  Typography,
  toDateValue
} from '../ui'

/** The four a calendar day can be given (ADR-017). Habit is a schedule, not a date. */
const TYPES = ['task', 'priority', 'goal', 'milestone']

export function EventFormSheet({ open, mode = 'create', event = null, defaultDate = null, onClose, onSaved }) {
  const { t } = useTranslation()
  const isEdit = mode === 'edit'

  const [type, setType] = useState('task')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [focusAreaId, setFocusAreaId] = useState('')
  const [goalId, setGoalId] = useState('')
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)

  const { plan, areas, goals, loading: planLoading } = useAnnualPlan()

  // Opening is what resets the form. Doing it on close would leave the last
  // thing the user typed on screen for the length of the closing animation.
  useEffect(() => {
    if (!open) return
    setErrors({})
    setSaveError(false)
    setFocusAreaId('')
    setGoalId('')
    setDescription(isEdit ? event?.description || '' : '')
    setDone(isEdit && event?.status === 'completed')
    setType(isEdit ? event?.type || 'task' : 'task')
    setTitle(isEdit ? event?.title || '' : '')
    setDate(toDateValue(isEdit && event?.date ? new Date(event.date) : (defaultDate ?? new Date())))
  }, [open, isEdit, event, defaultDate])

  const focusAreas = useMemo(() => (areas || []).map((a) => ({ value: a._id, label: a.name })), [areas])
  // Only goals that can still take a step reach the picker.
  const openGoals = useMemo(() => (goals || []).filter((g) => !isGoalCompleted(g)).map((g) => ({ value: g._id, label: g.title })), [goals])

  const needsFocusArea = !isEdit && type === 'goal'
  const needsGoal = !isEdit && type === 'milestone'
  const showsDescription = type === 'priority'
  const canTick = isEdit && COMPLETABLE.includes(type)

  const submit = async () => {
    if (saving) return
    const next = {}
    if (!title.trim()) next.title = true
    if (needsFocusArea && !focusAreaId) next.focusArea = true
    if (needsGoal && !goalId) next.goal = true
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSaving(true)
    setSaveError(false)
    try {
      if (isEdit) await calendarService.updateEvent({ event, title, description, date, done })
      else {
        await calendarService.createEvent({
          type,
          title,
          description,
          date,
          focusAreaId,
          goalId,
          annualPlanId: plan?._id ?? null
        })
      }
      onSaved?.()
      onClose?.()
    } catch {
      // Named, and nothing is lost: the sheet stays open with everything in it.
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      visible={open}
      onClose={saving ? () => {} : onClose}
      title={isEdit ? t('calendarModal.editEvent') : t('calendarModal.form.addTitle')}
    >
      <Stack spacing={2}>
        {saveError ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t('calendarModal.form.saveError')}
          </Typography>
        ) : null}

        {isEdit ? (
          <Typography level='body-sm' color='text.tertiary'>
            {t(eventType(type).labelKey)}
          </Typography>
        ) : (
          <FormField labelKey='calendarModal.form.selectType'>
            <Segmented
              accessibilityLabel={t('calendarModal.form.selectType')}
              value={type}
              onChange={(next) => {
                setType(next)
                setErrors({})
              }}
              options={TYPES.map((key) => ({ value: key, label: t(`calendarModal.form.types.${key}`) }))}
            />
          </FormField>
        )}

        <FormField labelKey='calendarModal.form.title' required errorKey={errors.title ? 'calendarModal.form.titleRequired' : null}>
          {({ invalid }) => (
            <Input
              value={title}
              onChangeText={(value) => {
                setTitle(value)
                if (errors.title && value.trim()) setErrors((prev) => ({ ...prev, title: false }))
              }}
              invalid={invalid}
              accessibilityLabel={t('calendarModal.form.title')}
              placeholder={isEdit ? undefined : t(`calendarModal.form.placeholder.${type}`)}
            />
          )}
        </FormField>

        {needsFocusArea ? (
          <ContextPicker
            labelKey='calendarModal.form.focusArea'
            placeholderKey='calendarModal.form.focusAreaPlaceholder'
            emptyKey='calendarModal.form.noAreas'
            errorKey={errors.focusArea ? 'form.requiredField' : null}
            loading={planLoading}
            options={focusAreas}
            value={focusAreaId}
            onChange={(value) => {
              setFocusAreaId(value)
              setErrors((prev) => ({ ...prev, focusArea: false }))
            }}
            t={t}
          />
        ) : null}

        {needsGoal ? (
          <ContextPicker
            labelKey='calendarModal.form.goal'
            placeholderKey='calendarModal.form.goalPlaceholder'
            helperKey='calendarModal.form.goalHelper'
            emptyKey='calendarModal.form.noActiveGoals'
            errorKey={errors.goal ? 'form.requiredField' : null}
            loading={planLoading}
            options={openGoals}
            value={goalId}
            onChange={(value) => {
              setGoalId(value)
              setErrors((prev) => ({ ...prev, goal: false }))
            }}
            t={t}
          />
        ) : null}

        {/* A priority belongs to a year's plan. Without one there is nothing to
            file it under, and saying so beats a request that fails. */}
        {!isEdit && type === 'priority' && !plan?._id && !planLoading ? (
          <Typography level='body-sm' color='text.secondary'>
            {t('calendarModal.form.noPlan')}
          </Typography>
        ) : null}

        <FormField labelKey='calendarModal.form.date'>
          <DateField
            value={date}
            onChange={setDate}
            accessibilityLabel={t('calendarModal.form.date')}
            placeholderKey='calendarModal.form.date'
          />
        </FormField>

        {showsDescription ? (
          <FormField labelKey='calendarModal.form.description'>
            <Input
              value={description}
              onChangeText={setDescription}
              multiline
              accessibilityLabel={t('calendarModal.form.description')}
              placeholder={t('calendarModal.form.descriptionPlaceholder')}
            />
          </FormField>
        ) : null}

        {/* The sheet is the one per-item surface here as on the web, so
            completion has to be reachable from it too (ADR-018). */}
        {canTick ? <Checkbox checked={done} onPress={() => setDone((on) => !on)} label={t('calendarModal.form.done')} /> : null}

        <Stack direction='row' spacing={1}>
          {/* Cancel stays live while saving, so a stuck request is escapable. */}
          <Button variant='tertiary' style={{ flex: 1 }} onPress={onClose}>
            {t('calendarModal.form.cancel')}
          </Button>
          <Button style={{ flex: 1 }} loading={saving} onPress={submit}>
            {isEdit ? t('calendarModal.form.saveChanges') : t(`calendarModal.form.addAction.${type}`)}
          </Button>
        </Stack>
      </Stack>
    </BottomSheet>
  )
}

/**
 * The picker a kind needs before it can be filed.
 *
 * Never disabled and never a page gate: while the plan loads, this control
 * alone shows a skeleton and the title above it can already be typed. An empty
 * plan says what to do about it rather than offering an empty list.
 */
function ContextPicker({ labelKey, placeholderKey, helperKey = null, emptyKey, errorKey, loading, options, value, onChange, t }) {
  return (
    <FormField labelKey={labelKey} required helperKey={options.length > 0 && !loading ? helperKey : null} errorKey={errorKey}>
      {({ invalid }) => {
        if (loading) return <Skeleton width='100%' height={44} />
        if (options.length === 0) {
          return (
            <View>
              <Typography level='body-sm' color='text.secondary'>
                {t(emptyKey)}
              </Typography>
            </View>
          )
        }
        return (
          <Select
            value={value}
            options={options}
            onChange={onChange}
            placeholderKey={placeholderKey}
            invalid={invalid}
            accessibilityLabel={t(labelKey)}
          />
        )
      }}
    </FormField>
  )
}

export default EventFormSheet

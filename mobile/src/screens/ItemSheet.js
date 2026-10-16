/**
 * The item sheet, on the phone (PLAN-012, ADR-046).
 *
 * One form for everything a learner writes down: a title and four optional
 * facts — Due, Scheduled, Priority, Part of a goal. Nothing asks what kind it
 * is; the header's readout and the key read the kind off the facts as they
 * change. It replaces the event form and the block sheet, and it takes the
 * screen (`FullSheet`): a form of this many fields in a bottom sheet left
 * half the phone dead and the keys behind the keyboard.
 *
 * The writes are `useItemWriter`'s, shared with the web; the facts come from
 * `@nowry/core/domain/items`, so this file spells no API field (its
 * `apiFields` rule) and decides nothing twice.
 *
 * **Nothing is disabled to express an error** (BUTTONS.md §4). An empty title
 * fails under the field; a once time with neither a day nor a due date fails
 * under Scheduled; a refused request fails at the top with everything typed.
 */
import { useEffect, useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useAnnualPlan } from '@nowry/core/hooks/useAnnualPlan'
import { useBlockLog } from '@nowry/core/hooks/useBlockLog'
import { useItemWriter } from '@nowry/core/hooks/useItemWriter'
import { isGoalCompleted } from '@nowry/core/domain/goalDerivation'
import {
  blockForMilestone,
  blockForTask,
  factsFrom,
  itemFromSources,
  keyLabel,
  missingIn,
  readoutParts,
  repeats
} from '@nowry/core/domain/items'
import {
  BLOCK_STEP,
  MIN_BLOCK_MINUTES,
  PERIOD_STARTS,
  REMINDER_OPTIONS,
  clockOn,
  formatTime,
  localDateKey,
  minutesOf,
  stateOf
} from '@nowry/core/domain/blocks'
import { useTheme } from '../theme'
import {
  Button,
  Checkbox,
  DateField,
  FormField,
  FullSheet,
  Icon,
  IconButton,
  Input,
  Segmented,
  Select,
  Skeleton,
  Stack,
  Switch,
  Typography,
  resolveColor
} from '../ui'

const MAX_BLOCK_MINUTES = 480
const DEFAULT_LENGTH = 20
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]
/** 2024-01-01 is a Monday; the API's weekday 0 (ADR-045 §3). */
const A_MONDAY = new Date(2024, 0, 1)
const HOURS = Array.from({ length: 24 }, (_, h) => h)
const MINUTES = Array.from({ length: 60 / BLOCK_STEP }, (_, i) => i * BLOCK_STEP)

const pad = (n) => String(n).padStart(2, '0')
const clampLength = (minutes) => Math.min(MAX_BLOCK_MINUTES, Math.max(MIN_BLOCK_MINUTES, minutes))

const defaultScheduled = (partial = {}) => ({
  start: partial.start ?? PERIOD_STARTS.morning,
  lengthMin: partial.lengthMin ?? DEFAULT_LENGTH,
  daysOfWeek: partial.daysOfWeek ?? [],
  date: partial.date ?? null,
  reminderMin: partial.reminderMin ?? null,
  afterBlockId: partial.afterBlockId ?? null
})

const initialFacts = ({ isEdit, source, prefill, blocks }) => {
  if (isEdit) return itemFromSources({ ...source, blocks })
  const facts = factsFrom(prefill ?? {})
  if (facts.scheduled) facts.scheduled = defaultScheduled(facts.scheduled)
  return facts
}

/**
 * Props:
 *   open, onClose, onSaved – the sheet's lifecycle
 *   mode     – 'create' | 'edit'
 *   source   – what is being edited: `{ task, milestone, goalId, block, occurrence }` (from `sourceFromEvent` or a block)
 *   prefill  – partial facts for create: `{ title, due, scheduled, goalId, origin }`
 *   blocks   – the learner's blocks, for After and to find the block an item spans
 *   due, suggestedMinutes – the forecast, which sizes a study time until the learner does
 */
export function ItemSheet({
  open,
  mode = 'create',
  source = null,
  prefill = null,
  blocks = [],
  due = 0,
  suggestedMinutes = DEFAULT_LENGTH,
  onClose,
  onSaved
}) {
  const { t, i18n } = useTranslation()
  const language = i18n?.language ?? 'en'
  const theme = useTheme()
  const isEdit = mode === 'edit' && Boolean(source)
  const occurrence = source?.occurrence ?? null

  const [facts, setFacts] = useState(() => initialFacts({ isEdit, source, prefill, blocks }))
  const [lengthTouched, setLengthTouched] = useState(isEdit)
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [log, setLog] = useState(occurrence?.log ?? null)

  const { saveItem, deleteItem } = useItemWriter()
  const record = useBlockLog()
  const { goals, loading: planLoading } = useAnnualPlan()

  // Opening resets the form; a reset on close would show the wipe mid-slide.
  useEffect(() => {
    if (!open) return
    const next = initialFacts({ isEdit, source, prefill, blocks })
    setFacts(next)
    setLengthTouched(isEdit || Boolean(prefill?.scheduled?.lengthMin))
    setDone(Boolean(source?.task?.is_completed || source?.milestone?.completed))
    setErrors({})
    setSaveError(false)
    setSaving(false)
    setConfirmingDelete(false)
    setMoreOpen(next.scheduled?.reminderMin != null || Boolean(next.scheduled?.afterBlockId))
    setLog(occurrence?.log ?? null)
    // `blocks` only serves to find the block an item spans; a refetch must not reset typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, source, prefill])

  const patch = (changes) => setFacts((prev) => ({ ...prev, ...changes }))
  const patchScheduled = (changes) => setFacts((prev) => ({ ...prev, scheduled: { ...prev.scheduled, ...changes } }))

  const openGoals = useMemo(
    () => [
      { value: '', label: t('items.sheet.goalNone') },
      ...(goals || []).filter((g) => !isGoalCompleted(g)).map((g) => ({ value: g._id, label: g.title }))
    ],
    [goals, t]
  )
  const goalLocked = isEdit && Boolean(source?.task || source?.milestone)
  const goalLabel = (goals || []).find((g) => g._id === facts.goalId)?.title ?? null
  const existing = useMemo(() => {
    if (!isEdit) return null
    const block =
      source.block ??
      (source.task ? blockForTask(source.task, blocks) : null) ??
      (source.milestone ? blockForMilestone(source.milestone, source.goalId, blocks) : null)
    return { task: source.task ?? null, milestone: source.milestone ?? null, goalId: source.goalId ?? null, block }
  }, [isEdit, source, blocks])
  const others = useMemo(
    () => [
      { value: '', label: t('calendarPage.blocks.form.afterNone') },
      ...blocks.filter((b) => !b.date && b.id !== existing?.block?.id).map((b) => ({ value: b.id, label: `${b.start} · ${b.title}` }))
    ],
    [blocks, existing, t]
  )
  const weekdays = useMemo(() => {
    const narrow = new Intl.DateTimeFormat(language, { weekday: 'narrow' })
    const long = new Intl.DateTimeFormat(language, { weekday: 'long' })
    return EVERY_DAY.map((i) => {
      const day = new Date(A_MONDAY.getFullYear(), A_MONDAY.getMonth(), A_MONDAY.getDate() + i)
      return { index: i, initial: narrow.format(day), name: long.format(day) }
    })
  }, [language])

  // The forecast's proposal holds until the learner sets a length (PRD D4).
  const isStudy = facts.origin === 'study'
  const lengthMin = facts.scheduled
    ? !lengthTouched && isStudy && due > 0
      ? clampLength(suggestedMinutes)
      : facts.scheduled.lengthMin
    : DEFAULT_LENGTH
  const start = facts.scheduled?.start ?? PERIOD_STARTS.morning
  const hour = Math.floor(minutesOf(start) / 60)
  const minute = minutesOf(start) % 60
  const setClock = (h, m) => patchScheduled({ start: formatTime(h * 60 + m) })
  const stepLength = (delta) => {
    setLengthTouched(true)
    patchScheduled({ lengthMin: clampLength(lengthMin + delta) })
  }
  const toggleDay = (index) => {
    const days = facts.scheduled.daysOfWeek
    patchScheduled({ daysOfWeek: days.includes(index) ? days.filter((d) => d !== index) : [...days, index].sort() })
    setErrors((prev) => ({ ...prev, date: false }))
  }

  const readout = readoutParts(facts)
    .map(({ key, params }) => {
      if (!params?.date) return t(key, params)
      const date = new Intl.DateTimeFormat(language, { weekday: 'short', day: 'numeric', month: 'short' }).format(
        new Date(`${params.date}T00:00:00`)
      )
      return t(key, { ...params, date })
    })
    .join(' · ')

  const submit = async () => {
    if (saving) return
    const toSave = facts.scheduled ? { ...facts, scheduled: { ...facts.scheduled, lengthMin } } : facts
    const missing = missingIn(toSave)
    setErrors({ title: missing.includes('title'), date: missing.includes('date') })
    if (missing.length > 0) return
    setSaving(true)
    setSaveError(false)
    try {
      const areaId = (goals || []).find((g) => g._id === facts.goalId)?.focus_area_id ?? null
      await saveItem(toSave, existing, { areaId, done: goalLocked ? done : null })
      onSaved?.()
      onClose?.()
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  const destroy = async () => {
    if (saving) return
    setSaving(true)
    setSaveError(false)
    try {
      await deleteItem(existing)
      onSaved?.()
      onClose?.()
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  const keepRecord = (action, nextLog) => async () => {
    const previous = log
    setLog(nextLog)
    try {
      await action(occurrence)
    } catch {
      setLog(previous)
      setSaveError(true)
    }
  }

  const todayKey = localDateKey()
  const showsRecord = isEdit && occurrence && occurrence.date <= todayKey
  const recordState = showsRecord
    ? stateOf({ ...occurrence, log }, clockOn(occurrence.date, todayKey, new Date().getHours() * 60 + new Date().getMinutes()))
    : null

  const footer = confirmingDelete ? (
    <Stack spacing={1}>
      <Typography level='body-sm' color='text.secondary'>
        {t('items.sheet.deleteBody')}
      </Typography>
      <Stack direction='row' spacing={1}>
        <Button variant='secondary' style={{ flex: 1 }} onPress={() => setConfirmingDelete(false)}>
          {t('common.cancel')}
        </Button>
        <Button variant='danger' style={{ flex: 1 }} loading={saving} onPress={destroy}>
          {t('items.sheet.delete')}
        </Button>
      </Stack>
    </Stack>
  ) : (
    <Stack direction='row' spacing={1}>
      {/* Cancel stays live while saving, so a stuck request is escapable. */}
      <Button variant='secondary' onPress={onClose}>
        {t('common.cancel')}
      </Button>
      <Button style={{ flex: 1 }} loading={saving} onPress={submit}>
        {t(keyLabel(facts, { edit: isEdit }).key)}
      </Button>
    </Stack>
  )

  return (
    <FullSheet
      visible={open}
      onClose={saving ? () => {} : onClose}
      title={t(isEdit ? 'items.sheet.editTitle' : 'items.sheet.addTitle')}
      readout={readout}
      footer={footer}
    >
      <Stack spacing={2.5}>
        {saveError ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t('calendarPage.blocks.form.saveError')}
          </Typography>
        ) : null}

        <FormField labelKey='items.sheet.title' required errorKey={errors.title ? 'items.sheet.titleRequired' : null}>
          {({ invalid }) => (
            <Input
              value={facts.title}
              onChangeText={(value) => {
                patch({ title: value })
                if (errors.title && value.trim()) setErrors((prev) => ({ ...prev, title: false }))
              }}
              invalid={invalid}
              accessibilityLabel={t('items.sheet.title')}
              placeholder={t('items.sheet.titlePlaceholder')}
              autoCapitalize='sentences'
              returnKeyType='done'
            />
          )}
        </FormField>

        {/* Due and Priority are one row: the two facts that make a task. */}
        <Stack direction='row' spacing={1.5}>
          <View style={{ flex: 1.1 }}>
            <FormField labelKey='items.sheet.due'>
              <DateField
                value={facts.due ?? ''}
                onChange={(value) => patch({ due: value || null })}
                accessibilityLabel={t('items.sheet.due')}
                placeholderKey='items.sheet.noDate'
              />
            </FormField>
          </View>
          <View style={{ flex: 1 }}>
            <FormField labelKey='items.sheet.priority'>
              <Stack direction='row' spacing={1} style={{ alignItems: 'center', justifyContent: 'space-between', minHeight: 48 }}>
                <Typography level='body-xs' color='text.tertiary' style={{ flex: 1 }}>
                  {t('items.sheet.priorityHint')}
                </Typography>
                <Switch
                  value={facts.priority}
                  onValueChange={(priority) => patch({ priority })}
                  accessibilityLabel={t('items.sheet.priority')}
                />
              </Stack>
            </FormField>
          </View>
        </Stack>

        <FormField
          labelKey='items.sheet.scheduled'
          errorKey={errors.date ? 'items.sheet.dateRequired' : null}
          helperKey={facts.scheduled && !errors.date ? 'items.sheet.onceHint' : null}
        >
          {!facts.scheduled ? (
            <Button
              variant='tertiary'
              style={{ alignSelf: 'flex-start' }}
              onPress={() => patch({ scheduled: defaultScheduled({ date: facts.due }) })}
            >
              {t('items.sheet.setTime')}
            </Button>
          ) : (
            <Stack spacing={1.5}>
              <Stack direction='row' spacing={1}>
                <View style={{ flex: 1 }}>
                  <Select
                    value={hour}
                    options={HOURS.map((h) => ({ value: h, label: pad(h) }))}
                    onChange={(h) => setClock(h, minute)}
                    accessibilityLabel={t('blocks.sheet.hour')}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Select
                    value={minute}
                    options={MINUTES.map((m) => ({ value: m, label: pad(m) }))}
                    onChange={(m) => setClock(hour, m)}
                    accessibilityLabel={t('blocks.sheet.minute')}
                  />
                </View>
                <Stack direction='row' spacing={0.5} style={{ alignItems: 'center', flex: 1.3 }}>
                  <IconButton variant='secondary' accessibilityLabel={t('blocks.sheet.shorter')} onPress={() => stepLength(-BLOCK_STEP)}>
                    <Icon name='Minus' size='sm' color='text.secondary' />
                  </IconButton>
                  <Typography level='title-sm' style={{ flex: 1, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
                    {t('study.dates.minutes', { count: lengthMin })}
                  </Typography>
                  <IconButton variant='secondary' accessibilityLabel={t('blocks.sheet.longer')} onPress={() => stepLength(BLOCK_STEP)}>
                    <Icon name='Plus' size='sm' color='text.secondary' />
                  </IconButton>
                </Stack>
              </Stack>
              {isStudy && due > 0 ? (
                <Typography level='body-xs' color='text.tertiary'>
                  {t('blocks.sheet.lengthHint', { count: due, minutes: suggestedMinutes })}
                </Typography>
              ) : null}
              <View accessibilityLabel={t('items.sheet.days')} style={{ flexDirection: 'row', gap: theme.spacing[1] }}>
                {weekdays.map((day) => {
                  const on = facts.scheduled.daysOfWeek.includes(day.index)
                  return (
                    <Pressable
                      key={day.index}
                      onPress={() => toggleDay(day.index)}
                      accessibilityRole='togglebutton'
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={day.name}
                      style={({ pressed }) => ({
                        flex: 1,
                        minHeight: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: theme.radius.md,
                        opacity: pressed ? 0.7 : 1,
                        backgroundColor: resolveColor(theme, on ? 'background.level2' : 'background.level1')
                      })}
                    >
                      <Typography level='title-sm' color={on ? 'text.primary' : 'text.tertiary'}>
                        {day.initial}
                      </Typography>
                    </Pressable>
                  )
                })}
              </View>
              {!repeats(facts.scheduled) ? (
                <DateField
                  value={facts.scheduled.date ?? facts.due ?? ''}
                  onChange={(value) => {
                    patchScheduled({ date: value || null })
                    setErrors((prev) => ({ ...prev, date: false }))
                  }}
                  accessibilityLabel={t('items.sheet.onceDate')}
                  placeholderKey='items.sheet.onceDate'
                  clearable={false}
                />
              ) : null}
              <Button variant='tertiary' style={{ alignSelf: 'flex-start' }} onPress={() => patch({ scheduled: null })}>
                {t('items.sheet.removeTime')}
              </Button>
            </Stack>
          )}
        </FormField>

        <FormField labelKey='items.sheet.goal'>
          {goalLocked ? (
            <Typography level='body-md' color='text.secondary'>
              {goalLabel ?? t('items.sheet.goalNone')}
            </Typography>
          ) : planLoading ? (
            <Skeleton width='100%' height={44} />
          ) : (
            <Select
              value={facts.goalId ?? ''}
              options={openGoals}
              onChange={(value) => patch({ goalId: value || null })}
              accessibilityLabel={t('items.sheet.goal')}
            />
          )}
        </FormField>

        {facts.scheduled ? (
          <Pressable
            onPress={() => setMoreOpen((on) => !on)}
            accessibilityRole='button'
            accessibilityState={{ expanded: moreOpen }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[1], minHeight: 44 }}
          >
            <Icon name={moreOpen ? 'ChevronDown' : 'ChevronRight'} size='sm' color='primary.plainColor' />
            <Typography level='body-md' color='primary.plainColor'>
              {t('calendarPage.blocks.form.moreOptions')}
            </Typography>
            <Typography level='body-sm' color='text.tertiary' numberOfLines={1} style={{ flex: 1 }}>
              {t('calendarPage.blocks.form.moreSummary', {
                remind:
                  facts.scheduled.reminderMin == null
                    ? t('blocks.sheet.remindOff')
                    : facts.scheduled.reminderMin === 0
                      ? t('blocks.sheet.remindAtStart')
                      : t('study.dates.minutes', { count: facts.scheduled.reminderMin }),
                after: (others.find((o) => o.value === (facts.scheduled.afterBlockId ?? ''))?.label ?? others[0].label).toLowerCase()
              })}
            </Typography>
          </Pressable>
        ) : null}

        {facts.scheduled && moreOpen ? (
          <FormField labelKey='blocks.sheet.remind'>
            <Segmented
              accessibilityLabel={t('blocks.sheet.remind')}
              value={String(facts.scheduled.reminderMin ?? null)}
              onChange={(value) => patchScheduled({ reminderMin: value === 'null' ? null : Number(value) })}
              options={REMINDER_OPTIONS.map((option) => ({
                value: String(option),
                label:
                  option === null
                    ? t('blocks.sheet.remindOff')
                    : option === 0
                      ? t('blocks.sheet.remindAtStart')
                      : t('study.dates.minutes', { count: option })
              }))}
            />
          </FormField>
        ) : null}

        {facts.scheduled && moreOpen && others.length > 1 ? (
          <FormField labelKey='blocks.sheet.after' helperKey='blocks.sheet.afterHelper'>
            <Select
              value={facts.scheduled.afterBlockId ?? ''}
              options={others}
              onChange={(value) => patchScheduled({ afterBlockId: value || null })}
              accessibilityLabel={t('blocks.sheet.after')}
            />
          </FormField>
        ) : null}

        {goalLocked ? <Checkbox checked={done} onPress={() => setDone((on) => !on)} label={t('items.sheet.done')} /> : null}

        {showsRecord ? (
          <Stack
            spacing={1}
            style={{ padding: theme.spacing[2], borderRadius: theme.radius.md, backgroundColor: resolveColor(theme, 'background.level1') }}
          >
            <Stack direction='row' spacing={1} style={{ alignItems: 'baseline' }}>
              <Typography level='title-sm'>{t('calendarPage.blocks.form.today')}</Typography>
              <Typography level='body-sm' color='text.tertiary'>
                {t(`calendarPage.blocks.state.${recordState}`)}
              </Typography>
            </Stack>
            <Stack direction='row' spacing={1}>
              <Button
                size='sm'
                variant={log?.status === 'kept' ? undefined : 'secondary'}
                onPress={keepRecord(record.keep, { status: 'kept', minutes: occurrence.lengthMin })}
              >
                {t('calendarPage.blocks.kept')}
              </Button>
              <Button
                size='sm'
                variant={log?.status === 'skipped' ? undefined : 'secondary'}
                onPress={keepRecord(record.skip, { status: 'skipped', minutes: 0 })}
              >
                {t('calendarPage.blocks.skip')}
              </Button>
              {log ? (
                <Button size='sm' variant='tertiary' onPress={keepRecord(record.undo, null)}>
                  {t('calendarPage.blocks.undo')}
                </Button>
              ) : null}
            </Stack>
          </Stack>
        ) : null}

        {isEdit && !confirmingDelete ? (
          <Button variant='tertiary' style={{ alignSelf: 'flex-start' }} onPress={() => setConfirmingDelete(true)}>
            {t('items.sheet.delete')}
          </Button>
        ) : null}
      </Stack>
    </FullSheet>
  )
}

export default ItemSheet

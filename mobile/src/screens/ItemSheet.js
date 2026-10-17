/**
 * The item sheet, on the phone (PLAN-012, PLAN-016, ADR-046).
 *
 * One form for everything a learner writes down: a title and four optional
 * facts — Due, Scheduled, Priority, Part of a goal. Nothing asks what kind it
 * is; the header's readout and the key read the kind off the facts as they
 * change. It takes the screen (`FullSheet`).
 *
 * **Each fact is a row that reads its value** (PRD D10): label · value · one
 * action at the end, 56pt. An unset row reads quietly and offers Set; a set
 * row reads its value and offers Change (Scheduled also ×). One row opens at a
 * time, in place, on a `level1` ground. The once-date field exists only while
 * there is no due date.
 *
 * The writes are `useItemWriter`'s, shared with the web; the facts come from
 * `@nowry/core/domain/items`, so this file spells no API field (its
 * `apiFields` rule) and decides nothing twice.
 *
 * **Nothing is disabled to express an error** (BUTTONS.md §4). An empty title
 * fails under the field; a once time with neither a day nor a due date fails
 * under Scheduled, which opens to show it; a refused request fails at the top
 * with everything typed.
 */
import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useAnnualPlan } from '@nowry/core/hooks/useAnnualPlan'
import { useBlockLog } from '@nowry/core/hooks/useBlockLog'
import { useItemWriter } from '@nowry/core/hooks/useItemWriter'
import { useTaskLists } from '@nowry/core/hooks/useTaskLists'
import { isGoalCompleted } from '@nowry/core/domain/goalDerivation'
import {
  blockForMilestone,
  blockForTask,
  factsFrom,
  itemFromSources,
  keyLabel,
  missingIn,
  readingOf,
  readoutParts,
  repeats,
  scheduledReadout
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
const LABEL_WIDTH = 104
const ROW_HEIGHT = 56

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

const formatDate = (key, language) =>
  new Intl.DateTimeFormat(language, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${key}T00:00:00`))

/** A readout part → its sentence, with a date key formatted for the locale. */
const sayPart = ({ key, params }, t, language) =>
  params?.date ? t(key, { ...params, date: formatDate(params.date, language) }) : t(key, params)

/** The row anatomy (PRD D10): label · value · one action; the open editor under it. */
function FactRow({ label, value, quiet = false, action = null, editor = null, last = false, theme }) {
  return (
    <View style={{ borderBottomWidth: last || editor ? 0 : StyleSheet.hairlineWidth, borderBottomColor: resolveColor(theme, 'divider') }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: ROW_HEIGHT, gap: theme.spacing[1] }}>
        <Typography level='title-sm' style={{ width: LABEL_WIDTH }}>
          {label}
        </Typography>
        <Typography
          level='body-md'
          color={quiet ? 'text.tertiary' : 'text.primary'}
          numberOfLines={2}
          style={{ flex: 1, fontVariant: ['tabular-nums'] }}
        >
          {value}
        </Typography>
        {action}
      </View>
      {editor ? (
        <View
          style={{
            backgroundColor: resolveColor(theme, 'background.level1'),
            borderRadius: theme.radius.md,
            padding: theme.spacing[1.5],
            marginBottom: theme.spacing[1.5],
            gap: theme.spacing[1.5]
          }}
        >
          {editor}
        </View>
      ) : null}
    </View>
  )
}

/** The quiet in-row action: Set · Change · Choose · Done. */
function RowAction({ label, onPress, expanded = null }) {
  return (
    <Button variant='tertiary' size='sm' onPress={onPress} accessibilityState={expanded === null ? undefined : { expanded }}>
      {label}
    </Button>
  )
}

/**
 * Props:
 *   open, onClose, onSaved – the sheet's lifecycle
 *   mode     – 'create' | 'edit'
 *   source   – what is being edited: `{ task, milestone, goalId, block, occurrence }` (from `sourceFromEvent` or a block)
 *   prefill  – partial facts for create: `{ title, due, scheduled, goalId, origin }`
 *   blocks   – the learner's blocks, for After and to find the block an item spans
 *   due, suggestedMinutes – the forecast, which sizes a study time until the learner does
 *   onStart  – runs a block on the timer; when given, today's unlogged block offers Start (PLAN-017)
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
  onSaved,
  onStart = null
}) {
  const { t, i18n } = useTranslation()
  const language = i18n?.language ?? 'en'
  const theme = useTheme()
  const isEdit = mode === 'edit' && Boolean(source)
  const occurrence = source?.occurrence ?? null

  const [facts, setFacts] = useState(() => initialFacts({ isEdit, source, prefill, blocks }))
  // The one open row: 'due' | 'scheduled' | 'goal' | 'more' | null.
  const [openRow, setOpenRow] = useState(null)
  const [lengthTouched, setLengthTouched] = useState(isEdit)
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [log, setLog] = useState(occurrence?.log ?? null)

  const { saveItem, deleteItem } = useItemWriter()
  const record = useBlockLog()
  const { goals, loading: planLoading } = useAnnualPlan()
  const { lists: taskLists } = useTaskLists()

  // Opening resets the form; a reset on close would show the wipe mid-slide.
  useEffect(() => {
    if (!open) return
    const next = initialFacts({ isEdit, source, prefill, blocks })
    setFacts(next)
    // The hours hand over a time to confirm, so that row opens; everything else opens closed.
    setOpenRow(!isEdit && prefill?.scheduled ? 'scheduled' : null)
    setLengthTouched(isEdit || Boolean(prefill?.scheduled?.lengthMin))
    setDone(Boolean(source?.task?.is_completed || source?.milestone?.completed))
    setErrors({})
    setSaveError(false)
    setSaving(false)
    setConfirmingDelete(false)
    setLog(occurrence?.log ?? null)
    // `blocks` only serves to find the block an item spans; a refetch must not reset typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, source, prefill])

  const patch = (changes) => setFacts((prev) => ({ ...prev, ...changes }))
  const patchScheduled = (changes) => setFacts((prev) => ({ ...prev, scheduled: { ...prev.scheduled, ...changes } }))
  const toggleRow = (row) => setOpenRow((prev) => (prev === row ? null : row))

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
  const withLength = facts.scheduled ? { ...facts, scheduled: { ...facts.scheduled, lengthMin } } : facts
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

  const readout = readoutParts(withLength)
    .map((part) => sayPart(part, t, language))
    .join(' · ')

  const submit = async () => {
    if (saving) return
    const missing = missingIn(withLength)
    setErrors({ title: missing.includes('title'), date: missing.includes('date') })
    if (missing.includes('date')) setOpenRow('scheduled')
    if (missing.length > 0) return
    setSaving(true)
    setSaveError(false)
    try {
      const areaId = (goals || []).find((g) => g._id === facts.goalId)?.focus_area_id ?? null
      await saveItem(withLength, existing, { areaId, done: goalLocked ? done : null })
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
  const onceNeedsDate = facts.scheduled && !repeats(facts.scheduled) && !facts.due
  const minutesLabel = (count) => t('study.dates.minutes', { count })

  // ── The rows' values ───────────────────────────────────────────────────
  const dueValue = facts.due ? formatDate(facts.due, language) : t('items.sheet.noDate')
  // Two lines on purpose: the row is narrow, and a break inside "20 min" read as two values.
  const scheduledValue = facts.scheduled
    ? `${sayPart(scheduledReadout(withLength), t, language)}\n${minutesLabel(lengthMin)}`
    : t('items.sheet.noDate')
  const remindValue = (option) =>
    option == null ? t('blocks.sheet.remindOff') : option === 0 ? t('blocks.sheet.remindAtStart') : minutesLabel(option)
  const moreValue = facts.scheduled
    ? t('calendarPage.blocks.form.moreSummary', {
        remind: remindValue(facts.scheduled.reminderMin),
        after: (others.find((o) => o.value === (facts.scheduled.afterBlockId ?? ''))?.label ?? others[0].label).toLowerCase()
      })
    : ''
  const actionLabel = (row, isSet) => (openRow === row ? t('items.sheet.closeRow') : isSet ? t('items.sheet.change') : t('items.sheet.set'))

  // ── The editors: the open state of a row ───────────────────────────────
  const dueEditor = (
    <Stack spacing={1}>
      <DateField
        value={facts.due ?? ''}
        onChange={(value) => patch({ due: value || null })}
        accessibilityLabel={t('items.sheet.due')}
        placeholderKey='items.sheet.noDate'
      />
    </Stack>
  )

  const scheduledEditor = facts.scheduled ? (
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
            {minutesLabel(lengthMin)}
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
      <View accessibilityLabel={t('items.sheet.days')} style={{ flexDirection: 'row', gap: theme.spacing[0.5] }}>
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
                backgroundColor: resolveColor(theme, on ? 'background.level2' : 'background.surface')
              })}
            >
              <Typography level='title-sm' color={on ? 'text.primary' : 'text.tertiary'}>
                {day.initial}
              </Typography>
            </Pressable>
          )
        })}
      </View>
      {onceNeedsDate ? (
        <DateField
          value={facts.scheduled.date ?? ''}
          onChange={(value) => {
            patchScheduled({ date: value || null })
            setErrors((prev) => ({ ...prev, date: false }))
          }}
          accessibilityLabel={t('items.sheet.onceDate')}
          placeholderKey='items.sheet.onceDate'
          clearable={false}
        />
      ) : null}
      <Typography level='body-xs' color={errors.date ? 'danger.plainColor' : 'text.tertiary'} accessibilityLiveRegion='polite'>
        {errors.date
          ? t('items.sheet.dateRequired')
          : repeats(facts.scheduled)
            ? ''
            : facts.due
              ? t('items.sheet.onceOnDue')
              : t('items.sheet.onceHint')}
      </Typography>
    </Stack>
  ) : null

  // A task's list (PLAN-021): General, or one of the learner's lists; the Goal row's grammar.
  const currentList = taskLists.find((list) => list.id === facts.list) ?? null
  const listEditor = (
    <Select
      value={currentList ? currentList.id : ''}
      options={[{ value: '', label: t('tasks.lists.general') }, ...taskLists.map((list) => ({ value: list.id, label: list.name }))]}
      onChange={(value) => {
        patch({ list: value || null })
        setOpenRow(null)
      }}
      accessibilityLabel={t('items.sheet.list')}
    />
  )

  const goalEditor = planLoading ? (
    <Skeleton width='100%' height={44} />
  ) : (
    <Select
      value={facts.goalId ?? ''}
      options={openGoals}
      onChange={(value) => {
        patch({ goalId: value || null })
        setOpenRow(null)
      }}
      accessibilityLabel={t('items.sheet.goal')}
    />
  )

  const moreEditor = facts.scheduled ? (
    <Stack spacing={1.5}>
      <FormField labelKey='blocks.sheet.remind'>
        <Segmented
          accessibilityLabel={t('blocks.sheet.remind')}
          value={String(facts.scheduled.reminderMin ?? null)}
          onChange={(value) => patchScheduled({ reminderMin: value === 'null' ? null : Number(value) })}
          options={REMINDER_OPTIONS.map((option) => ({ value: String(option), label: remindValue(option) }))}
        />
      </FormField>
      {others.length > 1 ? (
        <FormField labelKey='blocks.sheet.after' helperKey='blocks.sheet.afterHelper'>
          <Select
            value={facts.scheduled.afterBlockId ?? ''}
            options={others}
            onChange={(value) => patchScheduled({ afterBlockId: value || null })}
            accessibilityLabel={t('blocks.sheet.after')}
          />
        </FormField>
      ) : null}
    </Stack>
  ) : null

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
      <Stack spacing={0}>
        {saveError ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite' style={{ marginBottom: theme.spacing[2] }}>
            {t('calendarPage.blocks.form.saveError')}
          </Typography>
        ) : null}

        <View style={{ marginBottom: theme.spacing[1] }}>
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
        </View>

        <FactRow
          theme={theme}
          label={t('items.sheet.due')}
          value={dueValue}
          quiet={!facts.due}
          action={
            <RowAction label={actionLabel('due', Boolean(facts.due))} expanded={openRow === 'due'} onPress={() => toggleRow('due')} />
          }
          editor={openRow === 'due' ? dueEditor : null}
        />

        <FactRow
          theme={theme}
          label={t('items.sheet.scheduled')}
          value={scheduledValue}
          quiet={!facts.scheduled}
          action={
            <Stack direction='row' spacing={0} style={{ alignItems: 'center' }}>
              <RowAction
                label={actionLabel('scheduled', Boolean(facts.scheduled))}
                expanded={openRow === 'scheduled'}
                onPress={() => {
                  if (!facts.scheduled) patch({ scheduled: defaultScheduled({ date: facts.due }) })
                  toggleRow('scheduled')
                }}
              />
              {facts.scheduled ? (
                <IconButton
                  size='sm'
                  accessibilityLabel={t('items.sheet.removeTime')}
                  onPress={() => {
                    patch({ scheduled: null })
                    if (openRow === 'scheduled' || openRow === 'more') setOpenRow(null)
                  }}
                >
                  <Icon name='X' size='sm' color='text.secondary' />
                </IconButton>
              ) : null}
            </Stack>
          }
          editor={openRow === 'scheduled' ? scheduledEditor : null}
        />

        <FactRow
          theme={theme}
          label={t('items.sheet.priority')}
          value={t(facts.priority ? 'items.sheet.on' : 'items.sheet.off')}
          quiet={!facts.priority}
          action={
            <Switch
              value={facts.priority}
              onValueChange={(priority) => patch({ priority })}
              accessibilityLabel={t('items.sheet.priority')}
            />
          }
        />

        {readingOf(facts) === 'task' ? (
          <FactRow
            theme={theme}
            label={t('items.sheet.list')}
            value={currentList?.name ?? t('tasks.lists.general')}
            quiet={!currentList}
            action={
              <RowAction
                label={openRow === 'list' ? t('items.sheet.closeRow') : t('items.sheet.change')}
                expanded={openRow === 'list'}
                onPress={() => toggleRow('list')}
              />
            }
            editor={openRow === 'list' ? listEditor : null}
          />
        ) : null}

        <FactRow
          theme={theme}
          label={t('items.sheet.goal')}
          value={goalLabel ?? t('items.sheet.goalNone')}
          quiet={!facts.goalId}
          action={
            goalLocked ? null : (
              <RowAction
                label={openRow === 'goal' ? t('items.sheet.closeRow') : facts.goalId ? t('items.sheet.change') : t('items.sheet.choose')}
                expanded={openRow === 'goal'}
                onPress={() => toggleRow('goal')}
              />
            )
          }
          editor={openRow === 'goal' ? goalEditor : null}
          last={!facts.scheduled && !goalLocked}
        />

        {facts.scheduled ? (
          <FactRow
            theme={theme}
            label={t('calendarPage.blocks.form.moreOptions')}
            value={moreValue}
            quiet
            action={
              <RowAction
                label={openRow === 'more' ? t('items.sheet.closeRow') : t('items.sheet.change')}
                expanded={openRow === 'more'}
                onPress={() => toggleRow('more')}
              />
            }
            editor={openRow === 'more' ? moreEditor : null}
            last={!goalLocked}
          />
        ) : null}

        {goalLocked ? (
          <FactRow
            theme={theme}
            label={t('items.sheet.done')}
            value={t(done ? 'items.sheet.on' : 'items.sheet.off')}
            quiet={!done}
            action={<Checkbox checked={done} onPress={() => setDone((on) => !on)} label='' accessibilityLabel={t('items.sheet.done')} />}
            last
          />
        ) : null}

        {showsRecord ? (
          <Stack
            spacing={1}
            style={{
              marginTop: theme.spacing[2],
              padding: theme.spacing[2],
              borderRadius: theme.radius.md,
              backgroundColor: resolveColor(theme, 'background.level1')
            }}
          >
            <Stack direction='row' spacing={1} style={{ alignItems: 'baseline' }}>
              <Typography level='title-sm'>{t('calendarPage.blocks.form.today')}</Typography>
              <Typography level='body-sm' color='text.tertiary'>
                {t(`calendarPage.blocks.state.${recordState}`)}
              </Typography>
            </Stack>
            <Stack direction='row' spacing={1} style={{ flexWrap: 'wrap' }}>
              {/* Start is here, not on the row (PLAN-017): a late start is as welcome as an early one. */}
              {onStart && occurrence.date === todayKey && !log ? (
                <Button
                  size='sm'
                  variant='secondary'
                  startGlyph={<Icon name='Play' size='sm' color='text.secondary' />}
                  onPress={() => {
                    onStart(occurrence)
                    onClose?.()
                  }}
                >
                  {t('blocks.row.start')}
                </Button>
              ) : null}
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
          <Button
            variant='tertiary'
            style={{ alignSelf: 'flex-start', marginTop: theme.spacing[2] }}
            onPress={() => setConfirmingDelete(true)}
          >
            {t('items.sheet.delete')}
          </Button>
        ) : null}
      </Stack>
    </FullSheet>
  )
}

export default ItemSheet

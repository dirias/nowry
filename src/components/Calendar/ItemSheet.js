import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  Input,
  Option,
  Select,
  Sheet,
  Skeleton,
  Stack,
  Switch,
  Typography
} from '@mui/joy'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'

import { useBlockLog } from '@nowry/core/hooks/useBlockLog'
import { useAnnualPlan } from '@nowry/core/hooks/useAnnualPlan'
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
  repeats,
  scheduledReadout
} from '@nowry/core/domain/items'
import {
  BLOCK_STEP,
  MAX_BLOCK_MINUTES,
  MIN_BLOCK_MINUTES,
  PERIOD_STARTS,
  REMINDER_OPTIONS,
  clockOn,
  dueOn,
  localDateKey,
  minutesOfDay,
  stateOf,
  studyBlockLength
} from '@nowry/core/domain/blocks'
import { useTodayData } from '../Study/useTodayData'
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal'
import FormErrorBanner from '../Common/Form/FormErrorBanner'
import FormSheet from '../Common/Form/FormSheet'
import FormTextField from '../Common/Form/FormTextField'
import { focusRing, formLabel, segment, segmentedGroup, tabularNums } from '../Common/Form/formStyles'
import { formatMinutes } from './blockEvents'

/**
 * ItemSheet — the one form for everything a learner writes down (PLAN-012,
 * PLAN-015, ADR-046). A title and four optional facts: Due, Scheduled,
 * Priority, Part of a goal. Nothing asks what kind it is; the header's readout
 * and the key's label read the kind off the facts ("Add task", "Add routine",
 * "Add milestone"). Context fills one fact on open: a day fills Due, the hours
 * fill Scheduled, a goal's page fills the goal, the Study Center fills a
 * scheduled study time; the Add key opens it blank.
 *
 * **Each fact is a row that reads its value** (PRD D10). One anatomy — label ·
 * value · one action at the end. An unset row reads quietly and offers Set; a
 * set row reads its value and offers Change (Scheduled also ×). One row opens
 * at a time, in place, on a `level1` ground; the sheet is a `standard` sheet
 * and never scrolls with a row open. The once-date field exists only while
 * there is no due date: with one, a once item is scheduled on its due day.
 *
 * Props:
 *   open, onClose, onSaved – the sheet's lifecycle; `onSaved` after a write
 *   mode     – 'create' | 'edit'
 *   source   – what is being edited: `{ task, milestone, goalId, block, occurrence }`
 *   prefill  – partial facts for create: `{ title, due, scheduled, goalId, origin }`
 *   blocks   – the learner's blocks, for After and to find the block an item spans
 *   onStart  – runs a block on the timer; when given, today's unlogged block offers Start
 */

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] // Monday first, the API's convention
const DEFAULT_LENGTH = 20
const TIME_STEP_SECONDS = 300
const A_MONDAY = new Date(2024, 0, 1)
const LABEL_WIDTH = 128

const clampLength = (minutes) => Math.min(MAX_BLOCK_MINUTES, Math.max(MIN_BLOCK_MINUTES, minutes))

const defaultScheduled = (partial = {}) => ({
  start: partial.start ?? PERIOD_STARTS.morning,
  lengthMin: partial.lengthMin ?? DEFAULT_LENGTH,
  daysOfWeek: partial.daysOfWeek ?? [],
  date: partial.date ?? null,
  reminderMin: partial.reminderMin ?? null,
  afterBlockId: partial.afterBlockId ?? null
})

/** The facts the sheet opens with: the item being edited, or the context's prefill. */
const initialFacts = ({ isEdit, source, prefill, blocks }) => {
  if (isEdit) return itemFromSources({ ...source, blocks })
  const facts = factsFrom(prefill ?? {})
  if (facts.scheduled) facts.scheduled = defaultScheduled(facts.scheduled)
  return facts
}

/** The documents an edit already spans, from the source the caller handed over. */
const existingOf = (source, blocks) => {
  if (!source) return null
  const block =
    source.block ??
    (source.task ? blockForTask(source.task, blocks) : null) ??
    (source.milestone ? blockForMilestone(source.milestone, source.goalId, blocks) : null)
  return { task: source.task ?? null, milestone: source.milestone ?? null, goalId: source.goalId ?? null, block }
}

const formatDate = (key, language, long = false) =>
  new Intl.DateTimeFormat(
    language,
    long ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'short' }
  ).format(new Date(`${key}T00:00:00`))

/** A readout part → its sentence, with a date key formatted for the locale. */
const sayPart = ({ key, params }, t, language) =>
  params?.date ? t(key, { ...params, date: formatDate(params.date, language) }) : t(key, params)

/** The quiet in-row action: Set · Change · Choose · Done. */
const RowAction = ({ label, onClick, expanded = null }) => (
  <Button
    variant='plain'
    color='primary'
    size='sm'
    onClick={onClick}
    aria-expanded={expanded ?? undefined}
    sx={{ px: 0.75, minHeight: 32, flexShrink: 0, ...focusRing }}
  >
    {label}
  </Button>
)

/**
 * The row anatomy (PRD D10): label · value · one action. `quiet` draws an
 * unset value in tertiary ink. `editor`, when present, is the open state
 * drawn under the row on a level1 ground.
 */
const FactRow = ({ label, value, quiet = false, action = null, editor = null, last = false, testId }) => (
  <Box data-testid={testId} sx={{ borderBottom: last || editor ? 0 : '1px solid', borderColor: 'divider' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 52 }}>
      <Typography level='body-sm' sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 'lg' }}>
        {label}
      </Typography>
      <Typography level='body-md' noWrap sx={{ flex: 1, minWidth: 0, color: quiet ? 'text.tertiary' : 'text.primary', ...tabularNums }}>
        {value}
      </Typography>
      {action}
    </Box>
    {editor && <Box sx={{ bgcolor: 'background.level1', borderRadius: 'md', px: 2, py: 1.75, mb: 1.5 }}>{editor}</Box>}
  </Box>
)

/** "20 min" with − and + on the five-minute grid. */
const LengthStepper = ({ value, onChange, t }) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
    <IconButton
      variant='soft'
      color='neutral'
      size='sm'
      onClick={() => onChange(clampLength(value - BLOCK_STEP))}
      aria-label={t('calendarPage.blocks.form.less')}
      sx={{ minHeight: 32, minWidth: 32, ...focusRing }}
    >
      <RemoveRoundedIcon fontSize='small' />
    </IconButton>
    <Typography level='body-md' aria-live='polite' sx={{ minWidth: 64, textAlign: 'center', fontWeight: 'md', ...tabularNums }}>
      {formatMinutes(value, t)}
    </Typography>
    <IconButton
      variant='soft'
      color='neutral'
      size='sm'
      onClick={() => onChange(clampLength(value + BLOCK_STEP))}
      aria-label={t('calendarPage.blocks.form.more')}
      sx={{ minHeight: 32, minWidth: 32, ...focusRing }}
    >
      <AddRoundedIcon fontSize='small' />
    </IconButton>
  </Box>
)

/** Seven toggles, "any of": each its own key with its own ground. */
const DayToggles = ({ days, onToggle, labels, t }) => (
  <Box role='group' aria-label={t('items.sheet.days')} sx={{ display: 'flex', gap: 0.5, flex: 1 }}>
    {WEEKDAYS.map((day) => {
      const on = days.includes(day)
      return (
        <Button
          key={day}
          variant='soft'
          color='neutral'
          size='sm'
          onClick={() => onToggle(day)}
          aria-pressed={on}
          aria-label={labels[day].long}
          sx={{
            flex: 1,
            minWidth: 0,
            px: 0,
            minHeight: 36,
            bgcolor: on ? 'background.level2' : 'background.surface',
            color: on ? 'text.primary' : 'text.tertiary',
            fontWeight: on ? 'lg' : 'md',
            '--variant-softHoverBg': on ? 'var(--joy-palette-background-level2)' : 'var(--joy-palette-background-surface)',
            '--variant-softActiveBg': on ? 'var(--joy-palette-background-level2)' : 'var(--joy-palette-background-surface)',
            '&:hover': { color: 'text.primary' },
            ...focusRing
          }}
        >
          {labels[day].narrow}
        </Button>
      )
    })}
  </Box>
)

const remindLabel = (option, t) =>
  option === null
    ? t('calendarPage.blocks.form.remindOff')
    : option === 0
      ? t('calendarPage.blocks.form.remindAtStart')
      : t('calendarPage.blocks.form.remindMinutes', { count: option })

const EditorLabel = ({ children }) => (
  <Typography level='body-xs' sx={{ width: 76, flexShrink: 0, fontWeight: 'lg', color: 'text.secondary' }}>
    {children}
  </Typography>
)

/** The day's record for a block occurrence: its state, and Kept · Skip · Undo. */
const TodaySection = ({ occurrence, log, state, onStart, onKeep, onSkip, onUndo, pending, language, t }) => (
  <Box sx={{ p: 2, borderRadius: 'md', bgcolor: 'background.level1', mt: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1.5 }}>
      <Typography level='title-sm'>
        {occurrence.date === localDateKey() ? t('calendarPage.blocks.form.today') : formatDate(occurrence.date, language, true)}
      </Typography>
      <Typography level='body-sm' sx={{ color: 'text.tertiary', ...tabularNums }}>
        {t(`calendarPage.blocks.state.${state}`)}
      </Typography>
    </Box>
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      {/* Start is here, not on the row (PLAN-017): the timer is a choice made
          about one block, and a late start is as welcome as an early one. */}
      {onStart && (
        <Button variant='soft' color='primary' size='sm' onClick={onStart} startDecorator={<PlayArrowRounded />} sx={focusRing}>
          {t('blocks.row.start')}
        </Button>
      )}
      <Button
        variant='soft'
        color='neutral'
        size='sm'
        onClick={onKeep}
        aria-pressed={log?.status === 'kept'}
        loading={pending}
        sx={focusRing}
      >
        {t('calendarPage.blocks.kept')}
      </Button>
      <Button variant='soft' color='neutral' size='sm' onClick={onSkip} aria-pressed={log?.status === 'skipped'} sx={focusRing}>
        {t('calendarPage.blocks.skip')}
      </Button>
      {log && (
        <Button variant='plain' color='neutral' size='sm' onClick={onUndo} sx={focusRing}>
          {t('calendarPage.blocks.undo')}
        </Button>
      )}
    </Box>
  </Box>
)

const ItemSheet = ({ open, onClose, onSaved, onStart = null, mode = 'create', source = null, prefill = null, blocks = [] }) => {
  const { t, i18n } = useTranslation()
  const language = i18n?.language ?? 'en'
  const isEdit = mode === 'edit' && Boolean(source)
  const occurrence = source?.occurrence ?? null

  const [facts, setFacts] = useState(() => initialFacts({ isEdit, source, prefill, blocks }))
  // The one open row: 'due' | 'scheduled' | 'goal' | 'more' | null.
  const [openRow, setOpenRow] = useState(null)
  const [lengthSet, setLengthSet] = useState(isEdit)
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [log, setLog] = useState(occurrence?.log ?? null)
  const titleRef = useRef(null)

  const { saveItem, deleteItem } = useItemWriter()
  const { keep, skip, undo, pending } = useBlockLog()
  const { goals: cachedGoals, loading: goalsLoading } = useAnnualPlan()
  const { dueToday, forecast } = useTodayData()

  useEffect(() => {
    if (!open) return
    const next = initialFacts({ isEdit, source, prefill, blocks })
    setFacts(next)
    // The hours hand over a time to confirm, so that row opens; everything else opens closed.
    setOpenRow(!isEdit && prefill?.scheduled ? 'scheduled' : null)
    setLengthSet(isEdit || Boolean(prefill?.scheduled?.lengthMin))
    setDone(Boolean(source?.task?.is_completed || source?.milestone?.completed))
    setErrors({})
    setSaveError(null)
    setConfirmDelete(false)
    setLog(occurrence?.log ?? null)
    // `blocks` only serves to find the block an item spans; a refetch must not reset typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, source, prefill])

  const patch = (changes) => setFacts((prev) => ({ ...prev, ...changes }))
  const patchScheduled = (changes) => setFacts((prev) => ({ ...prev, scheduled: { ...prev.scheduled, ...changes } }))
  const toggleRow = (row) => setOpenRow((prev) => (prev === row ? null : row))

  const openGoals = useMemo(
    () =>
      (cachedGoals || []).filter((g) => !isGoalCompleted(g)).map((g) => ({ id: g._id, label: g.title, areaId: g.focus_area_id ?? null })),
    [cachedGoals]
  )
  const goalLocked = isEdit && Boolean(source?.task || source?.milestone)
  const goalLabel = (cachedGoals || []).find((g) => g._id === facts.goalId)?.title ?? null
  const existing = useMemo(() => existingOf(isEdit ? source : null, blocks), [isEdit, source, blocks])
  const otherRecurring = useMemo(() => (blocks ?? []).filter((b) => !b.date && b.id !== existing?.block?.id), [blocks, existing])

  const weekdayLabels = useMemo(() => {
    const narrow = new Intl.DateTimeFormat(language, { weekday: 'narrow' })
    const long = new Intl.DateTimeFormat(language, { weekday: 'long' })
    return WEEKDAYS.map((day) => {
      const date = new Date(A_MONDAY.getFullYear(), A_MONDAY.getMonth(), A_MONDAY.getDate() + day)
      return { narrow: narrow.format(date), long: long.format(date) }
    })
  }, [language])

  // The forecast sizes the study time until the learner does (PRD D4).
  const todayKey = localDateKey()
  const isStudy = facts.origin === 'study'
  const due = isStudy ? dueOn(facts.scheduled?.date || todayKey, todayKey, dueToday, forecast?.days ?? []) : 0
  const proposal = due > 0 ? studyBlockLength(due) : null
  const lengthMin = facts.scheduled ? (!lengthSet && proposal ? proposal : facts.scheduled.lengthMin) : DEFAULT_LENGTH
  const lengthHint = proposal ? t('calendarPage.blocks.form.forecastHint', { count: due, minutes: proposal }) : null
  const withLength = facts.scheduled ? { ...facts, scheduled: { ...facts.scheduled, lengthMin } } : facts

  const toggleDay = (day) => {
    const days = facts.scheduled.daysOfWeek
    patchScheduled({ daysOfWeek: days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort() })
    setErrors((prev) => ({ ...prev, date: false }))
  }

  const validate = () => {
    const missing = missingIn(withLength)
    const next = { title: missing.includes('title'), date: missing.includes('date') }
    setErrors(next)
    if (next.title) titleRef.current?.focus()
    if (next.date) setOpenRow('scheduled')
    return missing.length === 0
  }

  const submit = async () => {
    if (saving || !validate()) return
    setSaving(true)
    setSaveError(null)
    try {
      const areaId = openGoals.find((g) => g.id === facts.goalId)?.areaId ?? null
      await saveItem(withLength, existing, { areaId, done: goalLocked ? done : null })
      onSaved?.()
      onClose()
    } catch (err) {
      console.error('[ItemSheet] Save failed:', err)
      setSaveError(t('calendarPage.blocks.form.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const destroy = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await deleteItem(existing)
      setConfirmDelete(false)
      onSaved?.()
      onClose()
    } catch (err) {
      console.error('[ItemSheet] Delete failed:', err)
      setConfirmDelete(false)
      setSaveError(t('calendarPage.blocks.form.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const record = (action, nextLog) => async () => {
    const previous = log
    setLog(nextLog)
    try {
      await action(occurrence)
    } catch {
      setLog(previous)
      setSaveError(t('calendarPage.blocks.form.saveError'))
    }
  }

  const showsRecord = isEdit && occurrence && occurrence.date <= todayKey
  const recordState = showsRecord ? stateOf({ ...occurrence, log }, clockOn(occurrence.date, todayKey, minutesOfDay(new Date()))) : null
  const afterLabel = (
    otherRecurring.find((b) => b.id === facts.scheduled?.afterBlockId)?.title || t('calendarPage.blocks.form.afterNone')
  ).toLowerCase()
  const onceNeedsDate = facts.scheduled && !repeats(facts.scheduled) && !facts.due

  // ── The rows' values ───────────────────────────────────────────────────
  const dueValue = facts.due ? formatDate(facts.due, language) : t('items.sheet.noDate')
  const scheduledValue = facts.scheduled
    ? `${sayPart(scheduledReadout(withLength), t, language)} · ${formatMinutes(lengthMin, t)}`
    : t('items.sheet.noDate')
  const goalValue = goalLabel ?? t('items.sheet.goalNone')
  const moreValue = facts.scheduled
    ? t('calendarPage.blocks.form.moreSummary', { remind: remindLabel(facts.scheduled.reminderMin ?? null, t), after: afterLabel })
    : ''

  // ── The editors: the open state of a row ───────────────────────────────
  const dueEditor = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Input
        type='date'
        size='md'
        value={facts.due ?? ''}
        onChange={(event) => patch({ due: event.target.value || null })}
        slotProps={{ input: { 'aria-label': t('items.sheet.due') } }}
        sx={{ maxWidth: 220, ...focusRing }}
      />
      {facts.due && (
        <Button variant='plain' color='neutral' size='sm' onClick={() => patch({ due: null })} sx={focusRing}>
          {t('items.sheet.noDate')}
        </Button>
      )}
    </Box>
  )

  const scheduledEditor = facts.scheduled && (
    <Stack spacing={1.5}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <EditorLabel>{t('calendarPage.blocks.form.starts')}</EditorLabel>
        <Input
          type='time'
          size='md'
          value={facts.scheduled.start}
          onChange={(event) => patchScheduled({ start: event.target.value || facts.scheduled.start })}
          slotProps={{ input: { step: TIME_STEP_SECONDS, 'aria-label': t('calendarPage.blocks.form.starts') } }}
          sx={{ width: 140, ...focusRing }}
        />
        <EditorLabel>{t('calendarPage.blocks.form.lasts')}</EditorLabel>
        <LengthStepper
          value={lengthMin}
          onChange={(value) => {
            patchScheduled({ lengthMin: value })
            setLengthSet(true)
          }}
          t={t}
        />
      </Box>
      {lengthHint && (
        <Typography level='body-xs' sx={{ color: 'text.tertiary', pl: 11 }}>
          {lengthHint}
        </Typography>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <EditorLabel>{t('items.sheet.days')}</EditorLabel>
        <DayToggles days={facts.scheduled.daysOfWeek} onToggle={toggleDay} labels={weekdayLabels} t={t} />
      </Box>
      {onceNeedsDate && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <EditorLabel>{t('items.sheet.onceDate')}</EditorLabel>
          <Input
            type='date'
            size='md'
            value={facts.scheduled.date ?? ''}
            onChange={(event) => {
              patchScheduled({ date: event.target.value || null })
              setErrors((prev) => ({ ...prev, date: false }))
            }}
            slotProps={{ input: { 'aria-label': t('items.sheet.onceDate') } }}
            sx={{ maxWidth: 220, ...focusRing }}
          />
        </Box>
      )}
      <FormHelperText sx={{ pl: 11, color: errors.date ? 'danger.plainColor' : 'text.tertiary' }}>
        {errors.date
          ? t('items.sheet.dateRequired')
          : repeats(facts.scheduled)
            ? ''
            : facts.due
              ? t('items.sheet.onceOnDue')
              : t('items.sheet.onceHint')}
      </FormHelperText>
    </Stack>
  )

  const goalEditor = goalsLoading ? (
    <Skeleton variant='rectangular' height={40} sx={{ borderRadius: 'sm' }} />
  ) : (
    <Select
      size='md'
      value={facts.goalId || null}
      onChange={(_, v) => {
        patch({ goalId: v || null })
        setOpenRow(null)
      }}
      placeholder={t('items.sheet.goalNone')}
      slotProps={{ button: { 'aria-label': t('items.sheet.goal') } }}
      sx={{ maxWidth: 360, ...focusRing }}
    >
      <Option value=''>{t('items.sheet.goalNone')}</Option>
      {openGoals.map((option) => (
        <Option key={option.id} value={option.id}>
          {option.label}
        </Option>
      ))}
    </Select>
  )

  const moreEditor = facts.scheduled && (
    <Stack spacing={2}>
      <FormControl>
        <FormLabel sx={formLabel}>{t('calendarPage.blocks.form.remind')}</FormLabel>
        <Sheet variant='outlined' role='group' aria-label={t('calendarPage.blocks.form.remind')} sx={{ ...segmentedGroup, width: '100%' }}>
          {REMINDER_OPTIONS.map((option, index) => (
            <Button
              key={String(option)}
              variant='plain'
              color='neutral'
              onClick={() => patchScheduled({ reminderMin: option })}
              aria-pressed={(facts.scheduled.reminderMin ?? null) === option}
              sx={{ ...segment((facts.scheduled.reminderMin ?? null) === option, index === 0), flex: 1, px: 1 }}
            >
              {remindLabel(option, t)}
            </Button>
          ))}
        </Sheet>
      </FormControl>
      {otherRecurring.length > 0 && (
        <FormControl>
          <FormLabel sx={formLabel}>{t('calendarPage.blocks.form.after')}</FormLabel>
          <Select
            size='md'
            value={facts.scheduled.afterBlockId || null}
            onChange={(_, v) => patchScheduled({ afterBlockId: v || null })}
            placeholder={t('calendarPage.blocks.form.afterNone')}
            slotProps={{ button: { 'aria-label': t('calendarPage.blocks.form.after') } }}
            sx={focusRing}
          >
            <Option value=''>{t('calendarPage.blocks.form.afterNone')}</Option>
            {otherRecurring.map((other) => (
              <Option key={other.id} value={other.id}>
                {other.title}
              </Option>
            ))}
          </Select>
          <FormHelperText>{t('calendarPage.blocks.form.afterHelper')}</FormHelperText>
        </FormControl>
      )}
    </Stack>
  )

  const actionLabel = (row, isSet) => (openRow === row ? t('items.sheet.closeRow') : isSet ? t('items.sheet.change') : t('items.sheet.set'))

  const actionSx = { width: { xs: '100%', sm: 'auto' }, ...focusRing }
  const footer = (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', gap: 2 }}>
      <Button variant='soft' color='neutral' onClick={onClose} size='lg' sx={actionSx}>
        {t('calendarPage.blocks.form.cancel')}
      </Button>
      <Button onClick={submit} loading={saving} size='lg' sx={actionSx}>
        {t(keyLabel(facts, { edit: isEdit }).key)}
      </Button>
    </Box>
  )

  return (
    <>
      <FormSheet
        open={open}
        onClose={saving ? () => {} : onClose}
        titleKey={isEdit ? 'items.sheet.editTitle' : 'items.sheet.addTitle'}
        subtitleText={
          <Box component='span' aria-live='polite' data-testid='item-readout'>
            {readoutParts(withLength)
              .map((part) => sayPart(part, t, language))
              .join(' · ')}
          </Box>
        }
        width='standard'
        banner={saveError ? <FormErrorBanner titleKey='calendarModal.form.saveErrorTitle' detailText={saveError} /> : null}
        footer={footer}
      >
        <Box sx={{ mb: 1 }}>
          <FormTextField
            labelKey='items.sheet.title'
            placeholderKey='items.sheet.titlePlaceholder'
            errorKey={errors.title ? 'items.sheet.titleRequired' : null}
            value={facts.title}
            onChange={(value) => {
              patch({ title: value })
              if (errors.title && value.trim()) setErrors((prev) => ({ ...prev, title: false }))
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) submit()
            }}
            autoFocus
            inputRef={titleRef}
          />
        </Box>

        <FactRow
          testId='row-due'
          label={t('items.sheet.due')}
          value={dueValue}
          quiet={!facts.due}
          action={
            <RowAction label={actionLabel('due', Boolean(facts.due))} expanded={openRow === 'due'} onClick={() => toggleRow('due')} />
          }
          editor={openRow === 'due' ? dueEditor : null}
        />

        <FactRow
          testId='row-scheduled'
          label={t('items.sheet.scheduled')}
          value={scheduledValue}
          quiet={!facts.scheduled}
          action={
            <>
              <RowAction
                label={actionLabel('scheduled', Boolean(facts.scheduled))}
                expanded={openRow === 'scheduled'}
                onClick={() => {
                  if (!facts.scheduled) patch({ scheduled: defaultScheduled({ date: facts.due }) })
                  toggleRow('scheduled')
                }}
              />
              {facts.scheduled && (
                <IconButton
                  variant='plain'
                  color='neutral'
                  size='sm'
                  aria-label={t('items.sheet.removeTime')}
                  onClick={() => {
                    patch({ scheduled: null })
                    if (openRow === 'scheduled' || openRow === 'more') setOpenRow(null)
                  }}
                  sx={{ minHeight: 32, minWidth: 32, ...focusRing }}
                >
                  <CloseRoundedIcon fontSize='small' />
                </IconButton>
              )}
            </>
          }
          editor={openRow === 'scheduled' ? scheduledEditor : null}
        />

        <FactRow
          testId='row-priority'
          label={t('items.sheet.priority')}
          value={t(facts.priority ? 'items.sheet.on' : 'items.sheet.off')}
          quiet={!facts.priority}
          action={
            <Switch
              checked={facts.priority}
              onChange={(event) => patch({ priority: event.target.checked })}
              slotProps={{ input: { 'aria-label': t('items.sheet.priority') } }}
              sx={focusRing}
            />
          }
        />

        <FactRow
          testId='row-goal'
          label={t('items.sheet.goal')}
          value={goalValue}
          quiet={!facts.goalId}
          action={
            goalLocked ? null : (
              <RowAction
                label={openRow === 'goal' ? t('items.sheet.closeRow') : facts.goalId ? t('items.sheet.change') : t('items.sheet.choose')}
                expanded={openRow === 'goal'}
                onClick={() => toggleRow('goal')}
              />
            )
          }
          editor={openRow === 'goal' ? goalEditor : null}
          last={!facts.scheduled && !goalLocked}
        />

        {facts.scheduled && (
          <FactRow
            testId='row-more'
            label={t('calendarPage.blocks.form.moreOptions')}
            value={moreValue}
            quiet
            action={
              <RowAction
                label={openRow === 'more' ? t('items.sheet.closeRow') : t('items.sheet.change')}
                expanded={openRow === 'more'}
                onClick={() => toggleRow('more')}
              />
            }
            editor={openRow === 'more' ? moreEditor : null}
            last={!goalLocked}
          />
        )}

        {goalLocked && (
          <FactRow
            testId='row-done'
            label={t('items.sheet.done')}
            value={t(done ? 'items.sheet.on' : 'items.sheet.off')}
            quiet={!done}
            action={
              <Checkbox
                size='lg'
                checked={done}
                onChange={(e) => setDone(e.target.checked)}
                slotProps={{ input: { 'aria-label': t('items.sheet.done') } }}
                sx={focusRing}
              />
            }
            last
          />
        )}

        {showsRecord && (
          <TodaySection
            occurrence={occurrence}
            log={log}
            state={recordState}
            onStart={
              onStart && occurrence.date === todayKey && !log
                ? () => {
                    onStart(occurrence)
                    onClose()
                  }
                : null
            }
            onKeep={record(keep, { status: 'kept', minutes: occurrence.lengthMin })}
            onSkip={record(skip, { status: 'skipped', minutes: 0 })}
            onUndo={record(undo, null)}
            pending={pending}
            language={language}
            t={t}
          />
        )}

        {isEdit && (
          <Box sx={{ pt: 2 }}>
            <Button variant='plain' color='danger' size='sm' onClick={() => setConfirmDelete(true)} sx={{ px: 1, ...focusRing }}>
              {t('items.sheet.delete')}
            </Button>
          </Box>
        )}
      </FormSheet>

      {isEdit && (
        <DeleteConfirmationModal
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={destroy}
          title={t('items.sheet.deleteTitle')}
          description={t('items.sheet.deleteBody')}
          confirmText={t('items.sheet.delete')}
          loading={saving}
        />
      )}
    </>
  )
}

export default ItemSheet

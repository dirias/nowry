import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Button,
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

import { useBlocks } from '@nowry/core/hooks/useBlocks'
import { useBlockLog } from '@nowry/core/hooks/useBlockLog'
import { useAnnualPlan } from '@nowry/core/hooks/useAnnualPlan'
import { isGoalCompleted } from '@nowry/core/domain/goalDerivation'
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
import { formatMinutes, SOURCE_ICONS } from './blockEvents'

/** What a block can be for, from this form (PRD D1). Task and free are made elsewhere. */
const SOURCES = ['routine', 'study', 'focus', 'goal']
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] // Monday first, the API's convention
const DEFAULT_LENGTH = 20
/** The seconds `<input type="time">` steps by: five minutes, the block grid. */
const TIME_STEP_SECONDS = 300
/** A Monday, so `+ weekday` lands on the right name in every locale. */
const A_MONDAY = new Date(2024, 0, 1)

const clampLength = (minutes) => Math.min(MAX_BLOCK_MINUTES, Math.max(MIN_BLOCK_MINUTES, minutes))

/** The form's state for a block, a selection, or nothing. */
const initialState = ({ block, prefill }) => {
  if (block) {
    return {
      title: block.title ?? '',
      sourceType: SOURCES.includes(block.source?.type) ? block.source.type : 'routine',
      goalId: block.source?.type === 'goal' ? (block.source.id ?? '') : '',
      start: block.start ?? PERIOD_STARTS.morning,
      lengthMin: block.lengthMin ?? DEFAULT_LENGTH,
      lengthSet: true,
      once: Boolean(block.date),
      date: block.date ?? localDateKey(),
      daysOfWeek: block.daysOfWeek ?? [],
      reminderMin: block.reminderMin ?? null,
      afterBlockId: block.afterBlockId ?? ''
    }
  }
  return {
    title: '',
    sourceType: 'routine',
    goalId: '',
    start: prefill?.start ?? PERIOD_STARTS.morning,
    lengthMin: prefill?.lengthMin ?? DEFAULT_LENGTH,
    lengthSet: Boolean(prefill?.lengthMin),
    once: Boolean(prefill?.date),
    date: prefill?.date ?? localDateKey(),
    daysOfWeek: prefill?.date ? [] : [...WEEKDAYS],
    reminderMin: null,
    afterBlockId: ''
  }
}

/**
 * "For" — one segmented object of one class (§15.2); engaged is a ground.
 * The source's glyph sits beside the label from `sm` up.
 */
const SourceObject = ({ value, onChange, t }) => (
  <FormControl>
    <FormLabel sx={formLabel}>{t('calendarPage.blocks.form.for')}</FormLabel>
    <Sheet variant='outlined' role='group' aria-label={t('calendarPage.blocks.form.for')} sx={{ ...segmentedGroup, width: '100%' }}>
      {SOURCES.map((source, index) => {
        const Icon = SOURCE_ICONS[source]
        return (
          <Button
            key={source}
            variant='plain'
            color='neutral'
            onClick={() => onChange(source)}
            aria-pressed={value === source}
            startDecorator={<Icon sx={{ fontSize: 'md', display: { xs: 'none', sm: 'block' } }} />}
            sx={{ ...segment(value === source, index === 0), flex: 1, px: 1 }}
          >
            {t(`calendarPage.blocks.form.source.${source}`)}
          </Button>
        )
      })}
    </Sheet>
  </FormControl>
)

/** The goal a goal block is for — the event form's milestone picker, reused in shape. */
const GoalPicker = ({ loading, options, value, onChange, error, t }) => (
  <FormControl error={error}>
    <FormLabel sx={formLabel}>{t('calendarPage.blocks.form.goal')}</FormLabel>
    {loading ? (
      <Skeleton variant='rectangular' height={48} sx={{ borderRadius: 'sm' }} />
    ) : options.length === 0 ? (
      <Typography level='body-sm' sx={{ color: 'text.secondary', px: 2, py: 1.5, borderRadius: 'md', bgcolor: 'background.level1' }}>
        {t('calendarPage.blocks.form.noGoals')}
      </Typography>
    ) : (
      <Select
        size='lg'
        value={value || null}
        onChange={(_, v) => onChange(v ?? '')}
        placeholder={t('calendarPage.blocks.form.goalPlaceholder')}
        slotProps={{ button: { 'aria-label': t('calendarPage.blocks.form.goal') } }}
        sx={focusRing}
      >
        {options.map((option) => (
          <Option key={option.id} value={option.id}>
            {option.label}
          </Option>
        ))}
      </Select>
    )}
    {error && <FormHelperText>{t('calendarPage.blocks.form.goalRequired')}</FormHelperText>}
  </FormControl>
)

/** "Lasts" — a stepper on the five-minute grid, the length as its readout. */
const LengthStepper = ({ value, onChange, hint, t }) => (
  <FormControl>
    <FormLabel sx={formLabel}>{t('calendarPage.blocks.form.lasts')}</FormLabel>
    {/* One object: two keys at the small size with the length as the readout
        between them. Large square keys around a floating number read as three
        things; this reads as one control. */}
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      <IconButton
        variant='soft'
        color='neutral'
        size='sm'
        onClick={() => onChange(clampLength(value - BLOCK_STEP))}
        aria-label={t('calendarPage.blocks.form.less')}
        sx={{ minHeight: { xs: 44, sm: 36 }, minWidth: { xs: 44, sm: 36 }, ...focusRing }}
      >
        <RemoveRoundedIcon fontSize='small' />
      </IconButton>
      <Typography level='body-md' aria-live='polite' sx={{ minWidth: 72, textAlign: 'center', fontWeight: 'md', ...tabularNums }}>
        {formatMinutes(value, t)}
      </Typography>
      <IconButton
        variant='soft'
        color='neutral'
        size='sm'
        onClick={() => onChange(clampLength(value + BLOCK_STEP))}
        aria-label={t('calendarPage.blocks.form.more')}
        sx={{ minHeight: { xs: 44, sm: 36 }, minWidth: { xs: 44, sm: 36 }, ...focusRing }}
      >
        <AddRoundedIcon fontSize='small' />
      </IconButton>
    </Box>
    {hint && <FormHelperText>{hint}</FormHelperText>}
  </FormControl>
)

/** "Repeats" — seven weekday toggles, or a one-off on a date. */
const RepeatsObject = ({ once, days, date, onToggleDay, onOnceChange, onDateChange, error, labels, t }) => (
  <FormControl error={Boolean(error)}>
    <FormLabel sx={formLabel}>{t('calendarPage.blocks.form.repeats')}</FormLabel>
    {!once && (
      /* Seven toggles, not a segment: a segment means "one of", weekdays are
         "any of". Each is its own key with its own ground — level2 when on,
         level1 when off — and a gap between them says they do not share. */
      <Box role='group' aria-label={t('calendarPage.blocks.form.repeats')} sx={{ display: 'flex', gap: 0.5 }}>
        {WEEKDAYS.map((day) => {
          const on = days.includes(day)
          return (
            <Button
              key={day}
              variant='soft'
              color='neutral'
              size='sm'
              onClick={() => onToggleDay(day)}
              aria-pressed={on}
              aria-label={labels[day].long}
              sx={{
                flex: 1,
                minWidth: 0,
                px: 0,
                minHeight: { xs: 44, sm: 36 },
                bgcolor: on ? 'background.level2' : 'background.level1',
                color: on ? 'text.primary' : 'text.tertiary',
                fontWeight: on ? 'lg' : 'md',
                '--variant-softHoverBg': on ? 'var(--joy-palette-background-level2)' : 'var(--joy-palette-background-level1)',
                '--variant-softActiveBg': on ? 'var(--joy-palette-background-level2)' : 'var(--joy-palette-background-level1)',
                '&:hover': { color: 'text.primary' },
                ...focusRing
              }}
            >
              {labels[day].narrow}
            </Button>
          )
        })}
      </Box>
    )}
    <Switch
      checked={once}
      onChange={(event) => onOnceChange(event.target.checked)}
      endDecorator={t('calendarPage.blocks.form.once')}
      sx={{ alignSelf: 'flex-start', mt: 1, ...focusRing }}
    />
    {once && (
      <Input
        type='date'
        size='lg'
        value={date}
        onChange={(event) => onDateChange(event.target.value)}
        slotProps={{ input: { 'aria-label': t('calendarPage.blocks.form.onceDate') } }}
        sx={{ mt: 1, ...focusRing }}
      />
    )}
    {error && <FormHelperText>{t(error)}</FormHelperText>}
  </FormControl>
)

/** "Remind" — Off · At start · 5 min · 15 min · 30 min, one object. */
const RemindObject = ({ value, onChange, t }) => (
  <FormControl>
    <FormLabel sx={formLabel}>{t('calendarPage.blocks.form.remind')}</FormLabel>
    <Sheet variant='outlined' role='group' aria-label={t('calendarPage.blocks.form.remind')} sx={{ ...segmentedGroup, width: '100%' }}>
      {REMINDER_OPTIONS.map((option, index) => {
        const label =
          option === null
            ? t('calendarPage.blocks.form.remindOff')
            : option === 0
              ? t('calendarPage.blocks.form.remindAtStart')
              : t('calendarPage.blocks.form.remindMinutes', { count: option })
        return (
          <Button
            key={String(option)}
            variant='plain'
            color='neutral'
            onClick={() => onChange(option)}
            aria-pressed={value === option}
            sx={{ ...segment(value === option, index === 0), flex: 1, px: 1 }}
          >
            {label}
          </Button>
        )
      })}
    </Sheet>
  </FormControl>
)

/** The day's record for this block: its state as a readout, and Kept · Skip · Undo. */
const TodaySection = ({ occurrence, log, state, onKeep, onSkip, onUndo, pending, language, t }) => {
  const todayKey = localDateKey()
  const heading =
    occurrence.date === todayKey
      ? t('calendarPage.blocks.form.today')
      : new Intl.DateTimeFormat(language, { weekday: 'long', day: 'numeric', month: 'long' }).format(
          new Date(`${occurrence.date}T00:00:00`)
        )
  return (
    <Box sx={{ p: 2, borderRadius: 'md', bgcolor: 'background.level1' }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1.5 }}>
        <Typography level='title-sm'>{heading}</Typography>
        <Typography level='body-sm' sx={{ color: 'text.tertiary', ...tabularNums }}>
          {t(`calendarPage.blocks.state.${state}`)}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
}

/**
 * BlockFormModal — add or edit a block, on the shared sheet (PLAN-004).
 *
 * Mirrors the phone's block sheet field for field: title first; For as the
 * house segmented control; Starts; Lasts as a stepper whose length follows
 * the forecast for a study block until the learner sets it (PRD D4); Repeats
 * as seven weekday toggles or a one-off date; Remind; After. The action is
 * named after what it makes and is never disabled (ADR-017): an empty title
 * fails under the field, a missing goal under its picker, no weekday under
 * the toggles, a rejected request in the banner.
 *
 * Props:
 *   open, onClose, onSaved – the sheet's lifecycle; `onSaved` after a write
 *   mode       – 'create' | 'edit'
 *   block      – the block being edited (camelCase, from `useBlocks`)
 *   occurrence – the occurrence that was clicked, for the day's record
 *   prefill    – `{ date, start, lengthMin }` from a drag-select
 *   blocks     – the learner's blocks, for the After picker
 */
const BlockFormModal = ({ open, onClose, onSaved, mode = 'create', block = null, occurrence = null, prefill = null, blocks = [] }) => {
  const { t, i18n } = useTranslation()
  const language = i18n?.language ?? 'en'
  const isEdit = mode === 'edit' && Boolean(block)

  const [form, setForm] = useState(() => initialState({ block: isEdit ? block : null, prefill }))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [log, setLog] = useState(occurrence?.log ?? null)
  const titleRef = useRef(null)

  const { create, update, remove } = useBlocks()
  const { keep, skip, undo, pending } = useBlockLog()
  const { goals: cachedGoals, loading: goalsLoading } = useAnnualPlan()
  const { dueToday, forecast } = useTodayData()

  useEffect(() => {
    if (!open) return
    setForm(initialState({ block: isEdit ? block : null, prefill }))
    setErrors({})
    setSaveError(null)
    setConfirmDelete(false)
    setLog(occurrence?.log ?? null)
  }, [open, isEdit, block, prefill, occurrence])

  const patch = (changes) => setForm((prev) => ({ ...prev, ...changes }))

  const openGoals = useMemo(
    () =>
      (cachedGoals || []).filter((g) => !isGoalCompleted(g)).map((g) => ({ id: g._id, label: g.title, areaId: g.focus_area_id ?? null })),
    [cachedGoals]
  )
  const otherRecurring = useMemo(() => (blocks ?? []).filter((b) => !b.date && b.id !== block?.id), [blocks, block])

  const weekdayLabels = useMemo(() => {
    const narrow = new Intl.DateTimeFormat(language, { weekday: 'narrow' })
    const long = new Intl.DateTimeFormat(language, { weekday: 'long' })
    return WEEKDAYS.map((day) => {
      const date = new Date(A_MONDAY.getFullYear(), A_MONDAY.getMonth(), A_MONDAY.getDate() + day)
      return { narrow: narrow.format(date), long: long.format(date) }
    })
  }, [language])

  // ── The forecast sizes the study block until the learner does (PRD D4) ──
  const todayKey = localDateKey()
  const forecastDate = form.once && form.date ? form.date : todayKey
  const due = form.sourceType === 'study' ? dueOn(forecastDate, todayKey, dueToday, forecast?.days ?? []) : 0
  const proposal = due > 0 ? studyBlockLength(due) : null
  const lengthMin = !form.lengthSet && proposal ? proposal : form.lengthMin
  const lengthHint = proposal ? t('calendarPage.blocks.form.forecastHint', { count: due, minutes: proposal }) : null

  const toggleDay = (day) =>
    patch({ daysOfWeek: form.daysOfWeek.includes(day) ? form.daysOfWeek.filter((d) => d !== day) : [...form.daysOfWeek, day].sort() })

  // ── Validation: loud, never a disabled key ─────────────────────────────
  const validate = () => {
    const next = {}
    if (!form.title.trim()) next.title = true
    if (form.sourceType === 'goal' && !form.goalId) next.goal = true
    if (form.once && !form.date) next.repeats = 'calendarPage.blocks.form.dateRequired'
    if (!form.once && form.daysOfWeek.length === 0) next.repeats = 'calendarPage.blocks.form.daysRequired'
    setErrors(next)
    if (next.title) titleRef.current?.focus()
    return Object.keys(next).length === 0
  }

  const payload = () => {
    const goal = form.sourceType === 'goal' ? openGoals.find((g) => g.id === form.goalId) : null
    return {
      title: form.title.trim(),
      source: { type: form.sourceType, id: form.sourceType === 'goal' ? form.goalId : null },
      start: form.start,
      lengthMin,
      daysOfWeek: form.once ? [] : form.daysOfWeek,
      date: form.once ? form.date : null,
      reminderMin: form.reminderMin,
      afterBlockId: form.afterBlockId || null,
      areaId: goal?.areaId ?? (form.sourceType === 'goal' ? (block?.areaId ?? null) : null)
    }
  }

  const submit = async () => {
    if (saving || !validate()) return
    setSaving(true)
    setSaveError(null)
    try {
      if (isEdit) await update({ id: block.id, changes: payload() })
      else await create(payload())
      onSaved?.()
      onClose()
    } catch (err) {
      console.error('[BlockFormModal] Save failed:', err)
      setSaveError(t('calendarPage.blocks.form.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const destroy = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await remove(block.id)
      setConfirmDelete(false)
      onSaved?.()
      onClose()
    } catch (err) {
      console.error('[BlockFormModal] Delete failed:', err)
      setConfirmDelete(false)
      setSaveError(t('calendarPage.blocks.form.saveError'))
    } finally {
      setSaving(false)
    }
  }

  // ── The day's record: optimistic here as well as in the cache ──────────
  const record = (action, nextLog) => async () => {
    const previous = log
    setLog(nextLog)
    try {
      await action(occurrence)
    } catch (err) {
      setLog(previous)
      setSaveError(t('calendarPage.blocks.form.saveError'))
    }
  }

  const showsRecord = isEdit && occurrence && occurrence.date <= todayKey
  const recordState = showsRecord ? stateOf({ ...occurrence, log }, clockOn(occurrence.date, todayKey, minutesOfDay(new Date()))) : null

  const onTitleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) submit()
  }

  const SubtitleIcon = SOURCE_ICONS[form.sourceType] ?? SOURCE_ICONS.free
  const subtitle = isEdit ? (
    <Box component='span' sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
      <SubtitleIcon sx={{ fontSize: 'sm' }} />
      {t(`calendarPage.blocks.form.source.${form.sourceType}`)}
    </Box>
  ) : null

  const actionSx = { width: { xs: '100%', sm: 'auto' }, ...focusRing }
  const footer = (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', gap: 2 }}>
      {/* Cancel stays enabled while saving so a stuck request is escapable.
          Delete is not a key of this row (one solid, one secondary, §15.9);
          it sits at the body's foot as a danger link. */}
      <Button variant='soft' color='neutral' onClick={onClose} size='lg' sx={actionSx}>
        {t('calendarPage.blocks.form.cancel')}
      </Button>
      <Button onClick={submit} loading={saving} size='lg' sx={actionSx}>
        {isEdit ? t('calendarPage.blocks.form.save') : t('calendarPage.blocks.form.add')}
      </Button>
    </Box>
  )

  return (
    <>
      <FormSheet
        open={open}
        onClose={saving ? () => {} : onClose}
        titleKey={isEdit ? 'calendarPage.blocks.form.editTitle' : 'calendarPage.blocks.form.addTitle'}
        subtitleText={subtitle}
        width='simple'
        banner={saveError ? <FormErrorBanner titleKey='calendarModal.form.saveErrorTitle' detailText={saveError} /> : null}
        footer={footer}
      >
        <Stack spacing={2.5}>
          <FormTextField
            labelKey='calendarPage.blocks.form.title'
            placeholderKey='calendarPage.blocks.form.titlePlaceholder'
            errorKey={errors.title ? 'calendarPage.blocks.form.titleRequired' : null}
            value={form.title}
            onChange={(value) => {
              patch({ title: value })
              if (errors.title && value.trim()) setErrors((prev) => ({ ...prev, title: false }))
            }}
            onKeyDown={onTitleKeyDown}
            autoFocus
            inputRef={titleRef}
          />

          <SourceObject value={form.sourceType} onChange={(sourceType) => patch({ sourceType })} t={t} />

          {form.sourceType === 'goal' && (
            <GoalPicker
              loading={goalsLoading}
              options={openGoals}
              value={form.goalId}
              onChange={(goalId) => {
                patch({ goalId })
                setErrors((prev) => ({ ...prev, goal: false }))
              }}
              error={Boolean(errors.goal)}
              t={t}
            />
          )}

          <FormControl>
            <FormLabel sx={formLabel}>{t('calendarPage.blocks.form.starts')}</FormLabel>
            <Input
              type='time'
              size='lg'
              value={form.start}
              onChange={(event) => patch({ start: event.target.value || form.start })}
              slotProps={{ input: { step: TIME_STEP_SECONDS, 'aria-label': t('calendarPage.blocks.form.starts') } }}
              sx={focusRing}
            />
          </FormControl>

          <LengthStepper value={lengthMin} onChange={(value) => patch({ lengthMin: value, lengthSet: true })} hint={lengthHint} t={t} />

          <RepeatsObject
            once={form.once}
            days={form.daysOfWeek}
            date={form.date}
            onToggleDay={(day) => {
              toggleDay(day)
              setErrors((prev) => ({ ...prev, repeats: null }))
            }}
            onOnceChange={(once) => {
              patch({ once })
              setErrors((prev) => ({ ...prev, repeats: null }))
            }}
            onDateChange={(date) => patch({ date })}
            error={errors.repeats}
            labels={weekdayLabels}
            t={t}
          />

          <RemindObject value={form.reminderMin} onChange={(reminderMin) => patch({ reminderMin })} t={t} />

          {otherRecurring.length > 0 && (
            <FormControl>
              <FormLabel sx={formLabel}>{t('calendarPage.blocks.form.after')}</FormLabel>
              <Select
                size='lg'
                value={form.afterBlockId || null}
                onChange={(_, v) => patch({ afterBlockId: v ?? '' })}
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

          {showsRecord && (
            <TodaySection
              occurrence={occurrence}
              log={log}
              state={recordState}
              onKeep={record(keep, { status: 'kept', minutes: occurrence.lengthMin })}
              onSkip={record(skip, { status: 'skipped', minutes: 0 })}
              onUndo={record(undo, null)}
              pending={pending}
              language={language}
              t={t}
            />
          )}
          {isEdit && (
            <Box sx={{ pt: 1 }}>
              <Button variant='plain' color='danger' size='sm' onClick={() => setConfirmDelete(true)} sx={{ px: 1, ...focusRing }}>
                {t('calendarPage.blocks.form.delete')}
              </Button>
            </Box>
          )}
        </Stack>
      </FormSheet>

      {isEdit && (
        <DeleteConfirmationModal
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={destroy}
          title={t('calendarPage.blocks.form.deleteTitle')}
          description={t('calendarPage.blocks.form.deleteBody')}
          confirmText={t('calendarPage.blocks.form.delete')}
          loading={saving}
        />
      )}
    </>
  )
}

export default BlockFormModal

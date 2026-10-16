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
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'

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
  repeats
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
 * ADR-046). A title and four optional facts: Due, Scheduled, Priority, Part
 * of a goal. Nothing asks what kind it is; the header's readout and the key's
 * label read the kind off the facts as they change ("Add task", "Add
 * routine", "Add milestone"). Context fills one fact on open: a day fills
 * Due, the hours fill Scheduled, a goal's page fills the goal, the Study
 * Center fills a scheduled study time; the Add key opens it blank.
 *
 * Replaces EventFormModal and BlockFormModal. The writes are `useItemWriter`'s;
 * what is here is this form's own state.
 *
 * Props:
 *   open, onClose, onSaved – the sheet's lifecycle; `onSaved` after a write
 *   mode     – 'create' | 'edit'
 *   source   – what is being edited: `{ task, milestone, goalId, block, occurrence }`
 *              (task and milestone in the API's shape, block camelCase)
 *   prefill  – partial facts for create: `{ title, due, scheduled, goalId, origin }`
 *   blocks   – the learner's blocks, for the After picker and to find the one the item spans
 */

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] // Monday first, the API's convention
const DEFAULT_LENGTH = 20
const TIME_STEP_SECONDS = 300
const A_MONDAY = new Date(2024, 0, 1)

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

/** "20 min" with − and + on the five-minute grid. */
const LengthStepper = ({ value, onChange, hint, t }) => (
  <FormControl>
    <FormLabel sx={formLabel}>{t('calendarPage.blocks.form.lasts')}</FormLabel>
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

/** Seven toggles, "any of": each its own key with its own ground. */
const DayToggles = ({ days, onToggle, labels, t }) => (
  <Box role='group' aria-label={t('items.sheet.days')} sx={{ display: 'flex', gap: 0.5 }}>
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
)

const remindLabel = (option, t) =>
  option === null
    ? t('calendarPage.blocks.form.remindOff')
    : option === 0
      ? t('calendarPage.blocks.form.remindAtStart')
      : t('calendarPage.blocks.form.remindMinutes', { count: option })

const RemindObject = ({ value, onChange, t }) => (
  <FormControl>
    <FormLabel sx={formLabel}>{t('calendarPage.blocks.form.remind')}</FormLabel>
    <Sheet variant='outlined' role='group' aria-label={t('calendarPage.blocks.form.remind')} sx={{ ...segmentedGroup, width: '100%' }}>
      {REMINDER_OPTIONS.map((option, index) => (
        <Button
          key={String(option)}
          variant='plain'
          color='neutral'
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          sx={{ ...segment(value === option, index === 0), flex: 1, px: 1 }}
        >
          {remindLabel(option, t)}
        </Button>
      ))}
    </Sheet>
  </FormControl>
)

/** The day's record for a block occurrence: its state, and Kept · Skip · Undo. */
const TodaySection = ({ occurrence, log, state, onKeep, onSkip, onUndo, pending, language, t }) => {
  const heading =
    occurrence.date === localDateKey()
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

/** The header's readout, joined from the facts' parts. */
const readoutText = (facts, t, language) =>
  readoutParts(facts)
    .map(({ key, params }) => {
      if (!params?.date) return t(key, params)
      const date = new Intl.DateTimeFormat(language, { weekday: 'short', day: 'numeric', month: 'short' }).format(
        new Date(`${params.date}T00:00:00`)
      )
      return t(key, { ...params, date })
    })
    .join(' · ')

const ItemSheet = ({ open, onClose, onSaved, mode = 'create', source = null, prefill = null, blocks = [] }) => {
  const { t, i18n } = useTranslation()
  const language = i18n?.language ?? 'en'
  const isEdit = mode === 'edit' && Boolean(source)
  const occurrence = source?.occurrence ?? null

  const [facts, setFacts] = useState(() => initialFacts({ isEdit, source, prefill, blocks }))
  const [lengthSet, setLengthSet] = useState(isEdit)
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
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
    setLengthSet(isEdit || Boolean(prefill?.scheduled?.lengthMin))
    setDone(Boolean(source?.task?.is_completed || source?.milestone?.completed))
    setErrors({})
    setSaveError(null)
    setConfirmDelete(false)
    setMoreOpen(next.scheduled?.reminderMin != null || Boolean(next.scheduled?.afterBlockId))
    setLog(occurrence?.log ?? null)
    // `blocks` only serves to find the block an item spans; a refetch must not reset typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, source, prefill])

  const patch = (changes) => setFacts((prev) => ({ ...prev, ...changes }))
  const patchScheduled = (changes) => setFacts((prev) => ({ ...prev, scheduled: { ...prev.scheduled, ...changes } }))

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

  const toggleDay = (day) => {
    const days = facts.scheduled.daysOfWeek
    patchScheduled({ daysOfWeek: days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort() })
    setErrors((prev) => ({ ...prev, date: false }))
  }

  const validate = () => {
    const missing = missingIn({ ...facts, scheduled: facts.scheduled ? { ...facts.scheduled, lengthMin } : null })
    const next = { title: missing.includes('title'), date: missing.includes('date') }
    setErrors(next)
    if (next.title) titleRef.current?.focus()
    return missing.length === 0
  }

  const submit = async () => {
    if (saving || !validate()) return
    setSaving(true)
    setSaveError(null)
    try {
      const toSave = facts.scheduled ? { ...facts, scheduled: { ...facts.scheduled, lengthMin } } : facts
      const areaId = openGoals.find((g) => g.id === facts.goalId)?.areaId ?? null
      await saveItem(toSave, existing, { areaId, done: isEdit && (source?.task || source?.milestone) ? done : null })
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
  const canTick = isEdit && Boolean(source?.task || source?.milestone)
  const afterLabel = (
    otherRecurring.find((b) => b.id === facts.scheduled?.afterBlockId)?.title || t('calendarPage.blocks.form.afterNone')
  ).toLowerCase()

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
            {readoutText(facts, t, language)}
          </Box>
        }
        width='simple'
        banner={saveError ? <FormErrorBanner titleKey='calendarModal.form.saveErrorTitle' detailText={saveError} /> : null}
        footer={footer}
      >
        <Stack spacing={2.5}>
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

          {/* Due and Priority are one row: the two facts that make a task. */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, alignItems: 'start' }}>
            <FormControl>
              <FormLabel sx={formLabel}>{t('items.sheet.due')}</FormLabel>
              <Input
                type='date'
                size='lg'
                value={facts.due ?? ''}
                onChange={(event) => patch({ due: event.target.value || null })}
                slotProps={{ input: { 'aria-label': t('items.sheet.due') } }}
                sx={focusRing}
              />
            </FormControl>
            <FormControl>
              <FormLabel sx={formLabel}>{t('items.sheet.priority')}</FormLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, minHeight: 48 }}>
                <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                  {t('items.sheet.priorityHint')}
                </Typography>
                <Switch
                  checked={facts.priority}
                  onChange={(event) => patch({ priority: event.target.checked })}
                  slotProps={{ input: { 'aria-label': t('items.sheet.priority') } }}
                  sx={focusRing}
                />
              </Box>
            </FormControl>
          </Box>

          {/* Scheduled: off until a time is set; then Starts · Lasts, the days, and the once rule. */}
          <FormControl error={Boolean(errors.date)}>
            <FormLabel sx={formLabel}>{t('items.sheet.scheduled')}</FormLabel>
            {!facts.scheduled ? (
              <Button
                variant='plain'
                color='neutral'
                size='sm'
                onClick={() => patch({ scheduled: defaultScheduled({ date: facts.due }) })}
                sx={{ alignSelf: 'flex-start', px: 0.5, color: 'primary.plainColor', ...focusRing }}
              >
                {t('items.sheet.setTime')}
              </Button>
            ) : (
              <Stack spacing={1.5}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, alignItems: 'start' }}>
                  <FormControl>
                    <FormLabel sx={formLabel}>{t('calendarPage.blocks.form.starts')}</FormLabel>
                    <Input
                      type='time'
                      size='lg'
                      value={facts.scheduled.start}
                      onChange={(event) => patchScheduled({ start: event.target.value || facts.scheduled.start })}
                      slotProps={{ input: { step: TIME_STEP_SECONDS, 'aria-label': t('calendarPage.blocks.form.starts') } }}
                      sx={focusRing}
                    />
                  </FormControl>
                  <LengthStepper
                    value={lengthMin}
                    onChange={(value) => {
                      patchScheduled({ lengthMin: value })
                      setLengthSet(true)
                    }}
                    hint={lengthHint}
                    t={t}
                  />
                </Box>
                <DayToggles days={facts.scheduled.daysOfWeek} onToggle={toggleDay} labels={weekdayLabels} t={t} />
                {!repeats(facts.scheduled) && (
                  <Input
                    type='date'
                    size='lg'
                    value={facts.scheduled.date ?? facts.due ?? ''}
                    onChange={(event) => {
                      patchScheduled({ date: event.target.value || null })
                      setErrors((prev) => ({ ...prev, date: false }))
                    }}
                    slotProps={{ input: { 'aria-label': t('items.sheet.onceDate') } }}
                    sx={focusRing}
                  />
                )}
                <FormHelperText>{errors.date ? t('items.sheet.dateRequired') : t('items.sheet.onceHint')}</FormHelperText>
                <Button
                  variant='plain'
                  color='neutral'
                  size='sm'
                  onClick={() => patch({ scheduled: null })}
                  sx={{ alignSelf: 'flex-start', px: 0.5, ...focusRing }}
                >
                  {t('items.sheet.removeTime')}
                </Button>
              </Stack>
            )}
          </FormControl>

          {/* Part of a goal: a picker on create, a readout once the item exists. */}
          <FormControl>
            <FormLabel sx={formLabel}>{t('items.sheet.goal')}</FormLabel>
            {goalLocked ? (
              <Typography level='body-md' sx={{ color: 'text.secondary', minHeight: 48, display: 'flex', alignItems: 'center' }}>
                {goalLabel ?? t('items.sheet.goalNone')}
              </Typography>
            ) : goalsLoading ? (
              <Skeleton variant='rectangular' height={48} sx={{ borderRadius: 'sm' }} />
            ) : (
              <Select
                size='lg'
                value={facts.goalId || null}
                onChange={(_, v) => patch({ goalId: v || null })}
                placeholder={t('items.sheet.goalNone')}
                slotProps={{ button: { 'aria-label': t('items.sheet.goal') } }}
                sx={focusRing}
              >
                <Option value=''>{t('items.sheet.goalNone')}</Option>
                {openGoals.map((option) => (
                  <Option key={option.id} value={option.id}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            )}
          </FormControl>

          {facts.scheduled && (
            <Box>
              <Button
                variant='plain'
                color='neutral'
                size='sm'
                aria-expanded={moreOpen}
                aria-controls='item-sheet-more'
                onClick={() => setMoreOpen((prev) => !prev)}
                startDecorator={
                  <ExpandMoreRounded
                    aria-hidden='true'
                    sx={{
                      fontSize: 'xl',
                      transform: moreOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform var(--nowry-motion-quick) var(--nowry-motion-standard)'
                    }}
                  />
                }
                sx={{ px: 0.5, ...focusRing }}
              >
                {t('calendarPage.blocks.form.moreOptions')}
                <Typography component='span' level='body-sm' sx={{ color: 'text.tertiary', ml: 1, fontWeight: 'md' }}>
                  {t('calendarPage.blocks.form.moreSummary', {
                    remind: remindLabel(facts.scheduled.reminderMin ?? null, t),
                    after: afterLabel
                  })}
                </Typography>
              </Button>
            </Box>
          )}

          {facts.scheduled && moreOpen && (
            <Stack id='item-sheet-more' spacing={2.5}>
              <RemindObject value={facts.scheduled.reminderMin ?? null} onChange={(reminderMin) => patchScheduled({ reminderMin })} t={t} />
              {otherRecurring.length > 0 && (
                <FormControl>
                  <FormLabel sx={formLabel}>{t('calendarPage.blocks.form.after')}</FormLabel>
                  <Select
                    size='lg'
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
          )}

          {canTick && (
            <Checkbox size='lg' checked={done} onChange={(e) => setDone(e.target.checked)} label={t('items.sheet.done')} sx={focusRing} />
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
                {t('items.sheet.delete')}
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

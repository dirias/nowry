/**
 * Add or change one block, on the phone (PLAN-003, PRD D4, D11, D12).
 *
 * The form is the block's own anatomy in order: what it is called, what it is
 * for, when it starts, how long it lasts, which days, whether it reminds, and
 * what it follows. A goal block asks which goal, the way the event form asks a
 * milestone which goal it is a step of; nothing else is asked of a kind that
 * has no use for it.
 *
 * **The forecast sizes, the learner places** (D4). A study block's length is
 * the forecast's proposal for the day — "27 cards due ≈ 20 min" — until the
 * learner touches the stepper; after that it is theirs, and on edit it is
 * whatever was saved.
 *
 * **Starts is two selects, not a text field.** The kit has no time picker and
 * a native one is a new build; a `HH:MM` text field needs the keyboard, a
 * validator and an error line for a value that only has 288 possible shapes.
 * The hour and the five-minute step are two lists the kit already draws.
 *
 * **Nothing is disabled to express an error** (BUTTONS.md §4). An empty title
 * fails under the field on press; a rule with no day fails under the days; a
 * refused request fails at the top of the sheet with everything still typed.
 *
 * Delete confirms in place rather than in a second sheet: a modal over a modal
 * is the layering the kit's own `Select` had to give up on Android.
 */
import { useEffect, useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useAnnualPlan } from '@nowry/core/hooks/useAnnualPlan'
import { isGoalCompleted } from '@nowry/core/domain/goalDerivation'
import { BLOCK_STEP, MIN_BLOCK_MINUTES, PERIOD_STARTS, REMINDER_OPTIONS, formatTime, minutesOf } from '@nowry/core/domain/blocks'
import { useTheme } from '../theme'
import {
  BottomSheet,
  Button,
  DateField,
  FormField,
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

/** The four a learner makes by hand; task and free blocks come from elsewhere (D2, D7). */
const SOURCES = ['routine', 'study', 'focus', 'goal']
const MAX_BLOCK_MINUTES = 480
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]
/** 2024-01-01 is a Monday; the API's weekday 0 (ADR-045 §3). */
const A_MONDAY = new Date(2024, 0, 1)
const HOURS = Array.from({ length: 24 }, (_, h) => h)
const MINUTES = Array.from({ length: 60 / BLOCK_STEP }, (_, i) => i * BLOCK_STEP)

const pad = (n) => String(n).padStart(2, '0')
const clampLength = (minutes) => Math.min(MAX_BLOCK_MINUTES, Math.max(MIN_BLOCK_MINUTES, minutes))

export function BlockSheet({
  open,
  mode = 'create',
  block = null,
  date,
  blocks = [],
  due = 0,
  suggestedMinutes = MIN_BLOCK_MINUTES,
  onClose,
  create,
  update,
  remove
}) {
  const { t, i18n } = useTranslation()
  const language = i18n?.language ?? 'en'
  const theme = useTheme()
  const isEdit = mode === 'edit' && Boolean(block)

  const [title, setTitle] = useState('')
  const [source, setSource] = useState('routine')
  const [goalId, setGoalId] = useState('')
  const [start, setStart] = useState(PERIOD_STARTS.morning)
  const [length, setLength] = useState(MIN_BLOCK_MINUTES)
  const [lengthTouched, setLengthTouched] = useState(false)
  const [days, setDays] = useState(EVERY_DAY)
  const [once, setOnce] = useState(false)
  const [onceDate, setOnceDate] = useState('')
  const [reminder, setReminder] = useState(null)
  const [afterId, setAfterId] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const { goals, loading: planLoading } = useAnnualPlan()

  // Opening resets the form; a reset on close would show the wipe mid-slide.
  useEffect(() => {
    if (!open) return
    setErrors({})
    setSaveError(false)
    setSaving(false)
    setConfirmingDelete(false)
    setTitle(isEdit ? (block.title ?? '') : '')
    setSource(isEdit && SOURCES.includes(block.source?.type) ? block.source.type : 'routine')
    setGoalId(isEdit && block.source?.type === 'goal' ? (block.source.id ?? '') : '')
    setStart(isEdit ? block.start : PERIOD_STARTS.morning)
    setLength(isEdit ? block.lengthMin : MIN_BLOCK_MINUTES)
    setLengthTouched(isEdit)
    setOnce(isEdit ? Boolean(block.date) : false)
    setOnceDate(isEdit && block.date ? block.date : (date ?? ''))
    setDays(isEdit && !block.date ? (block.daysOfWeek ?? []) : EVERY_DAY)
    setReminder(isEdit ? (block.reminderMin ?? null) : null)
    setAfterId(isEdit ? (block.afterBlockId ?? '') : '')
  }, [open, isEdit, block, date])

  /*
   * The forecast's proposal holds until the learner sets a length (D4). It is
   * derived, not synced: an effect that wrote it on open ran once with the
   * previous visit's state still in place and overwrote an edited block's
   * own length with the forecast's.
   */
  const shownLength = !lengthTouched && source === 'study' ? clampLength(suggestedMinutes) : length

  const openGoals = useMemo(() => (goals || []).filter((g) => !isGoalCompleted(g)).map((g) => ({ value: g._id, label: g.title })), [goals])
  const others = useMemo(
    () => [
      { value: '', label: t('blocks.sheet.afterNone') },
      ...blocks.filter((b) => !b.date && b.id !== block?.id).map((b) => ({ value: b.id, label: `${b.start} · ${b.title}` }))
    ],
    [blocks, block, t]
  )
  const weekdays = useMemo(() => {
    const narrow = new Intl.DateTimeFormat(language, { weekday: 'narrow' })
    const long = new Intl.DateTimeFormat(language, { weekday: 'long' })
    return EVERY_DAY.map((i) => {
      const day = new Date(A_MONDAY.getFullYear(), A_MONDAY.getMonth(), A_MONDAY.getDate() + i)
      return { index: i, initial: narrow.format(day), name: long.format(day) }
    })
  }, [language])

  const hour = Math.floor(minutesOf(start) / 60)
  const minute = minutesOf(start) % 60
  const setClock = (h, m) => setStart(formatTime(h * 60 + m))
  const stepLength = (delta) => {
    setLengthTouched(true)
    setLength(clampLength(shownLength + delta))
  }
  const toggleDay = (index) =>
    setDays((current) => (current.includes(index) ? current.filter((d) => d !== index) : [...current, index].sort()))

  const showsHint = source === 'study' && due > 0

  const submit = async () => {
    if (saving) return
    const next = {}
    if (!title.trim()) next.title = true
    if (source === 'goal' && !goalId) next.goal = true
    if (once && !onceDate) next.date = true
    if (!once && days.length === 0) next.days = true
    setErrors(next)
    if (Object.keys(next).length > 0) return

    const goal = source === 'goal' ? (goals || []).find((g) => g._id === goalId) : null
    const payload = {
      title: title.trim(),
      source: { type: source, id: source === 'goal' ? goalId : null },
      start,
      lengthMin: shownLength,
      daysOfWeek: once ? [] : days,
      date: once ? onceDate : null,
      reminderMin: reminder,
      afterBlockId: afterId || null,
      areaId: goal?.focus_area_id ?? (isEdit && source !== 'goal' ? block.areaId : null)
    }

    setSaving(true)
    setSaveError(false)
    try {
      if (isEdit) await update({ id: block.id, changes: payload })
      else await create(payload)
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
      await remove(block.id)
      onClose?.()
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      visible={open}
      onClose={saving ? () => {} : onClose}
      title={t(isEdit ? 'blocks.sheet.editTitle' : 'blocks.sheet.addTitle')}
    >
      <Stack spacing={2}>
        {saveError ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t('blocks.sheet.saveError')}
          </Typography>
        ) : null}

        <FormField labelKey='blocks.sheet.title' required errorKey={errors.title ? 'blocks.sheet.titleRequired' : null}>
          {({ invalid }) => (
            <Input
              value={title}
              onChangeText={(value) => {
                setTitle(value)
                if (errors.title && value.trim()) setErrors((prev) => ({ ...prev, title: false }))
              }}
              invalid={invalid}
              accessibilityLabel={t('blocks.sheet.title')}
              placeholder={t('blocks.sheet.titlePlaceholder')}
              autoCapitalize='sentences'
              returnKeyType='done'
            />
          )}
        </FormField>

        <FormField labelKey='blocks.sheet.for'>
          <Segmented
            accessibilityLabel={t('blocks.sheet.for')}
            value={source}
            onChange={(next) => {
              setSource(next)
              setErrors((prev) => ({ ...prev, goal: false }))
            }}
            options={SOURCES.map((key) => ({ value: key, label: t(`blocks.source.${key}`) }))}
          />
        </FormField>

        {source === 'goal' ? (
          <FormField labelKey='calendarModal.form.goal' required errorKey={errors.goal ? 'form.requiredField' : null}>
            {({ invalid }) =>
              planLoading ? (
                <Skeleton width='100%' height={44} />
              ) : openGoals.length === 0 ? (
                <Typography level='body-sm' color='text.secondary'>
                  {t('calendarModal.form.noActiveGoals')}
                </Typography>
              ) : (
                <Select
                  value={goalId}
                  options={openGoals}
                  onChange={(value) => {
                    setGoalId(value)
                    setErrors((prev) => ({ ...prev, goal: false }))
                  }}
                  placeholderKey='calendarModal.form.goalPlaceholder'
                  invalid={invalid}
                  accessibilityLabel={t('calendarModal.form.goal')}
                />
              )
            }
          </FormField>
        ) : null}

        <FormField labelKey='blocks.sheet.starts'>
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
          </Stack>
        </FormField>

        <FormField labelKey='blocks.sheet.lasts'>
          {() => (
            <Stack spacing={0.5}>
              <Stack direction='row' spacing={1} style={{ alignItems: 'center' }}>
                <IconButton variant='secondary' accessibilityLabel={t('blocks.sheet.shorter')} onPress={() => stepLength(-BLOCK_STEP)}>
                  <Icon name='Minus' size='sm' color='text.secondary' />
                </IconButton>
                <Typography level='title-md' style={{ minWidth: 72, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
                  {t('study.dates.minutes', { count: shownLength })}
                </Typography>
                <IconButton variant='secondary' accessibilityLabel={t('blocks.sheet.longer')} onPress={() => stepLength(BLOCK_STEP)}>
                  <Icon name='Plus' size='sm' color='text.secondary' />
                </IconButton>
              </Stack>
              {/* `FormField`'s helper slot takes a bare key; this line carries
                  two numbers, so it is drawn here and the slot stays empty. */}
              {showsHint ? (
                <Typography level='body-xs' color='text.tertiary'>
                  {t('blocks.sheet.lengthHint', { count: due, minutes: suggestedMinutes })}
                </Typography>
              ) : null}
            </Stack>
          )}
        </FormField>

        <FormField
          labelKey='blocks.sheet.repeats'
          errorKey={errors.days ? 'blocks.sheet.daysRequired' : errors.date ? 'blocks.sheet.dateRequired' : null}
        >
          <Stack spacing={1.5}>
            {once ? null : (
              <View accessibilityLabel={t('blocks.sheet.repeats')} style={{ flexDirection: 'row', gap: theme.spacing[1] }}>
                {weekdays.map((day) => {
                  const on = days.includes(day.index)
                  return (
                    <Pressable
                      key={day.index}
                      onPress={() => {
                        toggleDay(day.index)
                        setErrors((prev) => ({ ...prev, days: false }))
                      }}
                      accessibilityRole='togglebutton'
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={day.name}
                      style={({ pressed }) => ({
                        flex: 1,
                        minHeight: 40,
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
            )}
            <Stack direction='row' spacing={1} style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography level='body-md' color='text.secondary'>
                {t('blocks.sheet.once')}
              </Typography>
              <Switch value={once} onValueChange={setOnce} accessibilityLabel={t('blocks.sheet.once')} />
            </Stack>
            {once ? (
              <DateField
                value={onceDate}
                onChange={(value) => {
                  setOnceDate(value)
                  setErrors((prev) => ({ ...prev, date: false }))
                }}
                accessibilityLabel={t('blocks.sheet.once')}
                placeholderKey='calendarModal.form.date'
                clearable={false}
              />
            ) : null}
          </Stack>
        </FormField>

        <FormField labelKey='blocks.sheet.remind'>
          <Segmented
            accessibilityLabel={t('blocks.sheet.remind')}
            value={String(reminder)}
            onChange={(value) => setReminder(value === 'null' ? null : Number(value))}
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

        {others.length > 1 ? (
          <FormField labelKey='blocks.sheet.after' helperKey='blocks.sheet.afterHelper'>
            <Select value={afterId} options={others} onChange={setAfterId} accessibilityLabel={t('blocks.sheet.after')} />
          </FormField>
        ) : null}

        {confirmingDelete ? (
          <Stack spacing={1}>
            <Typography level='body-sm' color='text.secondary'>
              {t('blocks.confirmDelete.body', { title: block?.title ?? '' })}
            </Typography>
            <Stack direction='row' spacing={1}>
              <Button variant='secondary' style={{ flex: 1 }} onPress={() => setConfirmingDelete(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant='danger' style={{ flex: 1 }} loading={saving} onPress={destroy}>
                {t('blocks.confirmDelete.confirm')}
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={1}>
            <Stack direction='row' spacing={1}>
              {/* Cancel stays live while saving, so a stuck request is escapable. */}
              <Button variant='secondary' style={{ flex: 1 }} onPress={onClose}>
                {t('common.cancel')}
              </Button>
              <Button style={{ flex: 1 }} loading={saving} onPress={submit}>
                {t(isEdit ? 'blocks.sheet.save' : 'blocks.add')}
              </Button>
            </Stack>
            {isEdit ? (
              <Button variant='danger' onPress={() => setConfirmingDelete(true)}>
                {t('blocks.confirmDelete.confirm')}
              </Button>
            ) : null}
          </Stack>
        )}
      </Stack>
    </BottomSheet>
  )
}

export default BlockSheet

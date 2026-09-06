import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, FormControl, FormHelperText, FormLabel, Option, Select, Sheet, Skeleton, Stack, Typography } from '@mui/joy'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import AdjustOutlinedIcon from '@mui/icons-material/AdjustOutlined'
import DiamondOutlinedIcon from '@mui/icons-material/DiamondOutlined'
import RepeatRoundedIcon from '@mui/icons-material/RepeatRounded'

import { tasksService } from '../../api/services/tasks.service'
import { annualPlanningService } from '../../api/services/annualPlanning.service'
import { useAnnualPlan } from '../../hooks/useAnnualPlan'
import { calculateProgress } from '../AnnualPlanning/goalDerivation'
import FormDisclosureRail from '../Common/Form/FormDisclosureRail'
import FormErrorBanner from '../Common/Form/FormErrorBanner'
import FormSheet from '../Common/Form/FormSheet'
import FormTextArea from '../Common/Form/FormTextArea'
import FormTextField from '../Common/Form/FormTextField'
import { focusRing, formLabel, segment, segmentedGroup } from '../Common/Form/formStyles'
import { stripTypePrefix } from './eventId'

/**
 * The four things a calendar day can be given (ADR-017). Habit is not one of
 * them: a habit is a schedule, and this form could only ever write a date —
 * the shape `calendar.service.js` files under "legacy". Planning cut the same
 * loop from the goal form in FE-A4. Milestone is: a dated step of a goal is
 * exactly what a calendar day is for, and the calendar already draws them.
 */
const TYPES = ['task', 'priority', 'goal', 'milestone']

const TYPE_ICONS = {
  task: CheckCircleOutlinedIcon,
  priority: FlagOutlinedIcon,
  goal: AdjustOutlinedIcon,
  milestone: DiamondOutlinedIcon,
  activity: RepeatRoundedIcon
}

/** Optional groups per type, offered as rail chips that remove themselves on use. */
const OPTIONAL_GROUPS = { priority: ['description'] }
const RAIL_LABELS = { description: 'calendarModal.form.addDescription' }

/**
 * A finished goal, by the definition the rest of the app already uses (see
 * AnnualPlanningLayout and CloseQuarterModal): an explicit `completed` status,
 * or progress at 100%. `calculateProgress` is the shared pure helper in
 * goalDerivation, so this stays in step with every other goal surface rather
 * than inventing a third rule. FocusAreaView locks a completed goal's
 * milestones; offering completed goals here would walk around that guard.
 */
const isGoalCompleted = (goal) => goal?.status === 'completed' || (goal ? calculateProgress(goal) : 0) === 100

/** YYYY-MM-DD for <input type="date">, always in local time. */
const toInputDate = (d) => {
  if (!d) return ''
  const src =
    d instanceof Date
      ? d
      : (() => {
          const s = String(d)
          const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
          return m ? new Date(`${m[1]}T00:00:00`) : new Date(s)
        })()
  const y = src.getFullYear()
  const mo = String(src.getMonth() + 1).padStart(2, '0')
  const day = String(src.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

/** The task list's label for a category id, from the same key SideMenu writes. */
const taskListLabel = (category) => {
  if (!category || category === 'general') return null
  try {
    const lists = JSON.parse(localStorage.getItem('nowry_task_lists') || '[]')
    return lists.find((l) => l.id === category)?.label ?? category
  } catch {
    return category
  }
}

/**
 * "What is it?" — one segmented object, four segments of one class (§15.2).
 * The engaged segment is a ground, never a hue: on a surface that also shows
 * done and undone, a fill colour on a selection reads as a state (§15.5). The
 * calendar's own glyph sits beside each label from `sm` up; at `xs` the four
 * labels alone fit between the rules.
 */
const EventTypeObject = ({ value, onChange, t }) => (
  <FormControl>
    <FormLabel sx={formLabel}>{t('calendarModal.form.selectType')}</FormLabel>
    <Sheet variant='outlined' role='group' aria-label={t('calendarModal.form.selectType')} sx={{ ...segmentedGroup, width: '100%' }}>
      {TYPES.map((typeKey, index) => {
        const Icon = TYPE_ICONS[typeKey]
        return (
          <Button
            key={typeKey}
            variant='plain'
            color='neutral'
            onClick={() => onChange(typeKey)}
            aria-pressed={value === typeKey}
            startDecorator={<Icon sx={{ fontSize: 'md', display: { xs: 'none', sm: 'block' } }} />}
            sx={{ ...segment(value === typeKey, index === 0), flex: 1, px: 1 }}
          >
            {t(`calendarModal.form.types.${typeKey}`)}
          </Button>
        )
      })}
    </Sheet>
  </FormControl>
)

/**
 * The picker a type needs before it can be filed: a focus area for a goal, an
 * open goal for a milestone. Never disabled and never a page gate — while the
 * plan loads, only this control shows a skeleton and the title can be typed.
 */
const ContextPicker = ({ labelKey, placeholderKey, helperKey, emptyKey, loading, options, value, onChange, error, t }) => (
  <FormControl required error={error}>
    <FormLabel sx={formLabel}>{t(labelKey)}</FormLabel>
    {loading ? (
      <Skeleton variant='rectangular' height={48} sx={{ borderRadius: 'sm' }} />
    ) : options.length === 0 ? (
      <Typography level='body-sm' sx={{ color: 'text.secondary', px: 2, py: 1.5, borderRadius: 'md', bgcolor: 'background.level1' }}>
        {t(emptyKey)}
      </Typography>
    ) : (
      <Select size='lg' value={value} onChange={(_, v) => onChange(v ?? '')} placeholder={t(placeholderKey)} sx={focusRing}>
        {options.map((option) => (
          <Option key={option.id} value={option.id}>
            {option.label}
          </Option>
        ))}
      </Select>
    )}
    {error ? (
      <FormHelperText>{t('form.requiredField')}</FormHelperText>
    ) : (
      helperKey && options.length > 0 && !loading && <FormHelperText>{t(helperKey)}</FormHelperText>
    )}
  </FormControl>
)

/**
 * EventFormModal — create or edit any calendar event, on the shared sheet.
 *
 * Title-first, as the goal form is since FE-A4: the type object, then the
 * title, then only what that type needs, then the date (prefilled from the day
 * clicked). Optional groups are rail chips. The primary action is named after
 * what it makes and is never disabled — an empty title fails loudly under the
 * field, a missing picker under itself, a rejected request in the banner.
 *
 * Props:
 *   open, onClose, onSuccess – as before
 *   mode  – 'create' | 'edit'
 *   event – the normalised calendar event (edit), null for create
 *   defaultDate – Date to prefill when creating
 */
const EventFormModal = ({ open, onClose, onSuccess, mode = 'create', event = null, defaultDate }) => {
  const { t } = useTranslation()
  const isEdit = mode === 'edit'

  const [type, setType] = useState('task')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [focusAreaId, setFocusAreaId] = useState('')
  const [goalId, setGoalId] = useState('')
  const [revealed, setRevealed] = useState([])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const titleRef = useRef(null)

  const { plan: cachedPlan, areas: cachedAreas, goals: cachedGoals, loading: contextLoading } = useAnnualPlan()

  useEffect(() => {
    if (!open) return
    setErrors({})
    setSaveError(null)
    setRevealed([])
    setFocusAreaId('')
    setGoalId('')
    setDescription(isEdit ? event?.description || '' : '')
    if (isEdit && event) {
      setType(event.type || 'task')
      setTitle(event.title || '')
      setDate(toInputDate(event.date))
    } else {
      setType('task')
      setTitle('')
      setDate(toInputDate(defaultDate || new Date()))
    }
  }, [open, isEdit, event, defaultDate])

  const activeType = isEdit ? event?.type || 'task' : type
  const annualPlanId = cachedPlan?._id
  const focusAreas = useMemo(() => (cachedAreas || []).map((a) => ({ id: a._id, label: a.name })), [cachedAreas])
  // Only goals that can still take a new milestone reach the picker.
  const openGoals = useMemo(
    () => (cachedGoals || []).filter((g) => !isGoalCompleted(g)).map((g) => ({ id: g._id, label: g.title })),
    [cachedGoals]
  )

  const needsFocusArea = !isEdit && type === 'goal'
  const needsGoal = !isEdit && type === 'milestone'
  const railOffers = isEdit ? [] : (OPTIONAL_GROUPS[type] || []).filter((group) => !revealed.includes(group))

  const changeType = (next) => {
    setType(next)
    setRevealed([])
    setErrors({})
  }

  const reveal = (group) => setRevealed((prev) => [...prev, group])

  // ── Validation: loud, never a disabled button ─────────────────────────────
  const validate = () => {
    const next = {}
    if (!title.trim()) next.title = true
    if (needsFocusArea && !focusAreaId) next.focusArea = true
    if (needsGoal && !goalId) next.goal = true
    setErrors(next)
    if (next.title) titleRef.current?.focus()
    return Object.keys(next).length === 0
  }

  const create = async () => {
    const trimmed = title.trim()
    switch (type) {
      case 'task':
        return tasksService.create({ title: trimmed, deadline: date || null })
      case 'priority':
        return annualPlanningService.createPriority({
          title: trimmed,
          description: description.trim() || '',
          deadline: date || null,
          annual_plan_id: annualPlanId,
          focus_area_id: null,
          linked_entity_id: null,
          linked_entity_type: null
        })
      case 'goal': {
        // Quarter and year come from the target date so the goal lands in the
        // quarter view it belongs to. T00:00:00 forces local-time parsing.
        const targetDate = date ? new Date(`${date}T00:00:00`) : new Date()
        return annualPlanningService.createGoal({
          title: trimmed,
          target_date: date || null,
          focus_area_id: focusAreaId,
          quarter: Math.ceil((targetDate.getMonth() + 1) / 3),
          year: targetDate.getFullYear()
        })
      }
      case 'milestone':
        return annualPlanningService.createMilestone(goalId, { title: trimmed, due_date: date || null })
      default:
        return null
    }
  }

  const update = async () => {
    const rawId = event?.id ? stripTypePrefix(event.id) : null
    if (!rawId) throw new Error('Missing event ID')
    const trimmed = title.trim()
    switch (activeType) {
      case 'task':
        return tasksService.update(rawId, { title: trimmed, deadline: date || null })
      case 'priority':
        return annualPlanningService.updatePriority(rawId, {
          title: trimmed,
          description: description.trim() || '',
          deadline: date || null
        })
      case 'goal':
        return annualPlanningService.updateGoal(rawId, { title: trimmed, target_date: date || null })
      case 'activity':
        return annualPlanningService.updateActivity(rawId, { title: trimmed, due_date: date || null })
      case 'milestone':
        // Addressed by the goal and the milestone's own id, not by the
        // index-based event id (CAL-004).
        if (!event?.goalId || !event?.milestoneId) throw new Error('Missing milestone address')
        return annualPlanningService.updateMilestone(event.goalId, event.milestoneId, { title: trimmed, due_date: date || null })
      default:
        return null
    }
  }

  const submit = async () => {
    if (saving || !validate()) return
    setSaving(true)
    setSaveError(null)
    try {
      await (isEdit ? update() : create())
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('[EventFormModal] Save failed:', err)
      setSaveError(t('calendarModal.form.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const onTitleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) submit()
  }

  // ── Edit subtitle: the fixed type and its context ─────────────────────────
  const SubtitleIcon = TYPE_ICONS[activeType] ?? AdjustOutlinedIcon
  const subtitle = isEdit ? (
    <Box component='span' sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
      <SubtitleIcon sx={{ fontSize: 'sm' }} />
      {[t(`calendarModal.form.types.${activeType}`), activeType === 'task' ? taskListLabel(event?.category) : null]
        .filter(Boolean)
        .join(' · ')}
    </Box>
  ) : null

  const actionSx = { width: { xs: '100%', sm: 'auto' }, ...focusRing }
  const footer = (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', gap: 2 }}>
      {/* Cancel stays enabled while saving so a stuck request is escapable. */}
      <Button variant='plain' onClick={onClose} size='lg' sx={actionSx}>
        {t('calendarModal.form.cancel')}
      </Button>
      <Button onClick={submit} loading={saving} size='lg' sx={actionSx}>
        {isEdit ? t('calendarModal.form.saveChanges') : t(`calendarModal.form.addAction.${type}`)}
      </Button>
    </Box>
  )

  return (
    <FormSheet
      open={open}
      onClose={saving ? () => {} : onClose}
      titleKey={isEdit ? 'calendarModal.editEvent' : 'calendarModal.form.addTitle'}
      subtitleText={subtitle}
      width='simple'
      banner={saveError ? <FormErrorBanner titleKey='calendarModal.form.saveErrorTitle' detailText={saveError} /> : null}
      footer={footer}
    >
      <Stack spacing={2.5}>
        {!isEdit && <EventTypeObject value={type} onChange={changeType} t={t} />}

        <FormTextField
          labelKey='calendarModal.form.title'
          placeholderKey={isEdit ? null : `calendarModal.form.placeholder.${type}`}
          errorKey={errors.title ? 'calendarModal.form.titleRequired' : null}
          value={title}
          onChange={(value) => {
            setTitle(value)
            if (errors.title && value.trim()) setErrors((prev) => ({ ...prev, title: false }))
          }}
          onKeyDown={onTitleKeyDown}
          required
          autoFocus
          inputRef={titleRef}
        />

        {needsFocusArea && (
          <ContextPicker
            labelKey='calendarModal.form.focusArea'
            placeholderKey='calendarModal.form.focusAreaPlaceholder'
            emptyKey='calendarModal.form.noAreas'
            loading={contextLoading}
            options={focusAreas}
            value={focusAreaId}
            onChange={(v) => {
              setFocusAreaId(v)
              setErrors((prev) => ({ ...prev, focusArea: false }))
            }}
            error={Boolean(errors.focusArea)}
            t={t}
          />
        )}

        {needsGoal && (
          <ContextPicker
            labelKey='calendarModal.form.goal'
            placeholderKey='calendarModal.form.goalPlaceholder'
            helperKey='calendarModal.form.goalHelper'
            emptyKey='calendarModal.form.noActiveGoals'
            loading={contextLoading}
            options={openGoals}
            value={goalId}
            onChange={(v) => {
              setGoalId(v)
              setErrors((prev) => ({ ...prev, goal: false }))
            }}
            error={Boolean(errors.goal)}
            t={t}
          />
        )}

        {!isEdit && type === 'priority' && !annualPlanId && !contextLoading && (
          <Typography level='body-sm' sx={{ color: 'text.secondary', px: 2, py: 1.5, borderRadius: 'md', bgcolor: 'background.level1' }}>
            {t('calendarModal.form.noPlan')}
          </Typography>
        )}

        <FormTextField labelKey='calendarModal.form.date' type='date' value={date} onChange={setDate} />

        {(revealed.includes('description') || (isEdit && activeType === 'priority')) && (
          <FormTextArea
            labelKey='calendarModal.form.description'
            placeholderKey='calendarModal.form.descriptionPlaceholder'
            value={description}
            onChange={setDescription}
            minRows={2}
            autoFocus={!isEdit}
          />
        )}

        <FormDisclosureRail available={railOffers} labels={RAIL_LABELS} onReveal={reveal} />
      </Stack>
    </FormSheet>
  )
}

export default EventFormModal

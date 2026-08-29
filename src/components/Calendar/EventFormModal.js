import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Box,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  Select,
  Option,
  CircularProgress,
  Typography,
  Divider,
  Chip
} from '@mui/joy'
import { tasksService } from '../../api/services/tasks.service'
import { annualPlanningService } from '../../api/services/annualPlanning.service'
import { useAnnualPlan } from '../../hooks/useAnnualPlan'
import { focusRing, touchTarget } from '../Common/Form/formStyles'

// Type color map (must match CalendarModal TYPE_META)
const TYPE_COLORS = {
  task: 'var(--joy-palette-primary-solidBg)',
  priority: 'var(--joy-palette-warning-solidBg)',
  goal: 'var(--joy-palette-success-solidBg)',
  activity: 'var(--joy-palette-primary-softColor)'
}

const TYPES = ['task', 'priority', 'goal', 'activity']

/**
 * These chips are a selection control, so they answer to the same geometry as
 * every other one in the app: `size='sm'` alone left them ~24px tall, visibly
 * shorter than the buttons around them and short of the ≥44px DESIGN_GUIDELINES
 * §3.2 requires at `xs` (WCAG 2.5.5). Matches `filterControl` in CalendarPage.
 */
const typeChip = { ...focusRing, ...touchTarget, cursor: 'pointer', transition: 'all 0.15s' }

/**
 * Formats a Date (or existing date string) to a YYYY-MM-DD value
 * suitable for <input type="date">, always using local time.
 */
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

/**
 * EventFormModal
 * Create or edit any calendar event type while respecting each asset's nature.
 *
 * Props:
 *   open        – boolean
 *   onClose     – () => void
 *   onSuccess   – () => void  (triggers event reload in CalendarModal)
 *   mode        – 'create' | 'edit'
 *   event       – existing normalized event (edit mode), null for create
 *   defaultDate – Date to pre-fill when creating
 */
const EventFormModal = ({ open, onClose, onSuccess, mode = 'create', event = null, defaultDate }) => {
  const { t } = useTranslation()
  const isEdit = mode === 'edit'

  // ── Form state ────────────────────────────────────────────────────────────
  const [type, setType] = useState('task')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [focusAreaId, setFocusAreaId] = useState('')
  const [goalId, setGoalId] = useState('')

  // Context for plan-based types
  const { plan: cachedPlan, areas: cachedAreas, goals: cachedGoals, loading: hookLoading } = useAnnualPlan()

  // Save state
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // ── Populate / reset on open ──────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setError(null)
    if (isEdit && event) {
      setType(event.type || 'task')
      setTitle(event.title || '')
      setDescription(event.description || '')
      setDate(toInputDate(event.date))
      setFocusAreaId('')
      setGoalId('')
    } else {
      setType('task')
      setTitle('')
      setDescription('')
      setDate(toInputDate(defaultDate || new Date()))
      setFocusAreaId('')
      setGoalId('')
    }
  }, [open, isEdit, event, defaultDate])

  // ── Fetch annual plan context only when needed ────────────────────────────
  // Only goal and activity creation need focus-area/goal selectors.
  const needsContext = !isEdit && (type === 'priority' || type === 'goal' || type === 'activity')
  const annualPlanId = cachedPlan?._id
  const focusAreas = cachedAreas || []
  const allGoals = cachedGoals || []
  const contextLoading = hookLoading

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeType = isEdit ? event?.type || 'task' : type
  const needsFocusArea = !isEdit && type === 'goal'
  const needsGoal = !isEdit && type === 'activity'
  const needsDescription = activeType === 'priority'

  // Determine if save should be blocked
  const canSave = title.trim() && !(needsFocusArea && !focusAreaId) && !(needsGoal && !goalId) && !(type === 'priority' && !annualPlanId)

  // ── Save handlers ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        await handleEdit()
      } else {
        await handleCreate()
      }
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('[EventFormModal] Save failed:', err)
      setError(t('calendarModal.form.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    switch (type) {
      case 'task':
        await tasksService.create({ title: title.trim(), deadline: date || null })
        break
      case 'priority':
        await annualPlanningService.createPriority({
          title: title.trim(),
          description: description.trim() || '',
          deadline: date || null,
          annual_plan_id: annualPlanId,
          focus_area_id: null,
          linked_entity_id: null,
          linked_entity_type: null
        })
        break
      case 'goal': {
        // Derive quarter (1–4) and year from the target date so the goal appears
        // in the correct quarter view in AnnualPlanningHome.
        // Use T00:00:00 suffix to force local-time parsing (avoids UTC midnight rollback).
        const targetDate = date ? new Date(`${date}T00:00:00`) : new Date()
        const goalQuarter = Math.ceil((targetDate.getMonth() + 1) / 3)
        const goalYear = targetDate.getFullYear()
        await annualPlanningService.createGoal({
          title: title.trim(),
          target_date: date || null,
          focus_area_id: focusAreaId,
          quarter: goalQuarter,
          year: goalYear
        })
        break
      }
      case 'activity':
        await annualPlanningService.createActivity(goalId, {
          title: title.trim(),
          due_date: date || null
        })
        break
      default:
        break
    }
  }

  const handleEdit = async () => {
    // Strip type prefix from normalized ID (e.g. "task-abc123" → "abc123")
    const rawId = event?.id ? event.id.replace(/^[a-z]+-/, '') : null
    if (!rawId) throw new Error('Missing event ID')

    switch (event?.type) {
      case 'task':
        await tasksService.update(rawId, { title: title.trim(), deadline: date || null })
        break
      case 'priority':
        await annualPlanningService.updatePriority(rawId, {
          title: title.trim(),
          description: description.trim() || '',
          deadline: date || null
        })
        break
      case 'goal':
        await annualPlanningService.updateGoal(rawId, {
          title: title.trim(),
          target_date: date || null
        })
        break
      case 'activity':
        await annualPlanningService.updateActivity(rawId, {
          title: title.trim(),
          due_date: date || null
        })
        break
      default:
        break
    }
  }

  return (
    <Modal open={open} onClose={!saving ? onClose : undefined}>
      <ModalDialog
        sx={{
          width: { xs: '100vw', sm: 440 },
          height: { xs: '100dvh', sm: 'auto' },
          maxHeight: { xs: '100dvh', sm: '90vh' },
          maxWidth: '100vw',
          borderRadius: { xs: 0, sm: 'md' },
          top: { xs: 0, sm: '50%' },
          left: { xs: 0, sm: '50%' },
          transform: { xs: 'none', sm: 'translate(-50%, -50%)' }
        }}
      >
        {/* Title */}
        <DialogTitle>
          <Stack direction='row' alignItems='center' spacing={1}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: 'primary.solidBg',
                flexShrink: 0
              }}
            />
            <Typography level='title-md' fontWeight={600}>
              {isEdit ? t('calendarModal.editEvent') : t('calendarModal.addEvent')}
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {/* ── Type selector (create only) ───────────────────────── */}
            {!isEdit && (
              <FormControl>
                <FormLabel>{t('calendarModal.form.selectType')}</FormLabel>
                <Stack direction='row' spacing={0.75} flexWrap='wrap' useFlexGap>
                  {TYPES.map((typeKey) => (
                    <Chip
                      key={typeKey}
                      size='sm'
                      variant={type === typeKey ? 'solid' : 'outlined'}
                      onClick={() => setType(typeKey)}
                      aria-pressed={type === typeKey}
                      sx={{
                        ...typeChip,
                        bgcolor: type === typeKey ? TYPE_COLORS[typeKey] : 'transparent',
                        borderColor: TYPE_COLORS[typeKey],
                        color: type === typeKey ? 'common.white' : 'text.secondary',
                        '&:hover': { opacity: 0.85 }
                      }}
                    >
                      {t(`calendarModal.form.types.${typeKey}`)}
                    </Chip>
                  ))}
                </Stack>
              </FormControl>
            )}

            {/* ── Edit mode: locked type badge ──────────────────────── */}
            {isEdit && (
              <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip
                  size='sm'
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    border: 'none'
                  }}
                >
                  {t(`calendarModal.form.types.${event?.type || 'task'}`)}
                </Chip>
                {event?.type === 'task' &&
                  event?.category &&
                  event?.category !== 'general' &&
                  (() => {
                    try {
                      const raw = localStorage.getItem('nowry_task_lists')
                      const lists = raw ? JSON.parse(raw) : []
                      const match = lists.find((l) => l.id === event.category)
                      const label = match ? match.label : event.category
                      return (
                        <Chip size='sm' variant='soft' color='neutral' sx={{ fontSize: '0.7rem', border: 'none' }}>
                          {label}
                        </Chip>
                      )
                    } catch {
                      /* ignore */
                      return null
                    }
                  })()}
              </Box>
            )}

            <Divider />

            {/* ── Focus area (goal creation) ────────────────────────── */}
            {needsFocusArea && (
              <FormControl required>
                <FormLabel>{t('calendarModal.form.focusArea')}</FormLabel>
                {contextLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                    <CircularProgress size='sm' />
                  </Box>
                ) : (
                  <Select value={focusAreaId} onChange={(_, v) => setFocusAreaId(v)} placeholder={t('calendarModal.form.focusArea')}>
                    {focusAreas.map((area) => (
                      <Option key={area._id} value={area._id}>
                        {area.name}
                      </Option>
                    ))}
                  </Select>
                )}
              </FormControl>
            )}

            {/* ── Goal selector (activity creation) ────────────────── */}
            {needsGoal && (
              <FormControl required>
                <FormLabel>{t('calendarModal.form.goal')}</FormLabel>
                {contextLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                    <CircularProgress size='sm' />
                  </Box>
                ) : (
                  <Select value={goalId} onChange={(_, v) => setGoalId(v)} placeholder={t('calendarModal.form.goal')}>
                    {allGoals.map((g) => (
                      <Option key={g._id} value={g._id}>
                        {g.title}
                      </Option>
                    ))}
                  </Select>
                )}
              </FormControl>
            )}

            {/* ── Title ────────────────────────────────────────────── */}
            <FormControl required>
              <FormLabel>{t('calendarModal.form.title')}</FormLabel>
              <Input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSave()}
                placeholder={t(`calendarModal.form.types.${activeType}`)}
              />
            </FormControl>

            {/* ── Description (priority only) ───────────────────────── */}
            {needsDescription && (
              <FormControl>
                <FormLabel>{t('calendarModal.form.description')}</FormLabel>
                <Textarea minRows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
              </FormControl>
            )}

            {/* ── Date ─────────────────────────────────────────────── */}
            <FormControl>
              <FormLabel>{t('calendarModal.form.date')}</FormLabel>
              <Input type='date' value={date} onChange={(e) => setDate(e.target.value)} />
            </FormControl>

            {/* ── Error ────────────────────────────────────────────── */}
            {error && (
              <Typography level='body-xs' color='danger'>
                {error}
              </Typography>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ position: 'sticky', bottom: 0, bgcolor: 'background.surface', pt: 1 }}>
          <Button variant='plain' color='neutral' onClick={onClose} disabled={saving}>
            {t('calendarModal.form.cancel')}
          </Button>
          <Button
            loading={saving}
            disabled={!canSave}
            onClick={handleSave}
            sx={{
              '&:disabled': { opacity: 0.5 }
            }}
          >
            {t('calendarModal.form.save')}
          </Button>
        </DialogActions>
      </ModalDialog>
    </Modal>
  )
}

export default EventFormModal

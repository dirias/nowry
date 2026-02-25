import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
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

// Type color map (must match CalendarModal TYPE_META)
const TYPE_COLORS = {
  task: '#6366f1',
  priority: '#f59e0b',
  goal: '#10b981',
  activity: '#3b82f6'
}

const TYPES = ['task', 'priority', 'goal', 'activity']

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
  const [annualPlanId, setAnnualPlanId] = useState(null)
  const [focusAreas, setFocusAreas] = useState([])
  const [allGoals, setAllGoals] = useState([])
  const [contextLoading, setContextLoading] = useState(false)

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
  // We fetch lazily to avoid 3-5 API calls when the user just wants to create a task.
  const needsContext = !isEdit && (type === 'goal' || type === 'activity')

  useEffect(() => {
    if (!open || !needsContext) return
    // Avoid refetching if we already have data
    if (focusAreas.length > 0 || allGoals.length > 0) return

    const fetchContext = async () => {
      setContextLoading(true)
      try {
        const plan = await annualPlanningService.getAnnualPlan(new Date().getFullYear())
        if (plan?._id) {
          setAnnualPlanId(plan._id)
          const [areas, prioritiesResult] = await Promise.allSettled([
            annualPlanningService.getFocusAreas(plan._id),
            annualPlanningService.getPriorities(plan._id)
          ])
          const areaList = areas.status === 'fulfilled' && Array.isArray(areas.value) ? areas.value : []
          setFocusAreas(areaList)

          // Pre-load goals for activity creation selector
          const goalResults = await Promise.allSettled(areaList.map((a) => annualPlanningService.getGoals(a._id)))
          const goals = goalResults.flatMap((r) => (r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []))
          setAllGoals(goals)
        }
      } catch (_) {
        /* annual plan may not exist; silently skip */
      } finally {
        setContextLoading(false)
      }
    }
    fetchContext()
  }, [open, needsContext])

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeType = isEdit ? event?.type || 'task' : type
  const typeColor = TYPE_COLORS[activeType] || '#6366f1'
  const needsFocusArea = !isEdit && type === 'goal'
  const needsGoal = !isEdit && type === 'activity'
  const needsDescription = activeType === 'priority'

  // Determine if save should be blocked
  const canSave = title.trim() && !(needsFocusArea && !focusAreaId) && !(needsGoal && !goalId)

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
      case 'goal':
        await annualPlanningService.createGoal({
          title: title.trim(),
          target_date: date || null,
          focus_area_id: focusAreaId
        })
        break
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
      <ModalDialog sx={{ width: { xs: '95vw', sm: 440 }, maxWidth: '100vw' }}>
        {/* Title */}
        <DialogTitle>
          <Stack direction='row' alignItems='center' spacing={1}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: typeColor,
                flexShrink: 0
              }}
            />
            <Typography level='title-md' fontWeight={600}>
              {isEdit ? t('calendarModal.editEvent') : t('calendarModal.addEvent')}
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent>
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
                      sx={{
                        cursor: 'pointer',
                        bgcolor: type === typeKey ? TYPE_COLORS[typeKey] : 'transparent',
                        borderColor: TYPE_COLORS[typeKey],
                        color: type === typeKey ? '#fff' : 'text.secondary',
                        transition: 'all 0.15s',
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
                    bgcolor: typeColor + '22',
                    color: typeColor,
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

            {/* ── Actions ──────────────────────────────────────────── */}
            <Stack direction='row' justifyContent='flex-end' spacing={1} sx={{ pt: 0.5 }}>
              <Button variant='plain' color='neutral' onClick={onClose} disabled={saving}>
                {t('calendarModal.form.cancel')}
              </Button>
              <Button
                loading={saving}
                disabled={!canSave}
                onClick={handleSave}
                sx={{
                  bgcolor: typeColor,
                  color: '#fff',
                  '&:hover': { bgcolor: typeColor, filter: 'brightness(0.9)' },
                  '&:disabled': { opacity: 0.5 }
                }}
              >
                {t('calendarModal.form.save')}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </ModalDialog>
    </Modal>
  )
}

export default EventFormModal

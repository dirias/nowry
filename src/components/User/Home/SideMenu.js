import * as React from 'react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sheet,
  Typography,
  Stack,
  Box,
  Button,
  Input,
  IconButton,
  Tooltip,
  CircularProgress,
  LinearProgress,
  Chip,
  ChipDelete,
  Divider,
  Skeleton,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Link as JoyLink
} from '@mui/joy'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { usePomodoro } from '@nowry/core/context/PomodoroContext'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import SortableTask from '../../Task/SortableTask'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { tasksService } from '@nowry/core/api/services'
import { useTaskData } from '@nowry/core/hooks/useTaskData'
import { useToday } from '@nowry/core/hooks/useToday'
import { useBlockLog } from '@nowry/core/hooks/useBlockLog'
import useAnnualPlan from '@nowry/core/hooks/useAnnualPlan'
import { stateOf } from '@nowry/core/domain/blocks'
import { useTodayData } from '../../Study/useTodayData'
import { focusRing, identityTile, listRow, readout, touchTargetBox } from '../../Common/Form/formStyles'

/** The Now tab: current, next, and this many of what follows — a glance, not the timeline. */
const LATER_SHOWN = 3
/** When the day is spent, the last blocks it held, read back. */
const PAST_SHOWN = 3
/** The time column, as the agenda's block row sets it. */
const TIME_COLUMN_WIDTH = 44

/** The source's colour: identity is the tile, and only the tile (§15.11). */
const sourceColor = (occurrence, focusAreas) => {
  const type = occurrence.block?.source?.type ?? 'free'
  if (type === 'goal') {
    const area = (focusAreas ?? []).find((a) => (a._id ?? a.id) === occurrence.block?.areaId)
    return area?.color || 'primary.softBg'
  }
  if (type === 'focus') return 'warning.plainColor'
  if (type === 'task' || type === 'free') return 'neutral.outlinedBorder'
  return 'primary.solidBg'
}

/** The agenda's completion idiom: empty circle to keep, filled success check to undo. */
const tickSx = (on) => ({
  ...touchTargetBox,
  borderRadius: 'sm',
  flexShrink: 0,
  color: on ? 'success.plainColor' : 'text.tertiary',
  ...focusRing
})

// ─── localStorage helpers ─────────────────────────────────────────────────────
const LISTS_KEY = 'nowry_task_lists'
const ACTIVE_LIST_KEY = 'nowry_active_task_list'

const loadLists = () => {
  try {
    const raw = localStorage.getItem(LISTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const saveLists = (lists) => {
  try {
    localStorage.setItem(LISTS_KEY, JSON.stringify(lists))
  } catch {
    /* ignore storage write errors */
  }
}

const loadActiveList = () => {
  return localStorage.getItem(ACTIVE_LIST_KEY) || 'all'
}

const saveActiveList = (id) => {
  localStorage.setItem(ACTIVE_LIST_KEY, id)
}
// ─────────────────────────────────────────────────────────────────────────────

const SideMenu = () => {
  const { t } = useTranslation()

  // Chip style helpers — use semantic primary tokens so dark mode and
  // user color preference both work correctly through the Joy UI palette.
  const activeChipSx = {
    bgcolor: 'primary.softBg',
    color: 'primary.plainColor',
    fontWeight: 600,
    border: 'none'
  }
  const inactiveChipSx = {
    bgcolor: 'background.level2',
    color: 'text.secondary',
    border: 'none'
  }
  const [tasks, setTasks] = React.useState([])
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('pending')

  // ── Task lists state ──────────────────────────────────────────────────────
  const [lists, setLists] = React.useState(loadLists)
  const [activeList, setActiveList] = React.useState(loadActiveList)
  const [addingList, setAddingList] = React.useState(false)
  const [newListName, setNewListName] = React.useState('')
  const newListInputRef = React.useRef(null)
  const searchInputRef = React.useRef(null)
  // ─────────────────────────────────────────────────────────────────────────

  // The panel opens on Now (PLAN-008): the clock is the reader, not a tab.
  const [activeTab, setActiveTab] = React.useState('now')

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  const { tasks: tasksData, loading: tasksLoading, reload: reloadTasks } = useTaskData()

  /*
   * The one spine (PRD D9): the same hook the calendar's Day reads, fed the
   * same due count the Today object shows, so Home and the calendar cannot
   * disagree about a block or its state. The tick writes through the same
   * optimistic log the agenda uses.
   */
  const { dueToday } = useTodayData()
  const day = useToday({ dueToday })
  const timer = usePomodoro()
  const navigate = useNavigate()
  // Start runs the block on the timer (PRD D7); a study block opens the review
  // on the budget its length implies, any other block the Focus sheet (PLAN-006).
  const startBlock = React.useCallback(
    (occurrence) => {
      timer.startBlock(occurrence)
      if (occurrence.block?.source?.type === 'study') {
        timer.setShowWidget(false)
        navigate(`/study/daily-review?limit=${Math.max(1, Math.round((occurrence.lengthMin || 0) * 1.5))}`)
        return
      }
      navigate('/calendar')
    },
    [timer, navigate]
  )
  const log = useBlockLog()
  const { focusAreas } = useAnnualPlan()

  const loading = tasksLoading

  // Mirror the task list from the shared hook into local state — tasks below are
  // mutated optimistically (add/remove/toggle/reorder) ahead of their own reload.
  // Compares by content (not tasksData's array identity) before seeding: useTaskData()
  // falls back to `data ?? []`, a fresh array reference on every render while the query
  // has no data yet (unauthenticated/loading), which would otherwise re-run this effect
  // and re-render forever.
  const tasksDataJson = JSON.stringify(tasksData)
  React.useEffect(() => {
    setTasks(JSON.parse(tasksDataJson))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasksDataJson])

  // Focus new list input when shown
  React.useEffect(() => {
    if (addingList && newListInputRef.current) {
      newListInputRef.current.focus()
    }
  }, [addingList])

  // ── List management ───────────────────────────────────────────────────────
  const handleSelectList = (id) => {
    setActiveList(id)
    saveActiveList(id)
    setSearch('')
  }

  const handleStartAddList = () => {
    setAddingList(true)
    setNewListName('')
  }

  const handleConfirmAddList = () => {
    const trimmed = newListName.trim()
    if (!trimmed) {
      setAddingList(false)
      return
    }
    const id = `list_${Date.now()}`
    const updated = [...lists, { id, label: trimmed }]
    setLists(updated)
    saveLists(updated)
    setActiveList(id)
    saveActiveList(id)
    setAddingList(false)
    setNewListName('')
  }

  const handleCancelAddList = () => {
    setAddingList(false)
    setNewListName('')
  }

  const handleDeleteList = (e, id) => {
    e.stopPropagation()
    const updated = lists.filter((l) => l.id !== id)
    setLists(updated)
    saveLists(updated)
    if (activeList === id) {
      setActiveList('all')
      saveActiveList('all')
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Task Management
  const addTask = async (title) => {
    try {
      const newTask = {
        title: title.trim(),
        description: '',
        is_completed: false,
        priority: 'medium',
        deadline: null,
        tags: [],
        category: activeList === 'all' ? 'general' : activeList
      }

      const created = await tasksService.create(newTask)
      setTasks([...tasks, created])
      reloadTasks()
      setSearch('')
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }

  const removeTask = async (id) => {
    try {
      await tasksService.delete(id)
      setTasks(tasks.filter((t) => (t._id || t.id) !== id))
      reloadTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const toggleTask = async (task) => {
    try {
      const updated = await tasksService.toggleComplete(task._id || task.id, task.is_completed)
      setTasks(tasks.map((t) => ((t._id || t.id) === (updated._id || updated.id) ? updated : t)))
      reloadTasks()
    } catch (error) {
      console.error('Error toggling task:', error)
    }
  }

  const updateTask = async (updatedTask) => {
    try {
      const taskId = updatedTask._id || updatedTask.id
      const updates = {
        title: updatedTask.title,
        deadline: updatedTask.deadline,
        priority: updatedTask.priority,
        is_completed: updatedTask.is_completed
      }

      const updated = await tasksService.update(taskId, updates)
      setTasks((prev) => prev.map((t) => ((t._id || t.id) === taskId ? updated : t)))
      reloadTasks()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' ? true : statusFilter === 'completed' ? t.is_completed : !t.is_completed
    const matchesList = activeList === 'all' ? true : t.category === activeList
    return matchesSearch && matchesStatus && matchesList
  })

  const isExactTitleMatch = (text) => tasks.some((t) => t.title.trim().toLowerCase() === text.trim().toLowerCase())

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && search.trim() && !isExactTitleMatch(search)) {
      addTask(search)
    }
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      const oldIndex = tasks.findIndex((t) => (t._id || t.id) === active.id)
      const newIndex = tasks.findIndex((t) => (t._id || t.id) === over.id)
      const newTasks = arrayMove(tasks, oldIndex, newIndex)
      setTasks(newTasks)
    }
  }

  if (loading) {
    return (
      <Sheet
        variant='outlined'
        sx={{ borderRadius: 'md', p: 2, minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <CircularProgress />
      </Sheet>
    )
  }

  // Map a category id → display label
  const getCategoryLabel = (catId) => {
    if (!catId || catId === 'general' || catId === 'all') return t('tasks.lists.general')
    const found = lists.find((l) => l.id === catId)
    return found ? found.label : catId
  }

  // Group filteredTasks by category — only used when activeList === 'all'
  const getGroupedTasks = () => {
    const groups = {}
    filteredTasks.forEach((task) => {
      const cat = task.category || 'general'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(task)
    })
    return Object.entries(groups).map(([id, items]) => ({ id, label: getCategoryLabel(id), tasks: items }))
  }

  return (
    <Sheet
      variant='outlined'
      sx={{
        backgroundColor: 'background.body',
        borderRadius: 'md',
        p: 2,
        boxShadow: 'sm',
        height: '100%',
        minHeight: 500,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Tabs
        aria-label={t('blocks.home.panelAria')}
        value={activeTab}
        onChange={(e, val) => setActiveTab(val)}
        sx={{ bgcolor: 'transparent', height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
      >
        <TabList
          disableUnderline
          sx={{
            p: 0.5,
            gap: 0.5,
            borderRadius: 'xl',
            bgcolor: 'background.level1',
            mb: 2,
            flexShrink: 0
          }}
        >
          <Tab
            disableIndicator
            value='now'
            variant={activeTab === 'now' ? 'solid' : 'plain'}
            color={activeTab === 'now' ? 'primary' : 'neutral'}
            sx={{ borderRadius: 'lg', flex: 1 }}
          >
            <Tooltip title={t('blocks.home.now')} size='sm'>
              <ScheduleRoundedIcon />
            </Tooltip>
          </Tab>
          <Tab
            disableIndicator
            value='tasks'
            variant={activeTab === 'tasks' ? 'solid' : 'plain'}
            color={activeTab === 'tasks' ? 'primary' : 'neutral'}
            sx={{ borderRadius: 'lg', flex: 1 }}
          >
            <Tooltip title={t('tasks.title')} size='sm'>
              <FormatListBulletedIcon />
            </Tooltip>
          </Tab>
        </TabList>

        {/* Tab Panels */}

        {/* Now — the day's blocks around the clock (PLAN-008, PRD D9) */}
        {activeTab === 'now' && (
          <TabPanel
            value='now'
            sx={{
              p: '0 !important',
              m: 0,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <NowTab day={day} log={log} focusAreas={focusAreas} onStart={startBlock} t={t} />
          </TabPanel>
        )}

        {/* Tasks */}
        {activeTab === 'tasks' && (
          <TabPanel value='tasks' sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Header & Filter */}
            <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 1 }}>
              <Typography level='title-md' startDecorator={<FormatListBulletedIcon sx={{ fontSize: 18, color: 'primary.plainColor' }} />}>
                {t('tasks.title')}
              </Typography>
              <Stack direction='row' spacing={0.5}>
                {['all', 'pending', 'completed'].map((f) => (
                  <Chip
                    key={f}
                    size='sm'
                    variant='plain'
                    color='neutral'
                    onClick={() => setStatusFilter(f)}
                    sx={{ cursor: 'pointer', px: 1, ...(statusFilter === f ? activeChipSx : inactiveChipSx) }}
                  >
                    {t(`tasks.filter.${f}`)}
                  </Chip>
                ))}
              </Stack>
            </Stack>

            {/* ── Completion progress ─────────────────────────────────────── */}
            {(() => {
              const listTasks = activeList === 'all' ? tasks : tasks.filter((t) => t.category === activeList)
              const total = listTasks.length
              const done = listTasks.filter((t) => t.is_completed).length
              const pct = total === 0 ? 0 : Math.round((done / total) * 100)
              return (
                <Box sx={{ mb: 1.5, flexShrink: 0 }}>
                  <Stack direction='row' justifyContent='space-between' alignItems='baseline' sx={{ mb: 0.5 }}>
                    <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                      {total === 0 ? t('tasks.progress.noTasks') : t('tasks.progress.label', { done, total })}
                    </Typography>
                    {total > 0 && (
                      <Typography
                        level='body-xs'
                        sx={{ color: pct === 100 ? 'success.plainColor' : 'text.tertiary', fontWeight: pct === 100 ? 600 : 400 }}
                      >
                        {pct}%
                      </Typography>
                    )}
                  </Stack>
                  <LinearProgress
                    determinate
                    value={pct}
                    color='primary'
                    size='sm'
                    sx={{
                      borderRadius: 'sm',
                      '--LinearProgress-thickness': '5px',
                      bgcolor: 'background.level2'
                    }}
                  />
                </Box>
              )
            })()}
            {/* ────────────────────────────────────────────────────────────── */}

            {/* ── List chips row ──────────────────────────────────────────── */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                flexWrap: 'nowrap',
                overflowX: 'auto',
                mb: 1,
                pb: 0.5,
                flexShrink: 0,
                // hide scrollbar but keep functionality
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none'
              }}
            >
              {/* "All" chip */}
              <Chip
                size='sm'
                variant='plain'
                color='neutral'
                onClick={() => handleSelectList('all')}
                sx={{ cursor: 'pointer', flexShrink: 0, ...(activeList === 'all' ? activeChipSx : inactiveChipSx) }}
              >
                {t('tasks.lists.all')}
              </Chip>

              {/* User-created list chips */}
              {lists.map((list) => (
                <Chip
                  key={list.id}
                  size='sm'
                  variant='plain'
                  color='neutral'
                  onClick={() => handleSelectList(list.id)}
                  endDecorator={
                    <ChipDelete onDelete={(e) => handleDeleteList(e, list.id)} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }} />
                  }
                  sx={{
                    cursor: 'pointer',
                    flexShrink: 0,
                    ...(activeList === list.id ? activeChipSx : inactiveChipSx)
                  }}
                >
                  {list.label}
                </Chip>
              ))}

              {/* Inline new-list input or + button */}
              {addingList ? (
                <Input
                  size='sm'
                  placeholder={t('tasks.lists.listPlaceholder')}
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmAddList()
                    if (e.key === 'Escape') handleCancelAddList()
                  }}
                  onBlur={handleConfirmAddList}
                  slotProps={{ input: { ref: newListInputRef } }}
                  sx={{ width: 110, flexShrink: 0, '--Input-minHeight': '24px', py: 0 }}
                />
              ) : (
                <Tooltip title={t('tasks.lists.addList')} size='sm'>
                  <IconButton
                    size='sm'
                    variant='plain'
                    color='neutral'
                    onClick={handleStartAddList}
                    sx={{ flexShrink: 0, '--IconButton-size': '24px', opacity: 0.6, '&:hover': { opacity: 1 } }}
                  >
                    <AddRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            {/* ────────────────────────────────────────────────────────────── */}

            {/* Search / Add Input */}
            <Box sx={{ position: 'relative', mb: 1 }}>
              <Input
                size='sm'
                placeholder={
                  activeList === 'all'
                    ? t('tasks.searchPlaceholder')
                    : t('tasks.addToListPlaceholder', { list: getCategoryLabel(activeList) })
                }
                startDecorator={<SearchRoundedIcon />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                slotProps={{ input: { ref: searchInputRef } }}
                sx={{ width: '100%' }}
              />
              {search.trim() && !isExactTitleMatch(search) && (
                <Tooltip title={t('tasks.addTooltip', { title: search })}>
                  <IconButton
                    onClick={() => addTask(search)}
                    size='sm'
                    color='primary'
                    variant='soft'
                    sx={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}
                  >
                    <AddRoundedIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {/* Task List */}
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                '&::-webkit-scrollbar': { width: 4 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'neutral.outlinedBorder', borderRadius: 2 },
                '&::-webkit-scrollbar-track': { bgcolor: 'transparent' }
              }}
            >
              {tasks.length === 0 ? (
                /* ── Fully empty ── */
                <Box sx={{ py: 4, px: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, textAlign: 'center' }}>
                  <FormatListBulletedIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
                  <Box>
                    <Typography level='title-sm' sx={{ mb: 0.5 }}>
                      {t('tasks.emptyTitle')}
                    </Typography>
                    <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                      {t('tasks.emptySubtitle')}
                    </Typography>
                  </Box>
                </Box>
              ) : filteredTasks.length === 0 ? (
                /* ── No match ── */
                <Box sx={{ py: 3, px: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, textAlign: 'center' }}>
                  <FormatListBulletedIcon sx={{ fontSize: 24, color: 'text.secondary', opacity: 0.6 }} />
                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                    {t('tasks.noMatchTitle')}
                  </Typography>
                </Box>
              ) : activeList === 'all' ? (
                /* ── Grouped by category ── */
                <Stack spacing={0}>
                  {getGroupedTasks().map((group, gi) => (
                    <Box key={group.id}>
                      {gi > 0 && <Divider sx={{ my: 1 }} />}
                      <Typography
                        level='body-xs'
                        sx={{
                          px: 0.5,
                          pb: 0.5,
                          color: 'text.tertiary',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em'
                        }}
                      >
                        {group.label}
                      </Typography>
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={group.tasks.map((t) => t._id || t.id)} strategy={verticalListSortingStrategy}>
                          <Stack spacing={0.5}>
                            {group.tasks.map((task) => (
                              <SortableTask
                                key={task._id || task.id}
                                task={task}
                                onToggle={() => toggleTask(task)}
                                onDelete={() => removeTask(task._id || task.id)}
                                onUpdate={updateTask}
                              />
                            ))}
                          </Stack>
                        </SortableContext>
                      </DndContext>
                    </Box>
                  ))}
                </Stack>
              ) : (
                /* ── Single list flat view ── */
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={filteredTasks.map((t) => t._id || t.id)} strategy={verticalListSortingStrategy}>
                    <Stack spacing={0.5}>
                      {filteredTasks.map((task) => (
                        <SortableTask
                          key={task._id || task.id}
                          task={task}
                          onToggle={() => toggleTask(task)}
                          onDelete={() => removeTask(task._id || task.id)}
                          onUpdate={updateTask}
                        />
                      ))}
                    </Stack>
                  </SortableContext>
                </DndContext>
              )}
            </Box>
          </TabPanel>
        )}
      </Tabs>
    </Sheet>
  )
}

/**
 * The day around the clock: now · next · later, from the one spine (PRD D9).
 *
 * The current block leads and carries "Start", a link into the calendar
 * where the block is worked (PLAN-006 wires Focus); the rows after it carry
 * the agenda's tick, which keeps or undoes through the same optimistic log,
 * so a block kept here is kept on the calendar at once. When the day is
 * spent — nothing running, nothing ahead — the tab reads the day back: one
 * line of copy, then the last blocks it held with their states, read-only.
 * Home is where you watch; the calendar is where you work.
 *
 * Each row is the one anatomy (§15.11): time readout · 16px tile in the
 * source's colour · title over "20 min · study" · the tick or the link.
 * State is the title's strike and the tick's fill, never a tint on the row.
 */
const NowTab = ({ day, log, focusAreas, onStart, t }) => {
  const toggle = (o) => (o.log?.status === 'kept' ? log.undo(o) : log.keep(o))

  if (day.loading && day.occurrences.length === 0) {
    return (
      <Stack>
        {[0, 1].map((i) => (
          <Box key={i} sx={listRow}>
            <Skeleton variant='rectangular' width={16} height={16} sx={{ borderRadius: 'sm', flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant='text' level='body-sm' width='55%' />
              <Skeleton variant='text' level='body-xs' width='30%' />
            </Box>
          </Box>
        ))}
      </Stack>
    )
  }

  if (day.error) {
    return (
      <Stack spacing={1} alignItems='flex-start' sx={{ pt: 1 }}>
        <Typography level='body-sm' sx={{ color: 'danger.plainColor' }} aria-live='polite'>
          {t('blocks.error')}
        </Typography>
        <Button size='sm' variant='plain' onClick={() => day.reload()} aria-label={t('common.retry')}>
          {t('common.retry')}
        </Button>
      </Stack>
    )
  }

  if (day.occurrences.length === 0) {
    /* Empty is the same object with one sentence in it (§15.10), and the way
       into the calendar, where the block is made. */
    return (
      <Stack spacing={1} alignItems='flex-start' sx={{ pt: 1 }}>
        <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
          {t('blocks.home.empty')}
        </Typography>
        <JoyLink component={RouterLink} to='/calendar' level='body-sm' sx={{ fontWeight: 'md', ...focusRing }}>
          {t('blocks.home.planDay')}
        </JoyLink>
      </Stack>
    )
  }

  const ahead = day.current ? [day.current, day.next, ...day.later.slice(0, LATER_SHOWN)].filter(Boolean) : []
  const spent = ahead.length === 0
  const rows = spent ? day.past.slice(-PAST_SHOWN) : ahead

  return (
    <Box sx={{ flex: 1, overflowY: 'auto' }}>
      {spent && (
        <Typography level='body-xs' sx={{ color: 'text.tertiary', pb: 1 }}>
          {t('blocks.home.dayDone')}
        </Typography>
      )}

      {rows.map((o, index) => (
        <React.Fragment key={`${o.blockId}|${o.date}`}>
          {index > 0 && <Divider />}
          <NowRow
            onStart={onStart}
            occurrence={o}
            nowMinutes={day.nowMinutes}
            current={!spent && index === 0}
            color={sourceColor(o, focusAreas)}
            onToggle={spent ? null : toggle}
            t={t}
          />
        </React.Fragment>
      ))}

      {/* The way into working the day, at the foot of what it holds. */}
      <Divider />
      <Box sx={{ ...listRow, minHeight: 44 }}>
        <JoyLink component={RouterLink} to='/calendar' level='body-sm' sx={{ color: 'text.secondary', ...focusRing }}>
          {t('blocks.home.openDay')}
        </JoyLink>
      </Box>
    </Box>
  )
}

const NowRow = ({ occurrence, nowMinutes, current, color, onToggle, onStart, t }) => {
  const state = stateOf(occurrence, nowMinutes)
  const kept = state === 'kept' || state === 'partial'
  const skipped = state === 'skipped'
  const running = state === 'running'
  const type = occurrence.block?.source?.type ?? 'free'
  const title = occurrence.title || occurrence.block?.title || ''
  const meta = t('calendarPage.blocks.meta', { minutes: occurrence.lengthMin, source: t(`calendarPage.blocks.source.${type}`) })
  const tickLabel = kept ? t('calendarPage.blocks.undoKept') : t('calendarPage.blocks.markKept')

  return (
    <Box sx={{ ...listRow, gap: 1.5 }} data-testid='home-block-row' data-block-state={state}>
      <Typography
        level='body-sm'
        sx={{
          ...readout,
          width: TIME_COLUMN_WIDTH,
          flexShrink: 0,
          color: running ? 'primary.plainColor' : 'text.tertiary',
          fontWeight: running ? 'lg' : 'md'
        }}
      >
        {occurrence.start}
      </Typography>
      <Box aria-hidden='true' sx={identityTile(color)} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          level='body-sm'
          noWrap
          sx={{
            fontWeight: 'md',
            color: skipped ? 'text.tertiary' : 'text.primary',
            textDecoration: skipped ? 'line-through' : 'none'
          }}
        >
          {title}
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {meta}
        </Typography>
      </Box>
      {current ? (
        <JoyLink
          component='button'
          type='button'
          level='body-sm'
          onClick={() => onStart?.(occurrence)}
          sx={{ fontWeight: 'md', flexShrink: 0, ...focusRing }}
        >
          {t('blocks.row.start')}
        </JoyLink>
      ) : onToggle ? (
        <IconButton
          size='sm'
          variant='plain'
          color={kept ? 'success' : 'neutral'}
          onClick={() => onToggle(occurrence)}
          aria-label={tickLabel}
          aria-pressed={kept}
          sx={tickSx(kept)}
        >
          {kept ? <CheckCircleIcon fontSize='small' /> : <RadioButtonUncheckedIcon fontSize='small' />}
        </IconButton>
      ) : (
        <Box aria-hidden='true' sx={{ ...tickSx(kept), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {kept ? <CheckCircleIcon fontSize='small' /> : <RadioButtonUncheckedIcon fontSize='small' />}
        </Box>
      )}
    </Box>
  )
}

export default SideMenu

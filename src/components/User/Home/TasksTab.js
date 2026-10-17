import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, Divider, Dropdown, Input, ListDivider, Menu, MenuButton, MenuItem, Skeleton, Typography } from '@mui/joy'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import { tasksService } from '@nowry/core/api/services'
import { useTaskLists } from '@nowry/core/hooks/useTaskLists'
import { dayTasks, listNameOf, whenOf, whenText } from '@nowry/core/domain/taskQueue'
import { localDateKey } from '@nowry/core/domain/blocks'
import { focusRing, identityTile, listRow } from '../../Common/Form/formStyles'
import { TaskTile } from '../../Calendar/blockEvents'
import { DayFootRow, DayRow, WHEN_COLUMN_WIDTH } from './DayRow'
import TaskListsDialog from './TaskListsDialog'

/**
 * The Tasks tab (PLAN-019, PRD-items D12): today. Late and today's open tasks
 * on the day panel's one row, ordered late, flagged, date; the count above is
 * exactly these rows. Capture is the first row, due today, into the list its
 * menu names. What is later sits behind "Upcoming · N"; what was ticked today
 * behind "Completed · N". Status, list and search filters, drag handles and the
 * hover delete are gone: editing, flagging, moving and deleting live in the
 * item sheet the title opens.
 */

const idOf = (task) => String(task?._id ?? task?.id ?? '')

/** The task's meta line: "Priority · Shopping list", "Task". */
const metaOf = (task, lists, t) =>
  [task.is_priority ? t('tasks.row.priority') : null, listNameOf(task, lists) ?? t('tasks.row.task')].filter(Boolean).join(' · ')

const TaskRow = ({ task, lists, now, language, onToggle, onOpen, t }) => {
  const when = whenOf(task, now)
  return (
    <DayRow
      testId='home-task-row'
      state={task.is_completed ? 'done' : when.kind}
      lead={task.is_completed ? '' : whenText(task, { now, language, t })}
      leadTone={when.kind === 'late' && !task.is_completed ? 'strong' : 'quiet'}
      tile={<TaskTile flagged={Boolean(task.is_priority)} />}
      title={task.title}
      meta={metaOf(task, lists, t)}
      done={Boolean(task.is_completed)}
      dimmed={Boolean(task.is_completed)}
      onOpen={() => onOpen(task)}
      openLabel={t('tasks.row.openAria', { title: task.title })}
      tickLabel={t(task.is_completed ? 'tasks.row.markUndone' : 'tasks.row.markDone', { title: task.title })}
      onToggle={() => onToggle(task)}
    />
  )
}

/** The list the capture row files into: General, a list, or one made from here. */
const ListMenu = ({ lists, value, onChange, onNew, onEdit, t }) => {
  const current = lists.find((list) => list.id === value)?.name ?? t('tasks.lists.general')
  const pick = (id) => () => onChange(id)
  return (
    <Dropdown>
      <MenuButton
        size='sm'
        variant='plain'
        color='neutral'
        endDecorator={<ExpandMoreRoundedIcon />}
        aria-label={t('tasks.capture.listAria', { name: current })}
        sx={{ flexShrink: 0, fontWeight: 'md', color: 'text.secondary', ...focusRing }}
      >
        {current}
      </MenuButton>
      <Menu placement='bottom-end' size='sm' sx={{ minWidth: 200 }}>
        {[{ id: null, name: t('tasks.lists.general') }, ...lists].map((list) => (
          <MenuItem
            key={list.id ?? 'general'}
            role='menuitemradio'
            aria-checked={list.id === value}
            selected={list.id === value}
            onClick={pick(list.id)}
          >
            <Box sx={{ width: 18, display: 'flex' }}>{list.id === value ? <CheckRoundedIcon sx={{ fontSize: 'md' }} /> : null}</Box>
            {list.name}
          </MenuItem>
        ))}
        <ListDivider />
        <MenuItem onClick={onNew}>
          <Box sx={{ width: 18 }} />
          {t('tasks.lists.new')}
        </MenuItem>
        <MenuItem onClick={onEdit}>
          <Box sx={{ width: 18 }} />
          {t('tasks.lists.edit')}
        </MenuItem>
      </Menu>
    </Dropdown>
  )
}

/** Capture: the list's first row, a "+" in the tile slot; "Add" appears once there is text. */
const CaptureRow = ({ lists, listId, onListChange, onAdded, onNewList, onEditLists, t }) => {
  const [draft, setDraft] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [failed, setFailed] = React.useState(false)

  const add = async () => {
    const title = draft.trim()
    if (!title || saving) return
    setSaving(true)
    setFailed(false)
    try {
      // Due today, because the panel says today; a date key, so no zone moves it.
      await tasksService.create({ title, deadline: localDateKey(), category: listId ?? null, is_completed: false })
      setDraft('')
      await onAdded()
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <Box sx={{ ...listRow, gap: 1.5, '&:hover': {} }}>
        <Box sx={{ width: WHEN_COLUMN_WIDTH, flexShrink: 0 }} />
        <Box
          aria-hidden='true'
          sx={{
            ...identityTile('background.level1', 16),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary'
          }}
        >
          <AddRoundedIcon sx={{ fontSize: 'xs' }} />
        </Box>
        <Input
          variant='plain'
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={t('home.addTaskToday')}
          disabled={saving}
          slotProps={{ input: { 'aria-label': t('home.addTaskToday'), maxLength: 200 } }}
          sx={{ flex: 1, minWidth: 0, px: 0, bgcolor: 'transparent', boxShadow: 'none', fontSize: 'sm', '&::before': { display: 'none' } }}
        />
        <ListMenu lists={lists} value={listId} onChange={onListChange} onNew={onNewList} onEdit={onEditLists} t={t} />
        {draft.trim() ? (
          <Button size='sm' variant='outlined' color='neutral' loading={saving} onClick={add} sx={{ flexShrink: 0, ...focusRing }}>
            {t('common.add')}
          </Button>
        ) : null}
      </Box>
      {failed ? (
        <Typography level='body-xs' role='alert' sx={{ color: 'danger.plainColor', pl: '72px', pb: 1 }}>
          {t('tasks.capture.failed')}
        </Typography>
      ) : null}
    </Box>
  )
}

/** A counted disclosure at the foot: "Upcoming · 4", "Completed · 2". */
const Disclosure = ({ label, count, open, onToggle, children, id }) => (
  <>
    <Divider />
    <DayFootRow
      glyph={open ? <ExpandMoreRoundedIcon /> : <ChevronRightRoundedIcon />}
      expanded={open}
      aria-controls={id}
      onClick={onToggle}
    >
      {`${label} · ${count}`}
    </DayFootRow>
    {open ? <Box id={id}>{children}</Box> : null}
  </>
)

const RowSkeleton = () => (
  <Box sx={{ ...listRow, gap: 1.5, '&:hover': {} }} aria-hidden='true'>
    <Skeleton variant='text' level='body-xs' sx={{ width: 30 }} />
    <Skeleton variant='rectangular' sx={{ width: 16, height: 16, borderRadius: 'xs' }} />
    <Box sx={{ flex: 1 }}>
      <Skeleton variant='text' level='body-sm' sx={{ width: '60%' }} />
      <Skeleton variant='text' level='body-xs' sx={{ width: '30%' }} />
    </Box>
    <Skeleton variant='circular' width={20} height={20} sx={{ mr: 1 }} />
  </Box>
)

/** Overrides a tick shows at once, until the list comes back with it. */
const useOptimisticTicks = (tasks, onReload) => {
  const [ticks, setTicks] = React.useState({})
  const shown = React.useMemo(
    () =>
      tasks.map((task) => {
        const tick = ticks[idOf(task)]
        return tick === undefined ? task : { ...task, is_completed: tick, updated_at: new Date().toISOString() }
      }),
    [tasks, ticks]
  )
  const toggle = async (task) => {
    const id = idOf(task)
    const next = !task.is_completed
    setTicks((prev) => ({ ...prev, [id]: next }))
    try {
      await tasksService.update(id, { is_completed: next })
      await onReload()
    } catch {
      // Left as it was: the list is the record.
    } finally {
      setTicks(({ [id]: _drop, ...rest }) => rest)
    }
  }
  return { shown, toggle }
}

const TasksTab = ({ tasks, loading, error, onReload, onOpenTask }) => {
  const { t, i18n } = useTranslation()
  const language = i18n?.language ?? 'en'
  const { lists, create, rename, remove } = useTaskLists()
  const [listId, setListId] = React.useState(null)
  const [dialog, setDialog] = React.useState(null) // null | 'new' | 'edit'
  const [openUpcoming, setOpenUpcoming] = React.useState(false)
  const [openDone, setOpenDone] = React.useState(false)
  const { shown, toggle } = useOptimisticTicks(tasks, onReload)

  const now = new Date()
  const day = dayTasks(shown, now)
  const knownList = lists.some((list) => list.id === listId) ? listId : null

  const rows = (items) =>
    items.map((task, index) => (
      <React.Fragment key={idOf(task)}>
        {index > 0 && <Divider />}
        <TaskRow task={task} lists={lists} now={now} language={language} onToggle={toggle} onOpen={onOpenTask} t={t} />
      </React.Fragment>
    ))

  const body = () => {
    if (loading && tasks.length === 0) {
      return (
        <>
          <Divider />
          <RowSkeleton />
          <Divider />
          <RowSkeleton />
        </>
      )
    }
    if (error && tasks.length === 0) {
      return (
        <>
          <Divider />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, pl: '72px' }} role='alert'>
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              {t('tasks.day.error')}
            </Typography>
            <Button size='sm' variant='outlined' color='neutral' onClick={onReload} sx={focusRing}>
              {t('common.retry')}
            </Button>
          </Box>
        </>
      )
    }
    return (
      <>
        <Divider />
        {day.open.length === 0 ? (
          <Typography level='body-sm' sx={{ color: 'text.secondary', py: 1.5, pl: '72px' }}>
            {t('tasks.day.empty')}
          </Typography>
        ) : (
          rows(day.open)
        )}
        {day.upcoming.length > 0 && (
          <Disclosure
            id='home-tasks-upcoming'
            label={t('tasks.day.upcoming')}
            count={day.upcoming.length}
            open={openUpcoming}
            onToggle={() => setOpenUpcoming((v) => !v)}
          >
            <Divider />
            {rows(day.upcoming)}
          </Disclosure>
        )}
        {day.done.length > 0 && (
          <Disclosure
            id='home-tasks-done'
            label={t('tasks.filter.completed')}
            count={day.done.length}
            open={openDone}
            onToggle={() => setOpenDone((v) => !v)}
          >
            <Divider />
            {rows(day.done)}
          </Disclosure>
        )}
      </>
    )
  }

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 1.5, mx: -1.5 }} data-testid='home-tasks-tab'>
      <CaptureRow
        lists={lists}
        listId={knownList}
        onListChange={setListId}
        onAdded={onReload}
        onNewList={() => setDialog('new')}
        onEditLists={() => setDialog('edit')}
        t={t}
      />
      {body()}
      <TaskListsDialog
        open={Boolean(dialog)}
        autoFocusNew={dialog === 'new'}
        onClose={() => setDialog(null)}
        lists={lists}
        onCreate={async (name) => {
          const list = await create(name)
          if (dialog === 'new' && list?.id) {
            setListId(list.id)
            setDialog(null)
          }
        }}
        onRename={rename}
        onRemove={remove}
      />
    </Box>
  )
}

export default TasksTab

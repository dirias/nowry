import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, Divider, Sheet, Skeleton, Stack, Tab, TabList, TabPanel, Tabs, Typography, Link as JoyLink } from '@mui/joy'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import { useTaskData } from '@nowry/core/hooks/useTaskData'
import { useTaskLists } from '@nowry/core/hooks/useTaskLists'
import { useToday } from '@nowry/core/hooks/useToday'
import { useBlockLog } from '@nowry/core/hooks/useBlockLog'
import { useBlocks } from '@nowry/core/hooks/useBlocks'
import useAnnualPlan from '@nowry/core/hooks/useAnnualPlan'
import { useAuth } from '@nowry/core/context/AuthContext'
import { usePomodoro } from '@nowry/core/context/PomodoroContext'
import { stateOf } from '@nowry/core/domain/blocks'
import { dayTasks } from '@nowry/core/domain/taskQueue'
import { useTodayData } from '../../Study/useTodayData'
import { focusRing, listRow, segment, segmentedGroup, tabularNums } from '../../Common/Form/formStyles'
import { BlockTile, blockMeta } from '../../Calendar/blockEvents'
import ItemSheet from '../../Calendar/ItemSheet'
import { DayEdge, DayFootRow, DayRow } from './DayRow'
import TasksTab from './TasksTab'
import { useLegacyTaskListImport } from './useLegacyTaskListImport'

/**
 * Home's day panel (PLAN-008, PLAN-018, PLAN-019): one segment over two tabs,
 * Now and Tasks, that draw one row (ADR-021 amendment 2026-10-17). Each tab's
 * count is the rows above its foot; the edge under the segment is the tab's
 * progress. A row's title opens the item sheet; its circle is its one action.
 */

/** The Now tab: current, next, and this many of what follows — a glance, not the timeline. */
const LATER_SHOWN = 3
/** When the day is spent, the last blocks it held, read back. */
const PAST_SHOWN = 3

/** The rows ahead of the clock: current, next, and a few of what follows (the phone's `aheadOf`). */
const aheadOf = (day) => (day?.current ? [day.current, day.next, ...(day.later ?? []).slice(0, LATER_SHOWN)].filter(Boolean) : [])

/**
 * A tab's panel. Its list reaches 12px past each side (`listRow`'s hover ground,
 * PLAN-018), so the panel must not clip: a clipping box with content past its
 * edge scrolls sideways the moment a control at that edge takes focus. The
 * height is bounded by `minHeight: 0` instead, so the list scrolls inside it.
 */
const tabPanelSx = { p: '0 !important', m: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'visible' }

const SideMenu = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const timer = usePomodoro()

  // The panel opens on Now (PLAN-008): the clock is the reader, not a tab.
  const [activeTab, setActiveTab] = React.useState('now')
  const [sheet, setSheet] = React.useState(null)

  const { tasks, loading: tasksLoading, error: tasksError, reload: reloadTasks } = useTaskData()
  const { importLegacy } = useTaskLists()
  useLegacyTaskListImport(importLegacy, Boolean(user?.id))

  /*
   * The one spine (PRD D9): the same hook the calendar's Day reads, fed the
   * same due count the Today object shows, so Home and the calendar cannot
   * disagree about a block or its state.
   */
  const { dueToday } = useTodayData()
  const day = useToday({ dueToday })
  const { blocks } = useBlocks({ from: day.date, to: day.date })
  const log = useBlockLog()
  const { focusAreas } = useAnnualPlan()

  const taskDay = dayTasks(tasks)
  const tabs = [
    { value: 'now', label: t('blocks.home.now'), count: aheadOf(day).length },
    { value: 'tasks', label: t('tasks.title'), count: taskDay.open.length }
  ]
  const edge =
    activeTab === 'now'
      ? { rate: day.kept.rate, label: t('blocks.keptOf', { kept: day.kept.kept, total: day.kept.planned }) }
      : {
          rate: taskDay.rate,
          label: t('tasks.day.edgeAria', { done: taskDay.done.length, total: taskDay.done.length + taskDay.open.length })
        }

  const startBlock = (occurrence) => {
    timer.startBlock(occurrence)
    if (occurrence.block?.source?.type === 'study') {
      timer.setShowWidget(false)
      navigate(`/study/daily-review?limit=${Math.max(1, Math.round((occurrence.lengthMin || 0) * 1.5))}`)
    }
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
        {/* One segment with words and counts (PLAN-018, ADR-020: engaged = level2 ground + underline). */}
        <TabList disableUnderline sx={{ ...segmentedGroup, mb: 1, flexShrink: 0, p: 0, gap: 0 }}>
          {tabs.map((tab, index) => (
            <Tab
              key={tab.value}
              disableIndicator
              value={tab.value}
              variant='plain'
              color='neutral'
              sx={{ ...segment(activeTab === tab.value, index === 0), flex: 1, gap: 0.75, ...focusRing }}
            >
              {tab.label}
              {tab.count > 0 && (
                <Typography component='span' level='body-sm' sx={{ color: 'text.tertiary', ...tabularNums }}>
                  {tab.count}
                </Typography>
              )}
            </Tab>
          ))}
        </TabList>

        {/* Progress is the edge under the tabs, on both (§15.4). */}
        <DayEdge rate={edge.rate} label={edge.label} />

        {activeTab === 'now' && (
          <TabPanel value='now' sx={tabPanelSx}>
            <NowTab
              day={day}
              log={log}
              focusAreas={focusAreas}
              onOpen={(occurrence) => setSheet({ source: { block: occurrence.block, occurrence } })}
              t={t}
            />
          </TabPanel>
        )}

        {activeTab === 'tasks' && (
          <TabPanel value='tasks' sx={tabPanelSx}>
            <TasksTab
              tasks={tasks}
              loading={tasksLoading}
              error={tasksError}
              onReload={reloadTasks}
              onOpenTask={(task) => setSheet({ source: { task } })}
            />
          </TabPanel>
        )}
      </Tabs>

      {/* The item sheet (PLAN-012): editing, flagging, moving and deleting live here. */}
      <ItemSheet
        key={sheet?.source?.block?.id ?? sheet?.source?.task?._id ?? 'closed'}
        open={Boolean(sheet)}
        onClose={() => setSheet(null)}
        onSaved={reloadTasks}
        mode={sheet ? 'edit' : 'create'}
        source={sheet?.source ?? null}
        prefill={null}
        blocks={blocks ?? []}
        onStart={startBlock}
      />
    </Sheet>
  )
}

/**
 * The day around the clock: now · next · later, from the one spine (PRD D9).
 * Every row carries the tick (PLAN-017); the title opens the block's sheet,
 * where Start lives. When the day is spent the tab reads the last blocks back.
 */
const NowTab = ({ day, log, focusAreas, onOpen, t }) => {
  const toggle = (o) => (o.log?.status === 'kept' ? log.undo(o) : log.keep(o))

  if (day.loading && day.occurrences.length === 0) {
    return (
      <Stack>
        {[0, 1].map((i) => (
          <Box key={i} sx={{ ...listRow, gap: 1.5 }} aria-hidden='true'>
            <Skeleton variant='text' level='body-xs' sx={{ width: 30 }} />
            <Skeleton variant='rectangular' width={16} height={16} sx={{ borderRadius: 'xs', flexShrink: 0 }} />
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

  const ahead = aheadOf(day)
  const spent = ahead.length === 0
  const rows = spent ? day.past.slice(-PAST_SHOWN) : ahead

  return (
    // `listRow` reaches 12px past its column (mx -1.5) so its hover ground lines up;
    // a vertical scroller turns that into a sideways one unless it makes room (PLAN-018).
    <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 1.5, mx: -1.5 }}>
      {spent && (
        <Typography level='body-xs' sx={{ color: 'text.tertiary', pb: 1 }}>
          {t('blocks.home.dayDone')}
        </Typography>
      )}

      {rows.map((o, index) => (
        <React.Fragment key={`${o.blockId}|${o.date}`}>
          {index > 0 && <Divider />}
          <NowRow occurrence={o} nowMinutes={day.nowMinutes} focusAreas={focusAreas} onToggle={toggle} onOpen={onOpen} t={t} />
        </React.Fragment>
      ))}

      {/* The way into working the day, at the foot of what it holds, on the rows' rails. */}
      <Divider />
      <DayFootRow component={RouterLink} to='/calendar' glyph={<CalendarTodayOutlinedIcon />}>
        {t('blocks.home.openDay')}
      </DayFootRow>
    </Box>
  )
}

const NowRow = ({ occurrence, nowMinutes, focusAreas, onToggle, onOpen, t }) => {
  const state = stateOf(occurrence, nowMinutes)
  const kept = state === 'kept' || state === 'partial'
  const title = occurrence.title || occurrence.block?.title || ''
  return (
    <DayRow
      testId='home-block-row'
      state={state}
      lead={occurrence.start}
      leadTone={state === 'running' ? 'now' : 'quiet'}
      // The tile is a label, never a control (§15.8, PLAN-018).
      tile={<BlockTile occurrence={occurrence} focusAreas={focusAreas} />}
      title={title}
      meta={blockMeta(occurrence, t)}
      done={kept}
      struck={state === 'skipped'}
      onOpen={() => onOpen(occurrence)}
      openLabel={t('blocks.row.openAria', { title })}
      tickLabel={kept ? t('calendarPage.blocks.undoKept') : t('calendarPage.blocks.markKept')}
      onToggle={() => onToggle(occurrence)}
    />
  )
}

export default SideMenu

/**
 * Home (MOB-018, MOB-074, MOB-075, and matched to the web's mobile view in MOB-079).
 *
 * **This screen is the web's Home page, on a phone.** Not an interpretation of
 * it and not a proposal for it — the standing instruction on this project, and
 * the one this file has now been corrected against three times. What the web
 * puts on Home, in the order it puts it, is what is here.
 *
 * Read from `src/components/User/Home/Home.js`, whose mobile column is:
 *
 *   1. a header — the greeting, one motivational line, and the review key
 *   2. `FocusBar` — ONE row of small chips: three areas by percentage, two
 *      priorities by deadline
 *   3. `SideMenu` — ONE panel whose four tabs are morning, afternoon, evening
 *      and tasks
 *   4. the news carousel
 *
 * Three faults it was reported with, all of them structural:
 *
 * - **The header was a dashboard.** A summary object carrying four readouts, a
 *   progress bar, a study key and a second smaller one. The web's header is a
 *   greeting, a line of encouragement and one key. Everything that was in those
 *   readouts is a number the Study Center already draws, on the tab next door.
 * - **Tasks and the routine were two sections.** On the web they are one panel
 *   and the tasks are its fourth tab. Two headings a screen apart for one
 *   object is not the same object.
 * - **The focus areas were a section.** Three rows with names, ratios, measures
 *   and percentages, plus a second section under it for the priorities. On the
 *   web both are chips in a single 38px strip: 🏠 96%, 💪 75%, 💰 73%. The
 *   annual plan is glanced at from Home and edited in Planning.
 *
 * **What is deliberately still different**, because a phone is not a browser:
 * the routine's four tabs carry WORDS here rather than the web's four
 * unlabelled glyphs (an unnamed icon is not a name, MOB-062), and the header
 * has no calendar or blackboard button — the calendar is a tab in the bar
 * below, and the blackboard is not built for this client.
 *
 * **The companion is not here** (MOB-089). MOB-050 gave it a panel on this
 * screen on the reasoning that a phone cannot float a thing over every page. It
 * can — §15.6 says the companion rests in a corner and a phone keeps only the
 * chip there — and what the panel actually carried was a level, a progress bar,
 * an XP line and a rename, none of which the web's Home shows and which
 * together took more of this column than the day's tasks. The pet is a bubble
 * over the tabs now; its readouts are in Settings, where the web keeps them.
 *
 * Skeletons, never a page gate. The layout the reader is about to see is
 * already there while the numbers arrive, so nothing moves when they do.
 */
import { useMemo, useState } from 'react'
import { Image, Linking, Pressable, ScrollView, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useAuth } from '@nowry/core/context/AuthContext'
import { useStatistics } from '@nowry/core/hooks/useStatistics'
import { useDeckData } from '@nowry/core/hooks/useDeckData'
import { useTaskData } from '@nowry/core/hooks/useTaskData'
import { useDailyRoutine } from '@nowry/core/hooks/useDailyRoutine'
import { useAnnualPlan } from '@nowry/core/hooks/useAnnualPlan'
import { tasksService } from '@nowry/core/api/services'
import { studySummary } from '@nowry/core/domain/studySummary'
import { deadlineReadout, watchedPriorities } from '@nowry/core/domain/priorityWatch'
import { dueTodayCount, taskCategory, taskDueState, tasksDueToday } from '@nowry/core/domain/taskQueue'
import {
  ROUTINE_PERIODS,
  completedToday,
  currentPeriod,
  routineItemTitle,
  routineItems,
  toggledCompletions,
  todayKey
} from '@nowry/core/domain/dailyRoutine'
import { useNews } from '@nowry/core/hooks/useNews'
import { unfavourited, useNewsFavourites } from '@nowry/core/hooks/useNewsFavourites'
import { annualPlanningService } from '@nowry/core/api/services'
import { DAILY_REVIEW } from '../../src/screens/StudySession'
import { useTheme } from '../../src/theme'
import {
  Button,
  Checkbox,
  Chip,
  Divider,
  Input,
  Icon,
  IconButton,
  LIST_ROW_HEIGHT,
  ListRow,
  NextStepsPanel,
  Progress,
  Readout,
  Screen,
  SectionHeader,
  Segmented,
  Sheet,
  Skeleton,
  Stack,
  Typography,
  resolveColor
} from '../../src/ui'

/** The board's count, and the web's. */
const TASKS_SHOWN = 4
/** Enough to be a carousel, few enough that a cold open is not ten images. */
const NEWS_SHOWN = 6
/** The web's own two numbers for its strip: three areas, two priorities. */
const AREAS_SHOWN = 3
const PRIORITIES_SHOWN = 2
/** The tab the web's panel gives its task list, beside the three periods. */
const TASKS_TAB = 'tasks'
/**
 * The narrowest the greeting may be squeezed before the review key drops to
 * its own line. Roughly the longest word in it at the default size — below
 * that, a word no longer fits on one line and the title breaks mid-word.
 */
const GREETING_MIN = 200
/**
 * `ListRow`'s own horizontal padding, which its pressed ground needs and which
 * therefore sets the rail every row's content sits on. The capture row and the
 * done disclosure are not `ListRow`s — one holds a field and the other a
 * caret — so they have to be told the rail, or they land 12pt to the left of
 * every task under them, which is the misalignment the redesign is about.
 */
const ROW_RAIL = 1.5

export default function Home() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const theme = useTheme()
  const { user } = useAuth()

  const { statistics, loading: statsLoading, error: statsError } = useStatistics()
  const deckData = useDeckData(null)
  const taskData = useTaskData()
  const { routine, invalidate: reloadRoutine } = useDailyRoutine()
  const plan = useAnnualPlan()

  /*
   * `studySummary` is the one reader of these field names. Home used to take
   * its deck count from the statistics summary, which has no such field, so it
   * printed "0 decks" beside a real due count on every account that has decks.
   */
  const today = studySummary({ decks: deckData.decks, statistics })
  const loading = statsLoading || deckData.loading
  const statsMissing = Boolean(statsError) && !statistics

  /*
   * The web's caption under its greeting, picked once per mount rather than
   * per render — a phrase that changes while you read it is a flicker, not a
   * greeting.
   */
  const motivation = useMemo(() => {
    const phrases = t('motivation.phrases', { returnObjects: true })
    return Array.isArray(phrases) && phrases.length > 0 ? phrases[Math.floor(Math.random() * phrases.length)] : null
  }, [t])

  const areas = plan.focusAreas ?? []
  const watching = watchedPriorities(plan.priorities, plan.goals, plan.preferredPriorityIds)

  return (
    <Screen>
      <Stack spacing={3}>
        <Greeting
          name={user?.username ?? user?.email ?? ''}
          motivation={motivation}
          due={today.asked}
          loading={loading}
          statsMissing={statsMissing}
          onReview={() => router.push(`/study/${DAILY_REVIEW}`)}
          theme={theme}
          t={t}
        />

        {/* An error is stated here, not thrown at the page: everything below
            still renders, because a failed statistics call is not a reason to
            lose Home. */}
        {statsMissing ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t('home.loadFailed')}
          </Typography>
        ) : null}

        <FocusBar
          areas={areas}
          priorities={watching}
          loading={plan.loading}
          language={i18n?.language ?? 'en'}
          onOpenArea={(id) => router.push(`/calendar/area/${id}`)}
          onOpenPlan={() => router.push('/annual-planning')}
          t={t}
        />

        <DayPanel
          routine={routine}
          reloadRoutine={reloadRoutine}
          tasks={taskData.tasks}
          tasksCount={dueTodayCount(taskData.tasks)}
          tasksLoading={taskData.loading}
          reloadTasks={taskData.reload}
          onEditRoutine={() => router.push('/annual-planning/daily-routine')}
          theme={theme}
          t={t}
        />

        {/* No companion here (MOB-089). The web's Home has none — the pet is a
            floating bubble over every page, and the level, the bar and the
            rename live on its settings page. A panel carrying all three took
            more of this column than the day's tasks did. */}
        <News theme={theme} t={t} />

        <NextStepsPanel />
      </Stack>
    </Screen>
  )
}

/**
 * The web's header, which is three things and no more: who you are, one line
 * of encouragement, and the only key on the page.
 *
 * What it replaced was a summary object with four readouts and a progress bar —
 * a dashboard of the study queue sitting on top of a page whose subject is the
 * day. The Study Center is one tab away and draws all of it better; Home's job
 * here is to say how many cards are waiting and offer to start.
 *
 * "All caught up" is the web's own empty branch, and it is a sentence rather
 * than a key, because there is nothing to press.
 */
function Greeting({ name, motivation, due, loading, statsMissing, onReview, theme, t }) {
  return (
    /*
     * The row wraps, as the web's header does. At the accessibility text sizes
     * the key needs most of the width, and a greeting squeezed into what is
     * left breaks mid-word — "¡Bienv / enido / de n / uevo". `minWidth` is what
     * forces the wrap: below it the key drops to its own line and both are
     * whole (MOB-083).
     */
    <Stack direction='row' spacing={2} flexWrap='wrap' style={{ alignItems: 'flex-start' }}>
      <View style={{ flex: 1, minWidth: GREETING_MIN, gap: theme.spacing[0.5] }}>
        <Typography level='h4'>{t('dashboard.welcome', { name })}</Typography>
        {motivation ? (
          <Typography level='body-xs' color='text.secondary'>
            {motivation}
          </Typography>
        ) : null}
      </View>

      {loading ? (
        <Skeleton width={128} height={36} />
      ) : statsMissing ? null : due > 0 ? (
        <Button size='sm' variant='secondary' onPress={onReview}>
          {t('dashboard.dailyFocus.reviewCount', { count: due })}
        </Button>
      ) : (
        <Typography level='body-sm' color='text.secondary' style={{ maxWidth: 140, textAlign: 'right' }}>
          {t('dashboard.dailyFocus.allCaughtUp')}
        </Typography>
      )}
    </Stack>
  )
}

/**
 * The annual plan, at a glance — one row of chips, which is all the web gives
 * it on Home.
 *
 * This replaced two full sections: the focus areas as rows with names, ratios,
 * measures and percentages, and the watched priorities as rows under them. Both
 * were built to a proposal rather than to the page, and both are `FocusBar` on
 * the web: three areas as `icon + progress%`, two priorities as
 * `title + days left`, in a strip 38 pixels tall.
 *
 * **The percentage is the area's own.** The web reads `area.progress` and does
 * not derive one from the goals it happens to hold — a number computed two ways
 * is a number that disagrees with itself on two screens.
 *
 * **No container around it.** The web draws a bordered bar because its strip
 * sits in a wide column with air on both sides; a phone's row is already the
 * width of the screen, and a bordered bar of bordered chips is two frames for
 * one line.
 *
 * Which priorities appear is the user's stored preference, read by
 * `watchedPriorities`. Choosing them is the web's modal, and choosing is work:
 * Planning is where it belongs, and this is the tap that opens it.
 */
function FocusBar({ areas, priorities, loading, language, onOpenArea, onOpenPlan, t }) {
  if (loading && areas.length === 0 && priorities.length === 0) {
    return <Skeleton width='100%' height={28} />
  }

  // The web renders nothing at all when there is neither an area nor a
  // priority: an empty strip is a frame around an absence.
  if (areas.length === 0 && priorities.length === 0) return null

  const when = (priority) => {
    const readout = deadlineReadout(priority)
    if (!readout) return null
    if (readout.key) return t(readout.key, readout.params)
    // A key of null means no phrase fits this distance; the date is the
    // readout, and only this side knows the reader's locale.
    return new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' }).format(new Date(readout.params.date))
  }

  return (
    <Stack direction='row' spacing={1} flexWrap='wrap' style={{ alignItems: 'center' }}>
      {areas.slice(0, AREAS_SHOWN).map((area) => (
        <Chip
          key={area._id ?? area.id}
          startGlyph={<Typography level='body-xs'>{area.icon || '🎯'}</Typography>}
          accessibilityLabel={`${area.name}: ${area.progress || 0}%`}
          onPress={() => onOpenArea(area._id ?? area.id)}
        >
          {`${area.progress || 0}%`}
        </Chip>
      ))}

      {priorities.slice(0, PRIORITIES_SHOWN).map((priority) => (
        <Chip
          key={priority._id ?? priority.id}
          endGlyph={
            when(priority) ? (
              <Typography level='body-xs' color='text.tertiary'>
                {when(priority)}
              </Typography>
            ) : null
          }
          style={{ flexShrink: 1 }}
          onPress={onOpenPlan}
        >
          {priority.title || priority.name}
        </Chip>
      ))}

      {/* The web's own empty branch, and it only appears once there are areas:
          a page with no plan at all says nothing rather than asking for one. */}
      {priorities.length === 0 && areas.length > 0 ? (
        <>
          <Typography level='body-xs' color='text.tertiary'>
            {t('focusBar.noPrioritiesYet')}
          </Typography>
          <Button size='sm' variant='tertiary' onPress={onOpenPlan}>
            {t('focusBar.createPriority')}
          </Button>
        </>
      ) : null}
    </Stack>
  )
}

/**
 * The day, as one panel with four tabs — the web's `SideMenu`, and the largest
 * object on its Home. Redrawn to the day-panel canvas, direction A (MOB-081).
 *
 * Tasks and the routine were two separate sections here, a screen apart, each
 * with its own heading. They are one object: the same question asked four ways,
 * which is what the single tab strip says and two headings cannot.
 *
 * **It opens on the period the clock is in**, as the web's does. Looking at
 * tonight at two in the afternoon is a normal want, so the tabs stay. It used
 * to hunt for a period with something in it and fall through to the tasks,
 * because an empty routine tab was a dead end: there was no routine editor, so
 * the empty state could offer nothing. There is one now (MOB-084), so the
 * fallback is gone and an empty morning says what to do about it.
 *
 * **The tabs carry words.** The web's four are unlabelled glyphs and its own
 * design canvas calls that the right idea drawn wrong. This is the one place
 * this screen deliberately differs, and it is the difference between a control
 * a screen reader can name and one it cannot.
 *
 * What the day-panel canvas changed, and why each one is a rule rather than a
 * taste:
 *
 * - **The ground.** It was `level1` with a hairline, which is the ground that
 *   means *pressable* (§15.1) — so the thing the controls act on was drawn as a
 *   control, and the companion below it on Home, which is decoration, was the
 *   one drawn on `surface`. The ladder was inverted. It is a `surface` sheet
 *   now, lifted once, and the segmented control's own `level1` ground is
 *   legible again for the first time: it used to sit on `level1` inside
 *   `level1` and vanish, leaving the cell hairlines floating.
 * - **Progress is the edge under the tabs** (§15.4), 3pt, exactly content
 *   width, doing the divider's job as well. The day's ratio was a sentence
 *   before, or nothing.
 * - **Capture is the first ROW of the list**, not a form above it. A bordered
 *   field and a second button, forty points tall and aligned to nothing below
 *   them, on the one interaction this panel should be fastest at. It is still
 *   zero taps to type.
 * - **The status filters are gone.** Three chips cutting the day three ways,
 *   directly under four tabs cutting it four ways — two segmented ideas stacked
 *   (§15.2). What they were for was making a tick reversible, and that is the
 *   list's job: the done tasks sit behind one disclosure at the foot.
 * - **The period's name is not repeated inside its own tab.** The same fix the
 *   news carousel already took — which is why the way into the editor is a row
 *   at the foot of the list rather than a pencil on a heading that no longer
 *   exists.
 *
 * Ticking is the verb the routine has here, and writing it is one tap away
 * rather than absent: the edit row at the foot of the list opens the editor,
 * and so does the empty state's key. Tasks get capture as well — writing a
 * thought down is not managing tasks, and a phone is where the thought
 * arrives.
 */
function DayPanel({ routine, reloadRoutine, tasks, tasksCount, tasksLoading, reloadTasks, onEditRoutine, theme, t }) {
  /*
   * The period the clock is in, read once when the panel mounts. A routine that
   * arrives a moment later does not move the tab under the reader's thumb.
   */
  const [tab, setTab] = useState(() => currentPeriod())

  const onTasks = tab === TASKS_TAB
  const done = completedToday(routine)
  const items = onTasks ? [] : routineItems(routine, tab)

  /*
   * The ratio the edge draws. Both halves come from the tab in hand: the day's
   * tasks, or the period's items. A tab with nothing in it draws an empty edge
   * rather than none, so the panel is the same shape on all four — a container
   * that resizes when you change tabs reads as four different objects.
   */
  const ratio = onTasks
    ? { done: tasksDueToday(tasks, { status: 'completed' }).length, total: tasksDueToday(tasks, { status: 'all' }).length }
    : { done: items.filter((item) => done.has(item.id)).length, total: items.length }

  return (
    <Sheet padding={2} elevation='sm'>
      <Stack spacing={2}>
        <Stack spacing={1}>
          <Segmented
            accessibilityLabel={t('annualPlanning.dailyRoutine.title')}
            value={tab}
            onChange={setTab}
            options={[
              ...ROUTINE_PERIODS.map((name) => ({
                value: name,
                /* Short labels, as the focus timer's modes already carry: the
                   full "Morning Routine" is three words on a quarter of 390pt. */
                label: t(`annualPlanning.dailyRoutine.short.${name}`),
                count: routineItems(routine, name).length || undefined
              })),
              { value: TASKS_TAB, label: t('tasks.title'), count: tasksCount || undefined }
            ]}
          />
          <Progress
            value={ratio.total > 0 ? (ratio.done / ratio.total) * 100 : 0}
            accessibilityLabel={t('tasks.progress.label', { done: ratio.done, total: ratio.total })}
          />
        </Stack>

        {onTasks ? (
          <TaskTab tasks={tasks} loading={tasksLoading} onReload={reloadTasks} theme={theme} t={t} />
        ) : (
          <RoutineTab period={tab} items={items} done={done} routine={routine} onReload={reloadRoutine} onEdit={onEditRoutine} t={t} />
        )}
      </Stack>
    </Sheet>
  )
}

/**
 * One period of the routine: its items, and the way into writing them.
 *
 * The editor was written, removed when it turned out there was nothing to open
 * — the phone could tick a routine item and nothing anywhere could create one —
 * and is reachable again now that there is one (MOB-084).
 *
 * **The way in is a row at the foot, not a pencil on a heading.** The heading
 * is gone: the tab above already says which period this is, and repeating it
 * inside its own tab is the fault the news carousel was corrected for
 * (MOB-081). A row is also the anatomy this panel already uses for the other
 * verb it keeps — the tasks tab opens with a capture row, so the routine
 * closing with an edit row is the same object, said twice.
 */
function RoutineTab({ period, items, done, routine, onReload, onEdit, t }) {
  const [pending, setPending] = useState(null)

  const toggle = async (item) => {
    setPending(item.id)
    try {
      await annualPlanningService.updateRoutineCompletions(todayKey(), toggledCompletions(routine, item.id))
      await onReload?.()
    } catch {
      // The interceptor reports it; the tick simply does not take.
    } finally {
      setPending(null)
    }
  }

  if (items.length === 0) {
    /* Said, and something offered. An empty state that names the thing to do
       and cannot start it is the fault this panel shipped with. */
    return (
      <Stack spacing={1.5} style={{ paddingTop: 8 }}>
        <Typography level='body-md' color='text.secondary'>
          {t(`annualPlanning.dailyRoutine.${period}EmptyTitle`)}
        </Typography>
        <Typography level='body-sm' color='text.tertiary'>
          {t('annualPlanning.dailyRoutine.emptySubtitle')}
        </Typography>
        <Button variant='secondary' onPress={onEdit}>
          {t('annualPlanning.dailyRoutine.emptyCta')}
        </Button>
      </Stack>
    )
  }

  return (
    <View>
      {items.map((item, index) => (
        <View key={item.id}>
          {index === 0 ? null : <Divider />}
          <ListRow
            tile={
              <Checkbox
                checked={done.has(item.id)}
                disabled={pending === item.id}
                onPress={() => toggle(item)}
                accessibilityLabel={t('annualPlanning.dailyRoutine.toggleItem')}
              />
            }
            /* The item's own reader: an item written on the web carries `text`,
               one slotted in from a goal carries `title`, and a screen that
               guessed between them showed blanks for half a routine. */
            name={routineItemTitle(item)}
            onPress={() => toggle(item)}
          />
        </View>
      ))}

      {/* The way into writing them, at the foot of what they are. */}
      <Divider />
      <ListRow
        tile={<Icon name='Pencil' size='sm' color='text.tertiary' />}
        name={t('annualPlanning.dailyRoutine.editRoutine')}
        onPress={onEdit}
      />
    </View>
  )
}

/**
 * The panel's fourth tab: today's tasks, checkable in place, with the two verbs
 * Home keeps.
 *
 * **Capture is a row, not a form.** It carries a `+` where the checkbox goes,
 * so it lands on the same two rails as every task under it, and the field has
 * no box of its own because the row is already the box. Zero taps to type, as
 * before — the point was never to slow it down, it was to stop a form sitting
 * on top of a list.
 *
 * **Done is a disclosure, not a mode.** Ticking a task used to make it vanish
 * with no screen anywhere in this client able to show it again: the calendar's
 * agenda drops the days of the current month that have already passed, so an
 * overdue task is not on it either. Three filter chips fixed that and cost a
 * whole control row; one line at the foot fixes it and costs nothing when there
 * is nothing done (ADR-012).
 *
 * **Late is the one thing a row says about itself.** Two of the three tasks on
 * this account were overdue and every row looked identical. Only `overdue`
 * draws: "today" is what the panel already means, and a readout on every row
 * that says the same word is texture, not information.
 */
function TaskTab({ tasks, loading, onReload, theme, t }) {
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState({})
  const [showDone, setShowDone] = useState(false)

  const shown = tasksDueToday(tasks, { limit: TASKS_SHOWN })
  const finished = tasksDueToday(tasks, { status: 'completed' })

  const add = async () => {
    const title = draft.trim()
    if (!title || saving) return
    setSaving(true)
    try {
      // Due today, because the field sits inside a panel that says today.
      await tasksService.create({ title, deadline: new Date().toISOString() })
      setDraft('')
      await onReload?.()
    } catch {
      // The client's interceptor reports the failure; the text stays in the
      // field so nothing the user typed is lost.
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (task) => {
    const id = task._id ?? task.id
    setBusy((state) => ({ ...state, [id]: true }))
    try {
      await tasksService.toggleComplete(id, task.is_completed)
      await onReload?.()
    } catch {
      // Left unticked; the list is re-read either way.
    } finally {
      setBusy((state) => ({ ...state, [id]: false }))
    }
  }

  const taskRow = (task, { finished: isDone = false } = {}) => {
    const id = task._id ?? task.id
    const late = !isDone && taskDueState(task) === 'overdue'
    return (
      <ListRow
        key={id}
        dimmed={isDone}
        tile={
          <Checkbox
            checked={Boolean(task.is_completed)}
            disabled={Boolean(busy[id])}
            onPress={() => toggle(task)}
            accessibilityLabel={t('calendarPage.agenda.markDone')}
          />
        }
        name={task.title}
        /* Never a raw list id: see `taskCategory`. */
        meta={taskCategory(task)}
        /* The word carries the state, and it lifts to `text.primary` rather
           than turning red: a hue on a dashboard reads as an error (§15.5). */
        readout={late ? <Readout leading>{t('focusBar.overdue')}</Readout> : null}
        onPress={() => toggle(task)}
      />
    )
  }

  return (
    <View>
      {/* The capture row. `Input` keeps its own type scale and placeholder
          colour; only its box is taken off, because the row is the box. */}
      <Stack
        direction='row'
        spacing={1.5}
        style={{ alignItems: 'center', minHeight: LIST_ROW_HEIGHT, paddingHorizontal: theme.spacing[ROW_RAIL] }}
      >
        <View
          importantForAccessibility='no'
          style={{
            width: 22,
            height: 22,
            borderRadius: theme.radius.sm,
            backgroundColor: resolveColor(theme, 'background.level1'),
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Icon name='Plus' size='sm' color='text.secondary' />
        </View>
        <Input
          value={draft}
          onChangeText={setDraft}
          placeholder={t('home.addTaskToday')}
          accessibilityLabel={t('home.addTaskToday')}
          returnKeyType='done'
          onSubmitEditing={add}
          editable={!saving}
          style={{ flex: 1, borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 0, minHeight: LIST_ROW_HEIGHT }}
        />
        {/* The key appears once there is something to save. An always-on
            button beside an empty field is a control that cannot be used. */}
        {draft.trim() ? (
          <Button size='sm' variant='secondary' loading={saving} onPress={add}>
            {t('common.add')}
          </Button>
        ) : null}
      </Stack>

      {loading && shown.length === 0 ? (
        <Stack spacing={1}>
          <Divider />
          <Skeleton width='100%' height={44} />
          <Skeleton width='100%' height={44} />
        </Stack>
      ) : shown.length === 0 ? (
        <>
          <Divider />
          <Typography level='body-sm' color='text.tertiary' style={{ paddingTop: theme.spacing[1] }}>
            {t('calendarPage.agenda.emptyToday')}
          </Typography>
        </>
      ) : (
        shown.map((task) => (
          <View key={task._id ?? task.id}>
            <Divider />
            {taskRow(task)}
          </View>
        ))
      )}

      {/* Nothing done today, nothing to disclose. */}
      {finished.length > 0 ? (
        <View>
          <Divider />
          <Pressable
            onPress={() => setShowDone((open) => !open)}
            accessibilityRole='button'
            accessibilityState={{ expanded: showDone }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing[1],
              minHeight: LIST_ROW_HEIGHT,
              paddingHorizontal: theme.spacing[ROW_RAIL],
              opacity: pressed ? 0.7 : 1
            })}
          >
            <Icon name={showDone ? 'ChevronDown' : 'ChevronRight'} size='sm' color='text.tertiary' />
            <Typography level='body-sm' color='text.secondary'>
              {`${t('tasks.filter.completed')} · ${finished.length}`}
            </Typography>
          </Pressable>
          {showDone
            ? finished.map((task) => (
                <View key={task._id ?? task.id}>
                  <Divider />
                  {taskRow(task, { finished: true })}
                </View>
              ))
            : null}
        </View>
      ) : null}
    </View>
  )
}

/**
 * Reading.
 *
 * The web's carousel is the largest object on its Home and the canvas argues it
 * should not be the page's centre of gravity — but it should be THERE, and it
 * was not here at all. It is the one surface on this screen that asks nothing
 * of the reader, which on a page otherwise made of obligations is doing real
 * work.
 *
 * An article opens in the browser, because it is somebody else's page and this
 * client has no reader for the web.
 */
function News({ theme, t }) {
  /*
   * The reader's own language and interests, off the profile the auth context
   * already holds — which is where the web reads them, and reading them a
   * second way would fire a request that can land after and overwrite the
   * real one (its own note on that hook).
   */
  const { user } = useAuth()
  const preferences = user?.preferences?.general
  const { articles, loading, error } = useNews(preferences?.language, preferences?.interests)
  const { favourites, isFavourite, toggle } = useNewsFavourites(preferences)
  const [tab, setTab] = useState('latest')

  const latest = unfavourited(articles, favourites).slice(0, NEWS_SHOWN)
  const shown = tab === 'latest' ? latest : favourites

  return (
    <View>
      {/* No heading above the segment: the segment IS the heading, and the web
          draws it the same way. A title reading "Latest news" over a tab
          reading "Latest news" is the same words twice (MOB-076). */}
      <Stack style={{ paddingBottom: theme.spacing[1], paddingTop: theme.spacing[1] }}>
        <Segmented
          accessibilityLabel={t('news.title')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'latest', label: t('news.title') },
            { value: 'favourites', label: t('news.favorites'), count: favourites.length || undefined }
          ]}
        />
      </Stack>

      {loading && shown.length === 0 && tab === 'latest' ? (
        <Stack direction='row' spacing={2}>
          <Skeleton width={220} height={168} />
          <Skeleton width={220} height={168} />
        </Stack>
      ) : error && shown.length === 0 && tab === 'latest' ? (
        <Typography level='body-sm' color='text.tertiary'>
          {t('news.loadError')}
        </Typography>
      ) : shown.length === 0 ? (
        <Typography level='body-sm' color='text.tertiary'>
          {tab === 'latest' ? t('news.noArticles') : t('news.noFavoritesHint')}
        </Typography>
      ) : (
        /* A carousel, as the web draws it: a row that scrolls sideways rather
           than a column that pushes everything below it down the screen. */
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing[2] }}>
          {shown.map((article, index) => (
            <View key={article.url ?? index} style={{ width: 220 }}>
              <Pressable
                onPress={() => article.url && Linking.openURL(article.url)}
                accessibilityRole='link'
                accessibilityLabel={article.title}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                {article.urlToImage ? (
                  <Image
                    source={{ uri: article.urlToImage }}
                    style={{ width: 220, height: 110, borderRadius: theme.radius.md, backgroundColor: theme.palette.background.level2 }}
                  />
                ) : (
                  <View
                    style={{ width: 220, height: 110, borderRadius: theme.radius.md, backgroundColor: theme.palette.background.level2 }}
                  />
                )}
                <Typography level='body-sm' numberOfLines={2} style={{ paddingTop: theme.spacing[1] }}>
                  {article.title}
                </Typography>
              </Pressable>

              {/* The star is its OWN control, not a corner of the card: an
                  article opens and a favourite is kept, and one tap must not
                  be able to do the other by accident. */}
              <Pressable
                onPress={() => toggle(article)}
                accessibilityRole='button'
                accessibilityState={{ selected: isFavourite(article) }}
                accessibilityLabel={t('news.favorites')}
                hitSlop={8}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing[0.5],
                  paddingTop: theme.spacing[0.5],
                  opacity: pressed ? 0.7 : 1
                })}
              >
                <Icon
                  name='Star'
                  size='sm'
                  color={isFavourite(article) ? 'warning.plainColor' : 'text.tertiary'}
                  fill={isFavourite(article) ? resolveColor(theme, 'warning.plainColor') : 'none'}
                />
                {/* The category the feed was fetched under, which `useNews`
                    tags onto every article — the web's card shows the same
                    thing, and the RSS titles already carry their publication. */}
                <Typography level='body-xs' color='text.tertiary' numberOfLines={1} style={{ flexShrink: 1 }}>
                  {article.category ? t(`news.categories.${article.category}`, article.category) : ''}
                </Typography>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

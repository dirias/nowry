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
 * The companion stays. The web's pet floats over every page, which a phone
 * cannot do; this is where it lives instead (MOB-050).
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
import { TASK_FILTERS, dueTodayCount, taskCategory, tasksDueToday } from '@nowry/core/domain/taskQueue'
import { ROUTINE_PERIODS, completedToday, currentPeriod, routineItems, toggledCompletions, todayKey } from '@nowry/core/domain/dailyRoutine'
import { useNews } from '@nowry/core/hooks/useNews'
import { unfavourited, useNewsFavourites } from '@nowry/core/hooks/useNewsFavourites'
import { annualPlanningService } from '@nowry/core/api/services'
import { DAILY_REVIEW } from '../../src/screens/StudySession'
import { useTheme } from '../../src/theme'
import {
  Button,
  Card,
  Checkbox,
  Chip,
  Divider,
  Input,
  Icon,
  ListRow,
  NextStepsPanel,
  Screen,
  Segmented,
  Skeleton,
  Stack,
  Typography,
  resolveColor
} from '../../src/ui'
import { PetPanel } from '../../src/screens/PetPanel'

/** The board's count, and the web's. */
const TASKS_SHOWN = 4
/** Enough to be a carousel, few enough that a cold open is not ten images. */
const NEWS_SHOWN = 6
/** The web's own two numbers for its strip: three areas, two priorities. */
const AREAS_SHOWN = 3
const PRIORITIES_SHOWN = 2
/** The tab the web's panel gives its task list, beside the three periods. */
const TASKS_TAB = 'tasks'

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
          theme={theme}
          t={t}
        />

        <PetPanel />

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
    <Stack direction='row' spacing={2} style={{ alignItems: 'flex-start' }}>
      <View style={{ flex: 1, gap: theme.spacing[0.5] }}>
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
 * object on its Home.
 *
 * Tasks and the routine were two separate sections here, a screen apart, each
 * with its own heading. They are one object: the same question asked four ways,
 * which is what the single tab strip says and two headings cannot.
 *
 * **It opens on the period the clock is in**, as the web's does. Looking at
 * tonight at two in the afternoon is a normal want, so the tabs stay.
 *
 * **The tabs carry words.** The web's four are unlabelled glyphs and its own
 * design canvas calls that the right idea drawn wrong. This is the one place
 * this screen deliberately differs, and it is the difference between a control
 * a screen reader can name and one it cannot.
 *
 * **It opens on a tab that has something in it.** The clock's period first, as
 * the web does; then any period that does have items; then tasks. The web can
 * afford to open on an empty morning because its empty state offers the editor
 * that fills it — this client has no routine editor at all yet, so opening on
 * an empty tab would be an empty panel with no way forward.
 *
 * Ticking is the one verb the routine has here, and the only one: the routine
 * is WRITTEN on the web and ticked here, which is why there is no pencil.
 * Tasks get one more — capture — because writing a thought down is not managing
 * tasks, and a phone is where the thought arrives.
 */
function DayPanel({ routine, reloadRoutine, tasks, tasksCount, tasksLoading, reloadTasks, theme, t }) {
  const [tab, setTab] = useState(() => openingTab(routine))

  return (
    <Card padding={2}>
      <Stack spacing={2}>
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

        {tab === TASKS_TAB ? (
          <TaskTab tasks={tasks} loading={tasksLoading} onReload={reloadTasks} theme={theme} t={t} />
        ) : (
          <RoutineTab period={tab} routine={routine} onReload={reloadRoutine} t={t} />
        )}
      </Stack>
    </Card>
  )
}

/**
 * The tab to open on: the clock's period if it holds anything, otherwise the
 * first period that does, otherwise the tasks.
 *
 * Read once, when the panel mounts. A routine that arrives a moment later does
 * not move the tab under the reader's thumb.
 */
function openingTab(routine) {
  const now = currentPeriod()
  if (routineItems(routine, now).length > 0) return now
  return ROUTINE_PERIODS.find((name) => routineItems(routine, name).length > 0) ?? TASKS_TAB
}

/** One period of the routine: its name and its items. */
function RoutineTab({ period, routine, onReload, t }) {
  const [pending, setPending] = useState(null)

  const items = routineItems(routine, period)
  const done = completedToday(routine)

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

  return (
    <View>
      <Typography level='title-md'>{t(`annualPlanning.dailyRoutine.${period}`)}</Typography>

      {items.length === 0 ? (
        /* Said, and nothing offered: this client has no routine editor, so a
           key here would be a key to nowhere. */
        <Typography level='body-sm' color='text.tertiary' style={{ paddingTop: 8 }}>
          {t('annualPlanning.dailyRoutine.emptySubtitle')}
        </Typography>
      ) : (
        items.map((item) => (
          <View key={item.id}>
            <Divider />
            <ListRow
              tile={
                <Checkbox
                  checked={done.has(item.id)}
                  disabled={pending === item.id}
                  onPress={() => toggle(item)}
                  accessibilityLabel={t('annualPlanning.dailyRoutine.toggleItem')}
                />
              }
              name={item.text || item.title || ''}
              onPress={() => toggle(item)}
            />
          </View>
        ))
      )}
    </View>
  )
}

/**
 * The panel's fourth tab: today's tasks, checkable in place, with the two verbs
 * Home keeps.
 *
 * The capture field is the exception to the watching rule and it earns it: the
 * web panel's type-and-Enter field is the fastest interaction on it, and
 * sending someone to another screen to write a thought down is a regression.
 *
 * **And the web's three filters, because a tick has to be reversible.** Pending
 * is the default and is what this list has always shown — which meant that
 * ticking a task made it vanish with no screen anywhere in this client able to
 * show it again. The calendar cannot: its agenda drops the days of the current
 * month that have already passed, so an overdue task is not on it either. Three
 * chips fix that and are what the web's own panel carries.
 *
 * Everything else — search, reordering, editing, deleting — is work, and work
 * is not here.
 */
function TaskTab({ tasks, loading, onReload, theme, t }) {
  const [filter, setFilter] = useState('pending')
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState({})

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

  const shown = tasksDueToday(tasks, { limit: TASKS_SHOWN, status: filter })

  return (
    <View>
      <Stack direction='row' spacing={1} style={{ alignItems: 'center', paddingBottom: theme.spacing[1] }}>
        <Input
          value={draft}
          onChangeText={setDraft}
          placeholder={t('home.addTaskToday')}
          accessibilityLabel={t('home.addTaskToday')}
          returnKeyType='done'
          onSubmitEditing={add}
          style={{ flex: 1 }}
        />
        <Button size='md' variant='secondary' loading={saving} disabled={!draft.trim()} onPress={add}>
          {t('common.add')}
        </Button>
      </Stack>

      <Stack direction='row' spacing={1} style={{ paddingBottom: theme.spacing[1] }}>
        {TASK_FILTERS.map((name) => (
          <Chip key={name} selected={filter === name} onPress={() => setFilter(name)}>
            {t(`tasks.filter.${name}`)}
          </Chip>
        ))}
      </Stack>

      {loading && shown.length === 0 ? (
        <Stack spacing={1}>
          <Skeleton width='100%' height={44} />
          <Skeleton width='100%' height={44} />
        </Stack>
      ) : shown.length === 0 ? (
        <Typography level='body-sm' color='text.tertiary'>
          {t('calendarPage.agenda.emptyToday')}
        </Typography>
      ) : (
        shown.map((task) => {
          const id = task._id ?? task.id
          return (
            <View key={id}>
              <Divider />
              <ListRow
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
                onPress={() => toggle(task)}
              />
            </View>
          )
        })
      )}
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

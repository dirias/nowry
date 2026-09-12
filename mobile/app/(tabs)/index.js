/**
 * Home (MOB-018, rebuilt to the Home canvas's phone board in MOB-074).
 *
 * **Home is where you watch. Every other page is where you work.** That is the
 * canvas's rule and it decides everything here: the plan is edited in Planning
 * and watched here, tasks are managed on their own page and checked off here,
 * the study queue is owned by the Study Center and named here in one readout.
 * Applied honestly it also cuts things — the due-deck list, the week's chart
 * and Recent, all of which the Study Center already draws and draws better.
 *
 * What was here before was one summary object and the companion, and then most
 * of a screen of white. The two sections that fill it are not decoration: the
 * focus areas and the chosen priorities are the only content in this product
 * that no other screen surfaces daily, because Planning is a place you visit
 * monthly. Without them Home has no reason to exist.
 *
 * **One exception to the rule, deliberately: capture.** Writing a task down is
 * not managing tasks, and a phone is where a thought arrives. Everything else
 * a task needs — search, filters, reordering, editing — is work, and work is
 * not here.
 *
 * The companion stays. It is not on the canvas board because the web's pet
 * floats over every page, which a phone cannot do; this is where it lives
 * instead (MOB-050).
 *
 * Skeletons, never a page gate. The layout the reader is about to see is
 * already there while the numbers arrive, so nothing moves when they do.
 */
import { useState } from 'react'
import { View } from 'react-native'
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
import { planMetrics } from '@nowry/core/domain/goalDerivation'
import { deadlineReadout, watchedPriorities } from '@nowry/core/domain/priorityWatch'
import { dueTodayCount, routineProgress, taskCategory, tasksDueToday } from '@nowry/core/domain/taskQueue'
import { DAILY_REVIEW } from '../../src/screens/StudySession'
import { useTheme } from '../../src/theme'
import {
  Button,
  Checkbox,
  Divider,
  Input,
  ListRow,
  Measure,
  NextStepsPanel,
  Readout,
  Screen,
  SectionHeader,
  Skeleton,
  Stack,
  SummaryObject,
  Typography
} from '../../src/ui'
import { PetPanel } from '../../src/screens/PetPanel'

/** The board's count, and the web's. */
const TASKS_SHOWN = 4
/** The web's short session, offered only when the day is longer than it. */
const QUICK_SIZE = 10

export default function Home() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const theme = useTheme()
  const { user } = useAuth()

  const { statistics, loading: statsLoading, error: statsError } = useStatistics()
  const deckData = useDeckData(null)
  const taskData = useTaskData()
  const { routine } = useDailyRoutine()
  const plan = useAnnualPlan()

  /*
   * `studySummary` is the one reader of these field names. Home used to take
   * its deck count from the statistics summary, which has no such field, so it
   * printed "0 decks" beside a real due count on every account that has decks.
   */
  const today = studySummary({ decks: deckData.decks, statistics })
  const decks = (deckData.decks ?? []).length
  const loading = statsLoading || deckData.loading
  const statsMissing = Boolean(statsError) && !statistics

  const tasksToday = tasksDueToday(taskData.tasks, { limit: TASKS_SHOWN })
  const tasksCount = dueTodayCount(taskData.tasks)
  const routineToday = routineProgress(routine)

  const areas = plan.focusAreas ?? []
  const watching = watchedPriorities(plan.priorities, plan.goals, plan.preferredPriorityIds)

  return (
    <Screen>
      <Stack spacing={3}>
        <SummaryObject
          title={t('auth.welcomeBack')}
          context={user?.username ?? user?.email ?? undefined}
          readouts={
            loading ? (
              <Stack direction='row' spacing={2}>
                <Skeleton width={72} height={14} />
                <Skeleton width={64} height={14} />
                <Skeleton width={56} height={14} />
              </Stack>
            ) : statsMissing ? null : (
              <>
                {/*
                 * The one line in the product where every domain's number
                 * stands in one sentence. That is what the Today object is
                 * FOR, and it read "due · streak · decks" — three numbers from
                 * one domain (MOB-074).
                 *
                 * Each is a translated phrase and each renders only above zero
                 * (ADR-012): a dashboard that counts what you do not have is
                 * telling you about an absence.
                 */}
                <Readout leading>{t('study.dueCount', { count: today.due })}</Readout>
                {tasksCount > 0 ? <Readout>{t('home.tasksToday', { count: tasksCount })}</Readout> : null}
                {routineToday ? (
                  <Readout>{t('annualPlanning.header.routineRatio', { completed: routineToday.done, total: routineToday.total })}</Readout>
                ) : null}
                <Readout>
                  {today.streak > 0 ? t('study.empty.streakLabel', { count: today.streak }) : t('study.empty.streakZeroLabel')}
                </Readout>
              </>
            )
          }
          /*
           * Empty is the same object with one sentence (ADR-021 §1) — never a
           * centred block that replaces the object the user will use tomorrow.
           */
          empty={!loading && !statsMissing && today.due === 0 && decks === 0 ? t('study.empty.noDecks') : null}
          progress={loading || statsMissing ? null : today.progress}
          progressLabel={loading || statsMissing ? null : t('study.today.progress', { done: today.reviewedToday, total: today.dayTotal })}
          action={
            <Button size='md' onPress={() => router.push(`/study/${DAILY_REVIEW}`)}>
              {today.asked > 0 ? t('study.today.study', { count: today.asked }) : t('study.startStudying')}
            </Button>
          }
          secondary={
            today.asked > QUICK_SIZE ? (
              <Button
                size='md'
                variant='secondary'
                onPress={() => router.push(`/study/${DAILY_REVIEW}?limit=${QUICK_SIZE}`)}
                accessibilityLabel={t('study.today.quickAria', { count: QUICK_SIZE })}
              >
                {t('study.today.quick', { count: QUICK_SIZE })}
              </Button>
            ) : null
          }
        />

        {/* An error is stated here, not thrown at the page: the object above
            still renders, because a failed statistics call is not a reason to
            lose Home. */}
        {statsMissing ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t('home.loadFailed')}
          </Typography>
        ) : null}

        <TodayTasks tasks={tasksToday} total={tasksCount} loading={taskData.loading} onReload={taskData.reload} theme={theme} t={t} />

        <ThisYear
          areas={areas}
          goals={plan.goals}
          loading={plan.loading}
          onOpen={() => router.push('/annual-planning')}
          theme={theme}
          t={t}
        />

        <Watching priorities={watching} areas={areas} language={i18n?.language ?? 'en'} theme={theme} t={t} />

        <PetPanel />

        <NextStepsPanel />
      </Stack>
    </Screen>
  )
}

/**
 * Today's tasks, checkable in place, with the one verb Home keeps.
 *
 * The capture field is the exception to the watching rule and it earns it: the
 * current web page's type-and-Enter field is the fastest interaction on it, and
 * sending someone to another screen to write a thought down is a regression.
 * Everything else — search, filters, reordering, editing, deleting — is work.
 */
function TodayTasks({ tasks, total, loading, onReload, theme, t }) {
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState({})

  const add = async () => {
    const title = draft.trim()
    if (!title || saving) return
    setSaving(true)
    try {
      // Due today, because the field sits under a heading that says today.
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

  return (
    <View>
      <SectionHeader title={t('tasks.title')} count={total > 0 ? t('home.tasksToday', { count: total }) : null} />

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

      {loading && tasks.length === 0 ? (
        <Stack spacing={1}>
          <Skeleton width='100%' height={44} />
          <Skeleton width='100%' height={44} />
        </Stack>
      ) : tasks.length === 0 ? (
        <Typography level='body-sm' color='text.tertiary'>
          {t('calendarPage.agenda.emptyToday')}
        </Typography>
      ) : (
        tasks.map((task) => {
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
 * The year, as one band rather than three cards.
 *
 * Each area is its identity colour, its name, how many of its goals are done
 * and how far along it is. This and Watching are the reason Home exists: the
 * annual plan is the only thing here that no other screen shows you daily,
 * because Planning is a place you visit monthly.
 */
function ThisYear({ areas, goals, loading, onOpen, theme, t }) {
  if (!loading && areas.length === 0) return null

  return (
    <View>
      <SectionHeader
        title={t('annualPlanning.home.focusAreas')}
        count={areas.length > 0 ? String(areas.length) : null}
        action={
          <Button size='sm' variant='tertiary' onPress={onOpen}>
            {t('annualPlanning.title')}
          </Button>
        }
      />

      {loading && areas.length === 0 ? (
        <Skeleton width='100%' height={44} />
      ) : (
        areas.map((area) => {
          const id = area._id ?? area.id
          const metrics = planMetrics((goals ?? []).filter((goal) => goal.focus_area_id === id))
          return (
            <View key={id}>
              <Divider />
              <ListRow
                tile={
                  <View
                    importantForAccessibility='no'
                    style={{ width: 16, height: 16, borderRadius: theme.radius.xs, backgroundColor: area.color || undefined }}
                  />
                }
                name={area.name}
                /* An area with no goals says nothing rather than "0 of 0",
                   which is a ratio of nothing reported as a fact (ADR-012). */
                meta={
                  metrics.total > 0 ? t('annualPlanning.header.goalsRatio', { completed: metrics.completed, total: metrics.total }) : null
                }
                measure={
                  metrics.total > 0 ? <Measure value={metrics.progress} accessibilityLabel={t('annualPlanning.home.progress')} /> : null
                }
                readout={metrics.total > 0 ? <Readout>{`${metrics.progress}%`}</Readout> : null}
                onPress={onOpen}
              />
            </View>
          )
        })
      )}
    </View>
  )
}

/**
 * The priorities the user chose to watch, deadline first.
 *
 * Which four, and in what order, is `priorityWatch` in the shared package —
 * four rules the web had inside a component, including the one that matters
 * most: a priority linked to a goal borrows the goal's area, so a row reading
 * the priority alone shows no area for exactly the priorities that have one.
 */
function Watching({ priorities, areas, language, theme, t }) {
  if (priorities.length === 0) return null

  const areaOf = (priority) => areas.find((area) => (area._id ?? area.id) === priority.focus_area_id)
  const when = (priority) => {
    const readout = deadlineReadout(priority)
    if (!readout) return null
    // A key of null means there is no phrase for this distance; the date is
    // the readout, and only this side knows the reader's locale.
    if (readout.key) return t(readout.key, readout.params)
    return new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' }).format(new Date(readout.params.date))
  }

  return (
    <View>
      <SectionHeader title={t('annualPlanning.home.yearlyPriorities')} count={String(priorities.length)} />

      {priorities.map((priority) => {
        const area = areaOf(priority)
        const readout = deadlineReadout(priority)
        return (
          <View key={priority._id ?? priority.id}>
            <Divider />
            <ListRow
              tile={
                <View
                  importantForAccessibility='no'
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: theme.radius.xs,
                    backgroundColor: area?.color || theme.palette.background.level3
                  }}
                />
              }
              name={priority.title || priority.name}
              meta={area?.name || null}
              /* Overdue lifts to `text.primary` like any load-bearing readout
                 (ADR-021 §3). The WORD carries the state; a hue alone never
                 does, and a red deadline on a dashboard reads as an error
                 rather than as a date (§15.5). */
              readout={when(priority) ? <Readout leading={readout?.key === 'focusBar.overdue'}>{when(priority)}</Readout> : null}
            />
          </View>
        )
      })}
    </View>
  )
}

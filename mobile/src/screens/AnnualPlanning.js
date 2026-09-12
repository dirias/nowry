/**
 * Annual Planning, on the phone (MOB-045, PRD FR-021).
 *
 * The web has four tabs — Overview, Goals, Priorities, Reports — across 6,600
 * lines, most of it dialogs, drawers and rails. This is the Overview, which is
 * the one that answers the question the phone is opened to ask: what am I
 * working on this year, and how far along is it.
 *
 * **It is also what makes the calendar's own form work.** A goal has to be
 * filed under a focus area and a priority under a plan, so a phone that could
 * create neither sent the user to a browser to get started. Creating the
 * year's plan and its focus areas is therefore in this slice; editing a goal,
 * closing a quarter, the reports and the AI panel are not.
 *
 * **A goal lives inside its area.** The first build listed every goal of the
 * quarter flat, under the areas — the web's Goals tab pasted under its
 * Overview. Reported from the device: tapping an area did nothing and the goals
 * were somewhere down the scroll. An area opens its own screen now, and this
 * one shows what the web's Overview shows.
 *
 * **Three focus areas, and the limit is the point** (`focusArea.limit`): the
 * feature is called the Power of 3 on the web's own setup screen. The Add key
 * disappears at three rather than failing at four.
 *
 * It does not own a `Screen`: the plan and the calendar are two views of one
 * thing and share a tab, so the tab owns the surface.
 *
 * **No upgrade path, at any tier** (ADR-030). The web's layout reads
 * `useSubscription` and opens an upgrade modal; nothing on this screen may link
 * to a purchase, so the gate does not exist here and neither does the key.
 */
import { useCallback, useMemo, useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { annualPlanningService } from '@nowry/core/api/services'
import { useAnnualPlan } from '@nowry/core/hooks/useAnnualPlan'
import { useAuth } from '@nowry/core/context/AuthContext'
import { getCurrentQuarter, planMetrics } from '@nowry/core/domain/goalDerivation'
import { completionPatch } from '@nowry/core/domain/calendar/eventHelpers'
import { deadlineReadout } from '@nowry/core/domain/priorityWatch'
import { useTheme } from '../theme'
import { AreaSheet } from './AnnualPlanningSheets'
import {
  Button,
  Divider,
  Icon,
  IconButton,
  ListRow,
  Measure,
  Readout,
  SectionHeader,
  Skeleton,
  Stack,
  SummaryObject,
  Typography
} from '../ui'

/** The web's own ceiling, from `annualPlanning.focusArea.limit`. */
const MAX_AREAS = 3

export function AnnualPlanning() {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const { user } = useAuth()
  const year = new Date().getFullYear()

  const { plan, areas, goals, priorities, loading, error, reload } = useAnnualPlan(year, user)

  const [creating, setCreating] = useState(false)
  const [areaSheet, setAreaSheet] = useState(false)
  // Ticked here, sent underneath. A priority's row is read and tapped in the
  // same second; waiting for a round trip to redraw it is a screen that feels
  // broken (the same rule as the agenda's tick).
  const [pending, setPending] = useState({})

  const quarter = getCurrentQuarter()
  // The quarter's goals, which is what the web's scope bar defaults to.
  const quarterGoals = useMemo(() => (goals || []).filter((goal) => goal.quarter === quarter), [goals, quarter])
  const metrics = useMemo(() => planMetrics(quarterGoals), [quarterGoals])

  const goalsByArea = useMemo(() => {
    const map = {}
    for (const goal of goals || []) {
      const key = goal.focus_area_id || 'none'
      map[key] = map[key] ?? []
      map[key].push(goal)
    }
    return map
  }, [goals])

  const createPlan = useCallback(async () => {
    setCreating(true)
    try {
      /*
       * The web's own title, character for character, so a plan started on a
       * phone is not a different kind of plan. It is English on both clients,
       * which is a real gap — but `annualPlanning.myPlan` carries a hardcoded
       * 2026 in all five locales, so translating it here would ship a plan
       * called "My 2026 Plan" in 2027. The gap is recorded rather than half
       * fixed in one client.
       */
      await annualPlanningService.createAnnualPlan({ year, title: `My ${year} Plan` })
      reload()
    } finally {
      setCreating(false)
    }
  }, [year, reload])

  const togglePriority = useCallback(
    async (priority) => {
      const id = priority._id ?? priority.id
      const done = !(pending[id] ?? priority.is_completed)
      setPending((state) => ({ ...state, [id]: done }))
      try {
        await annualPlanningService.updatePriority(id, completionPatch('priority', done))
        reload()
      } catch {
        setPending((state) => ({ ...state, [id]: !done }))
      }
    },
    [pending, reload]
  )

  if (loading && !plan) {
    return (
      <Stack spacing={2}>
        <Skeleton width='60%' height={28} />
        <Skeleton width='100%' height={96} />
        <Skeleton width='100%' height={56} />
        <Skeleton width='100%' height={56} />
      </Stack>
    )
  }

  if (error && !plan) {
    return (
      <Stack spacing={2}>
        <Typography level='body-md' color='danger.plainColor' accessibilityLiveRegion='polite'>
          {t('annualPlanning.tabs.errorLoading')}
        </Typography>
        <Button variant='secondary' onPress={reload}>
          {t('common.retry')}
        </Button>
      </Stack>
    )
  }

  /* No plan is not an error and not an empty list: it is one thing to do. */
  if (!plan) {
    return (
      <Stack spacing={2}>
        <Typography level='h4' accessibilityRole='header'>
          {t('annualPlanning.home.startJourney', { year })}
        </Typography>
        <Typography level='body-md' color='text.secondary'>
          {t('annualPlanning.home.startDescription')}
        </Typography>
        <Button loading={creating} onPress={createPlan}>
          {t('annualPlanning.home.createPlan')}
        </Button>
      </Stack>
    )
  }

  const atLimit = (areas || []).length >= MAX_AREAS

  return (
    <>
      <Stack spacing={3}>
        {/* The plan is the page's one summary object (ADR-021 §15.10): what it
            is, the numbers that describe it, and its progress as the object's
            own bottom edge rather than a bar inside it. */}
        <SummaryObject
          title={plan.title || String(year)}
          context={t(`annualPlanning.goal.timeframeQ${quarter}`)}
          progress={metrics.progress}
          readouts={
            <>
              {/* The web's own phrase for exactly this readout, translated in
                  five. Building "Label: 2" by concatenation is a sentence no
                  translator ever saw (MOB-062). */}
              <Readout leading>{t('annualPlanning.header.goalsRatio', { completed: metrics.completed, total: metrics.total })}</Readout>
              <Readout>
                {metrics.progress}% {t('annualPlanning.home.totalProgress')}
              </Readout>
            </>
          }
          empty={metrics.total === 0 ? t('annualPlanning.tabs.goalsEmptyBody') : null}
        />

        {/*
         * The way into the routine editor from the Plan tab (MOB-080).
         *
         * Home's panel has a pencil on it, and that was the only door: a user
         * who never scrolled Home could not find the screen at all. The routine
         * is the day-sized view of this plan, so its door belongs directly
         * under the plan's own summary.
         */}
        <View>
          <ListRow
            tile={<Icon name='Repeat' size='md' color='text.secondary' />}
            name={t('annualPlanning.dailyRoutine.title')}
            meta={t('annualPlanning.dailyRoutine.subtitle')}
            action={<Icon name='ChevronRight' size='sm' color='text.tertiary' />}
            onPress={() => router.push('/annual-planning/daily-routine')}
          />
          <Divider />
        </View>

        <View>
          <SectionHeader
            title={t('annualPlanning.focusArea.title')}
            count={(areas || []).length}
            action={
              atLimit ? null : (
                <IconButton size='sm' accessibilityLabel={t('annualPlanning.focusArea.add')} onPress={() => setAreaSheet(true)}>
                  <Icon name='Plus' size='sm' />
                </IconButton>
              )
            }
          />
          {(areas || []).length === 0 ? (
            <Typography level='body-md' color='text.secondary'>
              {t('annualPlanning.empty')}
            </Typography>
          ) : (
            (areas || []).map((area) => {
              const areaGoals = goalsByArea[area._id] ?? []
              const areaMetrics = planMetrics(areaGoals)
              const areaId = area._id ?? area.id
              return (
                <AreaRow
                  key={areaId}
                  area={area}
                  metrics={areaMetrics}
                  theme={theme}
                  t={t}
                  onPress={() => router.push(`/calendar/area/${areaId}`)}
                />
              )
            })
          )}
          {atLimit ? (
            <Typography level='body-xs' color='text.tertiary'>
              {t('annualPlanning.focusArea.limitReached')}
            </Typography>
          ) : null}
        </View>

        <View>
          <SectionHeader title={t('annualPlanning.priority.title')} count={(priorities || []).length} />
          {(priorities || []).length === 0 ? (
            <Typography level='body-md' color='text.secondary'>
              {t('annualPlanning.priority.noGoals')}
            </Typography>
          ) : (
            (priorities || []).map((priority) => {
              const id = priority._id ?? priority.id
              const done = pending[id] ?? priority.is_completed
              return (
                <View key={id}>
                  <ListRow
                    tile={
                      <IconButton
                        size='sm'
                        accessibilityLabel={done ? t('calendarPage.agenda.markUndone') : t('calendarPage.agenda.markDone')}
                        accessibilityState={{ checked: Boolean(done) }}
                        onPress={() => togglePriority(priority)}
                      >
                        <Icon name={done ? 'CircleCheck' : 'Circle'} size='sm' color={done ? 'success.plainColor' : 'text.tertiary'} />
                      </IconButton>
                    }
                    name={priority.title || priority.name}
                    /* A description identical to the title is the title said
                       twice, which reads as a bug rather than as detail. */
                    meta={priority.description && priority.description !== (priority.title || priority.name) ? priority.description : null}
                    /*
                     * When it is due. The web badges every priority that has a
                     * deadline and this page showed none at all, on the one
                     * screen whose whole subject is what you committed to and
                     * by when. Read through `deadlineReadout`, the same rule
                     * Home's strip uses, so the two screens cannot phrase one
                     * date two ways — and lifted to `text.primary` when it has
                     * passed, because the word carries the state and a hue on a
                     * plan reads as an error (§15.5).
                     */
                    readout={priorityWhen(t, i18n?.language ?? 'en', priority, done)}
                  />
                  <Divider />
                </View>
              )
            })
          )}
        </View>
      </Stack>

      <AreaSheet
        open={areaSheet}
        planId={plan._id}
        existing={areas || []}
        order={(areas || []).length + 1}
        onClose={() => setAreaSheet(false)}
        onSaved={reload}
      />
    </>
  )
}

/** One focus area: its colour, its name, and how far its goals have got. */
function AreaRow({ area, metrics, theme, t, onPress }) {
  return (
    <View>
      <ListRow
        tile={
          <View
            importantForAccessibility='no'
            style={{ width: 28, height: 28, borderRadius: theme.radius.sm, backgroundColor: area.color || undefined }}
          />
        }
        name={area.name}
        /*
         * An area with no goals says nothing at all — not "0 of 0", and not a
         * 0% beside an empty bar either. A ratio of nothing is not a fact and
         * a measure of nothing is not a measurement (ADR-012). The meta line
         * was fixed first and the measure was left drawing for another pass,
         * which is how half a rule survives (MOB-065).
         */
        meta={metrics.total > 0 ? t('annualPlanning.header.goalsRatio', { completed: metrics.completed, total: metrics.total }) : null}
        measure={metrics.total > 0 ? <Measure value={metrics.progress} accessibilityLabel={t('annualPlanning.home.progress')} /> : null}
        readout={metrics.total > 0 ? <Readout>{metrics.progress}%</Readout> : null}
        onPress={onPress}
      />
      <Divider />
    </View>
  )
}

/**
 * A priority's deadline, as the row's readout — or nothing, for a priority
 * that never had one.
 *
 * A completed priority's deadline stops being a claim on the future, so it
 * never leads: the web strikes it through and drops it to tertiary for the
 * same reason.
 */
function priorityWhen(t, language, priority, done) {
  const readout = deadlineReadout(priority)
  if (!readout) return null
  // A key of null means no phrase fits this distance; the date is the readout,
  // and only this side knows the reader's locale.
  const text = readout.key
    ? t(readout.key, readout.params)
    : new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' }).format(new Date(readout.params.date))
  return <Readout leading={!done && readout.key === 'focusBar.overdue'}>{text}</Readout>
}

export default AnnualPlanning

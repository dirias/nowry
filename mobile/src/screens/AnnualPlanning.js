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
 * **Three focus areas, and the limit is the point** (`focusArea.limit`): the
 * feature is called the Power of 3 on the web's own setup screen. The Add key
 * disappears at three rather than failing at four.
 *
 * **No upgrade path, at any tier** (ADR-030). The web's layout reads
 * `useSubscription` and opens an upgrade modal; nothing on this screen may link
 * to a purchase, so the gate does not exist here and neither does the key.
 */
import { useCallback, useMemo, useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { annualPlanningService } from '@nowry/core/api/services'
import { useAnnualPlan } from '@nowry/core/hooks/useAnnualPlan'
import { useAuth } from '@nowry/core/context/AuthContext'
import { calculateProgress, getCurrentQuarter, isGoalCompleted, planMetrics } from '@nowry/core/domain/goalDerivation'
import { completionPatch } from '@nowry/core/domain/calendar/eventHelpers'
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
  Screen,
  SectionHeader,
  Skeleton,
  Stack,
  SummaryObject,
  Typography
} from '../ui'

/** The web's own ceiling, from `annualPlanning.focusArea.limit`. */
const MAX_AREAS = 3

export function AnnualPlanning() {
  const { t } = useTranslation()
  const theme = useTheme()
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
      <Screen>
        <Stack spacing={2}>
          <Skeleton width='60%' height={28} />
          <Skeleton width='100%' height={96} />
          <Skeleton width='100%' height={56} />
          <Skeleton width='100%' height={56} />
        </Stack>
      </Screen>
    )
  }

  if (error && !plan) {
    return (
      <Screen>
        <Stack spacing={2}>
          <Typography level='body-md' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t('annualPlanning.tabs.errorLoading')}
          </Typography>
          <Button variant='secondary' onPress={reload}>
            {t('common.retry')}
          </Button>
        </Stack>
      </Screen>
    )
  }

  /* No plan is not an error and not an empty list: it is one thing to do. */
  if (!plan) {
    return (
      <Screen>
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
      </Screen>
    )
  }

  const atLimit = (areas || []).length >= MAX_AREAS

  return (
    <Screen>
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
              <Readout leading>
                {t('annualPlanning.stats.totalGoals')}: {metrics.total}
              </Readout>
              <Readout>
                {t('annualPlanning.stats.completed')}: {metrics.completed}
              </Readout>
              <Readout>
                {metrics.progress}% {t('annualPlanning.home.totalProgress')}
              </Readout>
            </>
          }
          empty={metrics.total === 0 ? t('annualPlanning.tabs.goalsEmptyBody') : null}
        />

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
              return <AreaRow key={area._id} area={area} metrics={areaMetrics} theme={theme} t={t} />
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
                    meta={priority.description || null}
                  />
                  <Divider />
                </View>
              )
            })
          )}
        </View>

        {/* The goals of this quarter, flat, because a phone reading a plan
            wants the list and not the tree. Each says which area it belongs to
            rather than being nested under it. */}
        <View>
          <SectionHeader title={t('annualPlanning.tabs.goals')} count={quarterGoals.length} />
          {quarterGoals.length === 0 ? (
            <Typography level='body-md' color='text.secondary'>
              {t('annualPlanning.tabs.goalsEmptyBody')}
            </Typography>
          ) : (
            quarterGoals.map((goal) => (
              <View key={goal._id}>
                <ListRow
                  tile={
                    <Icon
                      name={isGoalCompleted(goal) ? 'CircleCheck' : 'Target'}
                      size='md'
                      color={isGoalCompleted(goal) ? 'success.plainColor' : 'text.tertiary'}
                    />
                  }
                  name={goal.title}
                  meta={(areas || []).find((area) => area._id === goal.focus_area_id)?.name ?? null}
                  measure={<Measure value={calculateProgress(goal)} accessibilityLabel={t('annualPlanning.home.progress')} />}
                  readout={<Readout>{calculateProgress(goal)}%</Readout>}
                />
                <Divider />
              </View>
            ))
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
    </Screen>
  )
}

/** One focus area: its colour, its name, and how far its goals have got. */
function AreaRow({ area, metrics, theme, t }) {
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
        meta={t('annualPlanning.stats.totalGoals') + ': ' + metrics.total}
        measure={<Measure value={metrics.progress} accessibilityLabel={t('annualPlanning.home.progress')} />}
        readout={<Readout>{metrics.progress}%</Readout>}
      />
      <Divider />
    </View>
  )
}

export default AnnualPlanning

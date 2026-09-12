/**
 * One goal, and the steps that move it (MOB-047).
 *
 * The phone could already create a goal from the calendar and could see how far
 * along it was on the plan — and nowhere could it see WHY. A goal's progress is
 * its milestones done over its milestones total, so a screen that shows the
 * percentage and not the steps shows a number nobody can act on.
 *
 * Everything derived here is derived in the shared package: the state pill, the
 * percentage, which step is next, and whether a step is late. The web draws the
 * same five states from the same table, so a goal that reads "At risk" on a
 * laptop does not read "On track" on a phone.
 *
 * **A milestone is ticked one at a time, through its own endpoint**, addressed
 * by the goal and the milestone rather than by a position in an array — the
 * same address the calendar's tick uses (CAL-004). The web's goal FORM replaces
 * the whole array at once, which is right for a form and wrong for a tick: two
 * ticks in a row would race, and the loser would silently undo the winner.
 */
import { useCallback, useMemo, useState } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { annualPlanningService } from '@nowry/core/api/services'
import { useAnnualPlan } from '@nowry/core/hooks/useAnnualPlan'
import { useAuth } from '@nowry/core/context/AuthContext'
import {
  GOAL_STATE_COLOR,
  GOAL_STATE_I18N,
  calculateProgress,
  getGoalState,
  getNextMilestone,
  isMilestoneOverdue
} from '@nowry/core/domain/goalDerivation'
import { completionPatch } from '@nowry/core/domain/calendar/eventHelpers'
import { useTheme } from '../theme'
import { MilestoneSheet } from './AnnualPlanningSheets'
import { Button, Chip, Divider, Icon, IconButton, Progress, Readout, Screen, SectionHeader, Skeleton, Stack, Typography } from '../ui'

export function GoalDetail() {
  const { goalId } = useLocalSearchParams()
  const { t, i18n } = useTranslation()
  const language = i18n?.language ?? 'en'
  const theme = useTheme()
  const { user } = useAuth()

  const { goals, areas, loading, reload } = useAnnualPlan(new Date().getFullYear(), user)
  const [sheet, setSheet] = useState(false)
  const [pending, setPending] = useState({})

  const id = String(goalId)
  const goal = useMemo(() => (goals || []).find((candidate) => candidate._id === id) ?? null, [goals, id])
  const area = useMemo(() => (areas || []).find((candidate) => candidate._id === goal?.focus_area_id) ?? null, [areas, goal])

  /*
   * The tick is applied to the row first and sent second, and a refusal puts it
   * back. `pending` is keyed by milestone id, so two ticks in a row are two
   * independent facts rather than one array overwriting the other.
   */
  const toggle = useCallback(
    async (milestone) => {
      const key = milestone.id
      const done = !(pending[key] ?? milestone.completed)
      setPending((state) => ({ ...state, [key]: done }))
      try {
        await annualPlanningService.updateMilestone(id, key, completionPatch('milestone', done))
        reload()
      } catch {
        setPending((state) => ({ ...state, [key]: !done }))
      }
    },
    [id, pending, reload]
  )

  if (loading && !goal) {
    return (
      <Screen>
        <Stack spacing={2}>
          <Skeleton width='70%' height={28} />
          <Skeleton width='100%' height={64} />
          <Skeleton width='100%' height={52} />
          <Skeleton width='100%' height={52} />
        </Stack>
      </Screen>
    )
  }

  /* A goal reached by a stale link, or one deleted on another device. */
  if (!goal) {
    return (
      <Screen>
        <Typography level='body-md' color='text.secondary'>
          {t('annualPlanning.tabs.goalsEmptyTitle')}
        </Typography>
      </Screen>
    )
  }

  const milestones = goal.milestones ?? []
  const progress = calculateProgress(goal)
  const state = getGoalState(goal)
  const next = getNextMilestone(goal)
  const dueLabel = (value) => (value ? new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' }).format(new Date(value)) : null)

  return (
    <Screen>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography level='h4' accessibilityRole='header'>
            {goal.title}
          </Typography>
          <Stack direction='row' spacing={1} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            {/* The state is a word first. The colour agrees with it; it is
                never the only thing carrying it. */}
            <Chip size='sm' accessibilityLabel={t(`annualPlanning.goal.healthStatus.${GOAL_STATE_I18N[state]}`)}>
              {t(`annualPlanning.goal.healthStatus.${GOAL_STATE_I18N[state]}`)}
            </Chip>
            {area ? (
              <Typography level='body-sm' color='text.tertiary'>
                {area.name}
              </Typography>
            ) : null}
            <Typography level='body-sm' color='text.tertiary'>
              {dueLabel(goal.target_date || goal.deadline) ?? t('annualPlanning.goal.noDeadline')}
            </Typography>
          </Stack>
        </Stack>

        <Stack spacing={1}>
          <Stack direction='row' spacing={1} style={{ alignItems: 'baseline' }}>
            <Typography level='title-sm' color='text.secondary' style={{ flex: 1 }}>
              {t('annualPlanning.goal.progress')}
            </Typography>
            <Readout leading>{progress}%</Readout>
          </Stack>
          <Progress
            value={progress}
            accessibilityLabel={t('annualPlanning.goal.progress')}
            style={{ backgroundColor: resolveTrack(theme, state) }}
          />
          {next ? (
            <Typography level='body-sm' color='text.tertiary'>
              {next.title}
            </Typography>
          ) : null}
        </Stack>

        <View>
          <SectionHeader
            /*
             * The key reads "{{completed}} of {{total}} milestones" and uses
             * `count` only to pick its plural. Passing `count` alone printed
             * the two placeholders verbatim on the screen.
             */
            title={t('annualPlanning.goal.milestoneCount', {
              completed: milestones.filter((milestone) => milestone.completed).length,
              total: milestones.length,
              count: milestones.length
            })}
            action={
              <IconButton size='sm' accessibilityLabel={t('annualPlanning.goal.addMilestoneButton')} onPress={() => setSheet(true)}>
                <Icon name='Plus' size='sm' />
              </IconButton>
            }
          />

          {milestones.length === 0 ? (
            <Stack spacing={2}>
              <Typography level='body-md' color='text.secondary'>
                {t('annualPlanning.goal.noMilestones')}
              </Typography>
              <Button variant='secondary' onPress={() => setSheet(true)}>
                {t('annualPlanning.goal.addMilestoneButton')}
              </Button>
            </Stack>
          ) : (
            milestones.map((milestone, index) => {
              const done = pending[milestone.id] ?? milestone.completed
              const late = !done && isMilestoneOverdue(milestone)
              return (
                <View key={milestone.id ?? index}>
                  <Stack direction='row' spacing={2} style={{ alignItems: 'center', paddingVertical: theme.spacing[1] }}>
                    <IconButton
                      size='sm'
                      accessibilityLabel={t('annualPlanning.goal.milestoneToggleAria')}
                      accessibilityState={{ checked: Boolean(done) }}
                      onPress={() => toggle(milestone)}
                    >
                      <Icon name={done ? 'CircleCheck' : 'Circle'} size='sm' color={done ? 'success.plainColor' : 'text.tertiary'} />
                    </IconButton>
                    <Typography
                      level='body-md'
                      style={[{ flex: 1 }, done ? { textDecorationLine: 'line-through' } : null]}
                      color={done ? 'text.tertiary' : 'text.primary'}
                      numberOfLines={2}
                    >
                      {milestone.title}
                    </Typography>
                    {/*
                     * No date is silence, not a word. `milestoneNoDate` is the
                     * web's placeholder for a date FIELD — using it as a
                     * readout printed "Date" down the right of every undated
                     * milestone, which reads as a column header. Lateness rides
                     * on the date that is there rather than adding a badge.
                     */}
                    {dueLabel(milestone.due_date) ? (
                      <Typography level='body-xs' color={late ? 'danger.plainColor' : 'text.tertiary'}>
                        {dueLabel(milestone.due_date)}
                      </Typography>
                    ) : null}
                  </Stack>
                  <Divider />
                </View>
              )
            })
          )}
        </View>
      </Stack>

      <MilestoneSheet goalId={id} open={sheet} onClose={() => setSheet(false)} onSaved={reload} />
    </Screen>
  )
}

/** The track a progress bar sits on, tinted by the goal's own state. */
const resolveTrack = (theme, state) => theme.palette[GOAL_STATE_COLOR[state]]?.softBg ?? theme.palette.background.level2

export default GoalDetail

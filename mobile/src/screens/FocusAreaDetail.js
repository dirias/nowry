/**
 * One focus area and the goals filed under it (MOB-052).
 *
 * The plan listed the areas and, separately, every goal of the quarter in a
 * flat section below them. Reported from the device: tapping an area did
 * nothing, and the goals were somewhere further down the scroll. That is not
 * how this product is shaped — on the web a goal lives INSIDE its area, and the
 * flat list was the Goals tab's content pasted under the Overview's.
 *
 * So the area is the way in, and the flat section is gone. What remains on the
 * plan is what the web's Overview shows: the plan, its areas, its priorities.
 *
 * The area's colour is user data, so it appears as the identity tile at the
 * head and nowhere else — a screen tinted throughout by a colour the user
 * picked is a screen whose own hierarchy is at their mercy.
 */
import { useMemo } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAnnualPlan } from '@nowry/core/hooks/useAnnualPlan'
import { useAuth } from '@nowry/core/context/AuthContext'
import { calculateProgress, isGoalCompleted, planMetrics } from '@nowry/core/domain/goalDerivation'
import { useTheme } from '../theme'
import { Divider, Icon, ListRow, Measure, Readout, Screen, SectionHeader, Skeleton, Stack, Typography } from '../ui'

export function FocusAreaDetail() {
  const { areaId } = useLocalSearchParams()
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const { user } = useAuth()

  const { areas, goals, loading } = useAnnualPlan(new Date().getFullYear(), user)

  const id = String(areaId)
  const area = useMemo(() => (areas || []).find((candidate) => candidate._id === id) ?? null, [areas, id])
  const areaGoals = useMemo(() => (goals || []).filter((goal) => goal.focus_area_id === id), [goals, id])
  const metrics = useMemo(() => planMetrics(areaGoals), [areaGoals])

  if (loading && !area) {
    return (
      <Screen>
        <Stack spacing={2}>
          <Skeleton width='60%' height={28} />
          <Skeleton width='100%' height={56} />
          <Skeleton width='100%' height={56} />
        </Stack>
      </Screen>
    )
  }

  /* An area reached by a stale link, or one deleted on another device. */
  if (!area) {
    return (
      <Screen>
        <Typography level='body-md' color='text.secondary'>
          {t('annualPlanning.empty')}
        </Typography>
      </Screen>
    )
  }

  return (
    <Screen>
      <Stack spacing={3}>
        <Stack direction='row' spacing={2} style={{ alignItems: 'center' }}>
          <View
            importantForAccessibility='no'
            style={{ width: 36, height: 36, borderRadius: theme.radius.sm, backgroundColor: area.color || undefined }}
          />
          <Stack spacing={1} style={{ flex: 1, minWidth: 0 }}>
            <Typography level='h4' accessibilityRole='header' numberOfLines={2}>
              {area.name}
            </Typography>
            <Readout>
              {t('annualPlanning.stats.totalGoals')}: {metrics.total} · {metrics.progress}% {t('annualPlanning.home.totalProgress')}
            </Readout>
          </Stack>
        </Stack>

        {area.description ? (
          <Typography level='body-md' color='text.secondary'>
            {area.description}
          </Typography>
        ) : null}

        <View>
          <SectionHeader title={t('annualPlanning.tabs.goals')} count={areaGoals.length} />
          {areaGoals.length === 0 ? (
            <Typography level='body-md' color='text.secondary'>
              {t('annualPlanning.tabs.goalsEmptyBody')}
            </Typography>
          ) : (
            areaGoals.map((goal) => (
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
                  meta={t(`annualPlanning.goal.timeframeQ${goal.quarter}`, '')}
                  measure={<Measure value={calculateProgress(goal)} accessibilityLabel={t('annualPlanning.home.progress')} />}
                  readout={<Readout>{calculateProgress(goal)}%</Readout>}
                  onPress={() => router.push(`/calendar/goal/${goal._id}`)}
                />
                <Divider />
              </View>
            ))
          )}
        </View>
      </Stack>
    </Screen>
  )
}

export default FocusAreaDetail

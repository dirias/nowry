/**
 * The Study Center's Today object (MOB-019, PRD D1, ADR-021 §15.10).
 *
 * One summary object: title and date, one readout line, the 15-cell timeline,
 * and the single primary action that starts the cards that are due. The web
 * puts the title on a left rail and the timeline and actions on a right rail;
 * at 375px those stack, which is the only difference.
 *
 * The library — Decks, Cards, Tags — arrives in MOB-020 below this.
 *
 * **All caught up is this object saying so**, not a separate box. The empty
 * state cannot replace the thing the user will press tomorrow (§13.2).
 */
import { useMemo } from 'react'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useForecast } from '@nowry/core/hooks/useForecast'
import { useStatistics } from '@nowry/core/hooks/useStatistics'
import { Button, ForecastStrip, Readout, Screen, Skeleton, Stack, SummaryObject, Typography } from '../../../src/ui'

export default function StudyCenter() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const { statistics, loading: statsLoading, error: statsError } = useStatistics()
  const { forecast, loading: forecastLoading } = useForecast(7)

  const summary = statistics?.summary ?? null
  const dueToday = summary?.due_today ?? 0
  const reviewedToday = summary?.reviewed_today ?? 0
  const streak = summary?.current_streak ?? 0
  const weekly = statistics?.weekly_progress ?? []
  const future = forecast?.days ?? []

  const today = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()),
    [i18n.language]
  )

  const reviewedWeek = weekly.slice(0, -1).reduce((sum, d) => sum + (d.cards || 0), 0)
  const dueTomorrow = future[0]?.due ?? 0
  const dueWeek = future.reduce((sum, d) => sum + (d.due || 0), 0)

  const loading = statsLoading || forecastLoading
  const caughtUp = !loading && !statsError && dueToday === 0

  return (
    <Screen>
      <Stack spacing={3}>
        <SummaryObject
          title={t('study.title')}
          context={today}
          readouts={
            loading ? (
              <Stack direction='row' spacing={2}>
                <Skeleton width={64} height={14} />
                <Skeleton width={88} height={14} />
              </Stack>
            ) : statsError ? null : (
              <>
                {/* The one load-bearing number lifts; the rest stay tertiary. */}
                <Readout leading>{t('study.dueCount', { count: dueToday })}</Readout>
                <Readout>{t('study.today.reviewed', { count: reviewedToday })}</Readout>
                <Readout>{streak > 0 ? t('study.empty.streakLabel', { count: streak }) : t('study.empty.streakZeroLabel')}</Readout>
              </>
            )
          }
          // All caught up is the object saying so, in its own voice.
          empty={caughtUp ? t('study.today.allDone') : null}
          action={
            <Button size='sm' onPress={() => router.push('/study/due')} accessibilityLabel={t('study.startStudying')}>
              {t('study.startStudying')}
            </Button>
          }
        />

        {loading ? (
          <Skeleton width='100%' height={28} />
        ) : (
          <Stack spacing={1}>
            <ForecastStrip past={weekly} today={dueToday} future={future} />
            <Readout>{t('study.today.weekReadout', { reviewed: reviewedWeek, tomorrow: dueTomorrow, week: dueWeek })}</Readout>
          </Stack>
        )}

        {statsError ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t('home.loadFailed')}
          </Typography>
        ) : null}

        {/* The library — Decks, Cards, Tags — lands here in MOB-020. */}
      </Stack>
    </Screen>
  )
}

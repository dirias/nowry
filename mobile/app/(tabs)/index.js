/**
 * Home (MOB-018).
 *
 * The one-column expression of the web Home: one summary object (ADR-021 §1),
 * the companion, the next-steps panel (ADR-024) while it is offered, and
 * nothing else. The web puts a news carousel, a weekly chart, a calendar and a
 * blackboard beside it; a phone that stacked all five would be a scroll, not a
 * home.
 *
 * The companion is here rather than in the Study Center because the Study
 * Center is built to an approved artboard and this is not on it — and because
 * the web's pet floats over every page, which is a thing a phone cannot do and
 * should not imitate (MOB-050).
 *
 * Skeletons, never a page gate. The layout the reader is about to see is
 * already there while the numbers arrive, so nothing moves when they do.
 */
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useAuth } from '@nowry/core/context/AuthContext'
import { useStatistics } from '@nowry/core/hooks/useStatistics'
import { useDeckData } from '@nowry/core/hooks/useDeckData'
import { studySummary } from '@nowry/core/domain/studySummary'
import { Button, NextStepsPanel, Readout, Screen, Skeleton, Stack, SummaryObject, Typography } from '../../src/ui'
import { PetPanel } from '../../src/screens/PetPanel'

export default function Home() {
  const { t } = useTranslation()
  const router = useRouter()
  const { user } = useAuth()
  const { statistics, loading, error } = useStatistics()
  const deckData = useDeckData(null)

  /*
   * `studySummary` is the one reader of these field names. Home used to take
   * its deck count from the statistics summary, which has no such field, so it
   * printed "0 decks" beside a real due count on every account that has decks.
   */
  const today = studySummary({ decks: deckData.decks, statistics })
  const due = today.due
  const streak = today.streak
  const decks = (deckData.decks ?? []).length

  return (
    <Screen>
      <Stack spacing={3}>
        <SummaryObject
          title={t('auth.welcomeBack')}
          context={user?.username ?? user?.email ?? undefined}
          readouts={
            loading || deckData.loading ? (
              <Stack direction='row' spacing={2}>
                <Skeleton width={72} height={14} />
                <Skeleton width={64} height={14} />
                <Skeleton width={56} height={14} />
              </Stack>
            ) : error ? null : (
              <>
                {/* The one load-bearing number lifts to text.primary (ADR-021 §3). */}
                <Readout leading>{`${due} ${t('study.due')}`}</Readout>
                <Readout>{t('study.empty.streakLabel', { count: streak })}</Readout>
                <Readout>{`${decks} ${t('study.stats.decks')}`}</Readout>
              </>
            )
          }
          /*
           * Empty is the same object with one sentence (ADR-021 §1) — never a
           * centred block that replaces the object the user will use tomorrow.
           */
          empty={!loading && !error && due === 0 && decks === 0 ? t('study.empty.noDecks') : null}
          action={
            <Button size='sm' onPress={() => router.push('/study')}>
              {t('study.startStudying')}
            </Button>
          }
        />

        {/* An error is stated here, not thrown at the page: the object above
            still renders, because a failed statistics call is not a reason to
            lose Home. */}
        {error ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t('home.loadFailed')}
          </Typography>
        ) : null}

        <PetPanel />

        <NextStepsPanel />
      </Stack>
    </Screen>
  )
}

/**
 * The Study Center's Dashboard, built to the PhoneDashboard artboard
 * (Study Center canvas, 2026-09-06; the web's STUDY-003..007).
 *
 * The board's order, top to bottom: the Today object, then "Due now", then
 * "Up to date", then "Recent". The first version of this screen had only the
 * Today object and jumped straight to the library's tabs, which dropped the
 * grouping that is the point of the page — a learner opens this to see what is
 * asking for them today and what is not.
 *
 * **One solid on the screen, and it is on Today.** Every deck row is the action
 * for its deck, so a Study key on each row would put four solids on 390px. The
 * board draws a chevron instead, and so does `DeckRow`.
 *
 * **"Up to date" is collapsed to three.** The board shows a "Show all 5" key
 * beside the count, because a list of decks that want nothing is reference, not
 * work, and it must not push Recent off the screen.
 */
import { useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { deckCounts } from '@nowry/core/domain/deckTypes'
import { studySessionsService } from '@nowry/core/api/services'
import { useForecast } from '@nowry/core/hooks/useForecast'
import { useStatistics } from '@nowry/core/hooks/useStatistics'
import { useDeckData } from '@nowry/core/hooks/useDeckData'
import { useTheme } from '../theme'
import {
  Button,
  DeckRow,
  Divider,
  ForecastStrip,
  Readout,
  SectionHeader,
  SessionRow,
  Skeleton,
  Stack,
  SummaryObject,
  Typography
} from '../ui'

/** Enough to answer "what did I just do", not a history page. */
const RECENT_COUNT = 3
/** Up-to-date decks are reference; the rest are behind one key. */
const UP_TO_DATE_PREVIEW = 3

const SESSION_KIND = {
  ai_quiz: 'sessions.aiQuiz',
  srs_review: 'sessions.srsReview',
  deck_quiz: 'sessions.deckQuiz'
}

const minutes = (seconds) => Math.max(1, Math.round((seconds || 0) / 60))

export function StudyDashboard() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const theme = useTheme()

  const { statistics, loading: statsLoading, error: statsError } = useStatistics()
  const { forecast, loading: forecastLoading } = useForecast(7)
  const decks = useDeckData()

  const [sessions, setSessions] = useState(null)
  const [showAllUpToDate, setShowAllUpToDate] = useState(false)

  useEffect(() => {
    let cancelled = false
    studySessionsService
      .list(RECENT_COUNT)
      .then((data) => !cancelled && setSessions(data?.sessions ?? []))
      // Recent is the least load-bearing thing here; its absence is silence,
      // not an error the learner has to read past.
      .catch(() => !cancelled && setSessions([]))
    return () => {
      cancelled = true
    }
  }, [])

  const summary = statistics?.summary ?? null
  const dueToday = summary?.due_today ?? 0
  const reviewedToday = summary?.reviewed_today ?? 0
  const streak = summary?.current_streak ?? 0
  const weekly = statistics?.weekly_progress ?? []
  const future = forecast?.days ?? []

  const dateLabel = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date()),
    [i18n.language]
  )

  const list = decks.decks
  const { asking, upToDate, newToday } = useMemo(() => {
    const asks = []
    const rest = []
    let fresh = 0
    for (const deck of list ?? []) {
      const counts = deckCounts(deck)
      fresh += counts.fresh
      ;(counts.asked > 0 ? asks : rest).push(deck)
    }
    // The deck asking for the most comes first: the list is a queue, not an index.
    asks.sort((a, b) => deckCounts(b).asked - deckCounts(a).asked)
    return { asking: asks, upToDate: rest, newToday: fresh }
  }, [list])

  const asked = dueToday + newToday
  const loading = statsLoading || forecastLoading
  const reviewedWeek = weekly.slice(0, -1).reduce((sum, d) => sum + (d.cards || 0), 0)
  const dueTomorrow = future[0]?.due ?? 0
  const dueWeek = future.reduce((sum, d) => sum + (d.due || 0), 0)
  const done = reviewedToday + asked
  const progress = done > 0 ? (reviewedToday / done) * 100 : 0

  const shownUpToDate = showAllUpToDate ? upToDate : upToDate.slice(0, UP_TO_DATE_PREVIEW)
  const openDeck = (deck) => router.push(`/study/deck/${deck._id ?? deck.id}`)

  const gap = <View style={{ height: theme.spacing[2] }} />

  return (
    <Stack spacing={2}>
      <SummaryObject
        title={t('study.today.title')}
        context={dateLabel}
        progress={loading ? null : progress}
        readouts={
          loading ? (
            <Stack direction='row' spacing={2}>
              <Skeleton width={64} height={14} />
              <Skeleton width={56} height={14} />
              <Skeleton width={72} height={14} />
            </Stack>
          ) : statsError ? null : (
            <>
              {/* The one load-bearing number, per the board and ADR-021 §3. */}
              <Readout leading>{asked === 0 ? t('study.today.allDone') : t('study.dueCount', { count: dueToday })}</Readout>
              {newToday > 0 ? <Readout>{t('study.deck.newCount', { count: newToday })}</Readout> : null}
              <Readout>{t('study.today.reviewed', { count: reviewedToday })}</Readout>
              <Readout>{streak > 0 ? t('study.empty.streakLabel', { count: streak }) : t('study.empty.streakZeroLabel')}</Readout>
            </>
          )
        }
        empty={!loading && !statsError && (list ?? []).length === 0 ? t('study.today.emptySentence') : null}
        action={
          (list ?? []).length === 0 ? null : (
            <Button size='md' onPress={() => router.push('/study/due')} accessibilityLabel={t('study.startStudying')}>
              {asked > 0 ? t('study.today.study', { count: asked }) : t('study.today.browse')}
            </Button>
          )
        }
      />

      {loading ? null : weekly.length > 0 || future.length > 0 ? (
        <Stack spacing={1}>
          <ForecastStrip past={weekly} today={asked} future={future} />
          <Readout>{t('study.today.weekReadout', { reviewed: reviewedWeek, tomorrow: dueTomorrow, week: dueWeek })}</Readout>
        </Stack>
      ) : null}

      {statsError ? (
        <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
          {t('home.loadFailed')}
        </Typography>
      ) : null}

      {gap}

      <SectionHeader title={t('study.sections.dueNow')} count={t('study.sections.deckCount', { count: asking.length })} />
      {decks.loading ? (
        <Stack spacing={1}>
          <Skeleton width='100%' height={56} />
          <Skeleton width='100%' height={56} />
        </Stack>
      ) : asking.length === 0 ? (
        <Typography level='body-sm' color='text.tertiary'>
          {t('cards.session.noDue')}
        </Typography>
      ) : (
        asking.map((deck) => (
          <View key={deck._id ?? deck.id}>
            <Divider />
            <DeckRow deck={deck} onPress={() => openDeck(deck)} />
          </View>
        ))
      )}

      {upToDate.length > 0 ? (
        <>
          {gap}
          <SectionHeader
            title={t('study.sections.upToDate')}
            count={String(upToDate.length)}
            action={
              upToDate.length > UP_TO_DATE_PREVIEW && !showAllUpToDate ? (
                <Button size='sm' variant='secondary' onPress={() => setShowAllUpToDate(true)}>
                  {t('study.sections.showAll', { count: upToDate.length })}
                </Button>
              ) : null
            }
          />
          {shownUpToDate.map((deck) => (
            <View key={deck._id ?? deck.id}>
              <Divider />
              <DeckRow deck={deck} onPress={() => openDeck(deck)} />
            </View>
          ))}
        </>
      ) : null}

      {sessions === null || sessions.length > 0 ? (
        <>
          {gap}
          <SectionHeader title={t('study.sections.recent')} />
          {sessions === null ? (
            <Skeleton width='100%' height={56} />
          ) : (
            sessions.map((session, index) => (
              <View key={session.id ?? session._id ?? index}>
                <Divider />
                <SessionRow
                  title={session.deck_name || session.topic || t('sessions.unknownTopic')}
                  meta={[
                    t(SESSION_KIND[session.session_type] ?? SESSION_KIND.deck_quiz),
                    t('sessions.cardCount', { count: session.total_cards ?? 0 }),
                    t('study.dates.minutes', { count: minutes(session.duration_seconds) })
                  ].join(' · ')}
                  when={relativeDay(t, session.completed_at)}
                  score={session.score_percentage ?? null}
                />
              </View>
            ))
          )}
        </>
      ) : null}
    </Stack>
  )
}

/** Today, Yesterday, then "N days ago" — the web's own three cases. */
function relativeDay(t, iso) {
  if (!iso) return ''
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return t('study.dates.today')
  if (days === 1) return t('study.dates.yesterday')
  return t('study.dates.daysAgo', { count: days })
}

export default StudyDashboard

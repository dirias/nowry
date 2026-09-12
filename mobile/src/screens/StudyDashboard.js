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
import { reviewedThisWeek, studySummary } from '@nowry/core/domain/studySummary'
import { sessionLine } from '@nowry/core/domain/sessionLog'
import { studySessionsService } from '@nowry/core/api/services'
import { useForecast } from '@nowry/core/hooks/useForecast'
import { useStatistics } from '@nowry/core/hooks/useStatistics'
import { useDeckData } from '@nowry/core/hooks/useDeckData'
import { DAILY_REVIEW } from './StudySession'
import { useTheme } from '../theme'
import {
  Button,
  DeckRow,
  Divider,
  ForecastStrip,
  Icon,
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
/** The web's short session, offered only when the day is longer than it. */
const QUICK_SIZE = 10
/** Up-to-date decks are reference; the rest are behind one key. */
const UP_TO_DATE_PREVIEW = 3

export function StudyDashboard() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const theme = useTheme()

  const { statistics, loading: statsLoading, error: statsError } = useStatistics()
  const { forecast, loading: forecastLoading } = useForecast(7)
  const decks = useDeckData()

  const [sessions, setSessions] = useState(null)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [showAllUpToDate, setShowAllUpToDate] = useState(false)

  useEffect(() => {
    let cancelled = false
    studySessionsService
      .list(RECENT_COUNT)
      .then((data) => {
        if (cancelled) return
        setSessions(data?.sessions ?? [])
        setSessionTotal(data?.total ?? 0)
      })
      // Recent is the least load-bearing thing here; its absence is silence,
      // not an error the learner has to read past.
      .catch(() => !cancelled && setSessions([]))
    return () => {
      cancelled = true
    }
  }, [])

  /*
   * One reader for today's five numbers (`studySummary`). Due and new come
   * from the decks rather than the statistics summary, which is what keeps the
   * Today object and the "Due now" list below it from disagreeing — they are
   * the same question asked twice.
   */
  const today = studySummary({ decks: decks.decks, statistics })
  const weekly = statistics?.weekly_progress ?? []
  const future = forecast?.days ?? []

  const dateLabel = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date()),
    [i18n.language]
  )

  const list = decks.decks
  const { asking, upToDate } = useMemo(() => {
    const asks = []
    const rest = []
    for (const deck of list ?? []) {
      ;(deckCounts(deck).asked > 0 ? asks : rest).push(deck)
    }
    // The deck asking for the most comes first: the list is a queue, not an index.
    asks.sort((a, b) => deckCounts(b).asked - deckCounts(a).asked)
    return { asking: asks, upToDate: rest }
  }, [list])

  const loading = statsLoading || forecastLoading || decks.loading
  const reviewedWeek = reviewedThisWeek(statistics)
  const dueTomorrow = future[0]?.due ?? 0
  const dueWeek = future.reduce((sum, d) => sum + (d.due || 0), 0)

  /**
   * The web's own three cases: no streak at all, a live streak, and a live
   * streak with nothing done yet — which is the one that says the day is still
   * open and closes at midnight.
   */
  const streakLine = () => {
    if (today.streak <= 0) return t('study.empty.streakZeroLabel')
    const label = t('study.empty.streakLabel', { count: today.streak })
    return today.reviewedToday === 0 && today.asked > 0 ? `${label} ${t('study.today.beforeMidnight')}` : label
  }

  const shownUpToDate = showAllUpToDate ? upToDate : upToDate.slice(0, UP_TO_DATE_PREVIEW)
  const openDeck = (deck) => router.push(`/study/deck/${deck._id ?? deck.id}`)

  const gap = <View style={{ height: theme.spacing[2] }} />

  return (
    <Stack spacing={2}>
      <SummaryObject
        title={t('study.today.title')}
        context={dateLabel}
        progress={loading ? null : today.progress}
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
              <Readout leading>{today.asked === 0 ? t('study.today.allDone') : t('study.dueCount', { count: today.due })}</Readout>
              {today.fresh > 0 ? <Readout>{t('study.deck.newCount', { count: today.fresh })}</Readout> : null}
              <Readout>{t('study.today.reviewed', { count: today.reviewedToday })}</Readout>
              {/*
               * The streak carries the web's flame and the web's nudge. Both
               * were missing: the readout was the bare count, so a live streak
               * and a dead one looked identical, and "study before midnight" —
               * the one line that says the streak is about to break — was never
               * shown at all (MOB-062).
               */}
              <Stack direction='row' spacing={0.5} alignItems='center'>
                <Icon name='Flame' size='sm' color={today.streak > 0 ? 'warning.plainColor' : 'text.tertiary'} />
                <Readout>{streakLine()}</Readout>
              </Stack>
            </>
          )
        }
        empty={!loading && !statsError && (list ?? []).length === 0 ? t('study.today.emptySentence') : null}
        aside={
          loading || (weekly.length === 0 && future.length === 0) ? null : (
            <Stack spacing={1}>
              <ForecastStrip past={weekly} today={today.asked} future={future} />
              <Readout>{t('study.today.weekReadout', { reviewed: reviewedWeek, tomorrow: dueTomorrow, week: dueWeek })}</Readout>
            </Stack>
          )
        }
        action={
          (list ?? []).length === 0 ? null : (
            /*
             * No `accessibilityLabel`. The visible text IS the accessible
             * name, and "Start Studying" as the name beside a visible
             * "Study · 23" fails WCAG 2.5.3 (Label in Name) — a speech-input
             * user says what they can see. The web's own key has no aria-label
             * for the same reason, and `MarkToggle` already records the rule
             * (MOB-042).
             */
            <Button size='md' onPress={() => router.push(`/study/${DAILY_REVIEW}`)}>
              {today.asked > 0 ? t('study.today.study', { count: today.asked }) : t('study.today.browse')}
            </Button>
          )
        }
        /*
         * The web's one secondary, and only when it means something: a day of
         * twenty-four is worth cutting to ten, a day of six is not. It was
         * absent here, so the only way into a short session was to start the
         * long one and stop (MOB-062).
         */
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
        progressLabel={loading || statsError ? null : t('study.today.progress', { done: today.reviewedToday, total: today.dayTotal })}
      />

      {statsError ? (
        <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
          {t('home.loadFailed')}
        </Typography>
      ) : null}

      {gap}

      {/* The web's own readout: how many decks AND how many cards, because
          "3 decks" does not say whether today is ten minutes or an hour. This
          was the deck count alone (MOB-062). */}
      <SectionHeader
        title={t('study.sections.dueNow')}
        count={t('study.sections.decksReadout', { decks: asking.length, cards: today.asked })}
      />
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
            /* A bare "1" beside a heading is a number with no noun. The web
               says "1 deck" here, in the phrase five locales already have. */
            title={t('study.sections.upToDate')}
            count={t('study.sections.deckCount', { count: upToDate.length })}
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

      {/* Empty is the section with its sentence in it, not a missing section
          (ADR-021 §1). Hiding it made "what did I just do" a question the page
          answered by having no answer anywhere. */}
      <>
        {gap}
        {/*
         * The web ends this rail with "N total" and "History →". Both were
         * absent because the screen they point at did not exist, so three rows
         * were not a preview of anything — they were the whole record
         * (MOB-064).
         */}
        <SectionHeader
          title={t('study.sections.recent')}
          count={sessions && sessions.length > 0 ? t('sessions.ofTotal', { shown: sessions.length, total: sessionTotal }) : null}
          action={
            sessionTotal > RECENT_COUNT ? (
              <Button size='sm' variant='tertiary' onPress={() => router.push('/study/history')}>
                {t('sessions.history')}
              </Button>
            ) : null
          }
        />
        {sessions === null ? (
          <Skeleton width='100%' height={56} />
        ) : sessions.length === 0 ? (
          <Typography level='body-sm' color='text.tertiary'>
            {t('sessions.emptyHint')}
          </Typography>
        ) : (
          sessions.map(sessionLine).map((session, index) => (
            <View key={session.id ?? index}>
              <Divider />
              <SessionRow
                title={session.title || t('sessions.unknownTopic')}
                meta={[
                  t(session.kindKey),
                  t('sessions.cardCount', { count: session.cards }),
                  t('study.dates.minutes', { count: session.minutes })
                ].join(' · ')}
                when={relativeDay(t, session.completedAt)}
                score={session.score}
              />
            </View>
          ))
        )}
      </>
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

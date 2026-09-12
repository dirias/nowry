/**
 * Every finished session, and what each one asked (MOB-064).
 *
 * The dashboard's Recent rail shows three rows and answers "what did I just
 * do". The web ends that rail with "History →" and a "5 of 23" readout; the
 * phone offered neither, because this screen did not exist — so three was not
 * a preview of anything, it was the whole record.
 *
 * **A row expands where the web's expands.** The per-card breakdown is the one
 * thing here that the rail cannot show, and it is why a learner opens a past
 * session at all: which questions were missed, and what the answer was. Which
 * of the payload's four shapes a card row is — a question, a question and the
 * answer it missed, a title and its grade, or a bare id — is `sessionCardLine`
 * in the shared package, so the two clients read the same four.
 *
 * **Paging is a key, not a scroll.** The list endpoint takes a limit and
 * returns the total, so "Load 20 more" is honest about how many are left. An
 * infinite scroll over a history nobody scrolls twice would cost a request per
 * flick and say nothing about the size of the thing.
 */
import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { studySessionsService } from '@nowry/core/api/services'
import { sessionCardLine, sessionLine } from '@nowry/core/domain/sessionLog'
import { useTheme } from '../theme'
import { Button, Divider, Icon, Readout, SectionHeader, SessionRow, Screen, Skeleton, Stack, Typography } from '../ui'

/** What the web loads, and what its "Load more" adds. */
const PAGE_SIZE = 20

export function StudyHistory() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const theme = useTheme()

  const [sessions, setSessions] = useState(null)
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)
  const [failed, setFailed] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const load = useCallback(async (fetchLimit, more = false) => {
    if (more) setLoadingMore(true)
    try {
      const data = await studySessionsService.list(fetchLimit)
      setSessions(data?.sessions ?? [])
      setTotal(data?.total ?? 0)
      setFailed(false)
    } catch {
      setFailed(true)
      setSessions((current) => current ?? [])
    } finally {
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    load(limit)
  }, [load, limit])

  const when = (iso) =>
    iso ? new Intl.DateTimeFormat(i18n?.language ?? 'en', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso)) : ''

  const rows = sessions ?? []
  const remaining = Math.max(0, total - rows.length)

  return (
    <Screen>
      <Stack spacing={2}>
        <SectionHeader title={t('sessions.title')} count={total > 0 ? t('sessions.totalCount', { count: total }) : null} />

        {failed ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t('home.loadFailed')}
          </Typography>
        ) : null}

        {sessions === null ? (
          <Stack spacing={1}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} width='100%' height={56} />
            ))}
          </Stack>
        ) : rows.length === 0 ? (
          <Stack spacing={1} style={{ paddingVertical: theme.spacing[3] }}>
            <Typography level='title-md' color='text.secondary'>
              {t('sessions.empty')}
            </Typography>
            <Typography level='body-sm' color='text.tertiary'>
              {t('sessions.emptyHint')}
            </Typography>
            <View style={{ alignItems: 'flex-start', paddingTop: theme.spacing[1] }}>
              <Button size='sm' variant='secondary' onPress={() => router.replace('/study')}>
                {t('study.startStudying')}
              </Button>
            </View>
          </Stack>
        ) : (
          rows.map((session, index) => {
            const line = sessionLine(session)
            const key = line.id ?? index
            const open = expanded === key

            return (
              <View key={key}>
                <Divider />
                <SessionRow
                  title={line.title || t('sessions.unknownTopic')}
                  meta={[
                    t(line.kindKey),
                    t('sessions.cardCount', { count: line.cards }),
                    t('study.dates.minutes', { count: line.minutes })
                  ].join(' · ')}
                  when={when(line.completedAt)}
                  score={line.score}
                  onPress={() => setExpanded(open ? null : key)}
                />
                {open ? <Breakdown cards={session.cards ?? []} t={t} theme={theme} /> : null}
              </View>
            )
          })
        )}

        {remaining > 0 ? (
          <Button variant='secondary' loading={loadingMore} onPress={() => setLimit((current) => current + PAGE_SIZE)}>
            {t('sessions.loadMore', { count: Math.min(PAGE_SIZE, remaining) })}
          </Button>
        ) : null}
      </Stack>
    </Screen>
  )
}

/** What one past session asked, card by card. */
function Breakdown({ cards, t, theme }) {
  if (cards.length === 0) {
    return (
      <Typography level='body-xs' color='text.tertiary' style={{ paddingBottom: theme.spacing[1.5] }}>
        {t('sessions.noCardDetail')}
      </Typography>
    )
  }

  return (
    <Stack spacing={1} style={{ paddingBottom: theme.spacing[1.5] }}>
      {cards.map(sessionCardLine).map((line, index) => (
        <Stack key={index} direction='row' spacing={1.5} style={{ alignItems: 'flex-start' }}>
          {/* The judgement, as a glyph in its own colour — both named by
              `evaluationOf` so the two clients cannot disagree about what
              "partial" looks like. */}
          <View style={{ paddingTop: 2 }}>
            <Icon name={line.evaluation.iconKey} size='sm' color={line.evaluation.color} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            {line.question ? (
              <Typography level='body-xs' color='text.primary'>
                {line.question}
              </Typography>
            ) : null}
            {line.answer ? (
              <Typography level='body-xs' color='text.secondary'>
                {`→ ${line.answer}`}
              </Typography>
            ) : null}
            {line.title ? (
              <Stack direction='row' spacing={1} style={{ alignItems: 'center' }}>
                <Typography level='body-xs' color='text.primary' style={{ flexShrink: 1 }}>
                  {line.title}
                </Typography>
                {line.grade ? <Readout>{line.grade}</Readout> : null}
              </Stack>
            ) : null}
            {line.ref ? (
              <Typography level='body-xs' color='text.tertiary'>
                {t('sessions.cardRef', { id: line.ref })}
              </Typography>
            ) : null}
          </View>
        </Stack>
      ))}
    </Stack>
  )
}

export default StudyHistory

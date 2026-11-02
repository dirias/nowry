/**
 * StudyHistory — /study/history
 *
 * Full-page session history. Shows all completed sessions across every
 * study mode (AI quiz, deck quiz, SRS flashcard review).
 */
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Button, Chip, Container, Divider, Skeleton, Stack, Typography } from '@mui/joy'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import EventNoteRounded from '@mui/icons-material/EventNoteRounded'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRounded from '@mui/icons-material/ExpandLessRounded'
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded'
import MenuBookRounded from '@mui/icons-material/MenuBookRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import RemoveRounded from '@mui/icons-material/RemoveRounded'
import { studySessionsService } from '@nowry/core/api/services/studySessions.service'
import { evaluationOf, sessionCardLine, sessionLine, sessionTitle } from '@nowry/core/domain/sessionLog'
import { familySignal, sessionBreakdown } from '@nowry/core/domain/attemptSignals'
import { useSessionAttempts } from '@nowry/core/hooks/useSessionAttempts'

// ---------------------------------------------------------------------------
// Helpers (duplicated here to keep this page self-contained)
// ---------------------------------------------------------------------------

const formatDuration = (seconds) => {
  if (!seconds || seconds < 60) return `${seconds || 0}s`
  const mins = Math.round(seconds / 60)
  return `${mins} min`
}

const formatDate = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  })
}

const scoreColor = (pct) => {
  if (pct >= 80) return 'success'
  if (pct >= 55) return 'warning'
  return 'danger'
}

/** The glyph for an evaluation. Which of the three it is, and its colour, are
    `evaluationOf`'s; the component that draws it is this client's. */
const EVAL_GLYPHS = { Check: CheckRounded, Minus: RemoveRounded, X: CloseRounded }

const evalIcon = ({ iconKey, color }) => {
  const Glyph = EVAL_GLYPHS[iconKey] ?? CloseRounded
  return <Glyph sx={{ fontSize: 12, color }} />
}

// ---------------------------------------------------------------------------
// SessionRow
// ---------------------------------------------------------------------------

const SessionRow = ({ session, t, navigate, defaultExpanded = false }) => {
  // Open on arrival when a Recent row was the way in (ADR-058 §3).
  const [expanded, setExpanded] = useState(defaultExpanded)

  const isAI = session.session_type === 'ai_quiz'
  const isSRS = session.session_type === 'srs_review'

  const label = sessionTitle(t, sessionLine(session))

  const typeLabel = isAI ? t('sessions.aiQuiz') : isSRS ? t('sessions.srsReview') : t('sessions.deckQuiz')

  const pct = session.score_percentage

  return (
    <Box>
      <Box
        role='button'
        aria-label={expanded ? t('sessions.collapseAria') : t('sessions.expandAria')}
        aria-expanded={expanded}
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setExpanded((v) => !v)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          py: 2,
          px: 1,
          cursor: 'pointer',
          borderRadius: 'sm',
          transition: 'background 0.15s',
          '&:hover': { bgcolor: 'background.level1' },
          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
        }}
      >
        {/* Type icon */}
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 'sm',
            bgcolor: isAI ? 'primary.softBg' : isSRS ? 'success.softBg' : 'neutral.softBg',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {isAI ? (
            <AutoAwesomeRounded sx={{ fontSize: 18, color: 'primary.plainColor' }} />
          ) : (
            <MenuBookRounded sx={{ fontSize: 18, color: isSRS ? 'success.plainColor' : 'neutral.plainColor' }} />
          )}
        </Box>

        {/* Label + meta */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography level='title-sm' fontWeight={600} noWrap>
            {label}
          </Typography>
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            {typeLabel} · {t('sessions.cardCount', { count: session.total_cards })} · {formatDuration(session.duration_seconds)}
          </Typography>
        </Box>

        {/* Date */}
        <Typography level='body-xs' sx={{ color: 'text.tertiary', flexShrink: 0, display: { xs: 'none', sm: 'block' } }}>
          {formatDate(session.completed_at)}
        </Typography>

        {/* Correct / Total */}
        <Typography level='body-sm' sx={{ color: 'text.secondary', flexShrink: 0 }}>
          {session.correct}/{session.total_cards}
        </Typography>

        {/* Score */}
        <Chip size='sm' variant='soft' color={scoreColor(pct)} sx={{ flexShrink: 0, minWidth: 48, justifyContent: 'center' }}>
          {pct}%
        </Chip>

        {expanded ? (
          <ExpandLessRounded sx={{ fontSize: 18, color: 'text.tertiary', flexShrink: 0 }} />
        ) : (
          <ExpandMoreRounded sx={{ fontSize: 18, color: 'text.tertiary', flexShrink: 0 }} />
        )}
      </Box>

      {/* Expanded: the session as a reading (ADR-059 §3); the flat list for sessions without ledger rows. */}
      {expanded && <SessionBreakdown session={session} t={t} navigate={navigate} />}
    </Box>
  )
}

const FlatBreakdown = ({ session, t }) => (
  <Box sx={{ bgcolor: 'background.level1', borderRadius: 'sm', p: 2, mb: 1, ml: { xs: 0, sm: 6.5 } }}>
    <Stack spacing={1}>
      {session.cards.length === 0 && (
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t('sessions.noCardDetail')}
        </Typography>
      )}
      {/* Which of the payload's four shapes this card is, decided in
                `sessionCardLine` — the phone's history reads the same four
                (MOB-064). */}
      {session.cards.map(sessionCardLine).map((line, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Box sx={{ mt: 0.25, flexShrink: 0 }}>{evalIcon(line.evaluation)}</Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            {line.question && (
              <Typography level='body-xs' sx={{ color: 'text.primary' }}>
                {line.question}
              </Typography>
            )}
            {line.answer && (
              <Typography level='body-xs' sx={{ color: 'text.secondary', mt: 0.25 }}>
                → {line.answer}
              </Typography>
            )}
            {line.title && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography level='body-xs' sx={{ color: 'text.primary' }}>
                  {line.title}
                </Typography>
                {line.grade && (
                  <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                    {line.grade}
                  </Typography>
                )}
              </Box>
            )}
            {line.ref && (
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {t('sessions.cardRef', { id: line.ref })}
              </Typography>
            )}
          </Box>
        </Box>
      ))}
    </Stack>
  </Box>
)

const SIGNAL_COLOR = { fluent: 'success', misconception: 'danger', fragile: 'warning', unlearned: 'neutral' }

const Marks = ({ line, t }) => {
  const marks = [
    line.signals?.speed ? { key: line.signals.speed, color: SIGNAL_COLOR[line.signals.speed] ?? 'neutral' } : null,
    line.signals?.helped ? { key: 'asked', color: 'primary' } : null,
    line.signals?.lapse === 'lapse' || line.signals?.lapse === 'relearning' ? { key: line.signals.lapse, color: 'danger' } : null
  ].filter(Boolean)
  if (marks.length === 0) return null
  return (
    <Stack direction='row' spacing={0.5} sx={{ flexShrink: 0 }}>
      {marks.map((mark) => (
        <Chip key={mark.key} size='sm' variant='soft' color={mark.color}>
          {t(`sessions.signal.${mark.key}`)}
        </Chip>
      ))}
    </Stack>
  )
}

const CardLine = ({ line, t }) => {
  const glyph = evaluationOf(line)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      <Box sx={{ flexShrink: 0, display: 'flex' }}>{evalIcon(glyph)}</Box>
      <Typography level='body-xs' noWrap sx={{ color: 'text.primary', flex: 1, minWidth: 0 }}>
        {line.title || t('sessions.cardRef', { id: String(line.cardId ?? '').slice(-6) })}
      </Typography>
      <Marks line={line} t={t} />
    </Box>
  )
}

const Family = ({ family, t }) => {
  const signal = familySignal(family)
  const head =
    family.kind === 'character'
      ? t('sessions.breakdown.family', { label: family.label, count: family.cards.length })
      : family.kind === 'tag'
        ? t('sessions.breakdown.tagFamily', { label: family.label, count: family.cards.length })
        : t('sessions.breakdown.others')
  return (
    <Stack spacing={0.5}>
      <Stack direction='row' spacing={1} alignItems='center'>
        <Typography level='body-sm' fontWeight={600}>
          {head}
        </Typography>
        {signal ? (
          <Chip size='sm' variant='soft' color={SIGNAL_COLOR[signal] ?? 'neutral'}>
            {t(`sessions.signal.${signal}`)}
          </Chip>
        ) : null}
      </Stack>
      {family.cards.map((line, i) => (
        <CardLine key={line.cardId ?? i} line={line} t={t} />
      ))}
    </Stack>
  )
}

/**
 * One past session as a reading (ADR-059 §3, Direction A): a sentence, what
 * slipped grouped into families with their signals, what held folded, and the
 * moves. Fetched when the row opens.
 */
const SessionBreakdown = ({ session, t, navigate }) => {
  const { attempts, medianThinkMs, daysSincePrevious, loading, error } = useSessionAttempts(session.id)
  const [heldOpen, setHeldOpen] = useState(false)

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant='text' level='body-sm' width='60%' />
        <Skeleton variant='text' level='body-xs' width='40%' />
      </Box>
    )
  }
  if (error) {
    return (
      <Typography level='body-xs' sx={{ color: 'danger.plainColor', p: 2 }}>
        {t('sessions.breakdown.loadFailed')}
      </Typography>
    )
  }

  const reading = sessionBreakdown({ session, attempts, medianThinkMs, daysSincePrevious })
  if (!reading.fromLedger) return <FlatBreakdown session={session} t={t} />

  const drill = reading.moves.find((m) => m.kind === 'drill')
  const deckRoute = session.deck_id ?? 'daily-review'

  return (
    <Box sx={{ bgcolor: 'background.level1', borderRadius: 'sm', p: 2, mb: 1, ml: { xs: 0, sm: 6.5 } }}>
      <Stack spacing={2}>
        {reading.reading && (
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t(reading.reading.key, reading.reading.params)}
          </Typography>
        )}

        {reading.slippedCount > 0 && (
          <Stack spacing={1}>
            <Stack direction='row' spacing={1} alignItems='baseline'>
              <Typography level='title-sm'>{t('sessions.breakdown.slipped')}</Typography>
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {t('sessions.cardCount', { count: reading.slippedCount })}
              </Typography>
            </Stack>
            {reading.slipped.map((family, i) => (
              <Family key={`${family.kind}-${family.label ?? i}`} family={family} t={t} />
            ))}
          </Stack>
        )}

        {reading.held.count > 0 && (
          <Stack spacing={1}>
            <Stack direction='row' spacing={1} alignItems='center'>
              <Typography level='title-sm'>{t('sessions.breakdown.held')}</Typography>
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {t('sessions.cardCount', { count: reading.held.count })}
                {reading.held.fluent + reading.held.fragile > 0
                  ? ` · ${t('sessions.breakdown.heldCounts', { fluent: reading.held.fluent, fragile: reading.held.fragile })}`
                  : ''}
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Button variant='plain' color='neutral' size='sm' onClick={() => setHeldOpen((v) => !v)}>
                {t(heldOpen ? 'sessions.breakdown.hide' : 'sessions.breakdown.show')}
              </Button>
            </Stack>
            {heldOpen && reading.held.cards.map((line, i) => <CardLine key={line.cardId ?? i} line={line} t={t} />)}
          </Stack>
        )}

        {drill && (
          <Stack spacing={1}>
            <Typography level='title-sm'>{t('sessions.breakdown.next')}</Typography>
            <Box>
              <Button
                size='sm'
                onClick={() => navigate(`/study/${deckRoute}?mode=drill&cards=${encodeURIComponent(drill.cardIds.join(','))}`)}
                aria-label={t('sessions.breakdown.drill', { count: drill.cardIds.length })}
              >
                {t('sessions.breakdown.drill', { count: drill.cardIds.length })}
              </Button>
            </Box>
          </Stack>
        )}
      </Stack>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// StudyHistory page
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20

export default function StudyHistory() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const openSession = searchParams.get('session')

  const [sessions, setSessions] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback(async (fetchLimit, isLoadMore = false) => {
    isLoadMore ? setLoadingMore(true) : setLoading(true)
    try {
      const data = await studySessionsService.list(fetchLimit)
      setSessions(data.sessions || [])
      setTotal(data.total || 0)
    } catch {
      // Non-fatal
    } finally {
      isLoadMore ? setLoadingMore(false) : setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(limit)
  }, [load, limit])

  const handleLoadMore = () => {
    const next = limit + PAGE_SIZE
    setLimit(next)
    load(next, true)
  }

  return (
    <Container maxWidth='lg' sx={{ py: { xs: 3, md: 4 } }}>
      {/* Back */}
      <Button
        variant='plain'
        color='neutral'
        size='sm'
        startDecorator={<ArrowBackRounded sx={{ fontSize: 16 }} />}
        onClick={() => navigate('/study')}
        sx={{ mb: 3, px: 0 }}
      >
        {t('common.back')}
      </Button>

      {/* Header */}
      <Stack direction='row' justifyContent='space-between' alignItems='baseline' sx={{ mb: 3 }}>
        <Typography level='h3' component='h1' fontWeight={700}>
          {t('sessions.title')}
        </Typography>
        {!loading && total > 0 && (
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            {t('sessions.totalCount', { count: total })}
          </Typography>
        )}
      </Stack>

      {/* Loading */}
      {loading && (
        <Stack spacing={1} divider={<Divider />}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
              <Skeleton variant='rectangular' width={36} height={36} sx={{ borderRadius: 'sm', flexShrink: 0 }} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant='text' level='title-sm' width='45%' />
                <Skeleton variant='text' level='body-xs' width='30%' />
              </Box>
              <Skeleton variant='rectangular' width={48} height={24} sx={{ borderRadius: 'sm' }} />
            </Box>
          ))}
        </Stack>
      )}

      {/* Empty */}
      {!loading && sessions.length === 0 && (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <EventNoteRounded sx={{ fontSize: 48, color: 'text.tertiary', opacity: 0.5, mb: 2 }} />
          <Typography level='title-md' sx={{ mb: 0.5, color: 'text.secondary' }}>
            {t('sessions.empty')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            {t('sessions.emptyHint')}
          </Typography>
        </Box>
      )}

      {/* Session list */}
      {!loading && sessions.length > 0 && (
        <>
          <Stack divider={<Divider />}>
            {sessions.map((session) => (
              <SessionRow key={session.id} session={session} t={t} navigate={navigate} defaultExpanded={session.id === openSession} />
            ))}
          </Stack>

          {/* Load more */}
          {sessions.length < total && (
            <Stack sx={{ mt: 3 }} alignItems='center'>
              <Button variant='outlined' color='neutral' size='sm' loading={loadingMore} onClick={handleLoadMore}>
                {t('sessions.loadMore', { count: total - sessions.length })}
              </Button>
            </Stack>
          )}
        </>
      )}
    </Container>
  )
}

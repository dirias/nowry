/**
 * StudyHistory — /study/history
 *
 * Full-page session history. Shows all completed sessions across every
 * study mode (AI quiz, deck quiz, SRS flashcard review).
 */
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { studySessionsService } from '../../api/services/studySessions.service'

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

const evalIcon = (evaluation) => {
  if (evaluation === 'correct') return <CheckRounded sx={{ fontSize: 12, color: 'success.plainColor' }} />
  if (evaluation === 'partial') return <RemoveRounded sx={{ fontSize: 12, color: 'warning.plainColor' }} />
  return <CloseRounded sx={{ fontSize: 12, color: 'danger.plainColor' }} />
}

// ---------------------------------------------------------------------------
// SessionRow
// ---------------------------------------------------------------------------

const SessionRow = ({ session, t }) => {
  const [expanded, setExpanded] = useState(false)

  const isAI = session.session_type === 'ai_quiz'
  const isSRS = session.session_type === 'srs_review'

  const label = isAI ? session.topic : session.deck_name || (isSRS ? t('sessions.srsReview') : t('sessions.deckQuiz'))

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
            {label || t('sessions.unknownTopic')}
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

      {/* Expanded card breakdown */}
      {expanded && (
        <Box sx={{ bgcolor: 'background.level1', borderRadius: 'sm', p: 2, mb: 1, ml: { xs: 0, sm: 6.5 } }}>
          <Stack spacing={1}>
            {session.cards.length === 0 && (
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {t('sessions.noCardDetail')}
              </Typography>
            )}
            {session.cards.map((card, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Box sx={{ mt: 0.25, flexShrink: 0 }}>{evalIcon(card.evaluation)}</Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  {card.question_text && (
                    <Typography level='body-xs' sx={{ color: 'text.primary' }}>
                      {card.question_text}
                    </Typography>
                  )}
                  {card.correct_answer && card.evaluation !== 'correct' && (
                    <Typography level='body-xs' sx={{ color: 'text.secondary', mt: 0.25 }}>
                      → {card.correct_answer}
                    </Typography>
                  )}
                  {card.card_title && !card.question_text && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography level='body-xs' sx={{ color: 'text.primary' }}>
                        {card.card_title}
                      </Typography>
                      {card.grade && (
                        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                          {card.grade}
                        </Typography>
                      )}
                    </Box>
                  )}
                  {!card.question_text && !card.card_title && card.card_id && (
                    <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                      {t('sessions.cardRef', { id: card.card_id.slice(-6) })}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
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
        <Typography level='h3' fontWeight={700}>
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
              <SessionRow key={session.id} session={session} t={t} />
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

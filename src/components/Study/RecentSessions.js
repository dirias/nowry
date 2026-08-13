/**
 * RecentSessions
 *
 * Displays the user's completed quiz session history on the /study dashboard.
 * Shows up to 5 sessions by default; expands to all on "View all" click.
 * Each row is expandable to reveal per-card evaluations.
 *
 * Session types:
 *   ai_quiz  — topic-based AI quiz; cards include question_text + correct_answer
 *   deck_quiz — deck-based quiz; cards reference card_id
 */
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Button, Chip, Divider, Skeleton, Stack, Typography } from '@mui/joy'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRounded from '@mui/icons-material/ExpandLessRounded'
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded'
import MenuBookRounded from '@mui/icons-material/MenuBookRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import RemoveRounded from '@mui/icons-material/RemoveRounded'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import { studySessionsService } from '../../api/services/studySessions.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PREVIEW_COUNT = 5

const formatDuration = (seconds) => {
  if (!seconds || seconds < 60) return `${seconds || 0}s`
  const mins = Math.round(seconds / 60)
  return `${mins} min`
}

const formatDate = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  const now = new Date()
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
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
// SessionRow — single expandable row
// ---------------------------------------------------------------------------

const SessionRow = ({ session }) => {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const isAI = session.session_type === 'ai_quiz'
  const isSRS = session.session_type === 'srs_review'
  const label = isAI ? session.topic : session.deck_name || (isSRS ? t('sessions.srsReview') : t('sessions.deckQuiz'))
  const typeLabel = isAI ? t('sessions.aiQuiz') : isSRS ? t('sessions.srsReview') : t('sessions.deckQuiz')
  const cardCount = session.total_cards
  const pct = session.score_percentage

  return (
    <Box>
      {/* Summary row */}
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
          gap: 1.5,
          py: 1.5,
          cursor: 'pointer',
          borderRadius: 'sm',
          px: 0.5,
          transition: 'background 0.15s',
          '&:hover': { bgcolor: 'background.level1' },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.outlinedBorder',
            outlineOffset: '2px'
          }
        }}
      >
        {/* Type icon */}
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 'sm',
            bgcolor: isAI ? 'primary.softBg' : isSRS ? 'success.softBg' : 'neutral.softBg',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {isAI ? (
            <AutoAwesomeRounded sx={{ fontSize: 16, color: 'primary.plainColor' }} />
          ) : isSRS ? (
            <MenuBookRounded sx={{ fontSize: 16, color: 'success.plainColor' }} />
          ) : (
            <MenuBookRounded sx={{ fontSize: 16, color: 'neutral.plainColor' }} />
          )}
        </Box>

        {/* Label + meta */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography level='body-sm' fontWeight={600} noWrap sx={{ color: 'text.primary' }}>
            {label || t('sessions.unknownTopic')}
          </Typography>
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            {typeLabel} · {t('sessions.cardCount', { count: cardCount })} · {formatDuration(session.duration_seconds)}
          </Typography>
        </Box>

        {/* Date */}
        <Typography level='body-xs' sx={{ color: 'text.tertiary', flexShrink: 0 }}>
          {formatDate(session.completed_at)}
        </Typography>

        {/* Score */}
        <Chip size='sm' variant='soft' color={scoreColor(pct)} sx={{ flexShrink: 0, minWidth: 42, justifyContent: 'center' }}>
          {pct}%
        </Chip>

        {/* Expand chevron */}
        {expanded ? (
          <ExpandLessRounded sx={{ fontSize: 18, color: 'text.tertiary', flexShrink: 0 }} />
        ) : (
          <ExpandMoreRounded sx={{ fontSize: 18, color: 'text.tertiary', flexShrink: 0 }} />
        )}
      </Box>

      {/* Expanded card breakdown */}
      {expanded && (
        <Box sx={{ bgcolor: 'background.level1', borderRadius: 'sm', p: 1.5, mb: 0.5, ml: { xs: 0, sm: 5.5 } }}>
          <Stack spacing={0.75}>
            {session.cards.length === 0 && (
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {t('sessions.noCardDetail')}
              </Typography>
            )}
            {session.cards.map((card, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Box sx={{ mt: 0.25, flexShrink: 0 }}>{evalIcon(card.evaluation)}</Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  {/* AI quiz: question text */}
                  {card.question_text && (
                    <Typography level='body-xs' sx={{ color: 'text.primary' }} noWrap>
                      {card.question_text}
                    </Typography>
                  )}
                  {/* AI quiz: reveal correct answer when missed */}
                  {card.correct_answer && card.evaluation !== 'correct' && (
                    <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                      → {card.correct_answer}
                    </Typography>
                  )}
                  {/* SRS review + deck quiz: card title; grade badge only for SRS */}
                  {card.card_title && !card.question_text && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography level='body-xs' sx={{ color: 'text.primary' }} noWrap>
                        {card.card_title}
                      </Typography>
                      {card.grade && (
                        <Typography level='body-xs' sx={{ color: 'text.tertiary', flexShrink: 0 }}>
                          {card.grade}
                        </Typography>
                      )}
                    </Box>
                  )}
                  {/* Fallback for old sessions logged before card_title was stored */}
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
// RecentSessions — main export
// ---------------------------------------------------------------------------

export default function RecentSessions() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await studySessionsService.list(100)
      setSessions(data.sessions || [])
      setTotal(data.total || 0)
    } catch {
      // Non-fatal — section simply stays hidden
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <Box sx={{ mt: { xs: 4, md: 6 } }}>
      {/* Section header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography level='title-lg' fontWeight={700}>
          {t('sessions.title')}
        </Typography>
        {!loading && total > 0 && (
          <Button
            variant='plain'
            color='neutral'
            size='sm'
            endDecorator={<ArrowForwardRounded sx={{ fontSize: 14 }} />}
            onClick={() => navigate('/study/history')}
            sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'transparent', color: 'text.primary' } }}
          >
            {t('sessions.viewHistory')}
          </Button>
        )}
      </Box>

      {/* Loading skeletons */}
      {loading && (
        <Stack spacing={1}>
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5 }}>
              <Skeleton variant='rectangular' width={32} height={32} sx={{ borderRadius: 'sm', flexShrink: 0 }} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant='text' level='body-sm' width='55%' />
                <Skeleton variant='text' level='body-xs' width='35%' />
              </Box>
              <Skeleton variant='rectangular' width={42} height={22} sx={{ borderRadius: 'sm' }} />
            </Box>
          ))}
        </Stack>
      )}

      {/* Empty state */}
      {!loading && sessions.length === 0 && (
        <Box
          sx={{
            py: 3,
            px: 2,
            borderRadius: 'sm',
            bgcolor: 'background.level1',
            border: '1px dashed',
            borderColor: 'divider',
            textAlign: 'center'
          }}
        >
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('sessions.empty')}
          </Typography>
        </Box>
      )}

      {/* Session list */}
      {!loading && sessions.length > 0 && (
        <Stack divider={<Divider />}>
          {sessions.slice(0, PREVIEW_COUNT).map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </Stack>
      )}
    </Box>
  )
}

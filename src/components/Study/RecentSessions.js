/**
 * RecentSessions — the dashboard's history rail (PRD D11).
 *
 * Five rows, one anatomy (§15.11): a 28px type tile · label with a meta line ·
 * date · score as text in its grade colour beside a 36×3 bar. No expansion —
 * a dashboard is overview only (§11); the per-card breakdown lives on
 * /study/history. "History →" is navigation, so it is text on the right rail
 * with no material (§15.2).
 */
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Link, Skeleton, Stack, Typography } from '@mui/joy'
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded'
import StyleRounded from '@mui/icons-material/StyleRounded'
import QuizRounded from '@mui/icons-material/QuizRounded'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import { studySessionsService } from '../../api/services/studySessions.service'
import { listRow, measureFill, measureTrack, oneLine, readout, tabularNums } from '../Common/Form/formStyles'

const PREVIEW_COUNT = 5

const formatDuration = (seconds) => {
  if (!seconds || seconds < 60) return `${seconds || 0}s`
  return `${Math.round(seconds / 60)} min`
}

const gradeColor = (pct) => {
  if (pct >= 80) return 'success.plainColor'
  if (pct >= 55) return 'warning.plainColor'
  return 'danger.plainColor'
}

const gradeFill = (pct) => {
  if (pct >= 80) return 'success.solidBg'
  if (pct >= 55) return 'warning.solidBg'
  return 'danger.solidBg'
}

const KIND = {
  ai_quiz: { Icon: AutoAwesomeRounded, labelKey: 'sessions.aiQuiz' },
  srs_review: { Icon: StyleRounded, labelKey: 'sessions.srsReview' },
  deck_quiz: { Icon: QuizRounded, labelKey: 'sessions.deckQuiz' }
}

const SessionRow = ({ session, formatDate }) => {
  const { t } = useTranslation()
  const kind = KIND[session.session_type] || KIND.deck_quiz
  const label = session.session_type === 'ai_quiz' ? session.topic : session.deck_name || t(kind.labelKey)
  const pct = session.score_percentage ?? 0
  return (
    <Box data-testid='session-row' sx={{ ...listRow, gap: 1.5 }}>
      <Box
        aria-hidden='true'
        sx={{
          width: 28,
          height: 28,
          borderRadius: 'sm',
          bgcolor: 'background.level1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <kind.Icon sx={{ fontSize: 'sm', color: 'text.secondary' }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        <Typography level='title-sm' sx={oneLine}>
          {label || t('sessions.unknownTopic')}
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.tertiary', ...oneLine }}>
          {t(kind.labelKey)} · {t('sessions.cardCount', { count: session.total_cards })} · {formatDuration(session.duration_seconds)}
        </Typography>
      </Box>
      <Typography level='body-xs' sx={{ ...readout, fontSize: 'xs', flexShrink: 0 }}>
        {formatDate(session.completed_at)}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }} aria-label={t('sessions.scoreAria', { pct })}>
        <Box sx={{ ...measureTrack, width: 36 }}>
          <Box sx={measureFill(pct, gradeFill(pct))} />
        </Box>
        <Typography level='title-sm' sx={{ color: gradeColor(pct), width: 40, textAlign: 'right', ...tabularNums }}>
          {pct}%
        </Typography>
      </Box>
    </Box>
  )
}

export default function RecentSessions() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await studySessionsService.list(PREVIEW_COUNT)
      setSessions(data.sessions || [])
      setTotal(data.total || 0)
    } catch {
      // Non-fatal — the rail simply shows its empty line
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const formatDate = (iso) => {
    if (!iso) return ''
    const date = new Date(iso)
    const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return t('study.dates.today')
    if (diffDays === 1) return t('study.dates.yesterday')
    if (diffDays < 7) return t('study.dates.daysAgo', { count: diffDays })
    return date.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })
  }

  return (
    <Box component='section' aria-labelledby='study-recent-title'>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1, minHeight: 28 }}>
        <Stack direction='row' spacing={1.25} alignItems='baseline'>
          <Typography id='study-recent-title' level='title-md'>
            {t('study.sections.recent')}
          </Typography>
          {!loading && total > 0 && (
            <Typography level='body-sm' sx={readout}>
              {t('sessions.ofTotal', { shown: Math.min(sessions.length, PREVIEW_COUNT), total })}
            </Typography>
          )}
        </Stack>
        {!loading && total > 0 && (
          <Link
            component='button'
            level='body-sm'
            underline='none'
            onClick={() => navigate('/study/history')}
            endDecorator={<ArrowForwardRounded sx={{ fontSize: 'sm' }} />}
            sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
          >
            {t('sessions.history')}
          </Link>
        )}
      </Box>

      {loading && (
        <Stack spacing={1}>
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5 }}>
              <Skeleton variant='rectangular' width={28} height={28} sx={{ borderRadius: 'sm', flexShrink: 0 }} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant='text' level='body-sm' width='55%' />
                <Skeleton variant='text' level='body-xs' width='35%' />
              </Box>
            </Box>
          ))}
        </Stack>
      )}

      {!loading && sessions.length === 0 && (
        <Typography level='body-sm' sx={{ color: 'text.tertiary', py: 1.5 }}>
          {t('sessions.emptyHint')}
        </Typography>
      )}

      {!loading && sessions.length > 0 && (
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          {sessions.slice(0, PREVIEW_COUNT).map((session) => (
            <SessionRow key={session.id} session={session} formatDate={formatDate} />
          ))}
        </Box>
      )}
    </Box>
  )
}

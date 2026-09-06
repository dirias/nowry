import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Container, Typography, Box, Button, Stack } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { useStatistics } from '../../hooks/useStatistics'
import { useDeckData } from '../../hooks/useDeckData'
import { useForecast } from '../../hooks/useForecast'
import { agentService } from '../../api/services/agent.service'
import { usePet } from '../../context/AgentContext'
import CardHome from '../Cards/CardHome'
import RecentSessions from './RecentSessions'
import TodayObject from './TodayObject'
import ViewSegment from './ViewSegment'
import DeckRow from './DeckRow'
import { readout } from '../Common/Form/formStyles'

const UP_TO_DATE_PREVIEW = 3

const VIEWS = ['dashboard', 'library']

export default function StudyCenter() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    dueToday: 0,
    newToday: 0,
    reviewedToday: 0,
    totalActive: 0,
    streak: 0
  })

  const [showAllUpToDate, setShowAllUpToDate] = useState(false)

  const { statistics: statisticsData, loading: statsLoading } = useStatistics()
  const { decks: hookDecks, loading: decksLoading, reload: reloadDecks } = useDeckData()
  const { forecast } = useForecast(7)
  const { queuePreSessionIntervention } = usePet()

  // The view lives in the URL (architecture addendum, "Routes") so the library
  // is linkable and a phone's back control leaves a group, not the page.
  const [searchParams, setSearchParams] = useSearchParams()
  const view = VIEWS.includes(searchParams.get('view')) ? searchParams.get('view') : 'dashboard'
  const setView = useCallback(
    (next) => {
      const params = new URLSearchParams(searchParams)
      if (next === 'dashboard') params.delete('view')
      else params.set('view', next)
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)

      const resolvedDecks = hookDecks || []
      setDecks(resolvedDecks)

      // Derive global counts directly from deck data — single source of truth
      const dueToday = resolvedDecks.reduce((sum, d) => sum + (d.due_cards || 0), 0)
      const newToday = resolvedDecks.reduce((sum, d) => sum + (d.new_cards || 0), 0)
      const totalActive = resolvedDecks.reduce((sum, d) => sum + (d.total_cards || 0), 0)

      // Streak + weekly progress come exclusively from the statistics endpoint
      const summary = statisticsData?.summary || {}
      const weeklyData = statisticsData?.weekly_progress || []
      const todayData = weeklyData[weeklyData.length - 1]
      const reviewedToday = todayData ? todayData.cards || 0 : 0

      setStats({
        dueToday,
        newToday,
        reviewedToday,
        totalActive,
        streak: summary.current_streak || 0
      })

      setLoading(false)
    } catch (error) {
      console.error('Error fetching study data:', error)
      setLoading(false)
    }
  }, [hookDecks, statisticsData])

  useEffect(() => {
    if (statsLoading || decksLoading) return
    fetchData()
  }, [statsLoading, decksLoading, fetchData])

  // Phase 2 — Proactive companion: pre-session triggers evaluated once per render cycle
  // when all data is loaded. Priority order: re-engagement → pre-session framing → streak milestone.
  const phase2FiredRef = useRef(false)
  useEffect(() => {
    if (loading || statsLoading || !statisticsData || !decks?.length) return
    // Only fire once per component mount — data may re-derive but we don't re-trigger
    if (phase2FiredRef.current) return
    phase2FiredRef.current = true

    const todayUTC = new Date().toISOString().slice(0, 10)

    // --- Priority 1: Re-engagement (gap >= 3 calendar days) ---
    const lastStudyDate = statisticsData.summary?.last_study_date
    if (lastStudyDate) {
      const lastDate = new Date(lastStudyDate)
      const nowDate = new Date()
      const gapDays = Math.floor((nowDate - lastDate) / (1000 * 60 * 60 * 24))
      if (gapDays >= 3) {
        const reengagementKey = `nowry_reengagement_seen_${todayUTC}`
        if (!localStorage.getItem(reengagementKey)) {
          const topDeck = decksNeedingReview[0]
          const totalDueCount = (statisticsData.summary?.due_today ?? 0) + (statisticsData.summary?.new_today ?? 0)
          const daysSince = Math.floor((Date.now() - new Date(statisticsData.summary.last_study_date).getTime()) / (1000 * 60 * 60 * 24))
          agentService
            .postIntervention({
              type: 're_engagement',
              total_due_count: totalDueCount,
              top_deck_name: topDeck?.name ?? '',
              top_deck_due: topDeck?.due_cards ?? 0,
              days_since_last_session: daysSince
            })
            .then((result) => {
              localStorage.setItem(reengagementKey, '1')
              queuePreSessionIntervention(result)
            })
            .catch(() => {
              // Non-fatal — key intentionally not set so next visit can retry
            })
          return
        }
      }
    }

    // --- Priority 2: Pre-session framing (top deck >= 15 due cards) ---
    const topDeck = decksNeedingReview[0]
    if (topDeck && (topDeck.due_cards ?? 0) >= 15) {
      const presessionKey = `nowry_presession_seen_${topDeck._id}_${todayUTC}`
      if (!localStorage.getItem(presessionKey)) {
        agentService
          .postIntervention({
            type: 'pre_session_framing',
            deck_id: topDeck._id,
            deck_name: topDeck.name,
            due_count: topDeck.due_cards,
            last_struggle_pattern: statisticsData.summary?.last_session_struggle ?? null
          })
          .then((result) => {
            localStorage.setItem(presessionKey, '1')
            queuePreSessionIntervention(result)
          })
          .catch(() => {
            // Non-fatal
          })
        return
      }
    }

    // --- Priority 3: Streak milestone ---
    const currentStreak = statisticsData.summary?.current_streak
    const milestoneSteaks = [7, 14, 30, 60, 100]
    if (currentStreak && milestoneSteaks.includes(currentStreak)) {
      agentService
        .postIntervention({
          type: 'streak_milestone',
          streak_count: currentStreak
        })
        .then((result) => {
          if (result.already_seen === true) return
          queuePreSessionIntervention(result)
        })
        .catch(() => {
          // Non-fatal
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, statsLoading, statisticsData, decks])

  const decksNeedingReview = useMemo(
    () =>
      decks
        .filter((d) => (d.due_cards || 0) > 0 || (d.new_cards || 0) > 0)
        .sort((a, b) => {
          // Prioritize due cards first, then new cards
          const aTotal = (a.due_cards || 0) + (a.new_cards || 0)
          const bTotal = (b.due_cards || 0) + (b.new_cards || 0)
          return bTotal - aTotal
        }),
    [decks]
  )

  const nonDueDecks = useMemo(
    () => decks.filter((d) => (d.due_cards || 0) === 0 && (d.new_cards || 0) === 0).sort((a, b) => (b.mastery || 0) - (a.mastery || 0)),
    [decks]
  )

  const openStudy = useCallback((deck) => navigate(`/study/${deck._id}?mode=study`), [navigate])
  const openBrowse = useCallback((deck) => navigate(`/study/${deck._id}?mode=browse`), [navigate])

  const formatRelativeDate = (date) => {
    if (!date) return null
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return t('study.dates.today')
    if (diffDays === 1) return t('study.dates.yesterday')
    if (diffDays < 7) return t('study.dates.daysAgo', { count: diffDays })
    return t('study.dates.weeksAgo', { count: Math.floor(diffDays / 7) })
  }

  const weekly = statisticsData?.weekly_progress || []
  const totalCards = stats.totalActive

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 2, md: 4 } }}>
      {/* Title row: the page on the left rail, one view segment on the right (PRD D2, §15.7) */}
      <Box
        component='header'
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 3
        }}
      >
        <Typography level='h2'>{t('study.title')}</Typography>
        <ViewSegment
          ariaLabel={t('study.title')}
          testId='study-view'
          value={view}
          onChange={setView}
          options={[
            { value: 'dashboard', label: t('study.views.dashboard') },
            { value: 'library', label: t('study.views.library') }
          ]}
        />
      </Box>

      {view === 'dashboard' && (
        <>
          <TodayObject
            loading={loading}
            dueToday={stats.dueToday}
            newToday={stats.newToday}
            reviewedToday={stats.reviewedToday}
            streak={stats.streak}
            totalCards={totalCards}
            weekly={weekly}
            forecast={forecast}
            onStudy={() => navigate('/study/daily-review')}
            onQuick={() => navigate('/study/daily-review?limit=10')}
            onBrowse={() => setView('library')}
            onCreateDeck={() => navigate('/study?view=library&new=deck')}
            onBrowseDecks={() => navigate('/browse')}
            onImport={() => navigate('/study?view=library&new=import')}
          />

          {/* The lists: two groups of one row (PRD D3), Recent on the right at lg (D11) */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 2fr) minmax(0, 1fr)' },
              gap: { xs: 4, lg: 6 },
              alignItems: 'start'
            }}
          >
            <Box>
              {decksNeedingReview.length > 0 && (
                <Box component='section' aria-labelledby='study-due-title' sx={{ mb: 4 }}>
                  <Stack direction='row' spacing={1.25} alignItems='baseline' sx={{ mb: 1, minHeight: 28 }}>
                    <Typography id='study-due-title' level='title-md'>
                      {t('study.sections.dueNow')}
                    </Typography>
                    <Typography level='body-sm' sx={readout}>
                      {t('study.sections.decksReadout', { decks: decksNeedingReview.length, cards: stats.dueToday + stats.newToday })}
                    </Typography>
                  </Stack>
                  <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                    {decksNeedingReview.map((deck) => (
                      <DeckRow
                        key={deck._id}
                        deck={deck}
                        onStudy={openStudy}
                        onBrowse={openBrowse}
                        formatRelativeDate={formatRelativeDate}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {nonDueDecks.length > 0 && (
                <Box component='section' aria-labelledby='study-uptodate-title'>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1, minHeight: 28 }}>
                    <Stack direction='row' spacing={1.25} alignItems='baseline'>
                      <Typography id='study-uptodate-title' level='title-md'>
                        {t('study.sections.upToDate')}
                      </Typography>
                      <Typography level='body-sm' sx={readout}>
                        {t('study.sections.deckCount', { count: nonDueDecks.length })}
                      </Typography>
                    </Stack>
                    {nonDueDecks.length > UP_TO_DATE_PREVIEW && (
                      <Button
                        size='sm'
                        variant='soft'
                        color='neutral'
                        onClick={() => setShowAllUpToDate((v) => !v)}
                        aria-expanded={showAllUpToDate}
                      >
                        {showAllUpToDate ? t('sessions.showLess') : t('study.sections.showAll', { count: nonDueDecks.length })}
                      </Button>
                    )}
                  </Box>
                  <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                    {(showAllUpToDate ? nonDueDecks : nonDueDecks.slice(0, UP_TO_DATE_PREVIEW)).map((deck) => (
                      <DeckRow
                        key={deck._id}
                        deck={deck}
                        onStudy={openStudy}
                        onBrowse={openBrowse}
                        formatRelativeDate={formatRelativeDate}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>

            <RecentSessions />
          </Box>
        </>
      )}

      {view === 'library' && <CardHome />}
    </Container>
  )
}

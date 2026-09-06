import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Container, Typography, Box, Card, CardContent, Stack, Chip, Grid, Divider, Skeleton, Tooltip, IconButton } from '@mui/joy'
import { Quiz as QuizIcon, Style, AccountTree, ArrowForward, Settings } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { useStatistics } from '../../hooks/useStatistics'
import { useDeckData } from '../../hooks/useDeckData'
import { useForecast } from '../../hooks/useForecast'
import { agentService } from '../../api/services/agent.service'
import { usePet } from '../../context/AgentContext'
import CardHome from '../Cards/CardHome'
import DeckSettingsModal from './DeckSettingsModal'
import StudyModePickerModal from './StudyModePickerModal'
import RecentSessions from './RecentSessions'
import TodayObject from './TodayObject'
import ViewSegment from './ViewSegment'
import { touchTargetBox } from '../Common/Form/formStyles'

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

  const [modePickerState, setModePickerState] = useState({ open: false, deck: null })
  const [settingsState, setSettingsState] = useState({ open: false, deckId: null })
  const [settingsEverSaved, setSettingsEverSaved] = useState(false)

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

  const getDecksByType = (type) => {
    return decks.filter((d) => d.deck_type === type)
  }

  const getDueCardsForDeck = (deckId) => {
    const deck = decks.find((d) => d._id === deckId || d._id === deckId?._id)
    return deck?.due_cards || 0
  }

  const getMasteryForDeck = (deckId) => {
    const deck = decks.find((d) => d._id === deckId || d._id === deckId?._id)
    return deck?.mastery || 0
  }

  const getNewCardsForDeck = (deckId) => {
    const deck = decks.find((d) => d._id === deckId || d._id === deckId?._id)
    return deck?.new_cards || 0
  }

  const getLastStudiedForDeck = (deckId) => {
    const deck = decks.find((d) => d._id === deckId || d._id === deckId?._id)
    return deck?.last_studied ? new Date(deck.last_studied) : null
  }

  const isDeckDueSoon = (deckId) => {
    const deck = decks.find((d) => d._id === deckId || d._id === deckId?._id)
    return deck?.is_due_soon || false
  }

  const getHoursUntilDue = (deckId) => {
    const deck = decks.find((d) => d._id === deckId || d._id === deckId?._id)
    return deck?.hours_until_due ?? null
  }

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

  const showYourDecks = !loading && nonDueDecks.length >= 1

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

          {/* Zone 1 — Decks Needing Review / Attention */}
          {decksNeedingReview.length > 0 && (
            <>
              <Typography level='title-lg' fontWeight={700} sx={{ mb: 2 }}>
                {t('study.sections.needingReview')}
              </Typography>

              <Grid container spacing={2} sx={{ mb: { xs: 3, md: 4 } }}>
                {decksNeedingReview.map((deck) => {
                  const dueCount = deck.due_cards || 0
                  const mastery = deck.mastery || 0
                  const lastStudied = deck.last_studied ? new Date(deck.last_studied) : null
                  const newCards = deck.new_cards || 0
                  const isAllNew = deck.total_cards > 0 && deck.total_cards === (deck.new_cards || 0)

                  let accentColor = 'primary'
                  let IconComponent = Style
                  if (deck.deck_type === 'quiz') {
                    accentColor = 'warning'
                    IconComponent = QuizIcon
                  }
                  if (deck.deck_type === 'visual') {
                    accentColor = 'success'
                    IconComponent = AccountTree
                  }

                  return (
                    <Grid xs={12} sm={6} lg={4} key={deck._id}>
                      <Card
                        variant='outlined'
                        onClick={() => setModePickerState({ open: true, deck })}
                        sx={{
                          cursor: 'pointer',
                          height: '100%',
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            boxShadow: 'md',
                            transform: 'translateY(-2px)',
                            borderColor: `${accentColor}.outlinedBorder`,
                            '& .hover-arrow': { transform: 'translateX(4px)', opacity: 1 },
                            '& .settings-btn': { opacity: 1 }
                          }
                        }}
                      >
                        <CardContent sx={{ p: 2.5, gap: 0 }}>
                          {/* Header row */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Box
                                sx={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 'md',
                                  bgcolor: `${accentColor}.softBg`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <IconComponent sx={{ fontSize: 18, color: `${accentColor}.plainColor` }} />
                              </Box>
                              <Box>
                                <Typography level='title-sm' fontWeight={700} sx={{ lineHeight: 1.2 }}>
                                  {deck.name}
                                </Typography>
                                {lastStudied && (
                                  <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 0.25 }}>
                                    {formatRelativeDate(lastStudied)}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Tooltip title={t('deckSettings.menuItem')} size='sm'>
                                <IconButton
                                  size='sm'
                                  variant='plain'
                                  color='neutral'
                                  className='settings-btn'
                                  aria-label={t('deckSettings.openAria', { name: deck.name })}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSettingsState({ open: true, deckId: deck._id })
                                  }}
                                  sx={{
                                    opacity: { xs: 1, md: 0 },
                                    transition: 'opacity 0.2s',
                                    borderRadius: 'sm',
                                    ...touchTargetBox,
                                    '&:focus-visible': {
                                      opacity: 1,
                                      outline: '2px solid',
                                      outlineColor: 'primary.outlinedBorder'
                                    }
                                  }}
                                >
                                  <Settings sx={{ fontSize: 15 }} />
                                </IconButton>
                              </Tooltip>
                              <ArrowForward
                                className='hover-arrow'
                                sx={{ color: 'text.tertiary', fontSize: 18, opacity: 0.4, transition: 'all 0.25s ease' }}
                              />
                            </Box>
                          </Box>

                          {/* Mastery bar */}
                          <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                              <Typography level='body-xs' sx={{ color: 'text.tertiary', fontWeight: 600 }}>
                                {t('study.deck.mastery')}
                              </Typography>
                              <Typography
                                level='body-xs'
                                fontWeight={700}
                                sx={{ color: isAllNew ? 'text.tertiary' : `${accentColor}.plainColor` }}
                              >
                                {isAllNew ? t('study.deckPill.new') : `${mastery}%`}
                              </Typography>
                            </Box>
                            <Box sx={{ height: 4, borderRadius: 'sm', bgcolor: 'background.level2', overflow: 'hidden' }}>
                              <Box
                                sx={{
                                  height: '100%',
                                  width: isAllNew ? '100%' : `${mastery}%`,
                                  borderRadius: 'sm',
                                  bgcolor: isAllNew ? 'background.level3' : `${accentColor}.solidBg`,
                                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                              />
                            </Box>
                          </Box>

                          {/* Footer stats */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Stack direction='row' spacing={1.5}>
                              <Chip size='sm' color='danger' variant='soft'>
                                {t('study.dueCount', { count: dueCount })}
                              </Chip>
                              {newCards > 0 && (
                                <Chip size='sm' color='neutral' variant='soft'>
                                  {t('study.deck.newCount', { count: newCards })}
                                </Chip>
                              )}
                            </Stack>
                            <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                              {t(`study.types.${deck.deck_type}s`) || deck.deck_type}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                })}
              </Grid>
            </>
          )}

          {/* Zone 1.5 — Your Decks (non-due, compact horizontal scroll) */}
          {showYourDecks && (
            <Box sx={{ mb: { xs: 4, md: 6 } }}>
              <Typography level='body-sm' fontWeight={600} sx={{ color: 'text.tertiary', mb: 1.5 }}>
                {decksNeedingReview.length > 0 ? t('study.sections.otherDecks', 'Other decks') : t('study.sections.yourDecks')}
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  overflowX: 'auto',
                  py: 1,
                  scrollSnapType: 'x mandatory',
                  WebkitOverflowScrolling: 'touch',
                  '&::-webkit-scrollbar': { display: 'none' },
                  scrollbarWidth: 'none',
                  mx: { xs: -2, md: 0 },
                  px: { xs: 2, md: 0 }
                }}
              >
                {nonDueDecks.map((deck) => {
                  const mastery = deck.mastery || 0
                  const dueSoon = isDeckDueSoon(deck._id)
                  const hours = getHoursUntilDue(deck._id)
                  const isAllNew = deck.total_cards > 0 && deck.total_cards === (deck.new_cards || 0)
                  let accentColor = 'primary'
                  let IconComponent = Style
                  if (deck.deck_type === 'quiz') {
                    accentColor = 'warning'
                    IconComponent = QuizIcon
                  }
                  if (deck.deck_type === 'visual') {
                    accentColor = 'success'
                    IconComponent = AccountTree
                  }

                  return (
                    <Box
                      key={deck._id}
                      role='button'
                      aria-label={t('study.deckPill.ariaLabel', { name: deck.name })}
                      onClick={() => setModePickerState({ open: true, deck })}
                      sx={{
                        position: 'relative',
                        width: 140,
                        flexShrink: 0,
                        scrollSnapAlign: 'start',
                        cursor: 'pointer',
                        borderRadius: 'lg',
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.surface',
                        p: 1.5,
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          borderColor: `${accentColor}.outlinedBorder`,
                          transform: 'translateY(-1px)',
                          boxShadow: 'sm'
                        },
                        '&:focus-visible': {
                          outline: '2px solid',
                          outlineColor: 'primary.outlinedBorder',
                          outlineOffset: '2px'
                        }
                      }}
                    >
                      {/* Row 1: Icon + Name */}
                      <Stack direction='row' spacing={0.75} alignItems='center' sx={{ mb: 1 }}>
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            borderRadius: 'sm',
                            bgcolor: `${accentColor}.softBg`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <IconComponent sx={{ fontSize: 12, color: `${accentColor}.plainColor` }} />
                        </Box>
                        <Typography level='body-xs' fontWeight={700} noWrap sx={{ color: 'text.primary', flex: 1 }}>
                          {deck.name}
                        </Typography>
                      </Stack>

                      {/* Row 2: Mastery bar */}
                      <Box sx={{ height: 3, borderRadius: 'sm', bgcolor: 'background.level2', overflow: 'hidden', mb: 0.75 }}>
                        <Box
                          sx={{
                            height: '100%',
                            width: isAllNew ? '100%' : `${mastery}%`,
                            bgcolor: isAllNew ? 'background.level3' : `${accentColor}.solidBg`,
                            borderRadius: 'sm',
                            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        />
                      </Box>

                      {/* Row 3: Mastery % + due soon hint */}
                      <Stack direction='row' justifyContent='space-between' alignItems='center'>
                        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                          {isAllNew ? t('study.deckPill.new') : `${mastery}%`}
                        </Typography>
                        {dueSoon && hours !== null && (
                          <Typography level='body-xs' sx={{ color: 'warning.plainColor', fontWeight: 600 }}>
                            {t('study.deckPill.dueSoon', { hours })}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  )
                })}
              </Box>
            </Box>
          )}

          {/* Zone 3 — Session History */}
          <RecentSessions />

          {/* Zone 4 — Recent Performance (SM-2 card reviews) */}
          {!statsLoading && statisticsData?.recent_performance?.length > 0 && (
            <Box>
              <Typography level='title-lg' fontWeight={700} sx={{ mb: 2 }}>
                {t('study.sections.recentPerformance')}
              </Typography>
              <Box>
                <Stack divider={<Divider />}>
                  {statisticsData.recent_performance.slice(0, 5).map((item, i) => {
                    const scoreColor = item.score >= 8 ? 'success' : item.score >= 5 ? 'warning' : 'danger'
                    return (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0, py: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              flexShrink: 0,
                              bgcolor: `${scoreColor}.solidBg`
                            }}
                          />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography level='body-sm' fontWeight={600} noWrap>
                              {item.card_title}
                            </Typography>
                            <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                              {item.date}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip size='sm' color={scoreColor} variant='soft' sx={{ flexShrink: 0, ml: 2 }}>
                          {item.score}/10
                        </Chip>
                      </Box>
                    )
                  })}
                </Stack>
              </Box>
            </Box>
          )}
        </>
      )}

      {view === 'library' && <CardHome />}

      <DeckSettingsModal
        open={settingsState.open}
        onClose={() => setSettingsState({ open: false, deckId: null })}
        deckId={settingsState.deckId}
        onSaved={reloadDecks}
      />

      <StudyModePickerModal
        open={modePickerState.open}
        onClose={() => setModePickerState({ open: false, deck: null })}
        deck={modePickerState.deck || {}}
        onSelectMode={(mode) => {
          navigate(`/study/${modePickerState.deck._id}?mode=${mode}`)
          setModePickerState({ open: false, deck: null })
        }}
      />
    </Container>
  )
}

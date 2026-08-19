import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Stack,
  Button,
  Chip,
  Grid,
  Divider,
  Skeleton,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  tabClasses,
  Tooltip,
  IconButton
} from '@mui/joy'
import {
  School,
  Quiz as QuizIcon,
  Style,
  AccountTree,
  TrendingUp,
  CalendarToday,
  ArrowForward,
  LocalFireDepartment,
  Settings
} from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { useStatistics } from '../../hooks/useStatistics'
import { useDeckData } from '../../hooks/useDeckData'
import { agentService } from '../../api/services/agent.service'
import { usePet } from '../../context/AgentContext'
import CardHome from '../Cards/CardHome'
import DeckSettingsModal from './DeckSettingsModal'
import StudyModePickerModal from './StudyModePickerModal'
import RecentSessions from './RecentSessions'
import { touchTargetBox } from '../Common/Form/formStyles'

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

  // Swipeable Logic
  const [activeSectionIndex, setActiveSectionIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const minSwipeDistance = 50

  const handleTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      // Swiping Left -> Go Next (min to max index)
      setActiveSectionIndex((prev) => Math.min(prev + 1, 2))
    }
    if (isRightSwipe) {
      // Swiping Right -> Go Prev
      setActiveSectionIndex((prev) => Math.max(prev - 1, 0))
    }
  }

  const { statistics: statisticsData, loading: statsLoading } = useStatistics()
  const { decks: hookDecks, loading: decksLoading, reload: reloadDecks } = useDeckData()
  const { queuePreSessionIntervention } = usePet()

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

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 2, md: 4 } }}>
      {/* Header — Stats & CTA */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent='flex-end'
        alignItems={{ xs: 'center', sm: 'flex-end' }}
        spacing={{ xs: 2, md: 3 }}
        sx={{ mb: { xs: 3, md: 4 }, mt: { xs: 1, md: 2 } }}
      >
        {/* Minimalist Inline Stats */}
        <Stack
          direction='row'
          spacing={{ xs: 1.5, sm: 2 }}
          alignItems='center'
          sx={{ opacity: 0.8, flexWrap: 'wrap', gap: { xs: 1, sm: 0 }, justifyContent: 'center', mb: { xs: 0, sm: 0.5 } }}
        >
          <Tooltip title={t('study.stats.dueToday')} placement='bottom' size='sm'>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <TrendingUp sx={{ fontSize: 16, color: 'primary.plainColor', opacity: 0.8 }} />
              <Typography level='body-sm' fontWeight={600} sx={{ color: 'text.secondary' }}>
                <Skeleton loading={loading} variant='text' width='1ch'>
                  {stats.dueToday}
                </Skeleton>{' '}
                <Typography component='span' fontWeight={400} sx={{ color: 'text.tertiary', display: { xs: 'none', lg: 'inline' } }}>
                  {t('study.stats.dueToday')}
                </Typography>
              </Typography>
            </Box>
          </Tooltip>
          <Typography sx={{ color: 'divider' }}>•</Typography>

          <Tooltip title={t('study.stats.reviewedToday')} placement='bottom' size='sm'>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <School sx={{ fontSize: 16, color: 'success.plainColor', opacity: 0.8 }} />
              <Typography level='body-sm' fontWeight={600} sx={{ color: 'text.secondary' }}>
                <Skeleton loading={loading} variant='text' width='1ch'>
                  {stats.reviewedToday}
                </Skeleton>{' '}
                <Typography component='span' fontWeight={400} sx={{ color: 'text.tertiary', display: { xs: 'none', lg: 'inline' } }}>
                  {t('study.stats.reviewedToday')}
                </Typography>
              </Typography>
            </Box>
          </Tooltip>
          <Typography sx={{ color: 'divider' }}>•</Typography>

          <Tooltip title={t('study.stats.totalCards')} placement='bottom' size='sm'>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Style sx={{ fontSize: 16, color: 'text.secondary', opacity: 0.8 }} />
              <Typography level='body-sm' fontWeight={600} sx={{ color: 'text.secondary' }}>
                <Skeleton loading={loading} variant='text' width='1ch'>
                  {stats.totalActive}
                </Skeleton>{' '}
                <Typography component='span' fontWeight={400} sx={{ color: 'text.tertiary', display: { xs: 'none', lg: 'inline' } }}>
                  {t('study.stats.totalCards')}
                </Typography>
              </Typography>
            </Box>
          </Tooltip>
          <Typography sx={{ color: 'divider' }}>•</Typography>

          <Tooltip title={t('profile.stats.days')} placement='bottom' size='sm'>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <LocalFireDepartment
                sx={{
                  fontSize: 18,
                  color: stats.streak > 0 ? 'warning.plainColor' : 'text.tertiary',
                  opacity: 0.9,
                  filter: 'none'
                }}
              />
              <Typography level='body-sm' fontWeight={600} sx={{ color: 'text.secondary' }}>
                <Skeleton loading={loading} variant='text' width='1ch'>
                  {stats.streak}
                </Skeleton>{' '}
                <Typography component='span' fontWeight={400} sx={{ color: 'text.tertiary', display: { xs: 'none', lg: 'inline' } }}>
                  {t('profile.stats.days')}
                </Typography>
              </Typography>
            </Box>
          </Tooltip>
        </Stack>

        {(stats.dueToday > 0 || stats.newToday > 0) && (
          <Button
            size='sm'
            variant='outlined'
            color='primary'
            onClick={() => navigate('/study/daily-review')}
            endDecorator={<ArrowForward sx={{ fontSize: 13, opacity: 0.7, transition: 'transform 0.2s ease' }} />}
            sx={{
              borderRadius: 'xl',
              px: 2,
              py: 0.75,
              fontWeight: 600,
              fontSize: '0.8rem',
              letterSpacing: '0.01em',
              borderColor: 'primary.outlinedBorder',
              color: 'primary.plainColor',
              bgcolor: 'primary.softBg',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: 'primary.softHoverBg',
                borderColor: 'primary.solidBg',
                transform: 'translateY(-1px)',
                boxShadow: 'sm',
                '& .MuiButton-endDecorator svg': { transform: 'translateX(3px)', opacity: 1 }
              },
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.solidBg',
                outlineOffset: '3px'
              }
            }}
          >
            {t('study.startStudying')}
            <Typography component='span' level='body-xs' sx={{ ml: 0.75, opacity: 0.6, fontWeight: 500 }}>
              {stats.dueToday + stats.newToday}
            </Typography>
          </Button>
        )}
      </Stack>

      {/* Unified Tab Architecture - Left Aligned */}
      <Tabs aria-label='Study Navigation' defaultValue={0} sx={{ bgcolor: 'transparent', mt: 0 }}>
        <TabList
          disableUnderline
          sx={{
            p: 0,
            gap: 4,
            borderRadius: 0,
            bgcolor: 'transparent',
            display: 'flex',
            mb: { xs: 4, md: 6 },
            borderBottom: '1px solid',
            borderColor: 'divider',
            width: '100%',
            mx: 0,
            [`& .${tabClasses.root}`]: {
              bgcolor: 'transparent',
              fontWeight: 600,
              color: 'text.tertiary',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              paddingBottom: '8px',
              marginBottom: '-1px', // Pull the border over the divider
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: '2px solid transparent',
              '&:hover': {
                color: 'text.primary',
                bgcolor: 'transparent'
              }
            },
            [`& .${tabClasses.root}[aria-selected="true"]`]: {
              boxShadow: 'none',
              bgcolor: 'transparent',
              color: 'primary.plainColor',
              fontWeight: 800,
              borderBottomColor: 'primary.solidBg'
            }
          }}
        >
          <Tab disableIndicator sx={{ borderRadius: 0, px: 1, py: 1 }}>
            {t('study.tabs.dashboard')}
          </Tab>
          <Tab disableIndicator sx={{ borderRadius: 0, px: 1, py: 1 }}>
            {t('study.tabs.contentLibrary')}
          </Tab>
        </TabList>

        <TabPanel value={0} sx={{ p: 0 }}>
          {/* Zone 1 — Decks Needing Review / Attention */}
          {decksNeedingReview.length === 0 ? (
            <Box
              role='status'
              aria-label={t('study.empty.allDone')}
              sx={{ borderLeft: '2px solid', borderColor: 'success.outlinedBorder', pl: 2, py: 0.75, mb: { xs: 3, md: 4 } }}
            >
              <Stack direction='row' alignItems='center' flexWrap='wrap' gap={1}>
                <Stack direction='row' spacing={2} alignItems='center'>
                  {stats.streak > 0 && (
                    <>
                      <Skeleton loading={loading} variant='text' width='6ch'>
                        <Stack direction='row' spacing={0.75} alignItems='center'>
                          <LocalFireDepartment sx={{ fontSize: 16, color: 'warning.plainColor' }} />
                          <Typography level='body-sm' fontWeight={700} sx={{ color: 'text.primary' }}>
                            {t('study.empty.streakLabel', { count: stats.streak })}
                          </Typography>
                        </Stack>
                      </Skeleton>
                      <Divider orientation='vertical' sx={{ height: 16, alignSelf: 'center' }} />
                    </>
                  )}
                  <Typography level='body-sm' fontWeight={600} sx={{ color: 'text.primary' }}>
                    {t('study.empty.allDone')}
                  </Typography>
                  <Divider orientation='vertical' sx={{ height: 16, alignSelf: 'center' }} />
                  <Skeleton loading={loading} variant='text' width='8ch'>
                    <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                      {t('study.empty.weeklyCards', { count: stats.reviewedToday })}
                    </Typography>
                  </Skeleton>
                </Stack>
              </Stack>
            </Box>
          ) : (
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

          {/* Zone 2 — Weekly Momentum */}
          {!statsLoading && statisticsData?.weekly_progress?.length > 0 && (
            <Box sx={{ mb: { xs: 4, md: 6 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 2 }}>
                <Typography level='title-lg' fontWeight={700}>
                  {t('study.sections.weeklyMomentum')}
                </Typography>
                <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                  {t('study.sections.weeklyMomentumSubtitle', {
                    count: statisticsData.weekly_progress.reduce((s, d) => s + d.cards, 0)
                  })}
                </Typography>
              </Box>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: { xs: 1, md: 2 }, height: 96, justifyContent: 'space-between' }}>
                  {statisticsData.weekly_progress.map((day, i) => {
                    const maxVal = Math.max(...statisticsData.weekly_progress.map((d) => d.cards), 1)
                    const heightPct = day.cards > 0 ? Math.max((day.cards / maxVal) * 100, 8) : 4
                    const isToday = i === statisticsData.weekly_progress.length - 1
                    return (
                      <Tooltip key={day.date} title={`${day.cards} ${t('study.stats.cards')}`} size='sm' placement='top'>
                        <Box
                          sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 1,
                            height: '100%',
                            justifyContent: 'flex-end'
                          }}
                        >
                          <Box
                            sx={{
                              width: '100%',
                              height: `${heightPct}%`,
                              borderRadius: 'sm',
                              bgcolor: isToday ? 'primary.solidBg' : day.cards > 0 ? 'primary.softBg' : 'background.level2',
                              transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                          />
                          <Typography
                            level='body-xs'
                            sx={{
                              color: isToday ? 'primary.plainColor' : 'text.tertiary',
                              fontWeight: isToday ? 700 : 400
                            }}
                          >
                            {day.day}
                          </Typography>
                        </Box>
                      </Tooltip>
                    )
                  })}
                </Box>
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
        </TabPanel>

        <TabPanel value={1} sx={{ p: 0 }}>
          <Box sx={{ mt: -2 }}>
            <CardHome onDeckChange={reloadDecks} />
          </Box>
        </TabPanel>
      </Tabs>

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

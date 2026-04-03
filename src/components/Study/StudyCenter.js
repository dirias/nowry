import React, { useState, useEffect } from 'react'
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
  CircularProgress
} from '@mui/joy'
import {
  School,
  Quiz as QuizIcon,
  Style,
  AccountTree,
  TrendingUp,
  CalendarToday,
  ArrowForward,
  LocalFireDepartment
} from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { useCardData } from '../../hooks/useCardData'
import { useStatistics } from '../../hooks/useStatistics'
import { useDeckData } from '../../hooks/useDeckData'
import { cardsService, activityService } from '../../api/services'
import CardHome from '../Cards/CardHome'

export default function StudyCenter() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [decks, setDecks] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    dueToday: 0,
    reviewedToday: 0,
    totalActive: 0,
    streak: 0
  })

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

  const { cards: cardsData, loading: cardsLoading } = useCardData()
  const { statistics: statisticsData, loading: statsLoading } = useStatistics()
  const { decks: hookDecks, loading: decksLoading } = useDeckData()

  useEffect(() => {
    if (cardsLoading || statsLoading || decksLoading) return
    fetchData()
  }, [cardsLoading, statsLoading, decksLoading, cardsData, statisticsData, hookDecks])

  const fetchData = async () => {
    try {
      setLoading(true)

      setDecks(hookDecks || [])
      setCards(cardsData)

      // Use real stats from API - API returns data in summary object
      const summary = statisticsData.summary || {}
      const weeklyData = statisticsData.weekly_progress || []

      // Calculate due today cards
      const now = new Date()
      const dueCards = cardsData.filter((card) => {
        if (!card.next_review) return true
        const nextReview = new Date(card.next_review)
        return nextReview <= now
      })

      // Calculate reviewed today from weekly progress (today is last item)
      const todayData = weeklyData[weeklyData.length - 1]
      const reviewedToday = todayData ? todayData.cards || 0 : 0

      setStats({
        dueToday: dueCards.length,
        reviewedToday: reviewedToday,
        totalActive: summary.total_cards || cardsData.length,
        streak: summary.current_streak || 0
      })

      setLoading(false)
    } catch (error) {
      console.error('Error fetching study data:', error)
      setLoading(false)
    }
  }

  const getDecksByType = (type) => {
    return decks.filter((d) => d.deck_type === type)
  }

  const getDueCardsForDeck = (deckId) => {
    const now = new Date()
    return cards.filter((card) => {
      const matchesDeck = card.deck_id === deckId || card.deck_id?._id === deckId
      if (!matchesDeck) return false
      if (!card.next_review) return true
      const nextReview = new Date(card.next_review)
      return nextReview <= now
    }).length
  }

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 1, md: 1.5 } }}>
      {/* Glass Hero Header (Horizontal Command Center) */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent='space-between'
        alignItems={{ xs: 'center', md: 'flex-end' }}
        spacing={3}
        sx={{ mb: { xs: 2.5, md: 4 }, mt: { xs: 1, md: 2 } }}
      >
        {/* Left Column: Title & Subtitle */}
        <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
          <Typography level='h2' fontWeight={800} sx={{ mb: 0.5, letterSpacing: '-0.02em' }}>
            {t('study.title')}
          </Typography>
          <Typography level='body-md' sx={{ color: 'text.tertiary', maxWidth: 500 }}>
            {t('study.subtitle')}
          </Typography>
        </Box>

        {/* Right Column: Stats & Global Action CTA */}
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'center', sm: 'flex-end' }} spacing={{ xs: 2, md: 3 }}>
          {/* Minimalist Inline Stats */}
          <Stack
            direction='row'
            spacing={{ xs: 1.5, sm: 2 }}
            alignItems='center'
            sx={{ opacity: 0.8, flexWrap: 'wrap', gap: { xs: 1, sm: 0 }, justifyContent: 'center', mb: { xs: 0, sm: 0.5 } }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <TrendingUp sx={{ fontSize: 16, color: 'primary.solidBg', opacity: 0.8 }} />
              <Typography level='body-sm' fontWeight={600} sx={{ color: 'text.secondary' }}>
                <Skeleton loading={loading} variant='text' width='1ch'>
                  {stats.dueToday}
                </Skeleton>{' '}
                <Typography component='span' fontWeight={400} sx={{ color: 'text.tertiary', display: { xs: 'none', lg: 'inline' } }}>
                  {t('study.stats.dueToday')}
                </Typography>
              </Typography>
            </Box>
            <Typography sx={{ color: 'divider' }}>•</Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <School sx={{ fontSize: 16, color: 'success.solidBg', opacity: 0.8 }} />
              <Typography level='body-sm' fontWeight={600} sx={{ color: 'text.secondary' }}>
                <Skeleton loading={loading} variant='text' width='1ch'>
                  {stats.reviewedToday}
                </Skeleton>{' '}
                <Typography component='span' fontWeight={400} sx={{ color: 'text.tertiary', display: { xs: 'none', lg: 'inline' } }}>
                  {t('study.stats.reviewedToday')}
                </Typography>
              </Typography>
            </Box>
            <Typography sx={{ color: 'divider' }}>•</Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Style sx={{ fontSize: 16, color: 'neutral.solidBg', opacity: 0.8 }} />
              <Typography level='body-sm' fontWeight={600} sx={{ color: 'text.secondary' }}>
                <Skeleton loading={loading} variant='text' width='1ch'>
                  {stats.totalActive}
                </Skeleton>{' '}
                <Typography component='span' fontWeight={400} sx={{ color: 'text.tertiary', display: { xs: 'none', lg: 'inline' } }}>
                  {t('study.stats.totalCards')}
                </Typography>
              </Typography>
            </Box>
            <Typography sx={{ color: 'divider' }}>•</Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <LocalFireDepartment
                sx={{
                  fontSize: 18,
                  color: stats.streak > 0 ? '#ff7b00' : 'neutral.solidBg',
                  opacity: 0.9,
                  filter: stats.streak > 2 ? 'drop-shadow(0 0 4px rgba(255,123,0,0.4))' : 'none'
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
          </Stack>

          {stats.dueToday > 0 && (
            <Button
              size='md'
              variant='solid'
              color='danger'
              onClick={() => navigate('/study/daily-review')}
              sx={{ borderRadius: 'lg', px: 3, fontWeight: 700, boxShadow: 'sm' }}
            >
              🎯 {t('study.startStudying')} ({stats.dueToday})
            </Button>
          )}
        </Stack>
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
            Dashboard
          </Tab>
          <Tab disableIndicator sx={{ borderRadius: 0, px: 1, py: 1 }}>
            Content Library
          </Tab>
        </TabList>

        <TabPanel value={0} sx={{ p: 0 }}>
          {/* Action Zone: Floating Due Decks */}
          <Typography level='h4' fontWeight={600} sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' }, mb: 3 }}>
            Decks Needing Review
          </Typography>

          <Grid container spacing={3}>
            {decks.filter((d) => getDueCardsForDeck(d._id) > 0).length === 0 ? (
              <Grid xs={12}>
                <Typography level='body-md' sx={{ color: 'text.tertiary', textAlign: 'center', py: 4 }}>
                  {t('study.types.noDecks', { type: 'due' })} You&apos;re all caught up!
                </Typography>
              </Grid>
            ) : (
              decks
                .filter((d) => getDueCardsForDeck(d._id) > 0)
                .map((deck) => {
                  const dueCount = getDueCardsForDeck(deck._id)
                  // Calculate percentage for circular progress ring
                  const totalCards = cards.filter((c) => c.deck_id === deck._id || c.deck_id?._id === deck._id).length
                  const completed = totalCards - dueCount
                  const progressVal = totalCards > 0 ? Math.round((completed / totalCards) * 100) : 0

                  let iconColor = 'primary.main'
                  let IconComponent = Style
                  if (deck.deck_type === 'quiz') {
                    iconColor = 'warning.main'
                    IconComponent = QuizIcon
                  }
                  if (deck.deck_type === 'visual') {
                    iconColor = 'info.main'
                    IconComponent = AccountTree
                  }

                  return (
                    <Grid xs={12} md={6} lg={4} key={deck._id}>
                      <Box
                        onClick={() => navigate(`/study/${deck._id}`)}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          height: '100%',
                          p: 2.5,
                          borderRadius: 'xl',
                          cursor: 'pointer',
                          bgcolor: 'transparent',
                          position: 'relative',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            bgcolor: 'background.surface',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                            transform: 'translateY(-2px)',
                            '& .hover-arrow': {
                              transform: 'translateX(4px)',
                              opacity: 1,
                              color: iconColor
                            }
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <CircularProgress
                              determinate
                              value={progressVal}
                              color={deck.deck_type === 'quiz' ? 'warning' : deck.deck_type === 'visual' ? 'info' : 'primary'}
                              sx={{ '--CircularProgress-size': '44px', fontWeight: 700 }}
                            >
                              <IconComponent sx={{ fontSize: 20 }} />
                            </CircularProgress>
                            <Typography level='title-lg' sx={{ fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                              {deck.name}
                            </Typography>
                          </Box>
                          <ArrowForward
                            className='hover-arrow'
                            sx={{
                              color: 'text.tertiary',
                              fontSize: 22,
                              transition: 'all 0.3s ease',
                              opacity: 0.5
                            }}
                          />
                        </Box>

                        <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <Typography
                            level='body-xs'
                            textColor='text.tertiary'
                            sx={{ textTransform: 'uppercase', letterSpacing: 'sm', fontWeight: 600 }}
                          >
                            {t(`study.types.${deck.deck_type}s`) || deck.deck_type}
                          </Typography>
                          <Typography level='title-md' sx={{ color: iconColor }}>
                            {dueCount} Due
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )
                })
            )}
          </Grid>
        </TabPanel>

        <TabPanel value={1} sx={{ p: 0 }}>
          <Box sx={{ mt: -2 }}>
            <CardHome />
          </Box>
        </TabPanel>
      </Tabs>
    </Container>
  )
}

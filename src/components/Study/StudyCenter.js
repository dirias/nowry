import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Typography, Box, Card, CardContent, Stack, Button, Chip, Grid, Divider, Skeleton } from '@mui/joy'
import { School, Quiz as QuizIcon, Style, AccountTree, TrendingUp, CalendarToday } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { useCardData } from '../../hooks/useCardData'
import { useStatistics } from '../../hooks/useStatistics'
import { useDeckData } from '../../hooks/useDeckData'
import { cardsService, activityService } from '../../api/services'

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
      {/* Glass Hero Header */}
      <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 }, mt: { xs: 1, md: 2 } }}>
        <Typography level='h2' fontWeight={800} sx={{ mb: 1, letterSpacing: '-0.02em' }}>
          {t('study.title')}
        </Typography>
        <Typography level='body-md' sx={{ color: 'text.tertiary', mb: 3, maxWidth: 500, mx: 'auto' }}>
          {t('study.subtitle')}
        </Typography>

        {/* Minimalist Inline Stats */}
        <Stack
          direction='row'
          spacing={{ xs: 1.5, sm: 2 }}
          justifyContent='center'
          alignItems='center'
          sx={{ mb: 5, opacity: 0.8, flexWrap: 'wrap', gap: { xs: 1, sm: 0 } }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <TrendingUp sx={{ fontSize: 16, color: 'primary.solidBg', opacity: 0.8 }} />
            <Typography level='body-sm' fontWeight={600} sx={{ color: 'text.secondary' }}>
              <Skeleton loading={loading} variant='text' width='1ch'>
                {stats.dueToday}
              </Skeleton>{' '}
              <Typography component='span' fontWeight={400} sx={{ color: 'text.tertiary' }}>
                {t('study.stats.dueToday')}
              </Typography>
            </Typography>
          </Box>
          <Typography sx={{ color: 'divider', display: { xs: 'none', sm: 'block' } }}>•</Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <School sx={{ fontSize: 16, color: 'success.solidBg', opacity: 0.8 }} />
            <Typography level='body-sm' fontWeight={600} sx={{ color: 'text.secondary' }}>
              <Skeleton loading={loading} variant='text' width='1ch'>
                {stats.reviewedToday}
              </Skeleton>{' '}
              <Typography component='span' fontWeight={400} sx={{ color: 'text.tertiary' }}>
                {t('study.stats.reviewedToday')}
              </Typography>
            </Typography>
          </Box>
          <Typography sx={{ color: 'divider', display: { xs: 'none', sm: 'block' } }}>•</Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Style sx={{ fontSize: 16, color: 'neutral.solidBg', opacity: 0.8 }} />
            <Typography level='body-sm' fontWeight={600} sx={{ color: 'text.secondary' }}>
              <Skeleton loading={loading} variant='text' width='1ch'>
                {stats.totalActive}
              </Skeleton>{' '}
              <Typography component='span' fontWeight={400} sx={{ color: 'text.tertiary' }}>
                {t('study.stats.totalCards')}
              </Typography>
            </Typography>
          </Box>
          <Typography sx={{ color: 'divider', display: { xs: 'none', sm: 'block' } }}>•</Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <CalendarToday sx={{ fontSize: 16, color: 'warning.solidBg', opacity: 0.8 }} />
            <Typography level='body-sm' fontWeight={600} sx={{ color: 'text.secondary' }}>
              <Skeleton loading={loading} variant='text' width='1ch'>
                {stats.streak}
              </Skeleton>{' '}
              <Typography component='span' fontWeight={400} sx={{ color: 'text.tertiary' }}>
                {t('profile.stats.days')}
              </Typography>
            </Typography>
          </Box>
        </Stack>

        {/* Global Action CTA */}
        <Box sx={{ minHeight: 60 }}>
          {stats.dueToday > 0 && (
            <Stack alignItems='center' spacing={1.5}>
              <Button
                size='lg'
                variant='solid'
                color='danger'
                onClick={() => navigate('/study/daily-review')}
                sx={{ borderRadius: 'xl', px: 6, fontWeight: 700, boxShadow: 'sm' }}
              >
                🎯 {t('study.startStudying')}
              </Button>
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {t('study.reviewMsg', { count: stats.dueToday })}
              </Typography>
            </Stack>
          )}
        </Box>
      </Box>

      {/* Study by Type */}
      <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1.5 }}>
        <Typography level='h4' fontWeight={600} sx={{ fontSize: { xs: '1.125rem', md: '1.25rem' } }}>
          {t('study.byType')}
        </Typography>

        {/* Swipe Hint (Mobile) */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1, color: 'text.tertiary' }}>
          <Typography level='body-xs' sx={{ fontSize: '0.7rem' }}>
            {t('study.swipeHint')}
          </Typography>
        </Box>
      </Stack>

      {/* Mobile Tabs (Segmented Control) */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          p: 0.5,
          mb: 3,
          borderRadius: 'xl',
          bgcolor: 'background.level1',
          overflow: 'hidden'
        }}
      >
        {['Flashcards', 'Quizzes', 'Visual'].map((tabLabel, index) => {
          const tabKey = ['flashcards', 'quizzes', 'visual'][index]
          const label = t(`study.types.${tabKey}`)
          const isActive = activeSectionIndex === index
          let activeColor = 'primary.main'
          if (index === 1) activeColor = 'warning.main'
          if (index === 2) activeColor = 'info.main'

          return (
            <Box
              key={index}
              onClick={() => setActiveSectionIndex(index)}
              sx={{
                flex: 1,
                py: 1,
                px: 1,
                textAlign: 'center',
                borderRadius: 'lg',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                bgcolor: isActive ? 'background.surface' : 'transparent',
                boxShadow: isActive ? 'sm' : 'none',
                color: isActive ? activeColor : 'text.secondary',
                fontWeight: isActive ? 600 : 500,
                userSelect: 'none'
              }}
            >
              <Typography level='body-sm' textColor='inherit' fontWeight='inherit'>
                {label}
              </Typography>
            </Box>
          )
        })}
      </Box>

      {/* Swipe Container */}
      <Box
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        sx={{
          position: 'relative',
          minHeight: 400
        }}
      >
        <Grid container spacing={3}>
          {/* Flashcards */}
          <Grid
            xs={12}
            md={4}
            sx={{
              display: { xs: activeSectionIndex === 0 ? 'block' : 'none', md: 'block' },
              animation: { xs: 'fadeIn 0.3s ease-in-out', md: 'none' }
            }}
          >
            <Card
              variant='outlined'
              sx={{
                height: '100%',
                borderRadius: 'xl',
                bgcolor: 'background.surface',
                boxShadow: 'sm',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  boxShadow: 'xl',
                  transform: 'translateY(-6px)',
                  borderColor: 'primary.outlinedBorder'
                }
              }}
            >
              <CardContent>
                <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 'md',
                      bgcolor: 'primary.softBg',
                      color: 'primary.solidBg'
                    }}
                  >
                    <Style sx={{ fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography level='title-lg' fontWeight={600}>
                      {t('study.types.flashcards')}
                    </Typography>
                    <Chip size='sm' variant='soft' color='primary'>
                      {getDecksByType('flashcard').length} decks
                    </Chip>
                  </Box>
                </Stack>

                <Typography level='body-sm' sx={{ mb: 2, color: 'text.secondary' }}>
                  {t('study.types.flashcardsDesc')}
                </Typography>

                <Stack spacing={1}>
                  {getDecksByType('flashcard').length === 0 ? (
                    <Typography level='body-xs' sx={{ color: 'text.tertiary', textAlign: 'center', py: 2 }}>
                      {t('study.types.noDecks', { type: t('study.types.flashcards') })}
                    </Typography>
                  ) : (
                    <>
                      {getDecksByType('flashcard')
                        .slice(0, 3)
                        .map((deck) => {
                          const dueCount = getDueCardsForDeck(deck._id)
                          const hasDueCards = dueCount > 0

                          return (
                            <Button
                              key={deck._id}
                              variant='soft'
                              color={hasDueCards ? 'primary' : 'neutral'}
                              onClick={() => navigate(hasDueCards ? `/study/${deck._id}` : `/cards`)}
                              disabled={!hasDueCards}
                              sx={{ justifyContent: 'space-between' }}
                            >
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deck.name}</span>
                              {hasDueCards ? (
                                <Chip size='sm'>
                                  {dueCount} {t('study.due')}
                                </Chip>
                              ) : (
                                <Chip size='sm' variant='outlined'>
                                  {t('study.allReviewed')}
                                </Chip>
                              )}
                            </Button>
                          )
                        })}
                      {getDecksByType('flashcard').length > 3 && (
                        <Button variant='plain' size='sm' onClick={() => navigate('/cards')}>
                          {t('study.viewAll', { count: getDecksByType('flashcard').length })}
                        </Button>
                      )}
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Quizzes */}
          <Grid
            xs={12}
            md={4}
            sx={{
              display: { xs: activeSectionIndex === 1 ? 'block' : 'none', md: 'block' },
              animation: { xs: 'fadeIn 0.3s ease-in-out', md: 'none' }
            }}
          >
            <Card
              variant='outlined'
              sx={{
                height: '100%',
                borderRadius: 'xl',
                bgcolor: 'background.surface',
                boxShadow: 'sm',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  boxShadow: 'xl',
                  transform: 'translateY(-6px)',
                  borderColor: 'warning.outlinedBorder'
                }
              }}
            >
              <CardContent>
                <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 'md',
                      bgcolor: 'warning.softBg',
                      color: 'warning.solidBg'
                    }}
                  >
                    <QuizIcon sx={{ fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography level='title-lg' fontWeight={600}>
                      {t('study.types.quizzes')}
                    </Typography>
                    <Chip size='sm' variant='soft' color='warning'>
                      {getDecksByType('quiz').length} decks
                    </Chip>
                  </Box>
                </Stack>

                <Typography level='body-sm' sx={{ mb: 2, color: 'text.secondary' }}>
                  {t('study.types.quizzesDesc')}
                </Typography>

                <Stack spacing={1}>
                  {getDecksByType('quiz').length === 0 ? (
                    <Typography level='body-xs' sx={{ color: 'text.tertiary', textAlign: 'center', py: 2 }}>
                      {t('study.types.noDecks', { type: t('study.types.quizzes') })}
                    </Typography>
                  ) : (
                    <>
                      {getDecksByType('quiz')
                        .slice(0, 3)
                        .map((deck) => {
                          const dueCount = getDueCardsForDeck(deck._id)
                          const hasDueCards = dueCount > 0

                          return (
                            <Button
                              key={deck._id}
                              variant='soft'
                              color={hasDueCards ? 'warning' : 'neutral'}
                              onClick={() => navigate(hasDueCards ? `/study/${deck._id}` : `/cards`)}
                              disabled={!hasDueCards}
                              sx={{ justifyContent: 'space-between' }}
                            >
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deck.name}</span>
                              {hasDueCards ? (
                                <Chip size='sm'>
                                  {dueCount} {t('study.due')}
                                </Chip>
                              ) : (
                                <Chip size='sm' variant='outlined'>
                                  {t('study.allReviewed')}
                                </Chip>
                              )}
                            </Button>
                          )
                        })}
                      {getDecksByType('quiz').length > 3 && (
                        <Button variant='plain' size='sm' onClick={() => navigate('/cards')}>
                          {t('study.viewAll', { count: getDecksByType('quiz').length })}
                        </Button>
                      )}
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Visual Diagrams */}
          <Grid
            xs={12}
            md={4}
            sx={{
              display: { xs: activeSectionIndex === 2 ? 'block' : 'none', md: 'block' },
              animation: { xs: 'fadeIn 0.3s ease-in-out', md: 'none' }
            }}
          >
            <Card
              variant='outlined'
              sx={{
                height: '100%',
                borderRadius: 'xl',
                bgcolor: 'background.surface',
                boxShadow: 'sm',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  boxShadow: 'xl',
                  transform: 'translateY(-6px)',
                  borderColor: 'info.outlinedBorder'
                }
              }}
            >
              <CardContent>
                <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 'md',
                      bgcolor: 'info.softBg',
                      color: 'info.solidBg'
                    }}
                  >
                    <AccountTree sx={{ fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography level='title-lg' fontWeight={600}>
                      {t('study.types.visual')}
                    </Typography>
                    <Chip size='sm' variant='soft' color='info'>
                      {getDecksByType('visual').length} decks
                    </Chip>
                  </Box>
                </Stack>

                <Typography level='body-sm' sx={{ mb: 2, color: 'text.secondary' }}>
                  {t('study.types.visualDesc')}
                </Typography>

                <Stack spacing={1}>
                  {getDecksByType('visual').length === 0 ? (
                    <Typography level='body-xs' sx={{ color: 'text.tertiary', textAlign: 'center', py: 2 }}>
                      {t('study.types.noDecks', { type: t('study.types.visual') })}
                    </Typography>
                  ) : (
                    <>
                      {getDecksByType('visual')
                        .slice(0, 3)
                        .map((deck) => {
                          const dueCount = getDueCardsForDeck(deck._id)
                          const hasDueCards = dueCount > 0

                          return (
                            <Button
                              key={deck._id}
                              variant='soft'
                              color={hasDueCards ? 'info' : 'neutral'}
                              onClick={() => navigate(hasDueCards ? `/study/${deck._id}` : `/cards`)}
                              disabled={!hasDueCards}
                              sx={{ justifyContent: 'space-between' }}
                            >
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deck.name}</span>
                              {hasDueCards ? (
                                <Chip size='sm'>
                                  {dueCount} {t('study.due')}
                                </Chip>
                              ) : (
                                <Chip size='sm' variant='outlined'>
                                  {t('study.allReviewed')}
                                </Chip>
                              )}
                            </Button>
                          )
                        })}
                      {getDecksByType('visual').length > 3 && (
                        <Button variant='plain' size='sm' onClick={() => navigate('/cards')}>
                          {t('study.viewAll', { count: getDecksByType('visual').length })}
                        </Button>
                      )}
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  )
}

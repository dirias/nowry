import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Typography, Box, Card, CardContent, Stack, Button, Chip, Grid, LinearProgress, Divider } from '@mui/joy'
import { School, Quiz as QuizIcon, Style, AccountTree, TrendingUp, CalendarToday } from '@mui/icons-material'
import { decksService, cardsService } from '../../api/services'
import { useTranslation } from 'react-i18next'

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

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [decksData, cardsData, statisticsData] = await Promise.all([
        decksService.getAll(),
        cardsService.getAll(),
        cardsService.getStatistics()
      ])

      setDecks(decksData)
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

  if (loading) {
    return (
      <Container maxWidth='xl' sx={{ py: 4 }}>
        <LinearProgress />
        <Typography level='body-lg' sx={{ mt: 2, textAlign: 'center' }}>
          {t('common.loading')}
        </Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 1, md: 1.5 } }}>
      {/* Header */}
      <Stack spacing={1.5} sx={{ mb: 1.5 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent='space-between'
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={0.5}
          sx={{ width: '100%' }}
        >
          {/* Title */}
          <Typography level='h2' fontWeight={600} sx={{ fontSize: { xs: '1.5rem', md: '1.75rem' } }}>
            {t('study.title')}
          </Typography>

          {/* Subtitle */}
          <Typography level='body-sm' sx={{ color: 'text.tertiary', fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
            {t('study.subtitle')}
          </Typography>
        </Stack>

        {/* Stats Dashboard - Compact Minimalistic Design */}
        <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 2 }}>
          <Grid xs={3} sm={3} md={3}>
            <Box
              sx={{
                py: 1.5,
                px: 1,
                borderRadius: 'sm',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                minHeight: { xs: 80, md: 90 },
                transition: 'all 0.15s',
                bgcolor: 'transparent',
                '&:hover': {
                  bgcolor: 'primary.softBg'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <TrendingUp sx={{ fontSize: 20, color: 'primary.solidBg', opacity: 0.7 }} />
                <Typography
                  level='h2'
                  sx={{
                    color: 'text.primary',
                    lineHeight: 1,
                    fontSize: { xs: '2rem', md: '2.5rem' },
                    fontWeight: 600
                  }}
                >
                  {stats.dueToday}
                </Typography>
              </Box>
              <Typography level='body-xs' sx={{ color: 'text.tertiary', fontSize: '0.625rem', opacity: 0.6 }}>
                {t('study.stats.dueToday')}
              </Typography>
            </Box>
          </Grid>

          <Grid xs={3} sm={3} md={3}>
            <Box
              sx={{
                py: 1.5,
                px: 1,
                borderRadius: 'sm',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                minHeight: { xs: 80, md: 90 },
                transition: 'all 0.15s',
                bgcolor: 'transparent',
                '&:hover': {
                  bgcolor: 'success.softBg'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <School sx={{ fontSize: 20, color: 'success.solidBg', opacity: 0.7 }} />
                <Typography
                  level='h2'
                  sx={{
                    color: 'text.primary',
                    lineHeight: 1,
                    fontSize: { xs: '2rem', md: '2.5rem' },
                    fontWeight: 600
                  }}
                >
                  {stats.reviewedToday}
                </Typography>
              </Box>
              <Typography level='body-xs' sx={{ color: 'text.tertiary', fontSize: '0.625rem', opacity: 0.6 }}>
                {t('study.stats.reviewedToday')}
              </Typography>
            </Box>
          </Grid>

          <Grid xs={3} sm={3} md={3}>
            <Box
              sx={{
                py: 1.5,
                px: 1,
                borderRadius: 'sm',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                minHeight: { xs: 80, md: 90 },
                transition: 'all 0.15s',
                bgcolor: 'transparent',
                '&:hover': {
                  bgcolor: 'neutral.softBg'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Style sx={{ fontSize: 20, color: 'neutral.solidBg', opacity: 0.7 }} />
                <Typography
                  level='h2'
                  sx={{
                    color: 'text.primary',
                    lineHeight: 1,
                    fontSize: { xs: '2rem', md: '2.5rem' },
                    fontWeight: 600
                  }}
                >
                  {stats.totalActive}
                </Typography>
              </Box>
              <Typography level='body-xs' sx={{ color: 'text.tertiary', fontSize: '0.625rem', opacity: 0.6 }}>
                {t('study.stats.totalCards')}
              </Typography>
            </Box>
          </Grid>

          <Grid xs={3} sm={3} md={3}>
            <Box
              sx={{
                py: 1.5,
                px: 1,
                borderRadius: 'sm',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                minHeight: { xs: 80, md: 90 },
                transition: 'all 0.15s',
                bgcolor: 'transparent',
                '&:hover': {
                  bgcolor: 'warning.softBg'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <CalendarToday sx={{ fontSize: 20, color: 'warning.solidBg', opacity: 0.7 }} />
                <Typography
                  level='h2'
                  sx={{
                    color: 'text.primary',
                    lineHeight: 1,
                    fontSize: { xs: '2rem', md: '2.5rem' },
                    fontWeight: 600
                  }}
                >
                  {stats.streak}
                </Typography>
              </Box>
              <Typography level='body-xs' sx={{ color: 'text.tertiary', fontSize: '0.625rem', opacity: 0.6 }}>
                {t('profile.stats.days')}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Stack>

      {/* Subtle Divider for Visual Separation */}
      <Divider sx={{ my: 3, opacity: 0.3 }} />

      {/* Quick Start Actions */}
      {stats.dueToday > 0 && (
        <Card
          orientation='horizontal'
          variant='outlined'
          color='danger'
          size='sm'
          sx={{
            mb: 4,
            px: 3,
            py: 2,
            alignItems: 'center',
            boxShadow: 'sm',
            bgcolor: 'danger.softBg',
            // FORCE COMPACTING: override any default or inherited sizing
            height: 'auto',
            minHeight: 'unset',
            width: '100%'
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography level='title-md' fontWeight={600} sx={{ mb: 0.5, color: 'text.primary' }}>
              🎯 {t('study.startReview')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.secondary', lineHeight: 1.2 }}>
              {t('study.reviewMsg', { count: stats.dueToday })}
            </Typography>
          </Box>
          <Button size='sm' color='danger' onClick={() => navigate('/study/daily-review')}>
            {t('study.startStudying')}
          </Button>
        </Card>
      )}

      {/* Study by Type */}
      <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1.5, mt: 1 }}>
        <Typography level='h4' fontWeight={600} sx={{ fontSize: { xs: '1.125rem', md: '1.25rem' } }}>
          {t('study.byType')}
        </Typography>

        {/* Swipe Hint (Mobile) */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1, color: 'text.tertiary' }}>
          <Typography level='body-xs' sx={{ fontSize: '0.7rem' }}>
            Swipe to navigate
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
                {tabLabel}
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
                transition: 'all 0.25s ease',
                '&:hover': {
                  boxShadow: 'lg',
                  transform: 'translateY(-4px)',
                  borderColor: 'primary.500'
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

                <Typography level='body-sm' sx={{ mb: 2, color: 'neutral.600' }}>
                  {t('study.types.flashcardsDesc')}
                </Typography>

                <Stack spacing={1}>
                  {getDecksByType('flashcard').length === 0 ? (
                    <Typography level='body-xs' sx={{ color: 'neutral.500', textAlign: 'center', py: 2 }}>
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
                transition: 'all 0.25s ease',
                '&:hover': {
                  boxShadow: 'lg',
                  transform: 'translateY(-4px)',
                  borderColor: 'warning.500'
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

                <Typography level='body-sm' sx={{ mb: 2, color: 'neutral.600' }}>
                  {t('study.types.quizzesDesc')}
                </Typography>

                <Stack spacing={1}>
                  {getDecksByType('quiz').length === 0 ? (
                    <Typography level='body-xs' sx={{ color: 'neutral.500', textAlign: 'center', py: 2 }}>
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
                transition: 'all 0.25s ease',
                '&:hover': {
                  boxShadow: 'lg',
                  transform: 'translateY(-4px)',
                  borderColor: 'info.500'
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

                <Typography level='body-sm' sx={{ mb: 2, color: 'neutral.600' }}>
                  {t('study.types.visualDesc')}
                </Typography>

                <Stack spacing={1}>
                  {getDecksByType('visual').length === 0 ? (
                    <Typography level='body-xs' sx={{ color: 'neutral.500', textAlign: 'center', py: 2 }}>
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

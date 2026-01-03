import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Typography, Box, Card, CardContent, Stack, Button, Chip, Grid, LinearProgress } from '@mui/joy'
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
    <Container maxWidth='xl' sx={{ py: 4 }}>
      {/* Header */}
      <Stack spacing={4} sx={{ mb: 4 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent='space-between'
          alignItems={{ xs: 'center', md: 'center' }}
          spacing={2}
          sx={{ width: '100%' }}
        >
          {/* Left: Title */}
          <Typography level='h2' fontWeight={600} sx={{ mb: 0.5 }}>
            {t('study.title')}
          </Typography>

          {/* Center: Subtitle */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', flex: 1 }}>
            <Typography level='body-sm' sx={{ color: 'text.tertiary', display: 'flex', alignItems: 'center', gap: 1 }}>
              {t('study.subtitle')}
              {stats.streak > 0 && (
                <Typography component='span' level='body-xs' sx={{ color: 'warning.plainColor' }}>
                  • 🔥 {stats.streak} {t('profile.stats.days')}
                </Typography>
              )}
            </Typography>
          </Box>

          {/* Mobile Only Subtitle */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, width: '100%', justifyContent: 'center' }}>
            <Typography level='body-sm' sx={{ color: 'text.tertiary', textAlign: 'center' }}>
              {t('study.subtitle')}
            </Typography>
          </Box>

          {/* Empty Right Side to Balance Layout if needed, or just let it expand */}
          <Box sx={{ width: { xs: 0, md: 'auto' } }} />
        </Stack>

        {/* Stats Dashboard */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid xs={12} sm={6} md={3}>
            <Card variant='soft' color='danger'>
              <CardContent>
                <Stack direction='row' spacing={2} alignItems='center'>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 'md',
                      bgcolor: 'danger.solidBg',
                      color: 'danger.solidColor'
                    }}
                  >
                    <TrendingUp />
                  </Box>
                  <Box>
                    <Typography level='h3' fontWeight={700} sx={{ color: 'danger.solidBg' }}>
                      {stats.dueToday}
                    </Typography>
                    <Typography level='body-sm' sx={{ color: 'danger.plainColor' }}>
                      {t('study.stats.dueToday')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid xs={12} sm={6} md={3}>
            <Card variant='soft' color='success'>
              <CardContent>
                <Stack direction='row' spacing={2} alignItems='center'>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 'md',
                      bgcolor: 'success.solidBg',
                      color: 'success.solidColor'
                    }}
                  >
                    <School />
                  </Box>
                  <Box>
                    <Typography level='h3' fontWeight={700} sx={{ color: 'success.solidBg' }}>
                      {stats.reviewedToday}
                    </Typography>
                    <Typography level='body-sm' sx={{ color: 'success.plainColor' }}>
                      {t('study.stats.reviewedToday')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid xs={12} sm={6} md={3}>
            <Card variant='soft' color='primary'>
              <CardContent>
                <Stack direction='row' spacing={2} alignItems='center'>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 'md',
                      bgcolor: 'primary.solidBg',
                      color: 'primary.solidColor'
                    }}
                  >
                    <Style />
                  </Box>
                  <Box>
                    <Typography level='h3' fontWeight={700} sx={{ color: 'primary.solidBg' }}>
                      {stats.totalActive}
                    </Typography>
                    <Typography level='body-sm' sx={{ color: 'primary.plainColor' }}>
                      {t('study.stats.totalCards')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>

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
            borderColor: 'danger.200',
            backgroundColor: 'danger.50',
            // FORCE COMPACTING: override any default or inherited sizing
            height: 'auto',
            minHeight: 'unset',
            width: '100%'
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography level='title-md' fontWeight={600} sx={{ mb: 0.5 }}>
              🎯 {t('study.startReview')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'neutral.600', lineHeight: 1.2 }}>
              {t('study.reviewMsg', { count: stats.dueToday })}
            </Typography>
          </Box>
          <Button size='sm' color='danger' onClick={() => navigate('/cards')}>
            {t('study.startStudying')}
          </Button>
        </Card>
      )}

      {/* Study by Type */}
      <Typography level='h4' fontWeight={600} sx={{ mb: 3 }}>
        {t('study.byType')}
      </Typography>

      <Grid container spacing={3}>
        {/* Flashcards */}
        <Grid xs={12} md={4}>
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
                        return (
                          <Button
                            key={deck._id}
                            variant='soft'
                            color='primary'
                            onClick={() => navigate(`/study/${deck._id}`)}
                            sx={{ justifyContent: 'space-between' }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deck.name}</span>
                            {dueCount > 0 && (
                              <Chip size='sm'>
                                {dueCount} {t('study.due')}
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
        <Grid xs={12} md={4}>
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
                        return (
                          <Button
                            key={deck._id}
                            variant='soft'
                            color='warning'
                            onClick={() => navigate(`/study/${deck._id}`)}
                            sx={{ justifyContent: 'space-between' }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deck.name}</span>
                            {dueCount > 0 && (
                              <Chip size='sm'>
                                {dueCount} {t('study.due')}
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
        <Grid xs={12} md={4}>
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
                        return (
                          <Button
                            key={deck._id}
                            variant='soft'
                            color='info'
                            onClick={() => navigate(`/study/${deck._id}`)}
                            sx={{ justifyContent: 'space-between' }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deck.name}</span>
                            {dueCount > 0 && (
                              <Chip size='sm'>
                                {dueCount} {t('study.due')}
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
    </Container>
  )
}

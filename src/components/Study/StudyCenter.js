import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Typography, Box, Card, CardContent, Stack, Button, Chip, Grid, LinearProgress } from '@mui/joy'
import { School, Quiz as QuizIcon, Style, AccountTree, TrendingUp, CalendarToday } from '@mui/icons-material'
import { decksService, cardsService } from '../../api/services'

export default function StudyCenter() {
  const navigate = useNavigate()
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
      const [decksData, cardsData] = await Promise.all([decksService.getAll(), cardsService.getAll()])

      setDecks(decksData)
      setCards(cardsData)

      // Calculate stats
      const now = new Date()
      const dueCards = cardsData.filter((card) => {
        if (!card.next_review) return true
        const nextReview = new Date(card.next_review)
        return nextReview <= now
      })

      setStats({
        dueToday: dueCards.length,
        reviewedToday: 0, // TODO: Track reviewed today
        totalActive: cardsData.length,
        streak: 5 // TODO: Calculate actual streak
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
          Loading Study Center...
        </Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth='xl' sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography level='h2' fontWeight={700} sx={{ mb: 0.5 }}>
          📚 Study Center
        </Typography>
        <Typography level='body-sm' sx={{ color: 'neutral.600' }}>
          Your personalized learning hub
        </Typography>
      </Box>

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
                  <Typography level='h3' fontWeight={700}>
                    {stats.dueToday}
                  </Typography>
                  <Typography level='body-sm' sx={{ color: 'danger.700' }}>
                    Due Today
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
                  <Typography level='h3' fontWeight={700}>
                    {stats.reviewedToday}
                  </Typography>
                  <Typography level='body-sm' sx={{ color: 'success.700' }}>
                    Reviewed Today
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card variant='soft' color='warning'>
            <CardContent>
              <Stack direction='row' spacing={2} alignItems='center'>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 'md',
                    bgcolor: 'warning.solidBg',
                    color: 'warning.solidColor'
                  }}
                >
                  <CalendarToday />
                </Box>
                <Box>
                  <Typography level='h3' fontWeight={700}>
                    {stats.streak}
                  </Typography>
                  <Typography level='body-sm' sx={{ color: 'warning.700' }}>
                    Day Streak
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
                  <Typography level='h3' fontWeight={700}>
                    {stats.totalActive}
                  </Typography>
                  <Typography level='body-sm' sx={{ color: 'primary.700' }}>
                    Total Cards
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Start Actions */}
      {stats.dueToday > 0 && (
        <Card
          variant='outlined'
          color='danger'
          sx={{
            mb: 4,
            borderWidth: 2,
            transition: 'all 0.3s',
            '&:hover': {
              borderColor: 'danger.500',
              boxShadow: 'lg'
            }
          }}
        >
          <CardContent>
            <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between' flexWrap='wrap'>
              <Box>
                <Typography level='title-lg' fontWeight={600} sx={{ mb: 0.5 }}>
                  🎯 Start Your Daily Review
                </Typography>
                <Typography level='body-sm' sx={{ color: 'neutral.600' }}>
                  You have {stats.dueToday} cards ready to review
                </Typography>
              </Box>
              <Button size='lg' color='danger' onClick={() => navigate('/cards')}>
                Start Studying →
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Study by Type */}
      <Typography level='h4' fontWeight={600} sx={{ mb: 3 }}>
        Study by Type
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
                    Flashcards
                  </Typography>
                  <Chip size='sm' variant='soft' color='primary'>
                    {getDecksByType('flashcard').length} decks
                  </Chip>
                </Box>
              </Stack>

              <Typography level='body-sm' sx={{ mb: 2, color: 'neutral.600' }}>
                Classic flip-style cards for quick memorization
              </Typography>

              <Stack spacing={1}>
                {getDecksByType('flashcard').length === 0 ? (
                  <Typography level='body-xs' sx={{ color: 'neutral.500', textAlign: 'center', py: 2 }}>
                    No flashcard decks yet
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
                            {dueCount > 0 && <Chip size='sm'>{dueCount} due</Chip>}
                          </Button>
                        )
                      })}
                    {getDecksByType('flashcard').length > 3 && (
                      <Button variant='plain' size='sm' onClick={() => navigate('/cards')}>
                        View all {getDecksByType('flashcard').length} decks →
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
                    Quizzes
                  </Typography>
                  <Chip size='sm' variant='soft' color='warning'>
                    {getDecksByType('quiz').length} decks
                  </Chip>
                </Box>
              </Stack>

              <Typography level='body-sm' sx={{ mb: 2, color: 'neutral.600' }}>
                Multiple-choice with instant feedback
              </Typography>

              <Stack spacing={1}>
                {getDecksByType('quiz').length === 0 ? (
                  <Typography level='body-xs' sx={{ color: 'neutral.500', textAlign: 'center', py: 2 }}>
                    No quiz decks yet
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
                            {dueCount > 0 && <Chip size='sm'>{dueCount} due</Chip>}
                          </Button>
                        )
                      })}
                    {getDecksByType('quiz').length > 3 && (
                      <Button variant='plain' size='sm' onClick={() => navigate('/cards')}>
                        View all {getDecksByType('quiz').length} decks →
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
                    Visual Diagrams
                  </Typography>
                  <Chip size='sm' variant='soft' color='info'>
                    {getDecksByType('visual').length} decks
                  </Chip>
                </Box>
              </Stack>

              <Typography level='body-sm' sx={{ mb: 2, color: 'neutral.600' }}>
                Mind maps, flowcharts & visual aids
              </Typography>

              <Stack spacing={1}>
                {getDecksByType('visual').length === 0 ? (
                  <Typography level='body-xs' sx={{ color: 'neutral.500', textAlign: 'center', py: 2 }}>
                    No visual decks yet
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
                            {dueCount > 0 && <Chip size='sm'>{dueCount} due</Chip>}
                          </Button>
                        )
                      })}
                    {getDecksByType('visual').length > 3 && (
                      <Button variant='plain' size='sm' onClick={() => navigate('/cards')}>
                        View all {getDecksByType('visual').length} decks →
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

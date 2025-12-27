import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Container, Card, CardContent, Typography, Button, Stack, Box, LinearProgress, IconButton } from '@mui/joy'
import { ArrowBack, CheckCircle } from '@mui/icons-material'
import { cardsService } from '../../api/services'

export default function StudySession() {
  const { deckId } = useParams()
  const navigate = useNavigate()

  const [cards, setCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sessionComplete, setSessionComplete] = useState(false)

  useEffect(() => {
    fetchDeckCards()
  }, [deckId])

  const fetchDeckCards = async () => {
    try {
      setLoading(true)
      const cardsData = await cardsService.getAll()

      // Filter cards for this deck
      const deckCards = cardsData.filter((card) => card.deck_id === deckId || card.deck_id?._id === deckId)

      // Only show cards that are due for review
      const now = new Date()
      const dueCards = deckCards.filter((card) => {
        // New cards (never reviewed) should show up
        if (!card.next_review) return true

        // Cards that are scheduled for review on or before today
        const nextReview = new Date(card.next_review)
        return nextReview <= now
      })

      setCards(dueCards)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching cards:', error)
      setLoading(false)
    }
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleGrade = async (grade) => {
    const currentCard = cards[currentIndex]

    try {
      // Call SM-2 review endpoint
      await cardsService.review(currentCard._id || currentCard.id, grade)
      console.log(`Card reviewed with grade: ${grade}`)
    } catch (error) {
      console.error('Error reviewing card:', error)
    }

    // Move to next card
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
    } else {
      setSessionComplete(true)
    }
  }

  if (loading) {
    return (
      <Container maxWidth='md' sx={{ py: 4 }}>
        <LinearProgress />
        <Typography level='body-lg' sx={{ mt: 2, textAlign: 'center' }}>
          Loading study session...
        </Typography>
      </Container>
    )
  }

  if (cards.length === 0) {
    return (
      <Container maxWidth='md' sx={{ py: 4 }}>
        <Card>
          <CardContent>
            <Typography level='h4' sx={{ mb: 2 }}>
              🎉 All caught up!
            </Typography>
            <Typography level='body-md' sx={{ mb: 3 }}>
              No cards are due for review right now. Cards you&apos;ve studied are scheduled for future review based on how well you knew
              them. Check back later or add new cards to keep learning!
            </Typography>
            <Button onClick={() => navigate('/cards')}>Go Back</Button>
          </CardContent>
        </Card>
      </Container>
    )
  }

  if (sessionComplete) {
    return (
      <Container maxWidth='md' sx={{ py: 4 }}>
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <CheckCircle sx={{ fontSize: 80, color: 'success.500', mb: 2 }} />
            <Typography level='h3' sx={{ mb: 1 }}>
              Session Complete!
            </Typography>
            <Typography level='body-lg' sx={{ mb: 3, color: 'neutral.600' }}>
              You&apos;ve reviewed {cards.length} cards. Great job!
            </Typography>
            <Button size='lg' onClick={() => navigate('/cards')}>
              Back to Library
            </Button>
          </CardContent>
        </Card>
      </Container>
    )
  }

  const currentCard = cards[currentIndex]
  const progress = ((currentIndex + 1) / cards.length) * 100

  return (
    <Container maxWidth='md' sx={{ py: 4 }}>
      {/* Header */}
      <Stack direction='row' alignItems='center' spacing={2} sx={{ mb: 3 }}>
        <IconButton onClick={() => navigate('/cards')}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography level='body-sm' sx={{ color: 'neutral.600' }}>
            Card {currentIndex + 1} of {cards.length}
          </Typography>
          <LinearProgress determinate value={progress} sx={{ mt: 1, borderRadius: 'md' }} />
        </Box>
      </Stack>

      {/* Flashcard */}
      <Card
        sx={{
          minHeight: 400,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          transition: 'transform 0.3s ease',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transformStyle: 'preserve-3d',
          '&:hover': {
            transform: isFlipped ? 'rotateY(180deg) scale(1.02)' : 'scale(1.02)',
            boxShadow: 'lg'
          }
        }}
        onClick={handleFlip}
      >
        <CardContent
          sx={{
            textAlign: 'center',
            p: 4,
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          {!isFlipped ? (
            <>
              <Typography level='body-sm' sx={{ mb: 2, color: 'primary.500' }}>
                Question
              </Typography>
              <Typography level='h3' sx={{ wordBreak: 'break-word' }}>
                {currentCard.title}
              </Typography>
              <Typography level='body-sm' sx={{ mt: 4, color: 'neutral.500' }}>
                Click to reveal answer
              </Typography>
            </>
          ) : (
            <>
              <Typography level='body-sm' sx={{ mb: 2, color: 'success.500' }}>
                Answer
              </Typography>
              <Typography level='body-lg' sx={{ wordBreak: 'break-word' }}>
                {currentCard.content}
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      {/* Grading Buttons */}
      {isFlipped && (
        <Stack direction='row' spacing={2} sx={{ mt: 3 }} justifyContent='center'>
          <Button variant='soft' color='danger' onClick={() => handleGrade('again')}>
            Again
          </Button>
          <Button variant='soft' color='warning' onClick={() => handleGrade('hard')}>
            Hard
          </Button>
          <Button variant='soft' color='success' onClick={() => handleGrade('good')}>
            Good
          </Button>
          <Button variant='solid' color='primary' onClick={() => handleGrade('easy')}>
            Easy
          </Button>
        </Stack>
      )}
    </Container>
  )
}

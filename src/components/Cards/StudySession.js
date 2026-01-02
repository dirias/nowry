import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Container, Card, CardContent, Typography, Button, Stack, Box, LinearProgress, IconButton, Radio, RadioGroup } from '@mui/joy'
import { ArrowBack, CheckCircle, Lightbulb } from '@mui/icons-material'
import { cardsService } from '../../api/services'
import TTSControls from '../TTS/TTSControls'
import mermaid from 'mermaid'

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose'
})

export default function StudySession() {
  const { deckId } = useParams()
  const navigate = useNavigate()
  const mermaidRef = useRef(null)

  const [cards, setCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [mermaidSvg, setMermaidSvg] = useState('')

  useEffect(() => {
    fetchDeckCards()
  }, [deckId])

  useEffect(() => {
    // Render Mermaid diagram for visual cards
    const currentCard = cards[currentIndex]
    if (currentCard?.card_type === 'visual' && currentCard.diagram_code && mermaidRef.current) {
      const id = `mermaid-${Date.now()}`
      mermaid
        .render(id, currentCard.diagram_code)
        .then((result) => setMermaidSvg(result.svg))
        .catch((err) => console.error('Mermaid render error:', err))
    }
  }, [currentIndex, cards])

  const fetchDeckCards = async () => {
    try {
      setLoading(true)
      const cardsData = await cardsService.getAll()

      // Filter cards for this deck
      const deckCards = cardsData.filter((card) => card.deck_id === deckId || card.deck_id?._id === deckId)

      // Only show cards that are due for review
      const now = new Date()
      const dueCards = deckCards.filter((card) => {
        if (!card.next_review) return true
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

  const handleQuizAnswer = (option) => {
    setSelectedAnswer(option)
    setShowExplanation(true)
  }

  const handleGrade = async (grade) => {
    const currentCard = cards[currentIndex]

    try {
      await cardsService.review(currentCard._id || currentCard.id, grade)
    } catch (error) {
      console.error('Error reviewing card:', error)
    }

    // Move to next card
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
      setSelectedAnswer(null)
      setShowExplanation(false)
      setMermaidSvg('')
    } else {
      setSessionComplete(true)
    }
  }

  if (loading) {
    return (
      <Container maxWidth='lg' sx={{ py: 4 }}>
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
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <Typography level='h4' sx={{ mb: 2 }}>
              🎉 All caught up!
            </Typography>
            <Typography level='body-md' sx={{ mb: 3 }}>
              No cards are due for review right now. Check back later or add new cards to keep learning!
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
  const isQuiz = currentCard.card_type === 'quiz'
  const isVisual = currentCard.card_type === 'visual'

  return (
    <Container maxWidth='lg' sx={{ py: 4 }}>
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

      {/* Main Content */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        {/* Study Card */}
        <Box sx={{ flex: 1 }}>
          {isQuiz ? (
            // Quiz Card
            <Card sx={{ minHeight: 400 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography level='body-sm' sx={{ mb: 2, color: 'warning.500', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Lightbulb fontSize='small' /> Quiz Question
                </Typography>
                <Typography level='h4' sx={{ mb: 4 }}>
                  {currentCard.title}
                </Typography>

                <RadioGroup value={selectedAnswer} onChange={(e) => handleQuizAnswer(e.target.value)}>
                  <Stack spacing={2}>
                    {currentCard.options && currentCard.options.length > 0 ? (
                      currentCard.options.map((option, idx) => (
                        <Card
                          key={idx}
                          variant={selectedAnswer === option ? 'solid' : 'outlined'}
                          color={
                            showExplanation
                              ? option === currentCard.correct_answer
                                ? 'success'
                                : option === selectedAnswer
                                  ? 'danger'
                                  : 'neutral'
                              : selectedAnswer === option
                                ? 'primary'
                                : 'neutral'
                          }
                          sx={{
                            cursor: showExplanation ? 'default' : 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': !showExplanation
                              ? {
                                  transform: 'translateX(4px)',
                                  boxShadow: 'md'
                                }
                              : {}
                          }}
                          onClick={() => !showExplanation && handleQuizAnswer(option)}
                        >
                          <CardContent sx={{ p: 2 }}>
                            <Typography level='body-md' fontWeight={selectedAnswer === option ? 600 : 400}>
                              {option}
                            </Typography>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'danger.50', borderRadius: 'md' }}>
                        <Typography level='body-sm' color='danger'>
                          ⚠️ No options available for this question
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </RadioGroup>

                {showExplanation && currentCard.explanation && (
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.50', borderRadius: 'md', borderLeft: '4px solid', borderColor: 'primary.500' }}>
                    <Typography level='title-sm' color='primary' sx={{ mb: 1 }}>
                      Explanation
                    </Typography>
                    <Typography level='body-sm'>{currentCard.explanation}</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : isVisual ? (
            // Visual Card
            <Card sx={{ minHeight: 400 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography level='body-sm' sx={{ mb: 2, color: 'info.500' }}>
                  Visual Diagram
                </Typography>
                <Typography level='h4' sx={{ mb: 3 }}>
                  {currentCard.title}
                </Typography>

                <Box
                  ref={mermaidRef}
                  sx={{
                    p: 3,
                    border: '1px solid',
                    borderColor: 'neutral.outlinedBorder',
                    borderRadius: 'md',
                    bgcolor: 'background.body',
                    minHeight: 250,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'auto'
                  }}
                  dangerouslySetInnerHTML={{ __html: mermaidSvg }}
                />

                {currentCard.content && (
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 'md' }}>
                    <Typography level='body-sm'>{currentCard.content}</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : (
            // Flashcard
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
          )}

          {/* Grading Buttons */}
          {((isQuiz && showExplanation) || isVisual || (isFlipped && !isQuiz && !isVisual)) && (
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
        </Box>

        {/* TTS Controls Sidebar */}
        <Box sx={{ width: { xs: '100%', md: 350 } }}>
          <TTSControls
            text={isQuiz ? `${currentCard.title}. ${currentCard.options?.join(', ')}` : isFlipped ? currentCard.content : currentCard.title}
          />
        </Box>
      </Stack>
    </Container>
  )
}

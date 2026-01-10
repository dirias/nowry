import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Container, Card, CardContent, Typography, Button, Stack, Box, LinearProgress, IconButton, Radio, RadioGroup } from '@mui/joy'
import { ArrowBack, ArrowForward, CheckCircle, Lightbulb, Fullscreen, FullscreenExit } from '@mui/icons-material'
import { cardsService, decksService } from '../../api/services'
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
  const [showVoiceSettings, setShowVoiceSettings] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [voiceSettings, setVoiceSettings] = useState({
    front: { voiceName: null, rate: 1.0, pitch: 1.0 },
    back: { voiceName: null, rate: 1.0, pitch: 1.0 }
  })

  // Swipe state
  const touchStart = useRef(null)
  const touchEnd = useRef(null)
  const touchStartY = useRef(null)
  const touchEndY = useRef(null)
  const minSwipeDistance = 50

  useEffect(() => {
    fetchDeckCards()
    fetchDeckSettings()
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

  const fetchDeckSettings = async () => {
    // Skip settings for global review, use defaults
    if (deckId === 'daily-review') return

    try {
      const deck = await decksService.getById(deckId)
      if (deck.voice_settings) {
        setVoiceSettings(deck.voice_settings)
      }
    } catch (error) {
      console.error('Error fetching deck settings:', error)
    }
  }

  const fetchDeckCards = async () => {
    try {
      setLoading(true)
      const cardsData = await cardsService.getAll()
      let reviewCards = []

      const now = new Date()

      if (deckId === 'daily-review') {
        // Global Review: Get ALL cards that are due
        reviewCards = cardsData.filter((card) => {
          if (!card.next_review) return true
          const nextReview = new Date(card.next_review)
          return nextReview <= now
        })
      } else {
        // Deck Review: Filter by deck
        const deckCards = cardsData.filter((card) => card.deck_id === deckId || card.deck_id?._id === deckId)

        // Only show cards that are due for review
        const dueCards = deckCards.filter((card) => {
          if (!card.next_review) return true
          const nextReview = new Date(card.next_review)
          return nextReview <= now
        })

        // If no due cards in deck, show all (existing logic)
        reviewCards = dueCards.length > 0 ? dueCards : deckCards
      }

      setCards(reviewCards)
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
    handleNext()
  }

  const handleNext = () => {
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

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setIsFlipped(false)
      setSelectedAnswer(null)
      setShowExplanation(false)
      setMermaidSvg('')
    }
  }

  const handleVoiceSettingsChange = async (newSettings) => {
    // Determine which side we are on
    const side = isFlipped ? 'back' : 'front'

    const updatedSettings = {
      ...voiceSettings,
      [side]: { ...voiceSettings[side], ...newSettings }
    }

    // Update local state immediately
    setVoiceSettings(updatedSettings)

    // Save to DB
    if (deckId !== 'daily-review') {
      try {
        console.log('[StudySession] Saving voice settings to deck:', deckId, updatedSettings)
        await decksService.update(deckId, { voice_settings: updatedSettings })
      } catch (error) {
        console.error('Error saving voice settings:', error)
      }
    } else {
      // In daily-review, save to the specific deck this card belongs to
      const currentCard = cards[currentIndex]
      const targetDeckId = currentCard?.deck_id?._id || currentCard?.deck_id

      if (targetDeckId) {
        try {
          console.log('[StudySession] Saving voice settings to target deck:', targetDeckId, updatedSettings)
          await decksService.update(targetDeckId, { voice_settings: updatedSettings })
        } catch (error) {
          console.error('Error saving voice settings to target deck:', error)
        }
      } else {
        console.warn('[StudySession] Could not identify target deck for current card. Settings not saved.')
      }
    }
  }

  // Helper for Fullscreen Toggle
  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Swipe Handlers
  const onTouchStart = (e) => {
    touchEnd.current = null
    touchEndY.current = null
    touchStart.current = e.targetTouches[0].clientX
    touchStartY.current = e.targetTouches[0].clientY
  }

  const onTouchMove = (e) => {
    touchEnd.current = e.targetTouches[0].clientX
    touchEndY.current = e.targetTouches[0].clientY
  }

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current || !touchStartY.current || !touchEndY.current) return

    const distanceX = touchStart.current - touchEnd.current
    const distanceY = touchStartY.current - touchEndY.current

    const isHorizontal = Math.abs(distanceX) > Math.abs(distanceY)

    if (isHorizontal) {
      const isLeftSwipe = distanceX > minSwipeDistance
      const isRightSwipe = distanceX < -minSwipeDistance

      if (isLeftSwipe) handleNext()
      if (isRightSwipe) handlePrev()
    } else {
      // Vertical Swipe
      const isUpSwipe = distanceY > minSwipeDistance
      const isDownSwipe = distanceY < -minSwipeDistance

      if (isUpSwipe) {
        // Swipe Up -> Flip Card
        handleFlip()
      }
      if (isDownSwipe) {
        // Swipe Down -> Show Voice Menu
        setShowVoiceSettings(true)
      }
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
        <Card sx={{ textAlign: 'center', py: 6, borderRadius: 'xl', boxShadow: 'sm' }}>
          <CardContent>
            <Typography level='h4' sx={{ mb: 2 }}>
              🎉 All caught up!
            </Typography>
            <Typography level='body-md' sx={{ mb: 3 }}>
              No cards are due for review right now.
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
        <Card sx={{ textAlign: 'center', py: 6, borderRadius: 'xl', boxShadow: 'md' }}>
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

  const GradingButtons = () => (
    <Stack direction='row' spacing={1} sx={{ mt: 4, width: '100%' }} justifyContent='center'>
      <Button size='lg' variant='soft' color='danger' onClick={() => handleGrade('again')} sx={{ flex: 1 }}>
        Again
      </Button>
      <Button size='lg' variant='soft' color='warning' onClick={() => handleGrade('hard')} sx={{ flex: 1 }}>
        Hard
      </Button>
      <Button size='lg' variant='soft' color='success' onClick={() => handleGrade('good')} sx={{ flex: 1 }}>
        Good
      </Button>
      <Button size='lg' variant='solid' color='primary' onClick={() => handleGrade('easy')} sx={{ flex: 1 }}>
        Easy
      </Button>
    </Stack>
  )

  return (
    <Container
      maxWidth={isFullscreen ? false : 'xl'}
      sx={{
        py: isFullscreen ? 0 : 4,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        px: isFullscreen ? 0 : 2
      }}
    >
      {/* Header - Hide in Fullscreen */}
      {!isFullscreen && (
        <Stack direction='row' alignItems='center' spacing={2} sx={{ mb: 2 }}>
          <IconButton onClick={() => navigate('/cards')} variant='plain' color='neutral'>
            <ArrowBack />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography level='body-sm' sx={{ color: 'neutral.500', fontWeight: 600, mb: 0.5 }}>
              CARD {currentIndex + 1} OF {cards.length}
            </Typography>
            <LinearProgress
              determinate
              value={progress}
              sx={{
                borderRadius: 'sm',
                bgcolor: 'background.level2',
                color: 'primary.500',
                height: 4
              }}
            />
          </Box>
        </Stack>
      )}

      {/* Main Study Area */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={isFullscreen ? 0 : 4}
        alignItems={isFullscreen ? 'center' : 'flex-start'}
        justifyContent='center'
        sx={{ flex: 1 }}
      >
        {/* Previous Button (Desktop) - Hide in Fullscreen/Mobile usually */}
        {!isFullscreen && (
          <IconButton
            variant='plain'
            color='neutral'
            onClick={handlePrev}
            disabled={currentIndex === 0}
            sx={{ display: { xs: 'none', md: 'flex' }, mt: 20 }}
          >
            <ArrowBack fontSize='large' />
          </IconButton>
        )}

        {/* Card Container */}
        <Box
          sx={{
            flex: 1,
            width: '100%',
            maxWidth: isFullscreen ? '100%' : 800,
            position: isFullscreen ? 'fixed' : 'relative',
            top: isFullscreen ? 0 : 'auto',
            left: isFullscreen ? 0 : 'auto',
            right: isFullscreen ? 0 : 'auto',
            bottom: isFullscreen ? 0 : 'auto',
            height: isFullscreen ? '100vh' : 'auto',
            zIndex: isFullscreen ? 1300 : 1,
            bgcolor: 'background.body', // Ensure background prevents see-through
            display: isFullscreen ? 'flex' : 'block',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Fullscreen Toggle (Top-Left) */}
          <IconButton
            variant='plain'
            color='neutral'
            onClick={handleFullscreenToggle}
            sx={{
              display: { xs: 'inline-flex', md: 'none' },
              position: 'absolute',
              top: 16,
              left: 16,
              zIndex: 20,
              bgcolor: isFullscreen ? 'rgba(255,255,255,0.5)' : 'transparent',
              '&:hover': { bgcolor: isFullscreen ? 'rgba(255,255,255,0.8)' : 'background.level1' }
            }}
          >
            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>

          {/* Embedded TTS Controls */}
          <TTSControls
            compact
            settingsOpen={showVoiceSettings}
            onSettingsChange={setShowVoiceSettings}
            voiceSettings={isFlipped ? voiceSettings.back : voiceSettings.front}
            onVoiceSettingsChange={handleVoiceSettingsChange}
            text={isQuiz ? `${currentCard.title}. ${currentCard.options?.join(', ')}` : isFlipped ? currentCard.content : currentCard.title}
          />
          {isQuiz ? (
            // Quiz Card
            <Card
              variant={isFullscreen ? 'plain' : 'outlined'}
              sx={{
                minHeight: isFullscreen ? '100vh' : 500,
                borderRadius: isFullscreen ? 0 : 'xl',
                boxShadow: isFullscreen ? 'none' : 'sm',
                overflow: 'auto'
              }}
            >
              <CardContent sx={{ p: isFullscreen ? 4 : 4, pt: 8 }}>
                <Typography
                  level='body-xs'
                  sx={{ mb: 2, color: 'warning.600', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}
                >
                  Quiz Question
                </Typography>
                <Typography level='h3' sx={{ mb: 4, fontWeight: 600 }}>
                  {currentCard.title}
                </Typography>

                <RadioGroup value={selectedAnswer} onChange={(e) => handleQuizAnswer(e.target.value)}>
                  <Stack spacing={2}>
                    {currentCard.options?.map((option, idx) => (
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
                          '&:hover': !showExplanation ? { transform: 'translateY(-2px)', boxShadow: 'md', borderColor: 'primary.300' } : {}
                        }}
                        onClick={() => !showExplanation && handleQuizAnswer(option)}
                      >
                        <CardContent sx={{ p: 1.5 }}>
                          <Typography level='body-md' fontWeight={selectedAnswer === option ? 600 : 400}>
                            {option}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </RadioGroup>

                {showExplanation && (
                  <>
                    {currentCard.explanation && (
                      <Box
                        sx={{ mt: 3, p: 2, bgcolor: 'primary.50', borderRadius: 'md', borderLeft: '4px solid', borderColor: 'primary.500' }}
                      >
                        <Typography level='title-sm' color='primary' sx={{ mb: 1 }}>
                          Explanation
                        </Typography>
                        <Typography level='body-sm'>{currentCard.explanation}</Typography>
                      </Box>
                    )}
                    <GradingButtons />
                  </>
                )}
              </CardContent>
            </Card>
          ) : isVisual ? (
            // Visual Card
            <Card
              variant={isFullscreen ? 'plain' : 'outlined'}
              sx={{
                minHeight: isFullscreen ? '100vh' : 500,
                borderRadius: isFullscreen ? 0 : 'xl',
                boxShadow: isFullscreen ? 'none' : 'sm',
                overflow: 'auto'
              }}
            >
              <CardContent sx={{ p: isFullscreen ? 4 : 4, pt: 8 }}>
                <Typography
                  level='body-xs'
                  sx={{ mb: 2, color: 'info.600', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}
                >
                  Visual Diagram
                </Typography>
                <Typography level='h3' sx={{ mb: 3, fontWeight: 600 }}>
                  {currentCard.title}
                </Typography>

                <Box
                  ref={mermaidRef}
                  sx={{
                    p: 4,
                    border: '1px dashed',
                    borderColor: 'neutral.300',
                    borderRadius: 'lg',
                    bgcolor: 'background.body',
                    minHeight: 300,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'auto'
                  }}
                  dangerouslySetInnerHTML={{ __html: mermaidSvg }}
                />

                {currentCard.content && (
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'neutral.50', borderRadius: 'md' }}>
                    <Typography level='body-sm' textColor='text.secondary'>
                      {currentCard.content}
                    </Typography>
                  </Box>
                )}
                <GradingButtons />
              </CardContent>
            </Card>
          ) : (
            // Flashcard
            <Card
              variant={isFullscreen ? 'plain' : 'outlined'}
              sx={{
                minHeight: isFullscreen ? '100vh' : 500,
                borderRadius: isFullscreen ? 0 : 'xl',
                boxShadow: isFullscreen ? 'none' : 'sm',
                cursor: 'pointer',
                transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.27)', // Spring-like flip
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transformStyle: 'preserve-3d',
                '&:hover': {
                  boxShadow: isFullscreen ? 'none' : 'xl',
                  borderColor: 'primary.200'
                }
              }}
              onClick={handleFlip}
            >
              <CardContent
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  height: '100%',
                  p: 6,
                  pt: 8, // Ensure top buttons don't overlap text
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  backfaceVisibility: 'hidden' // Hide back when not flipped (if 2 faces) - simplified here
                }}
              >
                {!isFlipped ? (
                  <>
                    <Typography
                      level='body-xs'
                      sx={{ mb: 3, color: 'primary.500', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}
                    >
                      Question
                    </Typography>
                    <Typography level='h2' sx={{ wordBreak: 'break-word', fontWeight: 600 }}>
                      {currentCard.title}
                    </Typography>
                    <Typography level='body-sm' sx={{ mt: 'auto', pt: 4, color: 'neutral.400' }}>
                      <Box component='span' sx={{ display: { xs: 'inline', md: 'none' } }}>
                        Tap to flip • Swipe to skip
                      </Box>
                      <Box component='span' sx={{ display: { xs: 'none', md: 'inline' } }}>
                        Click to flip
                      </Box>
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography
                      level='body-xs'
                      sx={{ mb: 3, color: 'success.500', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}
                    >
                      Answer
                    </Typography>
                    <Typography level='h3' sx={{ wordBreak: 'break-word', fontWeight: 500 }}>
                      {currentCard.content}
                    </Typography>
                    <GradingButtons />
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </Box>

        {/* Next Button (Desktop) - Hide in Fullscreen */}
        {!isFullscreen && (
          <IconButton
            variant='plain'
            color='neutral'
            onClick={handleNext}
            disabled={currentIndex === cards.length - 1}
            sx={{ display: { xs: 'none', md: 'flex' }, mt: 20 }}
          >
            <ArrowForward fontSize='large' />
          </IconButton>
        )}
      </Stack>
    </Container>
  )
}

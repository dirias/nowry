import React, { useState, useEffect } from 'react'
import { Box, Typography, Button, CircularProgress, Stack } from '@mui/joy'
import { useNavigate } from 'react-router-dom'
import { cardsService, decksService } from '../../../api/services'

const DailyFocus = () => {
  const navigate = useNavigate()
  const [decksDue, setDecksDue] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDueDecks()
  }, [])

  const fetchDueDecks = async () => {
    try {
      setLoading(true)
      const [cardsData, decksData] = await Promise.all([cardsService.getAll(), decksService.getAll()])

      // Filter cards that are due today
      const now = new Date()
      const dueCards = cardsData.filter((card) => {
        if (!card.next_review) return true // New cards
        const nextReview = new Date(card.next_review)
        return nextReview <= now
      })

      // Group due cards by deck
      const deckMap = new Map()
      dueCards.forEach((card) => {
        const deckId = card.deck_id?._id || card.deck_id
        if (deckId) {
          deckMap.set(deckId, (deckMap.get(deckId) || 0) + 1)
        }
      })

      // Create deck objects with due counts
      const decksWithDue = decksData
        .map((deck) => ({
          id: deck._id || deck.id,
          name: deck.name,
          dueCount: deckMap.get(deck._id || deck.id) || 0
        }))
        .filter((deck) => deck.dueCount > 0)
        .sort((a, b) => b.dueCount - a.dueCount) // Sort by most due cards first

      setDecksDue(decksWithDue)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching due decks:', error)
      setLoading(false)
    }
  }

  const handleStudy = (deckId) => {
    navigate(`/study/${deckId}`)
  }

  if (loading) {
    return (
      <Box
        sx={{
          borderRadius: 'md',
          backgroundColor: 'primary.softBg',
          p: 3,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <CircularProgress size='sm' />
      </Box>
    )
  }

  if (decksDue.length === 0) {
    return (
      <Box
        sx={{
          borderRadius: 'md',
          backgroundColor: 'success.softBg',
          p: 3,
          textAlign: 'center',
          boxShadow: 'sm'
        }}
      >
        <Typography level='title-lg' sx={{ mb: 1 }}>
          🎉 ¡Todo al día!
        </Typography>
        <Typography level='body-sm' sx={{ color: 'neutral.600' }}>
          No tienes tarjetas pendientes. ¡Buen trabajo!
        </Typography>
      </Box>
    )
  }

  const topDeck = decksDue[0]

  return (
    <Box>
      {/* Primary focus card */}
      <Box
        sx={{
          borderRadius: 'md',
          backgroundColor: 'primary.softBg',
          p: 2.5,
          mb: decksDue.length > 1 ? 2 : 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'sm',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: 'md',
            transform: 'translateY(-2px)'
          }
        }}
      >
        <Box>
          <Typography level='body-sm' sx={{ color: 'primary.700', fontWeight: '500', mb: 0.5 }}>
            📚 Hoy podrías repasar
          </Typography>
          <Typography level='title-md' sx={{ fontWeight: 'bold' }}>
            {topDeck.name} — {topDeck.dueCount} {topDeck.dueCount === 1 ? 'tarjeta' : 'tarjetas'}{' '}
            {topDeck.dueCount === 1 ? 'pendiente' : 'pendientes'}
          </Typography>
        </Box>
        <Button variant='solid' color='primary' size='md' onClick={() => handleStudy(topDeck.id)}>
          ¡Vamos!
        </Button>
      </Box>

      {/* Other decks due */}
      {decksDue.length > 1 && (
        <Stack spacing={1}>
          {decksDue.slice(1, 4).map((deck) => (
            <Box
              key={deck.id}
              sx={{
                borderRadius: 'sm',
                backgroundColor: 'background.level1',
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
                '&:hover': {
                  backgroundColor: 'background.level2',
                  transform: 'translateX(4px)'
                }
              }}
            >
              <Typography level='body-sm' sx={{ fontWeight: '500' }}>
                {deck.name} — {deck.dueCount} {deck.dueCount === 1 ? 'tarjeta' : 'tarjetas'}
              </Typography>
              <Button variant='plain' size='sm' onClick={() => handleStudy(deck.id)}>
                Estudiar
              </Button>
            </Box>
          ))}
          {decksDue.length > 4 && (
            <Typography level='body-xs' sx={{ textAlign: 'center', color: 'neutral.500', mt: 1 }}>
              Y {decksDue.length - 4} {decksDue.length - 4 === 1 ? 'deck más' : 'decks más'} con tarjetas pendientes
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  )
}

export default DailyFocus

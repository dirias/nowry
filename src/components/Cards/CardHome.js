import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Container,
  Stack,
  Typography,
  Box,
  Input,
  Chip,
  Button,
  Select,
  Option,
  IconButton,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Card,
  CardContent,
  Grid,
  Divider,
  CircularProgress,
  Snackbar,
  Skeleton
} from '@mui/joy'
import { Search, Add, GridView, ViewList, FilterList, TrendingUp, School, Download, MoreVert, CalendarToday } from '@mui/icons-material'
import StyleRoundedIcon from '@mui/icons-material/StyleRounded'
import CreateDeckModal from './CreateDeckModal'
import CreateCardModal from './CreateCardModal'
import CardPreviewModal from './CardPreviewModal'
import ManageContent from './ManageContent'
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal'
import { decksService } from '../../api/services'
import { useCardData } from '../../hooks/useCardData'
import { useStatistics } from '../../hooks/useStatistics'
import { useDeckData } from '../../hooks/useDeckData'

export default function CardHome() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  // State
  const [decks, setDecks] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateDeck, setShowCreateDeck] = useState(false)
  const [showCreateCard, setShowCreateCard] = useState(false)
  const [editingDeck, setEditingDeck] = useState(null)
  const [editingCard, setEditingCard] = useState(null)
  const [deletingDeck, setDeletingDeck] = useState(null)
  const [deletingCard, setDeletingCard] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [errorSnackbar, setErrorSnackbar] = useState(null)
  const [previewState, setPreviewState] = useState({
    open: false,
    title: '',
    cards: [],
    initialIndex: 0
  })

  // Stats
  const [stats, setStats] = useState({
    dueToday: 0,
    streak: 0,
    totalCards: 0
  })

  const { cards: hookCards, loading: cardsLoading, reload: reloadCards } = useCardData()
  const { statistics: hookStats, loading: statsLoading } = useStatistics()
  const { decks: hookDecks, loading: decksLoading, reload: reloadDecks } = useDeckData()

  useEffect(() => {
    if (cardsLoading || statsLoading || decksLoading) return
    fetchData()
  }, [cardsLoading, statsLoading, decksLoading, hookCards, hookStats, hookDecks])

  const fetchData = async () => {
    try {
      setLoading(true)
      const decksData = hookDecks || []

      // Calculate due cards for each deck using cached cards
      const now = new Date()
      const decksWithDueCount = decksData.map((deck) => {
        const deckCards = hookCards.filter((card) => card.deck_id === deck._id || card.deck_id?._id === deck._id)
        const dueCards = deckCards.filter((card) => {
          if (!card.next_review) return true
          const nextReview = new Date(card.next_review)
          return nextReview <= now
        })
        return {
          ...deck,
          due_cards: dueCards.length,
          has_cards: deckCards.length > 0
        }
      })

      setDecks(decksWithDueCount)
      setCards(hookCards)

      // Use real stats from cached API response
      const summary = hookStats?.summary || {}
      const dueCards = hookCards.filter((card) => {
        if (!card.next_review) return true
        const nextReview = new Date(card.next_review)
        return nextReview <= now
      })

      setStats({
        dueToday: dueCards.length,
        streak: summary.current_streak || 0,
        totalCards: summary.total_cards || hookCards.length
      })

      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  const handleStudy = (deck) => {
    navigate(`/study/${deck._id}`)
  }

  const handlePreview = (deck) => {
    const deckCards = cards.filter((card) => card.deck_id === deck._id || card.deck_id?._id === deck._id)
    setPreviewState({
      open: true,
      title: deck.name,
      cards: deckCards,
      initialIndex: 0
    })
  }

  const handleClosePreview = () => {
    setPreviewState((prev) => ({ ...prev, open: false }))
  }

  const handleCardSaved = () => {
    setShowCreateCard(false)
    setEditingCard(null)
    reloadCards() // Force a fresh fetch so the new/edited card appears
  }

  const handleDeckSaved = () => {
    fetchData()
  }

  const handleEditDeck = (deck) => {
    setEditingDeck(deck)
    setShowCreateDeck(true)
  }

  const handleDeleteDeck = async (deck) => {
    setDeletingDeck(deck)
  }

  const confirmDeleteDeck = async () => {
    if (!deletingDeck) return

    try {
      setDeleteLoading(true)
      await decksService.delete(deletingDeck._id)
      setDeletingDeck(null)
      setDeleteLoading(false)
      reloadDecks()
      fetchData()
    } catch (error) {
      console.error('Error deleting deck:', error)
      setErrorSnackbar(error.response?.data?.detail || t('cards.deleteCardError'))
      setDeleteLoading(false)
    }
  }

  const handleEditCard = (card) => {
    setEditingCard(card)
    setShowCreateCard(true)
  }

  const handleDeleteCard = (card) => {
    setDeletingCard(card)
  }

  const confirmDeleteCard = async () => {
    if (!deletingCard) return
    try {
      setCards(cards.filter((c) => c._id !== deletingCard._id))
      setDeletingCard(null)
      reloadCards() // Background cache update
    } catch (error) {
      console.error('Error deleting card:', error)
      setErrorSnackbar(t('cards.deleteCardError'))
    }
  }

  return (
    <Container maxWidth='xl' sx={{ py: 4 }}>
      {/* Header */}
      <Stack spacing={1.5} sx={{ mb: 1.5 }}>
        {/* Title Row */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent='space-between'
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={{ xs: 1.5, md: 0.5 }}
          sx={{ width: '100%' }}
        >
          {/* Title & Subtitle */}
          <Box>
            <Typography level='h3' fontWeight={600} sx={{ fontSize: { xs: '1.5rem', md: '1.75rem' }, mb: 0.25 }}>
              {t('cards.title')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.tertiary', fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
              {t('cards.subtitle')}
            </Typography>
          </Box>

          {/* Action Buttons */}
          <Stack direction='row' spacing={1}>
            <Button
              startDecorator={<TrendingUp />}
              onClick={() => navigate('/study')}
              variant='solid'
              color='primary'
              size='sm'
              sx={{ fontSize: '0.8125rem' }}
            >
              {t('cards.studyCenter')}
            </Button>
            <Button
              startDecorator={<Add />}
              onClick={() => setShowCreateDeck(true)}
              variant='outlined'
              color='primary'
              size='sm'
              sx={{ fontSize: '0.8125rem' }}
            >
              {t('cards.newDeck')}
            </Button>
            <Button
              startDecorator={<Add />}
              onClick={() => {
                setEditingCard(null)
                setShowCreateCard(true)
              }}
              variant='outlined'
              color='primary'
              size='sm'
              sx={{ fontSize: '0.8125rem' }}
            >
              {t('cards.newCard', 'New Card')}
            </Button>
          </Stack>
        </Stack>

        {/* Stats Dashboard - Compact Minimalistic Design */}
        <Grid container spacing={{ xs: 2, md: 3 }}>
          <Grid xs={4} sm={4} md={4}>
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
                  bgcolor: 'danger.softBg'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <School sx={{ fontSize: 20, color: 'danger.solidBg', opacity: 0.7 }} />
                <Typography
                  level='h2'
                  sx={{
                    color: 'text.primary',
                    lineHeight: 1,
                    fontSize: { xs: '2rem', md: '2.5rem' },
                    fontWeight: 600
                  }}
                >
                  <Skeleton loading={loading} variant='text' width='2ch'>
                    {stats.dueToday}
                  </Skeleton>
                </Typography>
              </Box>
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {t('cards.dueToday')}
              </Typography>
            </Box>
          </Grid>

          <Grid xs={4} sm={4} md={4}>
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
                <GridView sx={{ fontSize: 20, color: 'neutral.solidBg', opacity: 0.7 }} />
                <Typography
                  level='h2'
                  sx={{
                    color: 'text.primary',
                    lineHeight: 1,
                    fontSize: { xs: '2rem', md: '2.5rem' },
                    fontWeight: 600
                  }}
                >
                  <Skeleton loading={loading} variant='text' width='2ch'>
                    {stats.totalCards}
                  </Skeleton>
                </Typography>
              </Box>
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {t('cards.totalCards')}
              </Typography>
            </Box>
          </Grid>

          <Grid xs={4} sm={4} md={4}>
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
                  <Skeleton loading={loading} variant='text' width='2ch'>
                    {stats.streak}
                  </Skeleton>
                </Typography>
              </Box>
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {t('profile.stats.days')}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Stack>

      {/* Subtle Divider for Visual Separation */}
      <Divider sx={{ my: 2, opacity: 0.3 }} />

      {loading ? (
        <Stack alignItems='center' justifyContent='center' sx={{ py: 8 }} spacing={2}>
          <CircularProgress size='md' />
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            {t('cards.loading')}
          </Typography>
        </Stack>
      ) : (
        <ManageContent
          decks={decks}
          cards={cards}
          onStudy={handleStudy}
          onPreview={handlePreview}
          onEditDeck={handleEditDeck}
          onDeleteDeck={handleDeleteDeck}
          onEditCard={handleEditCard}
          onDeleteCard={handleDeleteCard}
          onAddCard={(deck) => {
            // Set the deck context for the new card
            setEditingCard({ deck_id: deck._id })
            setShowCreateCard(true)
          }}
        />
      )}

      {/* Modals */}
      {showCreateDeck && (
        <CreateDeckModal
          open={showCreateDeck}
          onClose={() => {
            setShowCreateDeck(false)
            setEditingDeck(null)
          }}
          onSaved={handleDeckSaved}
          initialData={editingDeck}
        />
      )}

      {showCreateCard && (
        <CreateCardModal
          open={showCreateCard}
          onClose={() => {
            setShowCreateCard(false)
            setEditingCard(null)
          }}
          onCardSaved={handleCardSaved}
          decks={decks}
          card={editingCard}
        />
      )}

      {previewState.open && (
        <CardPreviewModal
          open={previewState.open}
          onClose={handleClosePreview}
          title={previewState.title}
          cards={previewState.cards}
          initialIndex={previewState.initialIndex}
          decks={decks}
        />
      )}

      {/* Delete Deck Confirmation Modal */}
      {deletingDeck && (
        <DeleteConfirmationModal
          open={!!deletingDeck}
          onClose={() => setDeletingDeck(null)}
          onConfirm={confirmDeleteDeck}
          title={t('cards.deleteModal.title')}
          description={t('cards.deleteModal.description', { name: deletingDeck.name })}
          confirmText={t('cards.deleteModal.confirm')}
          loading={deleteLoading}
          consequences={[
            {
              text: t('cards.deleteModal.consequence1', { count: deletingDeck.total_cards || 0 }),
              icon: <StyleRoundedIcon fontSize='small' />
            },
            {
              text: t('cards.deleteModal.consequence2')
            }
          ]}
        />
      )}

      {/* Delete Card Confirmation Modal */}
      {deletingCard && (
        <DeleteConfirmationModal
          open={!!deletingCard}
          onClose={() => setDeletingCard(null)}
          onConfirm={confirmDeleteCard}
          title={t('cards.deck.delete')}
          description={t('cards.confirmDeleteCard')}
          confirmText={t('cards.deck.delete')}
        />
      )}

      {/* Error Snackbar */}
      <Snackbar
        open={!!errorSnackbar}
        autoHideDuration={4000}
        onClose={() => setErrorSnackbar(null)}
        color='danger'
        variant='soft'
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {errorSnackbar}
      </Snackbar>
    </Container>
  )
}

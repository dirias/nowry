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
  Skeleton,
  Tooltip
} from '@mui/joy'
import {
  Search,
  Add,
  GridView,
  ViewList,
  FilterList,
  TrendingUp,
  School,
  Download,
  MoreVert,
  CalendarToday,
  Close
} from '@mui/icons-material'
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
  const [searchQuery, setSearchQuery] = useState('')
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
      {/* Glass Hero Header */}
      <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 }, mt: { xs: 1, md: 2 } }}>
        <Typography level='h2' fontWeight={800} sx={{ mb: 1, letterSpacing: '-0.02em' }}>
          {t('cards.title')}
        </Typography>
        <Typography level='body-md' sx={{ color: 'text.tertiary', mb: 2, maxWidth: 500, mx: 'auto' }}>
          {t('cards.subtitle')}
        </Typography>

        {/* Minimalist Inline Stats */}
        <Stack direction='row' spacing={2} justifyContent='center' alignItems='center' sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <School sx={{ fontSize: 16, color: 'danger.solidBg', opacity: 0.8 }} />
            <Typography level='body-sm' fontWeight={600} sx={{ color: 'text.secondary' }}>
              <Skeleton loading={loading} variant='text' width='1ch'>
                {stats.dueToday}
              </Skeleton>{' '}
              <Typography component='span' fontWeight={400} sx={{ color: 'text.tertiary' }}>
                {t('cards.dueToday')}
              </Typography>
            </Typography>
          </Box>
          <Typography sx={{ color: 'divider' }}>•</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <GridView sx={{ fontSize: 16, color: 'neutral.solidBg', opacity: 0.8 }} />
            <Typography level='body-sm' fontWeight={600} sx={{ color: 'text.secondary' }}>
              <Skeleton loading={loading} variant='text' width='2ch'>
                {stats.totalCards}
              </Skeleton>{' '}
              <Typography component='span' fontWeight={400} sx={{ color: 'text.tertiary' }}>
                {t('cards.totalCards')}
              </Typography>
            </Typography>
          </Box>
          <Typography sx={{ color: 'divider' }}>•</Typography>
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

        <Box sx={{ maxWidth: 640, mx: 'auto' }}>
          {decks.length > 0 || cards.length > 0 ? (
            <Input
              size='lg'
              placeholder={t('cards.manage_content.search.decks', 'Search decks and cards...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startDecorator={<Search sx={{ color: 'text.tertiary', ml: 1 }} />}
              endDecorator={
                <Stack direction='row' spacing={1} alignItems='center' sx={{ mr: 0.5 }}>
                  {searchQuery && (
                    <IconButton size='sm' variant='plain' color='neutral' onClick={() => setSearchQuery('')} sx={{ borderRadius: '50%' }}>
                      <Close sx={{ fontSize: 20 }} />
                    </IconButton>
                  )}
                  <Tooltip title={t('cards.studyCenter')} size='sm'>
                    <IconButton
                      size='sm'
                      variant='soft'
                      color='primary'
                      onClick={() => navigate('/study')}
                      sx={{ borderRadius: 'md', display: { xs: 'none', sm: 'inline-flex' } }}
                    >
                      <TrendingUp sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Button
                    size='sm'
                    variant='solid'
                    color='primary'
                    onClick={() => setShowCreateDeck(true)}
                    sx={{ borderRadius: 'md', fontWeight: 600 }}
                  >
                    {t('cards.newDeck')}
                  </Button>
                  <Button
                    size='sm'
                    variant='outlined'
                    color='primary'
                    onClick={() => {
                      setEditingCard(null)
                      setShowCreateCard(true)
                    }}
                    sx={{ borderRadius: 'md', fontWeight: 600, display: { xs: 'none', sm: 'inline-flex' } }}
                  >
                    {t('cards.newCard', 'New Card')}
                  </Button>
                </Stack>
              }
              sx={{
                width: '100%',
                borderRadius: 'xl',
                boxShadow: 'sm',
                bgcolor: 'rgba(var(--joy-palette-background-surfaceChannel) / 0.8)',
                backdropFilter: 'blur(12px)',
                '--Input-focusedThickness': '2px',
                p: 0.75,
                pl: 1
              }}
            />
          ) : (
            <Stack direction='row' spacing={2} justifyContent='center'>
              <Button
                size='lg'
                onClick={() => setShowCreateDeck(true)}
                startDecorator={<Add />}
                sx={{ borderRadius: 'lg', px: 4, boxShadow: 'sm' }}
              >
                {t('cards.newDeck')}
              </Button>
            </Stack>
          )}
        </Box>
      </Box>

      {/* Minimal spacer since the gigantic stat box has been integrated into the Hero natively */}
      <Box sx={{ mb: 2 }} />

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
          searchQuery={searchQuery}
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

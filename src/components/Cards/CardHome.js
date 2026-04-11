import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Container, Snackbar } from '@mui/joy'
import StyleRoundedIcon from '@mui/icons-material/StyleRounded'
import CreateDeckModal from './CreateDeckModal'
import CreateCardModal from './CreateCardModal'
import CardPreviewModal from './CardPreviewModal'
import ManageContent from './ManageContent'
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal'
import ImportDeckModal from './ImportDeckModal'
import DeckSettingsModal from '../Study/DeckSettingsModal'
import DeckPublishSheet from '../Study/DeckPublishSheet'
import { decksService, cardsService } from '../../api/services'
import { useCardData } from '../../hooks/useCardData'
import { useStatistics } from '../../hooks/useStatistics'
import { useDeckData } from '../../hooks/useDeckData'
import { apiCache } from '../../api/utils/cache'

export default function CardHome({ onDeckChange } = {}) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  // State
  const [decks, setDecks] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDeck, setShowCreateDeck] = useState(false)
  const [showImportDeck, setShowImportDeck] = useState(false)
  const [showCreateCard, setShowCreateCard] = useState(false)
  const [editingDeck, setEditingDeck] = useState(null)
  const [editingCard, setEditingCard] = useState(null)
  const [deletingDeck, setDeletingDeck] = useState(null)
  const [deletingCard, setDeletingCard] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [errorSnackbar, setErrorSnackbar] = useState(null)
  const [selectedTags, setSelectedTags] = useState([])
  const [availableTags, setAvailableTags] = useState([])
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [previewState, setPreviewState] = useState({
    open: false,
    title: '',
    cards: [],
    initialIndex: 0
  })
  const [deckSettingsState, setDeckSettingsState] = useState({ open: false, deckId: null })
  const [publishSheetState, setPublishSheetState] = useState({ open: false, deckId: null, deck: null })

  // Stats
  const [stats, setStats] = useState({
    dueToday: 0,
    streak: 0,
    totalCards: 0
  })

  // Debounce search so we don't fire an API call on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const {
    cards: hookCards,
    total: hookTotal,
    hasMore: hookHasMore,
    loading: cardsLoading,
    reload: reloadCards,
    fetchMore: reloadFetchMore
  } = useCardData(selectedTags, debouncedSearch)
  const { statistics: hookStats, loading: statsLoading } = useStatistics()
  const { decks: hookDecks, loading: decksLoading, reload: reloadDecks } = useDeckData()

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      const decksData = hookDecks || []

      const decksWithDueCount = decksData.map((deck) => {
        return {
          ...deck,
          due_cards: deck.due_cards || 0,
          total_cards: deck.total_cards || 0,
          has_cards: (deck.total_cards || 0) > 0
        }
      })

      setDecks(decksWithDueCount)
      setCards(hookCards)

      // Use global stats (already accurate from backend)
      const summary = hookStats?.summary || {}

      setStats({
        dueToday: summary.due_today || 0,
        streak: summary.current_streak || 0,
        totalCards: summary.total_cards || 0
      })

      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }, [hookDecks, hookCards, hookStats])

  useEffect(() => {
    if (cardsLoading || statsLoading || decksLoading) return
    fetchData()
  }, [cardsLoading, statsLoading, decksLoading, fetchData])

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

  const handlePublishDeck = (deck) => {
    setPublishSheetState({ open: true, deckId: deck._id, deck })
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
    <Container maxWidth='xl' sx={{ py: 0 }}>
      <ManageContent
        decks={decks}
        cards={cards}
        totalCards={hookTotal}
        hasMore={hookHasMore}
        onLoadMore={reloadFetchMore}
        loading={loading}
        searchQuery={searchQuery}
        onStudy={handleStudy}
        onPreview={handlePreview}
        onEditDeck={handleEditDeck}
        onDeleteDeck={handleDeleteDeck}
        onEditCard={handleEditCard}
        onDeleteCard={handleDeleteCard}
        onAddCard={(deck) => {
          setEditingCard({ deck_id: deck._id })
          setShowCreateCard(true)
        }}
        availableTags={availableTags}
        selectedTags={selectedTags}
        onTagToggle={(tag) => setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))}
        onClearTags={() => setSelectedTags([])}
        onSearchChange={setSearchQuery}
        onImport={() => setShowImportDeck(true)}
        onNewCard={() => {
          setEditingCard(null)
          setShowCreateCard(true)
        }}
        onNewDeck={() => setShowCreateDeck(true)}
        onDeckSettings={(deck) => setDeckSettingsState({ open: true, deckId: deck._id })}
        onPublishDeck={handlePublishDeck}
      />

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

      {showImportDeck && (
        <ImportDeckModal
          open={showImportDeck}
          onClose={() => setShowImportDeck(false)}
          onImported={() => {
            reloadDecks()
            reloadCards()
            apiCache.invalidate('cards:statistics')
            onDeckChange?.()
            setShowImportDeck(false)
          }}
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

      <DeckSettingsModal
        open={deckSettingsState.open}
        onClose={() => setDeckSettingsState({ open: false, deckId: null })}
        deckId={deckSettingsState.deckId}
        onSaved={() => {
          reloadDecks()
          onDeckChange?.()
        }}
      />

      <DeckPublishSheet
        open={publishSheetState.open}
        onClose={() => setPublishSheetState({ open: false, deckId: null, deck: null })}
        deckId={publishSheetState.deckId}
        deck={publishSheetState.deck}
        onPublished={() => {
          setPublishSheetState({ open: false, deckId: null, deck: null })
          reloadDecks()
        }}
      />

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

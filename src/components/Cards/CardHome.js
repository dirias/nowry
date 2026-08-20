import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Container, Snackbar } from '@mui/joy'
import StyleRoundedIcon from '@mui/icons-material/StyleRounded'
import DeckCreateSheet from './DeckCreateSheet'
import CreateCardModal from './CreateCardModal'
import ManageContent from './ManageContent'
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal'
import ImportDeckModal from './ImportDeckModal'
import DeckSettingsModal from '../Study/DeckSettingsModal'
import DeckPublishSheet from '../Study/DeckPublishSheet'
import StudyModePickerModal from '../Study/StudyModePickerModal'
import { decksService, cardsService } from '../../api/services'
import { useCardData } from '../../hooks/useCardData'
import { useStatistics } from '../../hooks/useStatistics'
import { useDeckData } from '../../hooks/useDeckData'
import { apiCache } from '../../api/utils/cache'

export default function CardHome() {
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
  const [editingCard, setEditingCard] = useState(null)
  const [deletingDeck, setDeletingDeck] = useState(null)
  const [deletingCard, setDeletingCard] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [errorSnackbar, setErrorSnackbar] = useState(null)
  const [selectedTags, setSelectedTags] = useState([])
  const [availableTags, setAvailableTags] = useState([])
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [deckSettingsState, setDeckSettingsState] = useState({ open: false, deckId: null, section: 'study' })
  const [publishSheetState, setPublishSheetState] = useState({ open: false, deckId: null, deck: null })
  const [modePickerState, setModePickerState] = useState({ open: false, deck: null })

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
    setModePickerState({ open: true, deck })
  }

  // Closing is the sheet's decision, not this one's: `Save & next` reports a
  // saved card and stays open for the next one. Closing here would end the
  // authoring loop on its first iteration.
  const handleCardSaved = () => {
    reloadCards() // Force a fresh fetch so the new/edited card appears
  }

  const handleDeckSaved = () => {
    // Invalidates the shared React Query cache entry, which every mounted
    // useDeckData() instance (including StudyCenter's Dashboard tab) is
    // subscribed to — no manual cross-component notification needed (ADR-008).
    reloadDecks()
    fetchData() // Re-derive local state now; the useDeckData effect also re-runs once hookDecks updates
  }

  // Editing a deck is editing a deck, whichever field it is. It used to open a
  // different modal from the one holding the same deck's pace and voice
  // settings, with no route between them; both now land in settings, on the
  // section the user asked for.
  const handleEditDeck = (deck) => {
    setDeckSettingsState({ open: true, deckId: deck._id, section: 'identity' })
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
        onDeckSettings={(deck) => setDeckSettingsState({ open: true, deckId: deck._id, section: 'study' })}
        onPublishDeck={handlePublishDeck}
      />

      {/* Modals */}
      {showCreateDeck && (
        <DeckCreateSheet
          open={showCreateDeck}
          onClose={() => setShowCreateDeck(false)}
          onSaved={handleDeckSaved}
          // A deck's value moment is its first card, so creation continues
          // into card authoring pre-targeted to the deck it just made.
          onAddCards={(deck) => {
            setShowCreateDeck(false)
            setEditingCard({ deck_id: deck._id })
            setShowCreateCard(true)
          }}
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
        onClose={() => setDeckSettingsState({ open: false, deckId: null, section: 'study' })}
        deckId={deckSettingsState.deckId}
        initialSection={deckSettingsState.section}
        onSaved={reloadDecks}
      />

      <StudyModePickerModal
        open={modePickerState.open}
        onClose={() => setModePickerState({ open: false, deck: null })}
        deck={modePickerState.deck || {}}
        onSelectMode={(mode) => {
          navigate(`/study/${modePickerState.deck._id}?mode=${mode}`)
          setModePickerState({ open: false, deck: null })
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

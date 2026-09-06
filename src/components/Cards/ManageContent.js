import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Button, Skeleton, Typography } from '@mui/joy'
import { patchCardInCache } from '../../api/cardCache'
import CardPreviewModal from './CardPreviewModal'
import DeckAnalysisPanel from './DeckAnalysisPanel'
import DeckActionsMenu from './DeckActionsMenu'
import DeckTile from './DeckTile'
import CardRow from './CardRow'
import LibraryToolbar, { LIBRARY_TABS } from './LibraryToolbar'
import TagsView from './TagsView'
import DeckRow from '../Study/DeckRow'
import { useSubscription } from '../../hooks/useSubscription'
import { useSubscriptionContext } from '../../context/SubscriptionContext'

const VIEW_MODE_KEY = 'nowry_deck_view_mode'

/**
 * The library (docs/prd-study-center.md D3, D5, US-003): one toolbar row, then
 * the decks as tiles or rows, or the cards as rows. Filters are menus off
 * their segments; nothing here ever moves the list.
 *
 * `cards` and `decks` are the owner's (CardHome) — server-filtered by search,
 * tags and the mark; only the type filter is local. The tab lives in the URL
 * (`?tab=cards`) so it is linkable and a phone's back control works.
 */
export default function ManageContent({
  decks,
  cards,
  loading = false,
  onEditDeck,
  onDeleteDeck,
  onEditCard,
  onDeleteCard,
  onAddCard,
  onStudy,
  onBrowse,
  searchQuery,
  totalCards = 0,
  hasMore = false,
  onLoadMore,
  availableTags = [],
  selectedTags = [],
  onTagToggle,
  onClearTags,
  markedOnly = false,
  onMarkedOnlyToggle,
  onSearchChange,
  onImport,
  onNewCard,
  onNewDeck,
  onDeckSettings,
  onPublishDeck
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { tier } = useSubscription()
  const { openUpgradeModal } = useSubscriptionContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = LIBRARY_TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'decks'
  const setTab = useCallback(
    (next) => {
      const params = new URLSearchParams(searchParams)
      if (next === 'decks') params.delete('tab')
      else params.set('tab', next)
      if (next !== 'tags') params.delete('group')
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const [filterType, setFilterType] = useState('all')
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(VIEW_MODE_KEY) || 'grid')
  const [activeDeckAnalysis, setActiveDeckAnalysis] = useState(null)
  const [previewState, setPreviewState] = useState({ open: false, cards: [], initialIndex: 0 })

  const handleViewChange = (mode) => {
    setViewMode(mode)
    localStorage.setItem(VIEW_MODE_KEY, mode)
  }

  // A row or the preview reports a mark into the React Query cache, which
  // re-renders every subscriber (ADR-008); `cards` is the owner's prop.
  const handleMarkChange = useCallback((cardId, markedAt) => {
    patchCardInCache(cardId, { marked_at: markedAt })
  }, [])

  const openStudy = useCallback((deck) => (onStudy ? onStudy(deck) : navigate(`/study/${deck._id}?mode=study`)), [navigate, onStudy])
  const openBrowse = useCallback((deck) => (onBrowse ? onBrowse(deck) : navigate(`/study/${deck._id}?mode=browse`)), [navigate, onBrowse])

  const filteredDecks = useMemo(() => {
    const query = (searchQuery || '').toLowerCase()
    return decks.filter((deck) => {
      const orGroups = query.split(',')
      const matchesSearch = orGroups.some((group) => {
        const terms = group.trim().split(/\s+/).filter(Boolean)
        if (terms.length === 0) return false
        return terms.every((term) => deck.name.toLowerCase().includes(term) || deck.tags?.some((tag) => tag.toLowerCase().includes(term)))
      })
      const deckTypeKey = deck.deck_type || 'flashcard'
      const matchesType = filterType === 'all' || deckTypeKey === filterType
      const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => deck.tags?.includes(tag))
      return (query.trim() === '' || matchesSearch) && matchesType && matchesTags
    })
  }, [decks, searchQuery, filterType, selectedTags])

  // Cards are filtered server-side (search + tags + mark via useCardData); only
  // the local type filter applies to what the API returned.
  const filteredCards = useMemo(
    () => cards.filter((card) => filterType === 'all' || (card.card_type || 'flashcard') === filterType),
    [cards, filterType]
  )

  const deckName = (deckId) => decks.find((d) => d._id === deckId || d._id === deckId?._id)?.name || '—'

  const handlePreviewCard = (card) => {
    const index = filteredCards.findIndex((c) => c._id === card._id)
    setPreviewState({ open: true, cards: filteredCards, initialIndex: index !== -1 ? index : 0 })
  }

  const filtersActive = filterType !== 'all' || selectedTags.length > 0 || markedOnly || Boolean(searchQuery)
  const clearAllFilters = useCallback(() => {
    setFilterType('all')
    onClearTags?.()
    if (markedOnly) onMarkedOnlyToggle?.()
    onSearchChange?.('')
  }, [markedOnly, onClearTags, onMarkedOnlyToggle, onSearchChange])

  const deckActions = (deck) => (
    <DeckActionsMenu
      deck={deck}
      className='deck-tile-actions'
      onAddCard={onAddCard}
      onDeckSettings={onDeckSettings}
      onEditDeck={onEditDeck}
      onPublishDeck={onPublishDeck}
      onAnalyzeDeck={(id) => setActiveDeckAnalysis((prev) => (prev === id ? null : id))}
      onDeleteDeck={onDeleteDeck}
      tier={tier}
      openUpgradeModal={openUpgradeModal}
    />
  )

  const emptyState = (kind) => (
    <Box sx={{ py: 8, textAlign: 'center' }}>
      <Typography level='title-md' sx={{ mb: 0.5, color: 'text.secondary' }}>
        {t(`cards.manage_content.empty.${kind}.title`)}
      </Typography>
      <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
        {filtersActive ? t(`cards.manage_content.empty.${kind}.filter`) : t(`cards.manage_content.empty.${kind}.start`)}
      </Typography>
      {filtersActive && (
        <Button variant='soft' color='neutral' size='sm' sx={{ mt: 2 }} onClick={clearAllFilters}>
          {t('filters.clearAll')}
        </Button>
      )}
    </Box>
  )

  return (
    <Box>
      <LibraryToolbar
        tab={tab}
        onTab={setTab}
        decksCount={decks.length}
        cardsCount={totalCards || cards.length}
        tagsCount={availableTags.length + 2}
        search={searchQuery}
        onSearch={onSearchChange}
        filterType={filterType}
        onFilterType={setFilterType}
        availableTags={availableTags}
        selectedTags={selectedTags}
        onTagToggle={onTagToggle}
        onClearTags={onClearTags}
        markedOnly={markedOnly}
        onMarkedOnlyToggle={onMarkedOnlyToggle}
        viewMode={viewMode}
        onViewMode={handleViewChange}
        onNewDeck={onNewDeck}
        onNewCard={onNewCard}
        onImport={onImport}
      />

      {tab === 'decks' && (
        <Box>
          {loading ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  md: 'repeat(3, minmax(0, 1fr))',
                  lg: 'repeat(4, minmax(0, 1fr))'
                },
                gap: 2
              }}
            >
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} variant='rectangular' height={96} sx={{ borderRadius: 'md' }} />
              ))}
            </Box>
          ) : filteredDecks.length === 0 ? (
            emptyState('decks')
          ) : viewMode === 'grid' ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  md: 'repeat(3, minmax(0, 1fr))',
                  lg: 'repeat(4, minmax(0, 1fr))'
                },
                gap: 2
              }}
            >
              {filteredDecks.map((deck) => (
                <React.Fragment key={deck._id}>
                  <DeckTile deck={deck} onStudy={openStudy} onBrowse={openBrowse} actions={deckActions(deck)} />
                  {activeDeckAnalysis === deck._id && (
                    <Box sx={{ gridColumn: '1 / -1' }}>
                      <DeckAnalysisPanel deckId={String(deck._id)} onClose={() => setActiveDeckAnalysis(null)} />
                    </Box>
                  )}
                </React.Fragment>
              ))}
            </Box>
          ) : (
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
              {filteredDecks.map((deck) => (
                <React.Fragment key={deck._id}>
                  <DeckRow deck={deck} onStudy={openStudy} onBrowse={openBrowse} trailing={deckActions(deck)} />
                  {activeDeckAnalysis === deck._id && (
                    <DeckAnalysisPanel deckId={String(deck._id)} onClose={() => setActiveDeckAnalysis(null)} />
                  )}
                </React.Fragment>
              ))}
            </Box>
          )}
        </Box>
      )}

      {tab === 'cards' && (
        <Box>
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} variant='rectangular' height={52} sx={{ borderRadius: 'md' }} />
              ))}
            </Box>
          ) : filteredCards.length === 0 ? (
            emptyState('cards')
          ) : (
            <>
              <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                {filteredCards.map((card) => (
                  <CardRow
                    key={card._id}
                    card={card}
                    deckName={deckName(card.deck_id)}
                    onPreview={handlePreviewCard}
                    onEdit={onEditCard}
                    onDelete={onDeleteCard}
                    onMarkChange={handleMarkChange}
                  />
                ))}
              </Box>
              {hasMore && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', pb: 4 }}>
                  <Button variant='soft' color='neutral' size='sm' onClick={onLoadMore} loading={loading}>
                    {t('common.loadMore')}
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      )}

      {tab === 'tags' && (
        <TagsView
          decks={decks}
          search={searchQuery}
          onEditCard={onEditCard}
          onDeleteCard={onDeleteCard}
          onPreviewCards={(list, index) => setPreviewState({ open: true, cards: list, initialIndex: index !== -1 ? index : 0 })}
        />
      )}

      <CardPreviewModal
        open={previewState.open}
        onClose={() => setPreviewState((prev) => ({ ...prev, open: false }))}
        title={t('cards.deck.preview')}
        cards={previewState.cards}
        initialIndex={previewState.initialIndex}
        decks={decks}
        onMarkChange={handleMarkChange}
      />
    </Box>
  )
}

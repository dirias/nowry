import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Button, Skeleton, Typography } from '@mui/joy'
import { patchCardInCache } from '../../api/cardCache'
import CardPreviewModal from './CardPreviewModal'
import DeckAnalysisPanel from './DeckAnalysisPanel'
import DeckActionsMenu from './DeckActionsMenu'
import DeckTile from './DeckTile'
import ArchivedDecks from './ArchivedDecks'
import CardRow from './CardRow'
import LibraryToolbar, { LIBRARY_TABS } from './LibraryToolbar'
import SelectionBar from './SelectionBar'
import BulkActionOverlays from './BulkActionOverlays'
import { useCardSelection } from './useCardSelection'
import { useBulkCardActions } from './useBulkCardActions'
import TagsView from './TagsView'
import DeckRow from '../Study/DeckRow'
import { useGroups } from '../../hooks/useGroups'
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
 *
 * A selection on the Cards view swaps the toolbar for the selection bar in
 * place (PRD D16, ADR-023 point 2); the bulk verbs run through one hook and
 * open their surfaces here. A row's Move to… is the same move for one card.
 */
export default function ManageContent({
  decks,
  cards,
  loading = false,
  onEditDeck,
  onArchiveDeck,
  onRestoreDeck,
  onDeleteDeck,
  onEditCard,
  onEditTags,
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
  untagged = false,
  onUntaggedToggle,
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

  // The groups index carries the untagged count the No tag row reads (PRD D15,
  // NFR performance): it loads once Cards or Tags is engaged, never for Decks.
  const { groups } = useGroups({ enabled: tab !== 'decks' })
  const untaggedCount = groups?.untagged?.cards ?? 0

  // The selection lives on the Cards view only; a tab change ends it.
  const selection = useCardSelection()
  const { clear: clearSelection } = selection
  useEffect(() => {
    clearSelection()
  }, [tab, clearSelection])
  // Tag ▾ is a multi-pick, so a tag or untag keeps the selection for the next
  // pick and the tri-state reads back; every other verb clears it (US-009).
  const afterBulk = useCallback(
    (action) => {
      if (action !== 'tag' && action !== 'untag') clearSelection()
    },
    [clearSelection]
  )
  const bulk = useBulkCardActions({ onDone: afterBulk })

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

  const selectedCards = useMemo(() => filteredCards.filter((card) => selection.isSelected(card._id)), [filteredCards, selection])
  const selectedIds = selectedCards.map((card) => card._id)
  const selecting = tab === 'cards' && selection.selecting
  // A card that left the view — a filter, a refetch after a verb — leaves the
  // selection with it, so the bar never counts what is not on screen.
  const { retain } = selection
  useEffect(() => {
    retain(filteredCards.map((card) => card._id))
  }, [filteredCards, retain])

  const handlePreviewCard = (card) => {
    const index = filteredCards.findIndex((c) => c._id === card._id)
    setPreviewState({ open: true, cards: filteredCards, initialIndex: index !== -1 ? index : 0 })
  }

  const filtersActive = filterType !== 'all' || selectedTags.length > 0 || untagged || markedOnly || Boolean(searchQuery)
  const clearAllFilters = useCallback(() => {
    setFilterType('all')
    onClearTags?.() // the owner clears the tags and No tag together
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
      onArchiveDeck={onArchiveDeck}
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
      {selecting ? (
        <SelectionBar
          selectedCards={selectedCards}
          total={filteredCards.length}
          availableTags={availableTags}
          onClear={selection.clear}
          onSelectAll={() => selection.selectAll(filteredCards.map((card) => card._id))}
          onMove={() => bulk.requestMove(selectedIds)}
          onTag={(tag) => bulk.run('tag', selectedIds, { tags: [tag] })}
          onUntag={(tag) => bulk.run('untag', selectedIds, { tags: [tag] })}
          onMark={() => bulk.run('mark', selectedIds)}
          onUnmark={() => bulk.run('unmark', selectedIds)}
          onDelete={() => bulk.requestDelete(selectedIds)}
        />
      ) : (
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
          untagged={untagged}
          untaggedCount={untaggedCount}
          onUntaggedToggle={onUntaggedToggle}
          markedOnly={markedOnly}
          onMarkedOnlyToggle={onMarkedOnlyToggle}
          viewMode={viewMode}
          onViewMode={handleViewChange}
          onNewDeck={onNewDeck}
          onNewCard={onNewCard}
          onImport={onImport}
        />
      )}

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
          {/* The foot of the Decks view in both layouts (PRD D18): absent at zero. */}
          <Box sx={{ mt: 3 }}>
            <ArchivedDecks onRestore={onRestoreDeck} />
          </Box>
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
                    onMove={(c) => bulk.requestMove([c._id])}
                    onEditTags={onEditTags}
                    onDelete={onDeleteCard}
                    onMarkChange={handleMarkChange}
                    selectable
                    selected={selection.isSelected(card._id)}
                    selecting={selection.selecting}
                    onSelect={(c) => selection.toggle(c._id)}
                    longPressHandlers={selection.longPressHandlers}
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
          availableTags={availableTags}
          onEditCard={onEditCard}
          onEditTags={onEditTags}
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
      <BulkActionOverlays actions={bulk} decks={decks} />
    </Box>
  )
}

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  IconButton,
  Chip,
  ChipDelete,
  Button,
  Stack,
  Input,
  Tooltip,
  Card,
  Skeleton,
  Sheet,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  tabClasses,
  Grid,
  Table,
  Dropdown,
  Menu,
  MenuButton,
  MenuItem
} from '@mui/joy'
import {
  Edit,
  Delete,
  Add,
  Style,
  Quiz as QuizIcon,
  AccountTree,
  LocalOffer,
  Search,
  Visibility,
  Event,
  School,
  MoreVert,
  GridView,
  ViewList,
  FilterAlt,
  FileUpload,
  Settings
} from '@mui/icons-material'
import CardPreviewModal from './CardPreviewModal'

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
  onPreview,
  searchQuery,
  totalCards = 0,
  hasMore = false,
  onLoadMore,
  availableTags = [],
  selectedTags = [],
  onTagToggle,
  onClearTags,
  onSearchChange,
  onImport,
  onNewCard,
  onNewDeck,
  onDeckSettings
}) {
  const { t } = useTranslation()
  const [activeView, setActiveView] = useState(0) // 0 = Decks, 1 = Cards
  const [filterType, setFilterType] = useState('all')
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('nowry_deck_view_mode') || 'grid'
  })
  const [filterOpen, setFilterOpen] = useState(false)

  const handleViewChange = (mode) => {
    setViewMode(mode)
    localStorage.setItem('nowry_deck_view_mode', mode)
  }

  // Preview State
  const [previewState, setPreviewState] = useState({
    open: false,
    title: '',
    cards: [],
    initialIndex: 0
  })

  const handleClosePreview = () => {
    setPreviewState((prev) => ({ ...prev, open: false }))
  }

  const handlePreviewDeck = (deck) => {
    const deckCards = getCardsForDeck(deck._id)
    setPreviewState({
      open: true,
      title: deck.name,
      cards: deckCards,
      initialIndex: 0
    })
  }

  const handlePreviewCard = (card) => {
    // Find index of card in current filtered list
    const index = filteredCards.findIndex((c) => c._id === card._id)
    setPreviewState({
      open: true,
      title: t('cards.deck.preview'),
      cards: filteredCards,
      initialIndex: index !== -1 ? index : 0
    })
  }

  const getDeckIcon = (type) => {
    switch (type) {
      case 'quiz':
        return <QuizIcon fontSize='small' />
      case 'visual':
        return <AccountTree fontSize='small' />
      default:
        return <Style fontSize='small' />
    }
  }

  const getDeckColor = (type) => {
    switch (type) {
      case 'quiz':
        return 'warning'
      case 'visual':
        return 'info'
      default:
        return 'primary'
    }
  }

  const getCardTypeLabel = (type) => {
    switch (type) {
      case 'quiz':
        return t('cards.manage_content.filters.quizzes')
      case 'visual':
        return t('cards.manage_content.filters.visual')
      default:
        return t('cards.manage_content.filters.flashcards')
    }
  }

  const getDeckName = (deckId) => {
    const deck = decks.find((d) => d._id === deckId || d._id === deckId?._id)
    return deck?.name || '—'
  }

  const getCardsForDeck = (deckId) => {
    return cards.filter((card) => card.deck_id === deckId || card.deck_id?._id === deckId)
  }

  // Filter decks
  const filteredDecks = decks.filter((deck) => {
    const query = searchQuery.toLowerCase()

    // Split by comma for OR condition
    const orGroups = query.split(',')

    // Check if matches ANY of the comma-separated groups
    const matchesSearch = orGroups.some((group) => {
      const terms = group.trim().split(/\s+/).filter(Boolean)
      if (terms.length === 0) return false // Ignore empty groups

      // Check if ALL terms in this group match (Name OR Tags)
      return terms.every((term) => deck.name.toLowerCase().includes(term) || deck.tags?.some((tag) => tag.toLowerCase().includes(term)))
    })

    const deckType = deck.deck_type || 'flashcard'
    const matchesType = filterType === 'all' || deckType === filterType
    return (searchQuery.trim() === '' || matchesSearch) && matchesType
  })

  // Cards are filtered server-side (search + tags via useCardData).
  // Only apply the local card-type filter on what the API returned.
  const filteredCards = cards.filter((card) => {
    const cardType = card.card_type || 'flashcard'
    return filterType === 'all' || cardType === filterType
  })

  const filters = [
    { key: 'all', label: t('cards.manage_content.filters.all'), color: 'neutral' },
    { key: 'flashcard', label: t('cards.manage_content.filters.flashcards'), color: 'primary' },
    { key: 'quiz', label: t('cards.manage_content.filters.quizzes'), color: 'warning' },
    { key: 'visual', label: t('cards.manage_content.filters.visual'), color: 'success' }
  ]

  const activeFilterCount = (filterType !== 'all' ? 1 : 0) + selectedTags.length

  return (
    <Box>
      {/* Premium Segmented Control for Sub-Views + Action Buttons */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent='space-between'
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Tabs
          value={activeView}
          onChange={(e, val) => setActiveView(val)}
          sx={{
            bgcolor: 'transparent'
          }}
        >
          <TabList
            disableUnderline
            sx={{
              p: 0.5,
              gap: 1,
              borderRadius: 'xl',
              bgcolor: 'background.level1',
              display: 'inline-flex',
              boxShadow: { xs: 'none', sm: 'inset 0 1px 2px var(--joy-palette-neutral-softBg)' },
              border: { xs: '1px solid', sm: 'none' },
              borderColor: 'divider',
              [`& .${tabClasses.root}`]: {
                minWidth: { xs: 80, sm: 120, md: 140 },
                fontWeight: 600,
                color: 'text.secondary',
                py: 1,
                px: 2,
                borderRadius: 'lg',
                border: 'none',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.27)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                '&:hover': {
                  bgcolor: 'background.level2',
                  color: 'text.primary'
                },
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.solidBg',
                  outlineOffset: '-2px'
                },
                boxShadow: 'none'
              },
              [`& .${tabClasses.root}[aria-selected="true"]`]: {
                color: 'primary.plainColor',
                bgcolor: 'background.surface',
                boxShadow: 'sm'
              }
            }}
          >
            <Tab disableIndicator aria-label={t('cards.manage_content.aria.decks', 'View Decks')}>
              <Typography level='title-sm' sx={{ fontWeight: 700, color: 'inherit', fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>
                {t('cards.manage_content.tabs.decksOnly', 'Decks')}
              </Typography>
              <Chip
                size='sm'
                variant={activeView === 0 ? 'solid' : 'soft'}
                color={activeView === 0 ? 'primary' : 'neutral'}
                sx={{ borderRadius: 'xl', fontWeight: 700, fontSize: '0.7rem', px: 1, height: 20 }}
              >
                {decks.length}
              </Chip>
            </Tab>
            <Tab disableIndicator aria-label={t('cards.manage_content.aria.cards', 'View Cards')}>
              <Typography level='title-sm' sx={{ fontWeight: 700, color: 'inherit', fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>
                {t('cards.manage_content.tabs.cardsOnly', 'Cards')}
              </Typography>
              <Chip
                size='sm'
                variant={activeView === 1 ? 'solid' : 'soft'}
                color={activeView === 1 ? 'primary' : 'neutral'}
                sx={{ borderRadius: 'xl', fontWeight: 700, fontSize: '0.7rem', px: 1, height: 20 }}
              >
                {totalCards || cards.length}
              </Chip>
            </Tab>
          </TabList>
        </Tabs>

        {/* Action Buttons */}
        <Stack direction='row' spacing={1} alignItems='center' justifyContent={{ xs: 'center', sm: 'flex-end' }}>
          <Tooltip title={t('cards.import.label')} size='sm'>
            <IconButton
              size='sm'
              variant='plain'
              color='neutral'
              onClick={onImport}
              aria-label={t('cards.import.label')}
              sx={{
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.solidBg' }
              }}
            >
              <FileUpload fontSize='small' />
            </IconButton>
          </Tooltip>
          <Button
            size='sm'
            variant='plain'
            color='neutral'
            onClick={onNewCard}
            aria-label={t('cards.newCard')}
            sx={{
              borderRadius: 'lg',
              fontWeight: 600,
              fontSize: '0.8rem',
              px: 1.5,
              '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.solidBg' }
            }}
          >
            {t('cards.newCard')}
          </Button>
          <Button
            size='sm'
            variant='solid'
            color='primary'
            onClick={onNewDeck}
            aria-label={t('cards.newDeck')}
            sx={{
              borderRadius: 'lg',
              fontWeight: 600,
              fontSize: '0.8rem',
              px: 1.5,
              '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.solidBg' }
            }}
          >
            {t('cards.newDeck')}
          </Button>
        </Stack>
      </Stack>

      {/* FilterBar */}
      <Stack direction='row' gap={1} alignItems='center' sx={{ mb: 1.5 }}>
        <Input
          size='md'
          placeholder={t('cards.manage_content.search.placeholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          startDecorator={<Search sx={{ opacity: 0.5 }} />}
          sx={{
            flex: 1,
            borderRadius: 'lg',
            boxShadow: 'none',
            '&:focus-within': { boxShadow: 'sm' }
          }}
          aria-label={t('cards.manage_content.aria.search')}
        />
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <IconButton
            size='md'
            variant={filterOpen ? 'solid' : activeFilterCount > 0 ? 'soft' : 'outlined'}
            color={activeFilterCount > 0 ? 'primary' : 'neutral'}
            onClick={() => setFilterOpen((v) => !v)}
            aria-label={t('filters.toggle')}
            aria-expanded={filterOpen}
            sx={{
              borderRadius: 'lg',
              minWidth: 40,
              '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.solidBg', outlineOffset: '2px' }
            }}
          >
            <FilterAlt />
          </IconButton>
          {activeFilterCount > 0 && (
            <Chip
              size='sm'
              variant='solid'
              color='primary'
              sx={{ position: 'absolute', top: -6, right: -6, minWidth: 16, height: 16, fontSize: '0.65rem', p: 0, pointerEvents: 'none' }}
            >
              {activeFilterCount}
            </Chip>
          )}
        </Box>
        {activeView === 0 && (
          <Stack direction='row' spacing={0.5} sx={{ display: { xs: 'none', sm: 'flex' }, flexShrink: 0 }}>
            <IconButton
              size='sm'
              variant={viewMode === 'grid' ? 'solid' : 'plain'}
              color={viewMode === 'grid' ? 'primary' : 'neutral'}
              onClick={() => handleViewChange('grid')}
              sx={{
                borderRadius: 'md',
                transition: 'all 0.2s',
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.solidBg' }
              }}
              aria-label={t('cards.manage_content.aria.gridView')}
            >
              <GridView fontSize='small' />
            </IconButton>
            <IconButton
              size='sm'
              variant={viewMode === 'list' ? 'solid' : 'plain'}
              color={viewMode === 'list' ? 'primary' : 'neutral'}
              onClick={() => handleViewChange('list')}
              sx={{
                borderRadius: 'md',
                transition: 'all 0.2s',
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.solidBg' }
              }}
              aria-label={t('cards.manage_content.aria.listView')}
            >
              <ViewList fontSize='small' />
            </IconButton>
          </Stack>
        )}
      </Stack>

      {/* FilterPanel */}
      {filterOpen && (
        <Sheet variant='soft' sx={{ borderRadius: 'lg', p: 2, mb: 2, bgcolor: 'background.level1' }}>
          <Typography
            level='body-xs'
            sx={{ color: 'text.secondary', mb: 1, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}
          >
            {t('filters.type')}
          </Typography>
          <Stack direction='row' flexWrap='wrap' gap={1} sx={{ mb: activeView === 1 && availableTags.length > 0 ? 2 : 0 }}>
            {filters.map(({ key, label, color }) => (
              <Chip
                key={key}
                size='sm'
                variant={filterType === key ? 'solid' : 'soft'}
                color={filterType === key ? color : 'neutral'}
                onClick={() => setFilterType(key)}
                sx={{ cursor: 'pointer', '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.solidBg' } }}
                aria-pressed={filterType === key}
              >
                {label}
              </Chip>
            ))}
          </Stack>
          {activeView === 1 && availableTags.length > 0 && (
            <>
              <Typography
                level='body-xs'
                sx={{ color: 'text.secondary', mb: 1, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                {t('filters.tags')}
              </Typography>
              <Stack direction='row' flexWrap='wrap' gap={1}>
                <Chip
                  size='sm'
                  variant={selectedTags.length === 0 ? 'solid' : 'soft'}
                  color={selectedTags.length === 0 ? 'primary' : 'neutral'}
                  onClick={onClearTags}
                  sx={{ cursor: 'pointer', fontWeight: 600, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.solidBg' } }}
                  aria-pressed={selectedTags.length === 0}
                >
                  {t('cards.tags.all')}
                </Chip>
                {availableTags.map(({ tag, count }) => (
                  <Chip
                    key={tag}
                    size='sm'
                    variant={selectedTags.includes(tag) ? 'solid' : 'soft'}
                    color={selectedTags.includes(tag) ? 'primary' : 'neutral'}
                    onClick={() => onTagToggle(tag)}
                    endDecorator={
                      <Typography level='body-xs' sx={{ color: 'inherit', opacity: 0.7 }}>
                        {count}
                      </Typography>
                    }
                    sx={{ cursor: 'pointer', '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.solidBg' } }}
                    aria-pressed={selectedTags.includes(tag)}
                  >
                    {tag}
                  </Chip>
                ))}
              </Stack>
            </>
          )}
          {activeFilterCount > 0 && (
            <Button
              variant='plain'
              color='danger'
              size='sm'
              sx={{ mt: 1.5, px: 0 }}
              onClick={() => {
                setFilterType('all')
                onClearTags?.()
              }}
            >
              {t('filters.clearAll')}
            </Button>
          )}
        </Sheet>
      )}

      {/* ActiveFilterStrip */}
      {activeFilterCount > 0 && (
        <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mb: 2 }}>
          {filterType !== 'all' && (
            <Chip
              size='sm'
              variant='soft'
              color='primary'
              endDecorator={<ChipDelete onDelete={() => setFilterType('all')} aria-label={t('filters.remove.type')} />}
            >
              {filters.find((f) => f.key === filterType)?.label}
            </Chip>
          )}
          {selectedTags.map((tag) => (
            <Chip
              key={tag}
              size='sm'
              variant='soft'
              color='primary'
              endDecorator={<ChipDelete onDelete={() => onTagToggle(tag)} aria-label={t('filters.remove.tag', { tag })} />}
            >
              {tag}
            </Chip>
          ))}
          {activeFilterCount >= 2 && (
            <Button
              variant='plain'
              size='sm'
              color='neutral'
              sx={{ px: 0.5 }}
              onClick={() => {
                setFilterType('all')
                onClearTags?.()
              }}
            >
              {t('filters.clearAll')}
            </Button>
          )}
        </Stack>
      )}

      {/* Decks View */}
      {activeView === 0 && (
        <Box>
          {loading ? (
            <Stack spacing={1.5}>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} variant='rectangular' height={64} sx={{ borderRadius: 'md' }} />
              ))}
            </Stack>
          ) : filteredDecks.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography level='title-md' sx={{ mb: 0.5, color: 'text.secondary' }}>
                {t('cards.manage_content.empty.decks.title')}
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                {searchQuery || activeFilterCount > 0
                  ? t('cards.manage_content.empty.decks.filter')
                  : t('cards.manage_content.empty.decks.start')}
              </Typography>
              {activeFilterCount > 0 && (
                <Button
                  variant='plain'
                  size='sm'
                  color='primary'
                  sx={{ mt: 1 }}
                  onClick={() => {
                    setFilterType('all')
                    onClearTags?.()
                  }}
                >
                  {t('filters.clearAll')}
                </Button>
              )}
            </Box>
          ) : viewMode === 'grid' ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(auto-fill, minmax(160px, 1fr))',
                  md: 'repeat(auto-fill, minmax(200px, 1fr))'
                },
                gap: { xs: 1.5, sm: 2, md: 3 },
                justifyItems: 'center'
              }}
            >
              {filteredDecks.map((deck) => {
                const deckColor = getDeckColor(deck.deck_type)
                const cardCount = deck.total_cards || 0
                const gradient =
                  deck.deck_type === 'quiz'
                    ? 'linear-gradient(135deg, var(--joy-palette-warning-50) 0%, var(--joy-palette-warning-100) 100%)'
                    : deck.deck_type === 'visual'
                      ? 'linear-gradient(135deg, var(--joy-palette-info-50) 0%, var(--joy-palette-info-100) 100%)'
                      : 'linear-gradient(135deg, var(--joy-palette-primary-50) 0%, var(--joy-palette-primary-100) 100%)'

                return (
                  <DeckGridCard
                    key={deck._id}
                    deck={deck}
                    deckColor={deckColor}
                    cardCount={cardCount}
                    gradient={gradient}
                    getDeckIcon={getDeckIcon}
                    handlePreviewDeck={handlePreviewDeck}
                    onPreview={onPreview}
                    onEditDeck={onEditDeck}
                    onDeleteDeck={onDeleteDeck}
                    onStudy={onStudy}
                    onDeckSettings={onDeckSettings}
                    t={t}
                  />
                )
              })}
            </Box>
          ) : (
            <Stack spacing={1}>
              {filteredDecks.map((deck) => {
                const deckColor = getDeckColor(deck.deck_type)
                const cardCount = deck.total_cards || 0

                return (
                  <Card
                    key={deck._id}
                    variant='outlined'
                    onClick={() => handlePreviewDeck(deck)}
                    sx={{
                      transition: 'all 0.15s',
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.surface',
                      '&:hover': {
                        borderColor: 'neutral.outlinedBorder',
                        bgcolor: 'background.level1',
                        boxShadow: 'sm'
                      }
                    }}
                  >
                    <Box sx={{ py: 1.5, px: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                      {/* Icon */}
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 'sm',
                          bgcolor: `${deckColor}.softBg`,
                          color: `${deckColor}.solidBg`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {getDeckIcon(deck.deck_type)}
                      </Box>

                      {/* Name & Count */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          level='title-sm'
                          sx={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            mb: 0.25
                          }}
                        >
                          {deck.name}
                        </Typography>
                        <Typography level='body-xs' sx={{ color: 'text.tertiary', fontSize: '0.75rem' }}>
                          {t('cards.manage_content.cardCount', { count: cardCount })}
                        </Typography>
                      </Box>

                      {/* Type Label */}
                      <Chip
                        size='sm'
                        variant='soft'
                        color={deckColor}
                        sx={{
                          fontSize: '0.65rem',
                          height: 20,
                          px: 1,
                          fontWeight: 600,
                          flexShrink: 0,
                          display: { xs: 'none', sm: 'flex' }
                        }}
                      >
                        {deck.deck_type || 'flashcard'}
                      </Chip>

                      {/* Actions */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                        {deck.has_cards && (
                          <Button
                            size='sm'
                            variant={deck.due_cards > 0 || deck.new_cards > 0 ? 'solid' : 'soft'}
                            color={deck.due_cards > 0 ? 'primary' : deck.new_cards > 0 ? 'success' : 'neutral'}
                            onClick={() => onStudy?.(deck)}
                            startDecorator={<School sx={{ fontSize: 16 }} />}
                            sx={{ fontSize: '0.75rem', fontWeight: 600, px: 1.5, display: { xs: 'none', sm: 'flex' } }}
                          >
                            {deck.due_cards > 0
                              ? t('cards.studyDue', { count: deck.due_cards })
                              : deck.new_cards > 0
                                ? t('cards.studyNew', { count: deck.new_cards })
                                : t('cards.review', 'Review')}
                          </Button>
                        )}

                        {deck.has_cards && (
                          <IconButton
                            size='sm'
                            variant={deck.due_cards > 0 || deck.new_cards > 0 ? 'solid' : 'soft'}
                            color={deck.due_cards > 0 ? 'primary' : deck.new_cards > 0 ? 'success' : 'neutral'}
                            onClick={() => onStudy?.(deck)}
                            sx={{ display: { xs: 'flex', sm: 'none' } }}
                          >
                            <School sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}

                        <Tooltip title={t('cards.deck.addCard')} size='sm'>
                          <IconButton
                            size='sm'
                            variant='soft'
                            color='success'
                            onClick={() => onAddCard(deck)}
                            sx={{ minWidth: 32, minHeight: 32, display: { xs: 'none', sm: 'flex' } }}
                          >
                            <Add sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>

                        <Dropdown>
                          <MenuButton
                            slots={{ root: IconButton }}
                            slotProps={{
                              root: {
                                variant: 'plain',
                                color: 'neutral',
                                size: 'sm',
                                sx: { minWidth: 32, minHeight: 32 }
                              }
                            }}
                          >
                            <MoreVert sx={{ fontSize: 16 }} />
                          </MenuButton>
                          <Menu placement='bottom-end' size='sm'>
                            <MenuItem onClick={() => onPreview?.(deck)}>
                              <Visibility sx={{ fontSize: 16 }} /> {t('cards.preview')}
                            </MenuItem>
                            <MenuItem onClick={() => onAddCard(deck)}>
                              <Add sx={{ fontSize: 16 }} /> {t('cards.deck.addCard')}
                            </MenuItem>
                            <MenuItem onClick={() => onDeckSettings?.(deck)}>
                              <Settings sx={{ fontSize: 16 }} /> {t('deckSettings.menuItem')}
                            </MenuItem>
                            <MenuItem onClick={() => onEditDeck(deck)}>
                              <Edit sx={{ fontSize: 16 }} /> {t('cards.deck.edit')}
                            </MenuItem>
                            <MenuItem onClick={() => onDeleteDeck(deck)} color='danger'>
                              <Delete sx={{ fontSize: 16 }} /> {t('cards.deck.delete')}
                            </MenuItem>
                          </Menu>
                        </Dropdown>
                      </Box>
                    </Box>
                  </Card>
                )
              })}
            </Stack>
          )}
        </Box>
      )}

      {/* Cards View */}
      {activeView === 1 && (
        <Stack spacing={2}>
          {loading
            ? [...Array(4)].map((_, i) => <Skeleton key={i} variant='rectangular' height={96} sx={{ borderRadius: 'md' }} />)
            : filteredCards.map((card) => {
                const cardColor = getDeckColor(card.card_type)

                return (
                  <Card
                    key={card._id}
                    variant='outlined'
                    onClick={() => handlePreviewCard(card)}
                    sx={{
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                      p: 2,
                      '&:hover': {
                        boxShadow: 'sm',
                        borderColor: `${cardColor}.outlinedBorder`,
                        bgcolor: 'background.surface'
                      }
                    }}
                  >
                    <Stack direction='row' alignItems='flex-start' spacing={2}>
                      {/* Type Icon */}
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 'md',
                          bgcolor: `${cardColor}.softBg`,
                          color: `${cardColor}.solidBg`
                        }}
                      >
                        {getDeckIcon(card.card_type)}
                      </Box>

                      {/* Card Content */}
                      <Box sx={{ flex: 1 }}>
                        <Typography level='title-md' fontWeight={600}>
                          {card.title || t('cards.manage_content.untitled')}
                        </Typography>
                        <Typography level='body-sm' sx={{ color: 'text.secondary', mt: 0.5 }}>
                          {card.content ? (
                            card.content.substring(0, 150) + (card.content.length > 150 ? '...' : '')
                          ) : (
                            <Typography component='span' sx={{ fontStyle: 'italic', opacity: 0.7 }}>
                              {t('cards.manage_content.noContent')}
                            </Typography>
                          )}
                        </Typography>

                        <Stack direction='row' spacing={1} sx={{ mt: 1.5 }} flexWrap='wrap'>
                          <Chip size='sm' variant='soft' color={cardColor} sx={{ fontWeight: 600 }}>
                            {getCardTypeLabel(card.card_type)}
                          </Chip>
                          <Chip size='sm' variant='outlined' startDecorator='📚'>
                            {getDeckName(card.deck_id)}
                          </Chip>
                          <Chip
                            size='sm'
                            variant='outlined'
                            color={card.next_review ? 'success' : 'primary'}
                            startDecorator={<Event fontSize='small' />}
                            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                          >
                            {card.next_review ? new Date(card.next_review).toLocaleDateString() : t('cards.manage_content.reviewNew')}
                          </Chip>
                          {card.tags?.map((tag, idx) => (
                            <Chip key={idx} size='sm' variant='outlined' sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
                              {tag}
                            </Chip>
                          ))}
                        </Stack>
                      </Box>

                      {/* Actions */}
                      <Stack direction='row' spacing={0.5} onClick={(e) => e.stopPropagation()}>
                        <Tooltip title={t('cards.deck.preview')}>
                          <IconButton size='sm' variant='plain' color='primary' onClick={() => handlePreviewCard(card)}>
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('cards.deck.edit')}>
                          <IconButton size='sm' variant='soft' onClick={() => onEditCard(card)}>
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('cards.deck.delete')}>
                          <IconButton size='sm' variant='soft' color='danger' onClick={() => onDeleteCard(card)}>
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Card>
                )
              })}

          {activeView === 1 && hasMore && filteredCards.length > 0 && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', pb: 4 }}>
              <Button variant='soft' color='neutral' size='sm' onClick={onLoadMore} loading={loading} sx={{ borderRadius: 'md', px: 4 }}>
                {t('common.loadMore', 'Load More')}
              </Button>
            </Box>
          )}

          {filteredCards.length === 0 && (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography level='title-md' sx={{ mb: 0.5, color: 'text.secondary' }}>
                {t('cards.manage_content.empty.cards.title')}
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                {searchQuery || activeFilterCount > 0
                  ? t('cards.manage_content.empty.cards.filter')
                  : t('cards.manage_content.empty.cards.start')}
              </Typography>
              {activeFilterCount > 0 && (
                <Button
                  variant='plain'
                  size='sm'
                  color='primary'
                  sx={{ mt: 1 }}
                  onClick={() => {
                    setFilterType('all')
                    onClearTags?.()
                  }}
                >
                  {t('filters.clearAll')}
                </Button>
              )}
            </Box>
          )}
        </Stack>
      )}
      {/* Preview Modal */}
      <CardPreviewModal
        open={previewState.open}
        onClose={handleClosePreview}
        title={previewState.title}
        cards={previewState.cards}
        initialIndex={previewState.initialIndex}
        decks={decks}
      />
    </Box>
  )
}

function DeckGridCard({
  deck,
  deckColor,
  cardCount,
  gradient,
  getDeckIcon,
  handlePreviewDeck,
  onPreview,
  onEditDeck,
  onDeleteDeck,
  onStudy,
  onDeckSettings,
  t
}) {
  const [transform, setTransform] = useState('')
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 })

  // Detect if the device supports hover (mouse users vs touch users)
  const isTouchDevice = typeof window !== 'undefined' ? window.matchMedia('(hover: none)').matches : false

  const handleMouseMove = (e) => {
    if (isTouchDevice) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = ((y - centerY) / centerY) * -12
    const rotateY = ((x - centerX) / centerX) * 12

    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`)
    setGlare({ x: (x / rect.width) * 100, y: (y / rect.height) * 100, opacity: 1 })
  }

  const handleTouch = (e) => {
    const touch = e.touches[0]
    const rect = e.currentTarget.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = ((y - centerY) / centerY) * -15
    const rotateY = ((x - centerX) / centerX) * 15

    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(0.97, 0.97, 0.97)`)
    setGlare({ x: (x / rect.width) * 100, y: (y / rect.height) * 100, opacity: 1 })
  }

  const handleReset = () => {
    setTransform('')
    setGlare((prev) => ({ ...prev, opacity: 0 }))
  }

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <Card
        variant='outlined'
        onMouseMove={handleMouseMove}
        onMouseLeave={handleReset}
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
        onTouchEnd={handleReset}
        onTouchCancel={handleReset}
        sx={{
          p: 1.5,
          width: '100%',
          maxWidth: 240,
          minHeight: 220,
          cursor: 'pointer',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.surface',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          transformStyle: isTouchDevice ? 'flat' : 'preserve-3d',
          transition: transform ? 'none' : 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.5s ease',
          transform: isTouchDevice ? 'none' : transform || 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          boxShadow: transform ? 'xl' : 'none',
          backfaceVisibility: 'hidden',
          WebkitFontSmoothing: 'antialiased',
          willChange: !isTouchDevice && transform ? 'transform' : 'auto',
          '&:hover': {
            borderColor: 'neutral.outlinedBorder',
            boxShadow: transform ? 'xl' : 'sm'
          }
        }}
      >
        {/* Dynamic Glare Overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, var(--joy-palette-common-white, #fff) 0%, transparent 60%)`,
            opacity: glare.opacity * 0.35,
            transition: glare.opacity ? 'none' : 'opacity 0.5s ease',
            pointerEvents: 'none',
            zIndex: 15,
            mixBlendMode: 'overlay',
            borderRadius: 'inherit'
          }}
        />

        {/* Preview Area - Fixed Height */}
        <Box
          sx={{ mb: 1.5, height: 90, borderRadius: 'sm', overflow: 'hidden', position: 'relative', zIndex: 1 }}
          onClick={() => handlePreviewDeck(deck)}
        >
          {deck.image_url ? (
            <img
              src={deck.image_url}
              alt={deck.name}
              loading='lazy'
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundImage: gradient
              }}
            >
              <Box sx={{ color: `${deckColor}.solidBg`, opacity: 0.6, transform: 'scale(1.5)' }}>{getDeckIcon(deck.deck_type)}</Box>
            </Box>
          )}
        </Box>

        {/* Header Row - Title + Actions */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1, gap: 1, zIndex: 1 }}>
          <Typography
            level='title-md'
            onClick={() => handlePreviewDeck(deck)}
            sx={{
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'text.primary',
              flex: 1
            }}
          >
            {deck.name}
          </Typography>

          {/* Actions Menu */}
          <Dropdown>
            <MenuButton
              slots={{ root: IconButton }}
              slotProps={{
                root: {
                  variant: 'plain',
                  color: 'neutral',
                  size: 'sm',
                  sx: { minWidth: 24, minHeight: 24, mt: -0.5, mr: -0.5, zIndex: 2 }
                }
              }}
            >
              <MoreVert sx={{ fontSize: 16 }} />
            </MenuButton>
            <Menu placement='bottom-end' size='sm'>
              <MenuItem onClick={() => onPreview?.(deck)}>
                <Visibility sx={{ fontSize: 16 }} /> {t('cards.preview')}
              </MenuItem>
              <MenuItem onClick={() => onDeckSettings?.(deck)}>
                <Settings sx={{ fontSize: 16 }} /> {t('deckSettings.menuItem')}
              </MenuItem>
              <MenuItem onClick={() => onEditDeck(deck)}>
                <Edit sx={{ fontSize: 16 }} /> {t('cards.deck.edit')}
              </MenuItem>
              <MenuItem onClick={() => onDeleteDeck(deck)} color='danger'>
                <Delete sx={{ fontSize: 16 }} /> {t('cards.deck.delete')}
              </MenuItem>
            </Menu>
          </Dropdown>
        </Box>

        {/* Metadata Row */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, zIndex: 1 }}
          onClick={() => handlePreviewDeck(deck)}
        >
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            {t('cards.manage_content.cardCount', { count: cardCount })}
          </Typography>

          {deck.due_cards > 0 ? (
            <Typography level='body-xs' sx={{ color: 'primary.plainColor', fontWeight: 600 }}>
              {t('cards.studyDue', { count: deck.due_cards })}
            </Typography>
          ) : deck.new_cards > 0 ? (
            <Typography level='body-xs' sx={{ color: 'success.plainColor', fontWeight: 600 }}>
              {t('study.deck.newCount', { count: deck.new_cards })}
            </Typography>
          ) : null}
        </Box>

        <Box sx={{ flex: 1, zIndex: 1 }} onClick={() => handlePreviewDeck(deck)} />

        {/* Action Button */}
        <Box sx={{ zIndex: 2, position: 'relative' }}>
          {!deck.has_cards ? (
            <Button size='sm' variant='outlined' color='neutral' disabled fullWidth sx={{ fontSize: '0.75rem', py: 0.75 }}>
              {t('cards.noCardsYet', 'Empty')}
            </Button>
          ) : deck.due_cards > 0 ? (
            <Button
              size='sm'
              variant='solid'
              color='primary'
              onClick={(e) => {
                e.stopPropagation()
                onStudy?.(deck)
              }}
              startDecorator={<School sx={{ fontSize: 14 }} />}
              fullWidth
              sx={{ fontSize: '0.75rem', py: 0.75, fontWeight: 600 }}
            >
              {t('cards.studyDue', { count: deck.due_cards })}
            </Button>
          ) : deck.new_cards > 0 ? (
            <Button
              size='sm'
              variant='solid'
              color='success'
              onClick={(e) => {
                e.stopPropagation()
                onStudy?.(deck)
              }}
              startDecorator={<School sx={{ fontSize: 14 }} />}
              fullWidth
              sx={{ fontSize: '0.75rem', py: 0.75, fontWeight: 600 }}
            >
              {t('cards.studyNew', { count: deck.new_cards })}
            </Button>
          ) : (
            <Button
              size='sm'
              variant='soft'
              color='neutral'
              onClick={(e) => {
                e.stopPropagation()
                onStudy?.(deck)
              }}
              startDecorator={<School sx={{ fontSize: 14 }} />}
              fullWidth
              sx={{ fontSize: '0.75rem', py: 0.75, fontWeight: 600 }}
            >
              {t('cards.review', 'Review')}
            </Button>
          )}
        </Box>
      </Card>
    </Box>
  )
}

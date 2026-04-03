import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Button,
  Stack,
  Input,
  Tooltip,
  Card,
  CardContent,
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
  ViewList
} from '@mui/icons-material'
import CardPreviewModal from './CardPreviewModal'

export default function ManageContent({
  decks,
  cards,
  onEditDeck,
  onDeleteDeck,
  onEditCard,
  onDeleteCard,
  onAddCard,
  onStudy,
  onPreview,
  searchQuery
}) {
  const { t } = useTranslation()
  const [activeView, setActiveView] = useState(0) // 0 = Decks, 1 = Cards
  const [filterType, setFilterType] = useState('all')
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('nowry_deck_view_mode') || 'grid'
  })

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

  // Filter cards
  const filteredCards = cards.filter((card) => {
    const query = searchQuery.toLowerCase()
    const deckName = getDeckName(card.deck_id).toLowerCase()

    // Split by comma for OR condition
    const orGroups = query.split(',')

    // Check if matches ANY of the comma-separated groups
    const matchesSearch = orGroups.some((group) => {
      const terms = group.trim().split(/\s+/).filter(Boolean)
      if (terms.length === 0) return false

      // Check if ALL terms in this group match
      return terms.every(
        (term) =>
          card.title?.toLowerCase().includes(term) ||
          card.content?.toLowerCase().includes(term) ||
          card.tags?.some((tag) => tag.toLowerCase().includes(term)) ||
          deckName.includes(term)
      )
    })

    const cardType = card.card_type || 'flashcard'
    const matchesType = filterType === 'all' || cardType === filterType
    return (searchQuery.trim() === '' || matchesSearch) && matchesType
  })

  const filters = [
    { key: 'all', label: t('cards.manage_content.filters.all'), color: 'neutral' },
    { key: 'flashcard', label: t('cards.manage_content.filters.flashcards'), color: 'primary' },
    { key: 'quiz', label: t('cards.manage_content.filters.quizzes'), color: 'warning' },
    { key: 'visual', label: t('cards.manage_content.filters.visual'), color: 'success' }
  ]

  return (
    <Box>
      {/* Premium Segmented Control for Sub-Views */}
      <Tabs
        value={activeView}
        onChange={(e, val) => setActiveView(val)}
        sx={{
          mb: 3,
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
            boxShadow: 'inset 0px 1px 3px rgba(0,0,0,0.02)', // Minimal inset shadow for depth, safe on dark/light
            [`& .${tabClasses.root}`]: {
              minWidth: { xs: 120, sm: 140 },
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
            <Typography level='title-sm' sx={{ fontWeight: 'inherit', color: 'inherit' }}>
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
            <Typography level='title-sm' sx={{ fontWeight: 'inherit', color: 'inherit' }}>
              {t('cards.manage_content.tabs.cardsOnly', 'Cards')}
            </Typography>
            <Chip
              size='sm'
              variant={activeView === 1 ? 'solid' : 'soft'}
              color={activeView === 1 ? 'primary' : 'neutral'}
              sx={{ borderRadius: 'xl', fontWeight: 700, fontSize: '0.7rem', px: 1, height: 20 }}
            >
              {cards.length}
            </Chip>
          </Tab>
        </TabList>
      </Tabs>

      <Stack direction='row' spacing={1.5} sx={{ mb: 2.5, alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Tactile Carousel Filter */}
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            overflowX: 'auto',
            pb: 1,
            px: { xs: 0.5, sm: 0 },
            mx: { xs: -0.5, sm: 0 },
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            flex: 1
          }}
        >
          {filters.map(({ key, label, color }) => {
            const isSelected = filterType === key
            return (
              <Chip
                key={key}
                size='sm'
                variant={isSelected ? 'soft' : 'plain'}
                color={isSelected ? color : 'neutral'}
                onClick={() => setFilterType(key)}
                sx={{
                  cursor: 'pointer',
                  fontWeight: isSelected ? 700 : 500,
                  borderRadius: 'xl',
                  flexShrink: 0,
                  scrollSnapAlign: 'start',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  border: '1px solid',
                  borderColor: isSelected ? `${color}.outlinedBorder` : 'transparent',
                  '&:active': { transform: 'scale(0.95)' },
                  '&:hover': {
                    bgcolor: isSelected ? `${color}.softHoverBg` : 'background.level1',
                    borderColor: isSelected ? `${color}.outlinedBorder` : 'neutral.outlinedBorder'
                  }
                }}
              >
                {label}
              </Chip>
            )
          })}
        </Box>

        {/* View Toggle (Only show for Decks) */}
        {activeView === 0 && (
          <Stack direction='row' spacing={0.5} sx={{ display: { xs: 'none', sm: 'flex' }, flexShrink: 0 }}>
            <IconButton
              size='sm'
              variant={viewMode === 'grid' ? 'solid' : 'plain'}
              color={viewMode === 'grid' ? 'primary' : 'neutral'}
              onClick={() => handleViewChange('grid')}
              sx={{ borderRadius: 'md', transition: 'all 0.2s' }}
            >
              <GridView fontSize='small' />
            </IconButton>
            <IconButton
              size='sm'
              variant={viewMode === 'list' ? 'solid' : 'plain'}
              color={viewMode === 'list' ? 'primary' : 'neutral'}
              onClick={() => handleViewChange('list')}
              sx={{ borderRadius: 'md', transition: 'all 0.2s' }}
            >
              <ViewList fontSize='small' />
            </IconButton>
          </Stack>
        )}
      </Stack>

      {/* Decks View */}
      {activeView === 0 && (
        <Box>
          {filteredDecks.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography level='title-md' sx={{ mb: 0.5, color: 'text.secondary' }}>
                {t('cards.manage_content.empty.decks.title')}
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                {searchQuery || filterType !== 'all'
                  ? t('cards.manage_content.empty.decks.filter')
                  : t('cards.manage_content.empty.decks.start')}
              </Typography>
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
                const cardCount = getCardsForDeck(deck._id).length
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
                    t={t}
                  />
                )
              })}
            </Box>
          ) : (
            <Stack spacing={1}>
              {filteredDecks.map((deck) => {
                const deckColor = getDeckColor(deck.deck_type)
                const cardCount = getCardsForDeck(deck._id).length

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
                            variant={deck.due_cards > 0 ? 'solid' : 'soft'}
                            color={deck.due_cards > 0 ? 'primary' : 'neutral'}
                            onClick={() => onStudy?.(deck)}
                            startDecorator={<School sx={{ fontSize: 16 }} />}
                            sx={{ fontSize: '0.75rem', fontWeight: 600, px: 1.5, display: { xs: 'none', sm: 'flex' } }}
                          >
                            {deck.due_cards > 0 ? t('cards.studyDue', { count: deck.due_cards }) : t('cards.review', 'Review')}
                          </Button>
                        )}

                        {deck.has_cards && (
                          <IconButton
                            size='sm'
                            variant={deck.due_cards > 0 ? 'solid' : 'soft'}
                            color={deck.due_cards > 0 ? 'primary' : 'neutral'}
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
          {filteredCards.map((card) => {
            const cardColor = getDeckColor(card.card_type)

            return (
              <Card
                key={card._id}
                variant='outlined'
                onClick={() => handlePreviewCard(card)}
                sx={{
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 'sm',
                    borderColor: `${cardColor}.outlinedBorder`,
                    bgcolor: 'background.surface'
                  }
                }}
              >
                <CardContent>
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
                </CardContent>
              </Card>
            )
          })}

          {filteredCards.length === 0 && (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography level='title-md' sx={{ mb: 0.5, color: 'text.secondary' }}>
                {t('cards.manage_content.empty.cards.title')}
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                {searchQuery || filterType !== 'all'
                  ? t('cards.manage_content.empty.cards.filter')
                  : t('cards.manage_content.empty.cards.start')}
              </Typography>
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
  t
}) {
  const [transform, setTransform] = useState('')
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 })

  const handleMouseMove = (e) => {
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
          transformStyle: 'preserve-3d',
          transition: transform ? 'none' : 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.5s ease',
          transform: transform || 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          boxShadow: transform ? 'xl' : 'none',
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
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.4) 0%, transparent 60%)`,
            opacity: glare.opacity,
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

          {deck.due_cards > 0 && (
            <Typography level='body-xs' sx={{ color: 'primary.plainColor', fontWeight: 600 }}>
              {t('cards.studyDue', { count: deck.due_cards })}
            </Typography>
          )}
        </Box>

        <Box sx={{ flex: 1, zIndex: 1 }} onClick={() => handlePreviewDeck(deck)} />

        {/* Action Button */}
        <Box sx={{ zIndex: 2, position: 'relative' }}>
          {!deck.has_cards ? (
            <Button size='sm' variant='outlined' color='neutral' disabled fullWidth sx={{ fontSize: '0.75rem', py: 0.75 }}>
              {t('cards.noCardsYet', 'Empty')}
            </Button>
          ) : deck.due_cards === 0 ? (
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
          ) : (
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
          )}
        </Box>
      </Card>
    </Box>
  )
}

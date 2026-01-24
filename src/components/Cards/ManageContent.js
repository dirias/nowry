import React, { useState } from 'react'
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
  Grid,
  Table
} from '@mui/joy'
import { Edit, Delete, Add, Style, Quiz as QuizIcon, AccountTree, LocalOffer, Search, Visibility, Event } from '@mui/icons-material'
import CardPreviewModal from './CardPreviewModal'

export default function ManageContent({ decks, cards, onEditDeck, onDeleteDeck, onEditCard, onDeleteCard, onAddCard }) {
  const [activeView, setActiveView] = useState(0) // 0 = Decks, 1 = Cards
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')

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
      title: 'Card Preview',
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
        return 'Quiz'
      case 'visual':
        return 'Visual'
      default:
        return 'Flashcard'
    }
  }

  const getDeckName = (deckId) => {
    const deck = decks.find((d) => d._id === deckId || d._id === deckId?._id)
    return deck?.name || 'Unknown Deck'
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

  return (
    <Box>
      {/* Header */}
      <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 4 }}>
        <Box>
          <Typography level='h3' fontWeight={600} sx={{ mb: 0.5 }}>
            Content Manager
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            {decks.length} decks • {cards.length} total cards
          </Typography>
        </Box>
      </Stack>

      {/* View Tabs */}
      <Tabs value={activeView} onChange={(e, val) => setActiveView(val)} sx={{ mb: 3 }}>
        <TabList>
          <Tab>Decks ({decks.length})</Tab>
          <Tab>Cards ({cards.length})</Tab>
        </TabList>
      </Tabs>

      {/* Toolbar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Input
          placeholder={`Search ${activeView === 0 ? 'decks' : 'cards'}...`}
          startDecorator={<Search />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          variant='soft'
          sx={{ flex: 1 }}
        />

        {/* Type Filter */}
        <Stack direction='row' spacing={0.5}>
          <Chip
            variant='soft'
            onClick={() => setFilterType('all')}
            sx={{
              cursor: 'pointer',
              textDecoration: filterType === 'all' ? 'underline' : 'none',
              textUnderlineOffset: '4px',
              textDecorationThickness: '2px'
            }}
          >
            All
          </Chip>
          <Chip
            variant='soft'
            color='primary'
            onClick={() => setFilterType('flashcard')}
            sx={{
              cursor: 'pointer',
              textDecoration: filterType === 'flashcard' ? 'underline' : 'none',
              textUnderlineOffset: '4px',
              textDecorationThickness: '2px'
            }}
          >
            Flashcards
          </Chip>
          <Chip
            variant='soft'
            color='warning'
            onClick={() => setFilterType('quiz')}
            sx={{
              cursor: 'pointer',
              textDecoration: filterType === 'quiz' ? 'underline' : 'none',
              textUnderlineOffset: '4px',
              textDecorationThickness: '2px'
            }}
          >
            Quizzes
          </Chip>
          <Chip
            variant='soft'
            color='info'
            onClick={() => setFilterType('visual')}
            sx={{
              cursor: 'pointer',
              textDecoration: filterType === 'visual' ? 'underline' : 'none',
              textUnderlineOffset: '4px',
              textDecorationThickness: '2px'
            }}
          >
            Visual
          </Chip>
        </Stack>
      </Stack>

      {/* Decks View - Compact Minimal List */}
      {activeView === 0 && (
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
                  {/* Icon - Small and Subtle */}
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
                      {cardCount} {cardCount === 1 ? 'card' : 'cards'}
                    </Typography>
                  </Box>

                  {/* Type Label - Minimal */}
                  <Chip
                    size='sm'
                    variant='soft'
                    color={deckColor}
                    sx={{
                      fontSize: '0.65rem',
                      height: 20,
                      px: 1,
                      fontWeight: 600,
                      flexShrink: 0
                    }}
                  >
                    {deck.deck_type || 'flashcard'}
                  </Chip>

                  {/* Actions - Compact */}
                  <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <Tooltip title='Add Card' size='sm'>
                      <IconButton
                        size='sm'
                        variant='soft'
                        color='success'
                        onClick={() => onAddCard(deck)}
                        sx={{ minWidth: 32, minHeight: 32 }}
                      >
                        <Add sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='Edit' size='sm'>
                      <IconButton size='sm' variant='plain' onClick={() => onEditDeck(deck)} sx={{ minWidth: 32, minHeight: 32 }}>
                        <Edit sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='Delete' size='sm'>
                      <IconButton
                        size='sm'
                        variant='plain'
                        color='danger'
                        onClick={() => onDeleteDeck(deck)}
                        sx={{ minWidth: 32, minHeight: 32 }}
                      >
                        <Delete sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Card>
            )
          })}

          {filteredDecks.length === 0 && (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography level='h4' sx={{ mb: 1, color: 'text.secondary' }}>
                No decks found
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                {searchQuery || filterType !== 'all' ? 'Try adjusting your filters' : 'Create your first deck to get started'}
              </Typography>
            </Box>
          )}
        </Stack>
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
                        {card.title || 'Untitled Card'}
                      </Typography>
                      <Typography level='body-sm' sx={{ color: 'neutral.600', mt: 0.5 }}>
                        {card.content ? (
                          card.content.substring(0, 150) + (card.content.length > 150 ? '...' : '')
                        ) : (
                          <Typography component='span' sx={{ fontStyle: 'italic', opacity: 0.7 }}>
                            No content
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
                        >
                          {card.next_review ? new Date(card.next_review).toLocaleDateString() : 'New'}
                        </Chip>
                        {/* Show Ease Factor (Review Factor) - SM-2 parameter */}
                        {card.ease_factor && (
                          <Tooltip title='Ease Factor: How easy you found this card (1.3-2.5)' variant='soft'>
                            <Chip size='sm' variant='outlined' color='neutral' startDecorator='📊'>
                              Factor: {card.ease_factor.toFixed(2)}
                            </Chip>
                          </Tooltip>
                        )}
                        {/* Show Interval (days until next review) */}
                        {card.interval !== undefined && (
                          <Tooltip title='Interval: Days until next review' variant='soft'>
                            <Chip size='sm' variant='outlined' color='neutral' startDecorator='⏱️'>
                              {card.interval}d
                            </Chip>
                          </Tooltip>
                        )}
                        {card.tags?.map((tag, idx) => (
                          <Chip key={idx} size='sm' variant='outlined'>
                            {tag}
                          </Chip>
                        ))}
                      </Stack>
                    </Box>

                    {/* Actions */}
                    <Stack direction='row' spacing={0.5} onClick={(e) => e.stopPropagation()}>
                      <Tooltip title='Preview'>
                        <IconButton size='sm' variant='plain' color='primary' onClick={() => handlePreviewCard(card)}>
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title='Edit Card'>
                        <IconButton size='sm' variant='soft' onClick={() => onEditCard(card)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title='Delete Card'>
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
              <Typography level='h4' sx={{ mb: 1, color: 'neutral.500' }}>
                No cards found
              </Typography>
              <Typography level='body-sm' sx={{ color: 'neutral.400' }}>
                {searchQuery || filterType !== 'all' ? 'Try adjusting your filters' : 'Create cards in your decks to get started'}
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
      />
    </Box>
  )
}

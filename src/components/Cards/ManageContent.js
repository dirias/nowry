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
  Grid,
  Table
} from '@mui/joy'
import { Edit, Delete, Add, Style, Quiz as QuizIcon, AccountTree, LocalOffer, Search, Visibility, Event } from '@mui/icons-material'
import CardPreviewModal from './CardPreviewModal'

export default function ManageContent({ decks, cards, onEditDeck, onDeleteDeck, onEditCard, onDeleteCard, onAddCard }) {
  const { t } = useTranslation()
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
      {/* Header */}
      <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 4 }}>
        <Box>
          <Typography level='h3' fontWeight={600} sx={{ mb: 0.5 }}>
            {t('cards.manage_content.title')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            {t('cards.manage_content.deckCount', { decks: decks.length, cards: cards.length })}
          </Typography>
        </Box>
      </Stack>

      {/* View Tabs - Styled to match CardHome pattern */}
      <Tabs
        value={activeView}
        onChange={(e, val) => setActiveView(val)}
        sx={{
          mb: 3,
          bgcolor: 'transparent',
          '--Tabs-gap': '0px'
        }}
      >
        <TabList
          disableUnderline
          sx={{
            p: 0.5,
            gap: 0.5,
            borderRadius: 'xl',
            bgcolor: 'background.level1',
            display: 'inline-flex'
          }}
        >
          <Tab
            disableIndicator
            sx={{
              borderRadius: 'lg',
              fontSize: '0.85rem',
              fontWeight: 500,
              px: 2,
              py: 0.75,
              '&.Mui-selected': {
                bgcolor: 'background.surface',
                boxShadow: 'sm',
                fontWeight: 600
              }
            }}
          >
            {t('cards.manage_content.tabs.decks', { count: decks.length })}
          </Tab>
          <Tab
            disableIndicator
            sx={{
              borderRadius: 'lg',
              fontSize: '0.85rem',
              fontWeight: 500,
              px: 2,
              py: 0.75,
              '&.Mui-selected': {
                bgcolor: 'background.surface',
                boxShadow: 'sm',
                fontWeight: 600
              }
            }}
          >
            {t('cards.manage_content.tabs.cards', { count: cards.length })}
          </Tab>
        </TabList>
      </Tabs>

      {/* Toolbar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Input
          placeholder={activeView === 0 ? t('cards.manage_content.search.decks') : t('cards.manage_content.search.cards')}
          startDecorator={<Search />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          variant='soft'
          sx={{ flex: 1 }}
        />

        {/* Type Filter - solid/plain chip pattern */}
        <Stack direction='row' spacing={0.5}>
          {filters.map(({ key, label, color }) => (
            <Chip
              key={key}
              size='sm'
              variant={filterType === key ? 'solid' : 'plain'}
              color={filterType === key ? color : 'neutral'}
              onClick={() => setFilterType(key)}
              sx={{ cursor: 'pointer', fontWeight: filterType === key ? 600 : 400 }}
            >
              {label}
            </Chip>
          ))}
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
                      {t('cards.manage_content.cardCount', { count: cardCount })}
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
                    <Tooltip title={t('cards.deck.addCard')} size='sm'>
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
                    <Tooltip title={t('cards.deck.edit')} size='sm'>
                      <IconButton size='sm' variant='plain' onClick={() => onEditDeck(deck)} sx={{ minWidth: 32, minHeight: 32 }}>
                        <Edit sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('cards.deck.delete')} size='sm'>
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
              <Typography level='title-md' sx={{ mb: 0.5, color: 'text.secondary' }}>
                {t('cards.manage_content.empty.decks.title')}
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                {searchQuery || filterType !== 'all'
                  ? t('cards.manage_content.empty.decks.filter')
                  : t('cards.manage_content.empty.decks.start')}
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
                        >
                          {card.next_review ? new Date(card.next_review).toLocaleDateString() : t('cards.manage_content.reviewNew')}
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

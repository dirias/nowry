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
import { Edit, Delete, Add, Style, Quiz as QuizIcon, AccountTree, LocalOffer, Search } from '@mui/icons-material'

export default function ManageContent({ decks, cards, onEditDeck, onDeleteDeck, onEditCard, onDeleteCard, onAddCard }) {
  const [activeView, setActiveView] = useState(0) // 0 = Decks, 1 = Cards
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')

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
    const matchesSearch = deck.name.toLowerCase().includes(searchQuery.toLowerCase())
    const deckType = deck.deck_type || 'flashcard' // Default to flashcard if no type
    const matchesType =
      filterType === 'all' || deckType === filterType || (filterType === 'flashcard' && (deckType === 'studycard' || !deckType)) // Handle studycard alias
    return matchesSearch && matchesType
  })

  // Filter cards
  const filteredCards = cards.filter((card) => {
    const matchesSearch =
      card.title?.toLowerCase().includes(searchQuery.toLowerCase()) || card.content?.toLowerCase().includes(searchQuery.toLowerCase())
    const cardType = card.card_type || 'flashcard' // Default to flashcard if no type
    const matchesType =
      filterType === 'all' || cardType === filterType || (filterType === 'flashcard' && (cardType === 'studycard' || !cardType)) // Handle studycard alias
    return matchesSearch && matchesType
  })

  return (
    <Box>
      {/* Header */}
      <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 3 }}>
        <Box>
          <Typography level='h4' sx={{ mb: 0.5 }}>
            Content Manager
          </Typography>
          <Typography level='body-sm' sx={{ color: 'neutral.600' }}>
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
          sx={{ flex: 1 }}
        />

        {/* Type Filter */}
        <Stack direction='row' spacing={1}>
          <Chip variant={filterType === 'all' ? 'solid' : 'outlined'} onClick={() => setFilterType('all')} sx={{ cursor: 'pointer' }}>
            All
          </Chip>
          <Chip
            variant={filterType === 'flashcard' ? 'solid' : 'outlined'}
            color='primary'
            onClick={() => setFilterType('flashcard')}
            sx={{ cursor: 'pointer' }}
          >
            Flashcards
          </Chip>
          <Chip
            variant={filterType === 'quiz' ? 'solid' : 'outlined'}
            color='warning'
            onClick={() => setFilterType('quiz')}
            sx={{ cursor: 'pointer' }}
          >
            Quizzes
          </Chip>
          <Chip
            variant={filterType === 'visual' ? 'solid' : 'outlined'}
            color='info'
            onClick={() => setFilterType('visual')}
            sx={{ cursor: 'pointer' }}
          >
            Visual
          </Chip>
        </Stack>
      </Stack>

      {/* Decks View */}
      {activeView === 0 && (
        <Grid container spacing={2}>
          {filteredDecks.map((deck) => {
            const deckColor = getDeckColor(deck.deck_type)
            const cardCount = getCardsForDeck(deck._id).length

            return (
              <Grid key={deck._id} xs={12} sm={6} md={4}>
                <Card
                  variant='outlined'
                  sx={{
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: 'md',
                      borderColor: `${deckColor}.outlinedBorder`
                    }
                  }}
                >
                  <CardContent>
                    <Stack spacing={2}>
                      {/* Icon & Name */}
                      <Stack direction='row' spacing={2} alignItems='center'>
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: 'md',
                            bgcolor: `${deckColor}.softBg`,
                            color: `${deckColor}.solidBg`
                          }}
                        >
                          {getDeckIcon(deck.deck_type)}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography level='title-md' fontWeight={600}>
                            {deck.name}
                          </Typography>
                          <Typography level='body-xs' sx={{ color: 'neutral.600' }}>
                            {cardCount} cards
                          </Typography>
                        </Box>
                      </Stack>

                      {/* Tags */}
                      <Stack direction='row' spacing={1} flexWrap='wrap'>
                        <Chip size='sm' variant='soft' color={deckColor}>
                          {deck.deck_type || 'flashcard'}
                        </Chip>
                        {deck.tags?.map((tag, idx) => (
                          <Chip key={idx} size='sm' variant='outlined' startDecorator={<LocalOffer fontSize='small' />}>
                            {tag}
                          </Chip>
                        ))}
                      </Stack>

                      {/* Actions */}
                      <Stack direction='row' spacing={1}>
                        <Button size='sm' variant='soft' color='success' startDecorator={<Add />} onClick={() => onAddCard(deck)} fullWidth>
                          Add Card
                        </Button>
                        <IconButton size='sm' variant='soft' onClick={() => onEditDeck(deck)}>
                          <Edit />
                        </IconButton>
                        <IconButton size='sm' variant='soft' color='danger' onClick={() => onDeleteDeck(deck)}>
                          <Delete />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}

          {filteredDecks.length === 0 && (
            <Grid xs={12}>
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <Typography level='h4' sx={{ mb: 1, color: 'neutral.500' }}>
                  No decks found
                </Typography>
                <Typography level='body-sm' sx={{ color: 'neutral.400' }}>
                  {searchQuery || filterType !== 'all' ? 'Try adjusting your filters' : 'Create your first deck to get started'}
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
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
                sx={{
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: 'sm',
                    borderColor: `${cardColor}.outlinedBorder`
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
                        {card.title}
                      </Typography>
                      <Typography level='body-sm' sx={{ color: 'neutral.600', mt: 0.5 }}>
                        {card.content?.substring(0, 150)}
                        {card.content?.length > 150 && '...'}
                      </Typography>

                      <Stack direction='row' spacing={1} sx={{ mt: 1.5 }} flexWrap='wrap'>
                        <Chip size='sm' variant='soft' color={cardColor}>
                          {getCardTypeLabel(card.card_type)}
                        </Chip>
                        <Chip size='sm' variant='outlined' startDecorator='📚'>
                          {getDeckName(card.deck_id)}
                        </Chip>
                        {card.tags?.map((tag, idx) => (
                          <Chip key={idx} size='sm' variant='outlined'>
                            {tag}
                          </Chip>
                        ))}
                      </Stack>
                    </Box>

                    {/* Actions */}
                    <Stack direction='row' spacing={0.5}>
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
    </Box>
  )
}

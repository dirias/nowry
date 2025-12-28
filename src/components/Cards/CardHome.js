import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Divider
} from '@mui/joy'
import { Search, Add, GridView, ViewList, FilterList, TrendingUp, School, Download, MoreVert } from '@mui/icons-material'
import DecksView from './DecksView'
import CreateDeckModal from './CreateDeckModal'
import CreateCardModal from './CreateCardModal'
import ManageContent from './ManageContent'
import { decksService, cardsService } from '../../api/services'

export default function CardHome() {
  const navigate = useNavigate()

  // State
  const [activeTab, setActiveTab] = useState(0)
  const [decks, setDecks] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [viewMode, setViewMode] = useState('grid')
  const [showCreateDeck, setShowCreateDeck] = useState(false)
  const [showCreateCard, setShowCreateCard] = useState(false)
  const [editingDeck, setEditingDeck] = useState(null)
  const [editingCard, setEditingCard] = useState(null)

  // Stats
  const [stats, setStats] = useState({
    dueToday: 0,
    streak: 5,
    totalCards: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [decksData, cardsData] = await Promise.all([decksService.getAll(), cardsService.getAll()])

      setDecks(decksData)
      setCards(cardsData)

      // Calculate stats
      const now = new Date()
      const dueCards = cardsData.filter((card) => {
        if (!card.next_review) return true
        const nextReview = new Date(card.next_review)
        return nextReview <= now
      })

      setStats({
        dueToday: dueCards.length,
        streak: 5, // TODO: Calculate real streak
        totalCards: cardsData.length
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

  const handleDeckSaved = () => {
    fetchData()
    setShowCreateDeck(false)
    setEditingDeck(null)
  }

  const handleCardSaved = () => {
    fetchData()
    setShowCreateCard(false)
    setEditingCard(null)
  }

  const handleEditDeck = (deck) => {
    setEditingDeck(deck)
    setShowCreateDeck(true)
  }

  const handleDeleteDeck = async (deck) => {
    if (window.confirm(`Are you sure you want to delete "${deck.name}"?`)) {
      try {
        await decksService.delete(deck._id)
        fetchData()
      } catch (error) {
        console.error('Error deleting deck:', error)
      }
    }
  }

  const handleEditCard = (card) => {
    setEditingCard(card)
    setShowCreateCard(true)
  }

  const handleDeleteCard = async (card) => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      try {
        await cardsService.delete(card._id)
        fetchData()
      } catch (error) {
        console.error('Error deleting card:', error)
      }
    }
  }

  // Filter and sort decks
  const getFilteredDecks = () => {
    let filtered = decks

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter((d) => d.deck_type === filterType)
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter((d) => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    // Sort
    switch (sortBy) {
      case 'name':
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'cards':
        filtered = [...filtered].sort((a, b) => (b.total_cards || 0) - (a.total_cards || 0))
        break
      case 'recent':
      default:
        filtered = [...filtered].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        break
    }

    return filtered
  }

  const filteredDecks = getFilteredDecks()

  return (
    <Container maxWidth='xl' sx={{ py: 4 }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems='flex-start' sx={{ mb: 3 }}>
        <Box>
          <Typography level='h2' sx={{ mb: 0.5, fontWeight: 700 }}>
            📚 Deck Library
          </Typography>
          <Typography level='body-md' sx={{ color: 'neutral.600' }}>
            Manage your flashcards, quizzes, and visual learning materials
          </Typography>
        </Box>

        <Stack direction='row' spacing={1}>
          <Button startDecorator={<TrendingUp />} onClick={() => navigate('/study')} variant='solid' color='primary' size='lg'>
            Study Center
          </Button>
          <Button startDecorator={<Add />} onClick={() => setShowCreateDeck(true)} variant='soft' color='primary' size='lg'>
            New Deck
          </Button>
        </Stack>
      </Stack>

      {/* Stats Dashboard */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid xs={12} sm={4}>
          <Card variant='soft' color='primary'>
            <CardContent>
              <Stack direction='row' justifyContent='space-between' alignItems='center'>
                <Box>
                  <Typography level='body-sm' sx={{ color: 'primary.700' }}>
                    Due Today
                  </Typography>
                  <Typography level='h2' sx={{ color: 'primary.600' }}>
                    {stats.dueToday}
                  </Typography>
                </Box>
                <School sx={{ fontSize: 40, opacity: 0.5, color: 'primary.600' }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={4}>
          <Card variant='soft' color='warning'>
            <CardContent>
              <Stack direction='row' justifyContent='space-between' alignItems='center'>
                <Box>
                  <Typography level='body-sm' sx={{ color: 'warning.700' }}>
                    Study Streak
                  </Typography>
                  <Typography level='h2' sx={{ color: 'warning.600' }}>
                    {stats.streak} days
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, opacity: 0.5, color: 'warning.600' }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={4}>
          <Card variant='soft' color='neutral'>
            <CardContent>
              <Stack direction='row' justifyContent='space-between' alignItems='center'>
                <Box>
                  <Typography level='body-sm' sx={{ color: 'neutral.700' }}>
                    Total Cards
                  </Typography>
                  <Typography level='h2' sx={{ color: 'neutral.600' }}>
                    {stats.totalCards}
                  </Typography>
                </Box>
                <GridView sx={{ fontSize: 40, opacity: 0.5, color: 'neutral.600' }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)} sx={{ mb: 3 }}>
        <TabList>
          <Tab>Browse Decks</Tab>
          <Tab>Manage Content</Tab>
        </TabList>
      </Tabs>

      {/* Browse Tab */}
      {activeTab === 0 && (
        <>
          {/* Toolbar */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }} alignItems='center'>
            {/* Search */}
            <Input
              placeholder='Search decks...'
              startDecorator={<Search />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flex: 1, minWidth: 200 }}
            />

            {/* Filter by Type */}
            <Select value={filterType} onChange={(e, val) => setFilterType(val)} startDecorator={<FilterList />} sx={{ minWidth: 150 }}>
              <Option value='all'>All Types</Option>
              <Option value='flashcard'>Flashcards</Option>
              <Option value='quiz'>Quizzes</Option>
              <Option value='visual'>Visual</Option>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onChange={(e, val) => setSortBy(val)} sx={{ minWidth: 150 }}>
              <Option value='recent'>Recent</Option>
              <Option value='name'>Name</Option>
              <Option value='cards'>Card Count</Option>
            </Select>

            {/* View Mode */}
            <Stack direction='row' spacing={0.5}>
              <IconButton variant={viewMode === 'grid' ? 'solid' : 'outlined'} color='neutral' onClick={() => setViewMode('grid')}>
                <GridView />
              </IconButton>
              <IconButton variant={viewMode === 'list' ? 'solid' : 'outlined'} color='neutral' onClick={() => setViewMode('list')}>
                <ViewList />
              </IconButton>
            </Stack>
          </Stack>

          {/* Deck Count & Type Filter Chips */}
          <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 2 }}>
            <Typography level='body-sm' sx={{ color: 'neutral.600' }}>
              {filteredDecks.length} deck{filteredDecks.length !== 1 ? 's' : ''}
            </Typography>
            {filterType !== 'all' && (
              <Chip size='sm' variant='soft' endDecorator={<span onClick={() => setFilterType('all')}>×</span>}>
                {filterType}
              </Chip>
            )}
          </Stack>

          <Divider sx={{ mb: 3 }} />

          {/* Decks Grid/List */}
          {loading ? (
            <Typography>Loading...</Typography>
          ) : (
            <DecksView
              decks={filteredDecks}
              onStudy={handleStudy}
              onEdit={handleEditDeck}
              onDelete={handleDeleteDeck}
              viewMode={viewMode}
            />
          )}
        </>
      )}

      {/* Manage Tab */}
      {activeTab === 1 && (
        <ManageContent
          decks={decks}
          cards={cards}
          onEditDeck={handleEditDeck}
          onDeleteDeck={handleDeleteDeck}
          onEditCard={handleEditCard}
          onDeleteCard={handleDeleteCard}
          onAddCard={(deck) => {
            // Set the deck context for the new card
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
          onDeckSaved={handleDeckSaved}
          deck={editingDeck}
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
    </Container>
  )
}

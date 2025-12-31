import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()

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
    streak: 0,
    totalCards: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [decksData, cardsData, statisticsData] = await Promise.all([
        decksService.getAll(),
        cardsService.getAll(),
        cardsService.getStatistics()
      ])

      setDecks(decksData)
      setCards(cardsData)

      // Use real stats from API - API returns data in summary object
      const summary = statisticsData.summary || {}
      const now = new Date()
      const dueCards = cardsData.filter((card) => {
        if (!card.next_review) return true
        const nextReview = new Date(card.next_review)
        return nextReview <= now
      })

      setStats({
        dueToday: dueCards.length,
        streak: summary.current_streak || 0,
        totalCards: summary.total_cards || cardsData.length
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
    if (window.confirm(t('cards.confirmDeleteDeck', { name: deck.name }))) {
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
    if (window.confirm(t('cards.confirmDeleteCard'))) {
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
      <Stack spacing={4} sx={{ mb: 4 }}>
        {/* Title Row */}
        {/* Title Row */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent='space-between'
          alignItems={{ xs: 'center', md: 'center' }}
          spacing={2}
          sx={{ width: '100%' }}
        >
          {/* Left: Title */}
          <Typography level='h2' fontWeight={600}>
            {t('cards.title')}
          </Typography>

          {/* Center: Subtitle */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', flex: 1 }}>
            <Typography level='body-sm' sx={{ color: 'text.tertiary', display: 'flex', alignItems: 'center', gap: 1 }}>
              {t('cards.subtitle')}
              {stats.streak > 0 && (
                <Typography component='span' level='body-xs' sx={{ color: 'warning.plainColor' }}>
                  • 🔥 {stats.streak} {t('profile.stats.days')}
                </Typography>
              )}
            </Typography>
          </Box>

          {/* Mobile Only Subtitle (stacked) */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, width: '100%', justifyContent: 'center' }}>
            <Typography level='body-sm' sx={{ color: 'text.tertiary', textAlign: 'center' }}>
              {t('cards.subtitle')}
            </Typography>
          </Box>

          {/* Right: Buttons */}
          <Stack direction='row' spacing={1}>
            <Button startDecorator={<TrendingUp />} onClick={() => navigate('/study')} variant='solid' color='primary' size='lg'>
              {t('cards.studyCenter')}
            </Button>
            <Button startDecorator={<Add />} onClick={() => setShowCreateDeck(true)} variant='soft' color='primary' size='lg'>
              {t('cards.newDeck')}
            </Button>
          </Stack>
        </Stack>

        {/* Stats Dashboard */}
        <Grid container spacing={2}>
          <Grid xs={12} sm={6}>
            <Card variant='soft' color='danger'>
              <CardContent>
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                  <Box>
                    <Typography level='body-sm' sx={{ color: 'danger.plainColor' }}>
                      {t('cards.dueToday')}
                    </Typography>
                    <Typography level='h2' sx={{ color: 'danger.solidBg' }}>
                      {stats.dueToday}
                    </Typography>
                  </Box>
                  <School sx={{ fontSize: 40, opacity: 0.5, color: 'danger.solidBg' }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} sm={6}>
            <Card variant='soft' color='neutral'>
              <CardContent>
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                  <Box>
                    <Typography level='body-sm' sx={{ color: 'neutral.plainColor' }}>
                      {t('cards.totalCards')}
                    </Typography>
                    <Typography level='h2' sx={{ color: 'neutral.solidBg' }}>
                      {stats.totalCards}
                    </Typography>
                  </Box>
                  <GridView sx={{ fontSize: 40, opacity: 0.5, color: 'neutral.solidBg' }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)} sx={{ mb: 3 }}>
        <TabList>
          <Tab>{t('cards.browse')}</Tab>
          <Tab>{t('cards.manage')}</Tab>
        </TabList>
      </Tabs>

      {/* Browse Tab */}
      {activeTab === 0 && (
        <>
          {/* Toolbar */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }} alignItems='center'>
            {/* Search */}
            <Input
              placeholder={t('cards.search')}
              startDecorator={<Search />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flex: 1, minWidth: 200 }}
            />

            {/* Filter by Type */}
            <Select value={filterType} onChange={(e, val) => setFilterType(val)} startDecorator={<FilterList />} sx={{ minWidth: 150 }}>
              <Option value='all'>{t('cards.allTypes')}</Option>
              <Option value='flashcard'>{t('study.types.flashcards')}</Option>
              <Option value='quiz'>{t('study.types.quizzes')}</Option>
              <Option value='visual'>{t('study.types.visual')}</Option>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onChange={(e, val) => setSortBy(val)} sx={{ minWidth: 150 }}>
              <Option value='recent'>{t('cards.recent')}</Option>
              <Option value='name'>{t('cards.name')}</Option>
              <Option value='cards'>{t('cards.cardCount')}</Option>
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
              {t('cards.deckCount_plural', { count: filteredDecks.length })}
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
            <Typography>{t('cards.loading')}</Typography>
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
            setEditingCard({ deck_id: deck._id })
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
          onSaved={handleDeckSaved}
          initialData={editingDeck}
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

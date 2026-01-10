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
        <Box>
          {/* Desktop/Tablet Stats */}
          <Grid container spacing={2} sx={{ display: { xs: 'none', md: 'flex' } }}>
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

          {/* Mobile Stats (Compact Row) */}
          <Stack direction='row' spacing={1} sx={{ display: { xs: 'flex', md: 'none' } }}>
            <Card
              variant='soft'
              color='danger'
              sx={{ flex: 1, p: 1.5, alignItems: 'center', textAlign: 'center', flexDirection: 'column', gap: 0.5 }}
            >
              <School sx={{ fontSize: 20, color: 'danger.solidBg', mb: 0.5 }} />
              <Typography level='h3' fontWeight={700} sx={{ color: 'danger.solidBg', lineHeight: 1 }}>
                {stats.dueToday}
              </Typography>
              <Typography level='body-xs' fontWeight={600} sx={{ color: 'danger.plainColor', fontSize: '0.7rem' }}>
                {t('cards.dueToday')}
              </Typography>
            </Card>

            <Card
              variant='soft'
              color='neutral'
              sx={{ flex: 1, p: 1.5, alignItems: 'center', textAlign: 'center', flexDirection: 'column', gap: 0.5 }}
            >
              <GridView sx={{ fontSize: 20, color: 'neutral.solidBg', mb: 0.5 }} />
              <Typography level='h3' fontWeight={700} sx={{ color: 'neutral.solidBg', lineHeight: 1 }}>
                {stats.totalCards}
              </Typography>
              <Typography level='body-xs' fontWeight={600} sx={{ color: 'neutral.plainColor', fontSize: '0.7rem' }}>
                {t('cards.totalCards')}
              </Typography>
            </Card>
          </Stack>
        </Box>
      </Stack>

      {/* Mobile Tabs (Segmented Control) */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          p: 0.5,
          mb: 3,
          borderRadius: 'xl',
          bgcolor: 'background.level1',
          overflow: 'hidden'
        }}
      >
        {[t('cards.browse'), t('cards.manage')].map((tabLabel, index) => {
          const isActive = activeTab === index
          return (
            <Box
              key={index}
              onClick={() => setActiveTab(index)}
              sx={{
                flex: 1,
                py: 1,
                px: 1,
                textAlign: 'center',
                borderRadius: 'lg',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                bgcolor: isActive ? 'background.surface' : 'transparent',
                boxShadow: isActive ? 'sm' : 'none',
                color: isActive ? 'primary.main' : 'text.secondary',
                fontWeight: isActive ? 600 : 500,
                userSelect: 'none'
              }}
            >
              <Typography level='body-sm' textColor='inherit' fontWeight='inherit'>
                {tabLabel}
              </Typography>
            </Box>
          )
        })}
      </Box>

      {/* Desktop Tabs (Minimalistic) */}
      <Tabs
        value={activeTab}
        onChange={(e, val) => setActiveTab(val)}
        sx={{
          mb: 4,
          display: { xs: 'none', md: 'flex' },
          bgcolor: 'transparent'
        }}
      >
        <TabList
          disableUnderline
          sx={{
            p: 0,
            gap: 4,
            bgcolor: 'transparent',
            borderBottom: '1px solid',
            borderColor: 'divider',
            '& .MuiTab-root': {
              bgcolor: 'transparent',
              border: 'none',
              boxShadow: 'none !important',
              outline: 'none !important',
              '&:hover': { bgcolor: 'transparent', border: 'none' },
              '&.Mui-selected': { bgcolor: 'transparent', border: 'none' },
              '&::before': { display: 'none' },
              '&::after': { display: 'none' }
            }
          }}
        >
          <Tab
            disableIndicator
            value={0}
            sx={{
              p: 0,
              pb: 1.5,
              minHeight: 'auto',
              fontSize: 'md',
              fontWeight: activeTab === 0 ? 700 : 500,
              color: activeTab === 0 ? 'primary.plainColor' : 'neutral.500',
              border: 'none',
              borderBottom: '2px solid',
              borderColor: activeTab === 0 ? 'primary.plainColor' : 'transparent',
              bgcolor: 'transparent',
              transition: 'color 0.2s, border-color 0.2s',
              '&:hover': {
                color: 'primary.plainColor',
                bgcolor: 'transparent',
                border: 'none',
                borderBottom: '2px solid',
                borderColor: 'primary.plainColor'
              },
              '&.Mui-selected': {
                color: 'primary.plainColor',
                bgcolor: 'transparent',
                border: 'none',
                borderBottom: '2px solid',
                borderColor: 'primary.plainColor'
              },
              '&.Mui-focusVisible': {
                outline: 'none',
                bgcolor: 'transparent',
                border: 'none',
                borderBottom: '2px solid',
                borderColor: activeTab === 0 ? 'primary.plainColor' : 'transparent'
              }
            }}
          >
            {t('cards.browse')}
          </Tab>
          <Tab
            disableIndicator
            value={1}
            sx={{
              p: 0,
              pb: 1.5,
              minHeight: 'auto',
              fontSize: 'md',
              fontWeight: activeTab === 1 ? 700 : 500,
              color: activeTab === 1 ? 'primary.plainColor' : 'neutral.500',
              border: 'none',
              borderBottom: '2px solid',
              borderColor: activeTab === 1 ? 'primary.plainColor' : 'transparent',
              bgcolor: 'transparent',
              transition: 'color 0.2s, border-color 0.2s',
              '&:hover': {
                color: 'primary.plainColor',
                bgcolor: 'transparent',
                border: 'none',
                borderBottom: '2px solid',
                borderColor: 'primary.plainColor'
              },
              '&.Mui-selected': {
                color: 'primary.plainColor',
                bgcolor: 'transparent',
                border: 'none',
                borderBottom: '2px solid',
                borderColor: 'primary.plainColor'
              },
              '&.Mui-focusVisible': {
                outline: 'none',
                bgcolor: 'transparent',
                border: 'none',
                borderBottom: '2px solid',
                borderColor: activeTab === 1 ? 'primary.plainColor' : 'transparent'
              }
            }}
          >
            {t('cards.manage')}
          </Tab>
        </TabList>
      </Tabs>

      {/* Browse Tab */}
      {activeTab === 0 && (
        <>
          {/* Toolbar (Glassmorphism / Future) */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{
              mb: 3,
              p: 1,
              bgcolor: 'background.surface',
              borderRadius: 'xl',
              boxShadow: 'sm',
              border: '1px solid',
              borderColor: 'neutral.outlinedBorder'
            }}
            alignItems='center'
          >
            {/* Search - Pill Shaped */}
            <Input
              placeholder={t('cards.search')}
              startDecorator={<Search sx={{ color: 'primary.plainColor' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              variant='plain'
              sx={{
                flex: 1,
                minWidth: { md: 240 },
                width: '100%',
                bgcolor: 'transparent',
                '--Input-focusedHighlight': 'transparent', // Remove default glow
                '&:hover': { bgcolor: 'transparent' }
              }}
            />

            <Divider orientation='vertical' sx={{ display: { xs: 'none', md: 'block' }, height: 24 }} />

            {/* Actions Row */}
            <Stack direction='row' spacing={1} sx={{ width: { xs: '100%', md: 'auto' } }} alignItems='center'>
              {/* Filter - Plain & Clean */}
              <Select
                value={filterType}
                onChange={(e, val) => setFilterType(val)}
                variant='plain'
                color='neutral'
                startDecorator={<FilterList fontSize='small' sx={{ color: filterType !== 'all' ? 'primary.plainColor' : 'neutral.400' }} />}
                sx={{
                  minWidth: { md: 140 },
                  '&:hover': { bgcolor: 'background.level1' }
                }}
              >
                <Option value='all'>{t('cards.allTypes')}</Option>
                <Option value='flashcard'>{t('study.types.flashcards')}</Option>
                <Option value='quiz'>{t('study.types.quizzes')}</Option>
                <Option value='visual'>{t('study.types.visual')}</Option>
              </Select>

              {/* Sort - Plain & Clean */}
              <Select
                value={sortBy}
                onChange={(e, val) => setSortBy(val)}
                variant='plain'
                color='neutral'
                sx={{
                  minWidth: { md: 140 },
                  '&:hover': { bgcolor: 'background.level1' }
                }}
              >
                <Option value='recent'>{t('cards.recent')}</Option>
                <Option value='name'>{t('cards.name')}</Option>
                <Option value='cards'>{t('cards.cardCount')}</Option>
              </Select>

              {/* View Mode Toggle */}
              <Box
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  bgcolor: 'background.level1',
                  borderRadius: 'lg',
                  p: 0.5,
                  gap: 0.5
                }}
              >
                <IconButton
                  size='sm'
                  variant={viewMode === 'grid' ? 'solid' : 'plain'}
                  color={viewMode === 'grid' ? 'primary' : 'neutral'}
                  onClick={() => setViewMode('grid')}
                  sx={{ borderRadius: 'md', transition: 'all 0.2s' }}
                >
                  <GridView fontSize='small' />
                </IconButton>
                <IconButton
                  size='sm'
                  variant={viewMode === 'list' ? 'solid' : 'plain'}
                  color={viewMode === 'list' ? 'primary' : 'neutral'}
                  onClick={() => setViewMode('list')}
                  sx={{ borderRadius: 'md', transition: 'all 0.2s' }}
                >
                  <ViewList fontSize='small' />
                </IconButton>
              </Box>
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

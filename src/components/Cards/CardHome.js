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
import { Search, Add, GridView, ViewList, FilterList, TrendingUp, School, Download, MoreVert, CalendarToday } from '@mui/icons-material'
import DecksView from './DecksView'
import CreateDeckModal from './CreateDeckModal'
import CreateCardModal from './CreateCardModal'
import CardPreviewModal from './CardPreviewModal'
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
  const [previewState, setPreviewState] = useState({
    open: false,
    title: '',
    cards: [],
    initialIndex: 0
  })

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

      // Calculate due cards for each deck
      const now = new Date()
      const decksWithDueCount = decksData.map((deck) => {
        const deckCards = cardsData.filter((card) => card.deck_id === deck._id || card.deck_id?._id === deck._id)
        const dueCards = deckCards.filter((card) => {
          if (!card.next_review) return true
          const nextReview = new Date(card.next_review)
          return nextReview <= now
        })
        return {
          ...deck,
          due_cards: dueCards.length,
          has_cards: deckCards.length > 0
        }
      })

      setDecks(decksWithDueCount)
      setCards(cardsData)

      // Use real stats from API - API returns data in summary object
      const summary = statisticsData.summary || {}
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

  const handlePreview = (deck) => {
    const deckCards = cards.filter((card) => card.deck_id === deck._id || card.deck_id?._id === deck._id)
    setPreviewState({
      open: true,
      title: deck.name,
      cards: deckCards,
      initialIndex: 0
    })
  }

  const handleClosePreview = () => {
    setPreviewState((prev) => ({ ...prev, open: false }))
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
    <Container maxWidth='xl' sx={{ py: { xs: 1, md: 1.5 } }}>
      {/* Header */}
      <Stack spacing={1.5} sx={{ mb: 1.5 }}>
        {/* Title Row */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent='space-between'
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={{ xs: 1.5, md: 0.5 }}
          sx={{ width: '100%' }}
        >
          {/* Title & Subtitle */}
          <Box>
            <Typography level='h2' fontWeight={600} sx={{ fontSize: { xs: '1.5rem', md: '1.75rem' }, mb: 0.25 }}>
              {t('cards.title')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.tertiary', fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
              {t('cards.subtitle')}
            </Typography>
          </Box>

          {/* Action Buttons */}
          <Stack direction='row' spacing={1}>
            <Button
              startDecorator={<TrendingUp />}
              onClick={() => navigate('/study')}
              variant='solid'
              color='primary'
              size='sm'
              sx={{ fontSize: '0.8125rem' }}
            >
              {t('cards.studyCenter')}
            </Button>
            <Button
              startDecorator={<Add />}
              onClick={() => setShowCreateDeck(true)}
              variant='outlined'
              color='primary'
              size='sm'
              sx={{ fontSize: '0.8125rem' }}
            >
              {t('cards.newDeck')}
            </Button>
          </Stack>
        </Stack>

        {/* Stats Dashboard - Compact Minimalistic Design */}
        <Grid container spacing={{ xs: 2, md: 3 }}>
          <Grid xs={4} sm={4} md={4}>
            <Box
              sx={{
                py: 1.5,
                px: 1,
                borderRadius: 'sm',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                minHeight: { xs: 80, md: 90 },
                transition: 'all 0.15s',
                bgcolor: 'transparent',
                '&:hover': {
                  bgcolor: 'danger.softBg'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <School sx={{ fontSize: 20, color: 'danger.solidBg', opacity: 0.7 }} />
                <Typography
                  level='h2'
                  sx={{
                    color: 'text.primary',
                    lineHeight: 1,
                    fontSize: { xs: '2rem', md: '2.5rem' },
                    fontWeight: 600
                  }}
                >
                  {stats.dueToday}
                </Typography>
              </Box>
              <Typography level='body-xs' sx={{ color: 'text.tertiary', fontSize: '0.625rem', opacity: 0.6 }}>
                {t('cards.dueToday')}
              </Typography>
            </Box>
          </Grid>

          <Grid xs={4} sm={4} md={4}>
            <Box
              sx={{
                py: 1.5,
                px: 1,
                borderRadius: 'sm',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                minHeight: { xs: 80, md: 90 },
                transition: 'all 0.15s',
                bgcolor: 'transparent',
                '&:hover': {
                  bgcolor: 'neutral.softBg'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <GridView sx={{ fontSize: 20, color: 'neutral.solidBg', opacity: 0.7 }} />
                <Typography
                  level='h2'
                  sx={{
                    color: 'text.primary',
                    lineHeight: 1,
                    fontSize: { xs: '2rem', md: '2.5rem' },
                    fontWeight: 600
                  }}
                >
                  {stats.totalCards}
                </Typography>
              </Box>
              <Typography level='body-xs' sx={{ color: 'text.tertiary', fontSize: '0.625rem', opacity: 0.6 }}>
                {t('cards.totalCards')}
              </Typography>
            </Box>
          </Grid>

          <Grid xs={4} sm={4} md={4}>
            <Box
              sx={{
                py: 1.5,
                px: 1,
                borderRadius: 'sm',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                minHeight: { xs: 80, md: 90 },
                transition: 'all 0.15s',
                bgcolor: 'transparent',
                '&:hover': {
                  bgcolor: 'warning.softBg'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <CalendarToday sx={{ fontSize: 20, color: 'warning.solidBg', opacity: 0.7 }} />
                <Typography
                  level='h2'
                  sx={{
                    color: 'text.primary',
                    lineHeight: 1,
                    fontSize: { xs: '2rem', md: '2.5rem' },
                    fontWeight: 600
                  }}
                >
                  {stats.streak}
                </Typography>
              </Box>
              <Typography level='body-xs' sx={{ color: 'text.tertiary', fontSize: '0.625rem', opacity: 0.6 }}>
                {t('profile.stats.days')}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Stack>

      {/* Subtle Divider for Visual Separation */}
      <Divider sx={{ my: 3, opacity: 0.3 }} />

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
              cards={cards}
              onStudy={handleStudy}
              onPreview={handlePreview}
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

      {previewState.open && (
        <CardPreviewModal
          open={previewState.open}
          onClose={handleClosePreview}
          title={previewState.title}
          cards={previewState.cards}
          initialIndex={previewState.initialIndex}
        />
      )}
    </Container>
  )
}

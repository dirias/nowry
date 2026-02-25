import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Typography,
  Box,
  Input,
  Select,
  Option,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Button,
  IconButton,
  Skeleton,
  Avatar
} from '@mui/joy'
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Favorite as FavoriteIcon,
  CallSplit as ForkIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  MenuBook as MenuBookIcon,
  GridView as GridViewIcon,
  ViewList as ViewListIcon
} from '@mui/icons-material'
import { publicContentService } from '../api/services'
import Book from '../components/Books/Book'

const CATEGORIES = [
  'science',
  'math',
  'languages',
  'history',
  'literature',
  'technology',
  'art',
  'music',
  'business',
  'health',
  'design',
  'programming',
  'technical',
  'documentation',
  'planning',
  'features',
  'deployment'
]

const SORT_OPTIONS = [
  { value: 'recent', label: 'sortOptions.recent' },
  { value: 'popular', label: 'sortOptions.popular' },
  { value: 'most_liked', label: 'sortOptions.mostLiked' },
  { value: 'most_forked', label: 'sortOptions.mostForked' }
]

const PublicBrowse = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState(0) // 0=Books, 1=Decks
  const [viewMode, setViewMode] = useState(localStorage.getItem('public_view_mode') || 'grid')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false) // Separate state for "load more"
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    sort_by: 'recent',
    skip: 0,
    limit: 12
  })
  const [total, setTotal] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [deckCards, setDeckCards] = useState({}) // Store cards for each deck

  const handleViewChange = (newMode) => {
    setViewMode(newMode)
    localStorage.setItem('public_view_mode', newMode)
  }

  useEffect(() => {
    fetchContent()
  }, [activeTab, filters])

  const fetchContent = async () => {
    const isLoadingMore = filters.skip > 0

    if (isLoadingMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const service = activeTab === 0 ? publicContentService.browseBooks : publicContentService.browseDecks
      const result = await service(filters)

      // If skip > 0, we're loading more - append items
      // If skip === 0, we're doing a fresh search - replace items
      if (isLoadingMore) {
        setItems((prevItems) => [...prevItems, ...(result.items || [])])
      } else {
        setItems(result.items || [])
      }

      setTotal(result.total || 0)

      // If fetching decks, also fetch preview cards for each deck
      if (activeTab === 1 && result.items) {
        fetchDeckCards(result.items)
      }
    } catch (error) {
      console.error('Error fetching public content:', error)
      if (!isLoadingMore) {
        setItems([])
      }
    } finally {
      if (isLoadingMore) {
        setLoadingMore(false)
      } else {
        setLoading(false)
      }
    }
  }

  const fetchDeckCards = async (decks) => {
    const cardsData = {}

    for (const deck of decks) {
      try {
        // Fetch first 3 cards for preview - use the cards endpoint for the deck
        const response = await fetch(`http://localhost:8000/decks/${deck._id}/cards?limit=3`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('firebase_token')}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          cardsData[deck._id] = data.cards || data.items || []
        } else {
          cardsData[deck._id] = []
        }
      } catch (error) {
        console.error(`Error fetching cards for deck ${deck._id}:`, error)
        cardsData[deck._id] = []
      }
    }

    setDeckCards(cardsData)
  }

  const handleSearch = (value) => {
    setFilters({ ...filters, search: value, skip: 0 })
  }

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value, skip: 0 })
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      sort_by: 'recent',
      skip: 0,
      limit: 12
    })
  }

  const handleLoadMore = () => {
    // Update filters to load more items
    setFilters({ ...filters, skip: filters.skip + filters.limit })
  }

  const handleItemClick = (item) => {
    const contentType = activeTab === 0 ? 'books' : 'decks'
    navigate(`/public/${contentType}/${item._id}`)
  }

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography level='h3' sx={{ mb: 0.5, fontWeight: 600 }}>
          {t('public.library')}
        </Typography>
        <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
          {t('public.browse')}
        </Typography>
      </Box>

      {/* Search & Filters */}
      <Box sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          {/* Search */}
          <Input
            placeholder={t('public.searchPlaceholder')}
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            startDecorator={<SearchIcon />}
            sx={{ flex: 1 }}
            size='md'
          />

          {/* View Toggle */}
          <Stack direction='row' spacing={0.5}>
            <IconButton size='md' variant={viewMode === 'grid' ? 'solid' : 'plain'} onClick={() => handleViewChange('grid')}>
              <GridViewIcon />
            </IconButton>
            <IconButton size='md' variant={viewMode === 'list' ? 'solid' : 'plain'} onClick={() => handleViewChange('list')}>
              <ViewListIcon />
            </IconButton>
          </Stack>

          {/* Sort */}
          <Select value={filters.sort_by} onChange={(e, value) => handleFilterChange('sort_by', value)} size='md' sx={{ minWidth: 150 }}>
            {SORT_OPTIONS.map((option) => (
              <Option key={option.value} value={option.value}>
                {t(`public.${option.label}`)}
              </Option>
            ))}
          </Select>

          {/* Filter Toggle */}
          <IconButton
            variant='outlined'
            onClick={() => setShowFilters(!showFilters)}
            size='md'
            sx={{
              '&:hover': {
                bgcolor: 'background.level1'
              }
            }}
          >
            <FilterIcon />
          </IconButton>
        </Stack>

        {/* Expandable Filters */}
        {showFilters && (
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.level1',
              borderRadius: 'sm',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Stack spacing={2}>
              <Box>
                <Typography level='body-sm' sx={{ mb: 1, fontWeight: 600 }}>
                  {t('public.category')}
                </Typography>
                <Select
                  value={filters.category}
                  onChange={(e, value) => handleFilterChange('category', value)}
                  placeholder={t('public.all')}
                  size='sm'
                >
                  <Option value=''>{t('public.all')}</Option>
                  {CATEGORIES.map((cat) => (
                    <Option key={cat} value={cat}>
                      {t(`public.categories.${cat}`)}
                    </Option>
                  ))}
                </Select>
              </Box>

              <Button variant='plain' size='sm' startDecorator={<ClearIcon />} onClick={clearFilters} sx={{ alignSelf: 'flex-start' }}>
                {t('public.clearFilters')}
              </Button>
            </Stack>
          </Box>
        )}
      </Box>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(e, value) => setActiveTab(value)}>
        <TabList>
          <Tab>{t('public.books')}</Tab>
          <Tab>{t('public.decks')}</Tab>
        </TabList>

        <TabPanel value={0} sx={{ p: 0, pt: 3 }}>
          <ContentGrid items={items} loading={loading} onItemClick={handleItemClick} contentType='book' viewMode={viewMode} />
        </TabPanel>

        <TabPanel value={1} sx={{ p: 0, pt: 3 }}>
          <ContentGrid
            items={items}
            loading={loading}
            onItemClick={handleItemClick}
            contentType='deck'
            deckCards={deckCards}
            viewMode={viewMode}
          />
        </TabPanel>
      </Tabs>

      {/* Results Info & Load More */}
      {!loading && items.length > 0 && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 2 }}>
            {t('public.showingResults', { count: items.length })} {total > items.length && `of ${total}`}
          </Typography>

          {items.length < total && (
            <Button variant='outlined' onClick={handleLoadMore} size='sm' loading={loadingMore} disabled={loadingMore}>
              {loadingMore ? 'Loading...' : t('public.loadMore')}
            </Button>
          )}
        </Box>
      )}

      {/* Loading More Indicator */}
      {loadingMore && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            Loading more items...
          </Typography>
        </Box>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography level='h4' sx={{ mb: 1 }}>
            {t('public.noResults')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('public.tryFilters')}
          </Typography>
        </Box>
      )}
    </Container>
  )
}

// ContentGrid Component
const ContentGrid = ({ items, loading, onItemClick, contentType, deckCards = {}, viewMode = 'grid' }) => {
  const { t } = useTranslation()

  if (loading) {
    return (
      <Grid container spacing={2}>
        {[...Array(6)].map((_, i) => (
          <Grid xs={12} sm={6} md={4} lg={3} key={i}>
            <Skeleton variant='rectangular' height={viewMode === 'grid' ? 340 : 80} sx={{ borderRadius: 'md' }} />
          </Grid>
        ))}
      </Grid>
    )
  }

  const isBook = contentType === 'book'

  // GRID VIEW
  if (viewMode === 'grid') {
    return (
      <Grid container spacing={2} sx={{ justifyContent: { xs: 'center', sm: 'flex-start' } }}>
        {items.map((item) => (
          <Grid key={item._id} xs={12} sm={6} md={4} lg={3} sx={{ display: 'flex', justifyContent: 'center' }}>
            {isBook ? (
              // Reuse Book.js component for consistency
              <Book
                book={{
                  ...item,
                  author: item.author_name // Map author_name to author for Book component
                }}
                handleBookClick={onItemClick}
              />
            ) : (
              // ✨ PREMIUM DECK DESIGN - Shows actual card previews
              <Card
                variant='outlined'
                sx={{
                  width: '100%',
                  maxWidth: 280,
                  height: 340,
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden',
                  position: 'relative',
                  bgcolor: 'background.surface',
                  borderRadius: 'md',
                  '&:hover': {
                    borderColor: 'primary.outlinedBorder',
                    transform: 'translateY(-8px)',
                    boxShadow: 'lg'
                  }
                }}
                onClick={() => onItemClick(item)}
              >
                <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Deck Cover Preview - TOP */}
                  <Box
                    sx={{
                      height: 160,
                      mb: 2,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {deckCards[item._id] && deckCards[item._id].length > 0 ? (
                      // Show deck cover with card count badge
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          background:
                            item.cover_color ||
                            item.color ||
                            'linear-gradient(135deg, var(--joy-palette-primary-solidBg) 0%, var(--joy-palette-primary-900) 100%)',
                          borderRadius: 'sm',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          overflow: 'hidden',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.2) 100%)'
                          }
                        }}
                      >
                        {/* Card stack indicator */}
                        <Typography level='h1' sx={{ fontSize: '4rem', opacity: 0.9, color: 'common.white', zIndex: 1, mb: 1 }}>
                          🎴
                        </Typography>
                        <Chip
                          variant='solid'
                          size='lg'
                          sx={{
                            bgcolor: 'background.surface',
                            color: item.cover_color || item.color || 'primary.solidBg',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            zIndex: 1
                          }}
                        >
                          {deckCards[item._id].length} cards
                        </Chip>
                      </Box>
                    ) : (
                      // Fallback: Elegant placeholder
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          bgcolor: 'background.level1',
                          border: '2px dashed',
                          borderColor: 'divider',
                          borderRadius: 'sm',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Typography level='h3' sx={{ opacity: 0.3 }}>
                          🎴
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Deck Info - BOTTOM */}
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Box>
                      {/* Deck name */}
                      <Typography
                        level='title-md'
                        sx={{
                          fontWeight: 700,
                          mb: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          color: 'text.primary',
                          letterSpacing: '-0.01em',
                          bgcolor: 'transparent'
                        }}
                      >
                        {item.name}
                      </Typography>

                      {/* Author */}
                      {item.author_name && (
                        <Typography
                          level='body-xs'
                          sx={{
                            color: 'text.tertiary',
                            fontWeight: 500,
                            fontSize: '0.7rem',
                            mb: 1,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            bgcolor: 'transparent'
                          }}
                        >
                          by {item.author_name}
                        </Typography>
                      )}

                      {item.description && (
                        <Typography
                          level='body-xs'
                          sx={{
                            color: 'text.secondary',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            mb: 1,
                            lineHeight: 1.4,
                            bgcolor: 'transparent'
                          }}
                        >
                          {item.description}
                        </Typography>
                      )}

                      {/* Card count badge */}
                      <Chip
                        size='sm'
                        variant='soft'
                        color='primary'
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.7rem'
                        }}
                      >
                        {item.total_cards || 0} {t('public.cards', { defaultValue: 'cards' })}
                      </Chip>
                    </Box>

                    {/* Stats */}
                    <Stack direction='row' spacing={2} sx={{ mt: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ViewIcon sx={{ fontSize: 14, color: 'text.tertiary', opacity: 0.6 }} />
                        <Typography level='body-xs' sx={{ color: 'text.secondary', fontWeight: 500, bgcolor: 'transparent' }}>
                          {item.public_metadata?.views || 0}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FavoriteIcon sx={{ fontSize: 14, color: 'danger.solidBg', opacity: 0.7 }} />
                        <Typography level='body-xs' sx={{ color: 'text.secondary', fontWeight: 500, bgcolor: 'transparent' }}>
                          {item.public_metadata?.likes || 0}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ForkIcon sx={{ fontSize: 14, color: 'success.solidBg', opacity: 0.7 }} />
                        <Typography level='body-xs' sx={{ color: 'text.secondary', fontWeight: 500, bgcolor: 'transparent' }}>
                          {item.public_metadata?.forks || 0}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
        ))}
      </Grid>
    )
  }

  // LIST VIEW
  return (
    <Stack spacing={0}>
      {items.map((item) => (
        <Box
          key={item._id}
          onClick={() => onItemClick(item)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            py: 1.5,
            px: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: 'background.level1'
            }
          }}
        >
          {/* Icon/Cover */}
          <Box
            sx={{
              width: 40,
              height: isBook ? 56 : 40,
              borderRadius: 'sm',
              overflow: 'hidden',
              flexShrink: 0,
              bgcolor: item.cover_color || item.color || 'primary.solidBg',
              backgroundImage: item.cover_image ? `url(${item.cover_image})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            {!item.cover_image && <MenuBookIcon sx={{ fontSize: 20, color: 'common.white', opacity: 0.8 }} />}
          </Box>

          {/* Title & Author */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography level='title-sm' sx={{ fontWeight: 600, bgcolor: 'transparent' }}>
              {isBook ? item.title : item.name}
            </Typography>
            <Typography level='body-xs' sx={{ color: 'text.secondary', bgcolor: 'transparent' }}>
              {item.author_name || 'Unknown'}
            </Typography>
          </Box>

          {/* Stats (hide on mobile) */}
          <Stack direction='row' spacing={2} sx={{ display: { xs: 'none', md: 'flex' }, minWidth: 200 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ViewIcon sx={{ fontSize: 14, color: 'text.tertiary', opacity: 0.6 }} />
              <Typography level='body-xs' sx={{ color: 'text.secondary', fontWeight: 500, bgcolor: 'transparent' }}>
                {item.public_metadata?.views || 0}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FavoriteIcon sx={{ fontSize: 14, color: 'danger.solidBg', opacity: 0.7 }} />
              <Typography level='body-xs' sx={{ color: 'text.secondary', fontWeight: 500, bgcolor: 'transparent' }}>
                {item.public_metadata?.likes || 0}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ForkIcon sx={{ fontSize: 14, color: 'success.solidBg', opacity: 0.7 }} />
              <Typography level='body-xs' sx={{ color: 'text.secondary', fontWeight: 500, bgcolor: 'transparent' }}>
                {item.public_metadata?.forks || 0}
              </Typography>
            </Box>
          </Stack>

          {/* Category/Type (hide on mobile) */}
          {item.public_metadata?.category && (
            <Chip size='sm' variant='soft' sx={{ display: { xs: 'none', sm: 'flex' } }}>
              {t(`public.categories.${item.public_metadata.category.toLowerCase()}`, {
                defaultValue: item.public_metadata.category.charAt(0).toUpperCase() + item.public_metadata.category.slice(1)
              })}
            </Chip>
          )}
        </Box>
      ))}
    </Stack>
  )
}

export default PublicBrowse

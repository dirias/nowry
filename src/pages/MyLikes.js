import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Typography,
  Box,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Grid,
  Card,
  CardContent,
  CardCover,
  Chip,
  Stack,
  Button,
  Skeleton,
  IconButton
} from '@mui/joy'
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Visibility as ViewIcon,
  CallSplit as ForkIcon,
  Explore as ExploreIcon
} from '@mui/icons-material'
import { publicContentService } from '../api/services'
import { SuccessWindow, Error as ErrorMsg } from '../components/Messages'

const MyLikes = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState(0) // 0=All, 1=Books, 2=Decks
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    const fetchLikedContent = async () => {
      setLoading(true)
      try {
        const contentType = activeTab === 0 ? 'all' : activeTab === 1 ? 'book' : 'deck'
        const data = await publicContentService.getMyLikes(contentType)
        setItems(data || [])
      } catch (error) {
        console.error('Error fetching liked content:', error)
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchLikedContent()
  }, [activeTab])

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleUnlike = async (item) => {
    try {
      const service = item.content_type === 'book' ? publicContentService.unlikeBook : publicContentService.unlikeDeck
      await service(item._id)

      // Remove from list
      setItems(items.filter((i) => i._id !== item._id))
      showMessage('success', t('public.unlikeSuccess'))
    } catch (error) {
      console.error('Error unliking:', error)
      showMessage('error', 'Failed to unlike')
    }
  }

  const handleItemClick = (item) => {
    const contentType = item.content_type === 'book' ? 'books' : 'decks'
    navigate(`/public/${contentType}/${item._id}`)
  }

  return (
    <>
      {message && (
        <Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 10000 }}>
          {message.type === 'success' ? <SuccessWindow message={message.text} /> : <ErrorMsg message={message.text} />}
        </Box>
      )}

      <Container maxWidth='xl' sx={{ py: { xs: 2, md: 4 } }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography level='h3' sx={{ mb: 1 }}>
            {t('public.myLikes')}
          </Typography>
          <Typography level='body-md' sx={{ color: 'text.secondary' }}>
            Content you&apos;ve liked from the public library
          </Typography>
        </Box>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(e, value) => setActiveTab(value)}>
          <TabList>
            <Tab>{t('public.all')}</Tab>
            <Tab>{t('public.books')}</Tab>
            <Tab>{t('public.decks')}</Tab>
          </TabList>

          <TabPanel value={0} sx={{ p: 0, pt: 3 }}>
            <LikedContentGrid items={items} loading={loading} onItemClick={handleItemClick} onUnlike={handleUnlike} />
          </TabPanel>

          <TabPanel value={1} sx={{ p: 0, pt: 3 }}>
            <LikedContentGrid items={items} loading={loading} onItemClick={handleItemClick} onUnlike={handleUnlike} />
          </TabPanel>

          <TabPanel value={2} sx={{ p: 0, pt: 3 }}>
            <LikedContentGrid items={items} loading={loading} onItemClick={handleItemClick} onUnlike={handleUnlike} />
          </TabPanel>
        </Tabs>

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <FavoriteBorderIcon sx={{ fontSize: 64, color: 'text.tertiary', mb: 2 }} />
            <Typography level='h4' sx={{ mb: 1 }}>
              {t('public.noLikes')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 3 }}>
              {t('public.exploreContent')}
            </Typography>
            <Button variant='outlined' startDecorator={<ExploreIcon />} onClick={() => navigate('/browse')}>
              {t('public.browse')}
            </Button>
          </Box>
        )}
      </Container>
    </>
  )
}

// LikedContentGrid Component
const LikedContentGrid = ({ items, loading, onItemClick, onUnlike }) => {
  const { t } = useTranslation()

  if (loading) {
    return (
      <Grid container spacing={2}>
        {[...Array(6)].map((_, i) => (
          <Grid xs={12} sm={6} md={4} lg={3} key={i}>
            <Skeleton variant='rectangular' height={250} sx={{ borderRadius: 'sm' }} />
          </Grid>
        ))}
      </Grid>
    )
  }

  return (
    <Grid container spacing={2}>
      {items.map((item) => (
        <Grid xs={12} sm={6} md={4} lg={3} key={item._id}>
          <Card
            variant='outlined'
            sx={{
              height: 280,
              position: 'relative',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.outlinedBorder',
                transform: 'translateY(-4px)',
                boxShadow: 'md'
              }
            }}
          >
            {/* Unlike Button (Top Right) */}
            <IconButton
              variant='solid'
              color='danger'
              size='sm'
              onClick={(e) => {
                e.stopPropagation()
                onUnlike(item)
              }}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 2,
                opacity: 0.9,
                '&:hover': { opacity: 1 }
              }}
            >
              <FavoriteIcon sx={{ fontSize: 16 }} />
            </IconButton>

            {/* Cover */}
            <CardCover>
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  bgcolor: item.cover_color || 'primary.solidBg',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => onItemClick(item)}
              >
                {item.cover_image && (
                  <img src={item.cover_image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </Box>
            </CardCover>

            {/* Overlay Content */}
            <CardCover
              sx={{
                background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 50%)',
                cursor: 'pointer'
              }}
              onClick={() => onItemClick(item)}
            />

            <CardContent
              sx={{
                justifyContent: 'flex-end',
                cursor: 'pointer'
              }}
              onClick={() => onItemClick(item)}
            >
              {/* Content Type Badge */}
              <Chip
                size='sm'
                variant='solid'
                color='primary'
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8
                }}
              >
                {item.content_type === 'book' ? t('public.books') : t('public.decks')}
              </Chip>

              {/* Title */}
              <Typography
                level='h4'
                sx={{
                  color: 'white',
                  mb: 0.5,
                  // Static sm (14), well below h4's own 20px default: this is an
                  // overlay title on a compact public-content thumbnail card, not
                  // a section heading — h4 is kept only for its bold weight.
                  fontSize: 'sm',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}
              >
                {item.title}
              </Typography>

              {/* Author */}
              {item.author_name && (
                <Typography
                  level='body-xs'
                  sx={{
                    color: 'rgba(255,255,255,0.7)',
                    mb: 1
                  }}
                >
                  {t('public.by')} {item.author_name}
                </Typography>
              )}

              {/* Stats */}
              <Stack direction='row' spacing={1.5} sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ViewIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }} />
                  <Typography level='body-xs' sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    {item.public_metadata?.views || 0}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FavoriteIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }} />
                  <Typography level='body-xs' sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    {item.public_metadata?.likes || 0}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ForkIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }} />
                  <Typography level='body-xs' sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    {item.public_metadata?.forks || 0}
                  </Typography>
                </Box>
              </Stack>

              {/* Tags */}
              {item.public_metadata?.tags && item.public_metadata.tags.length > 0 && (
                <Stack direction='row' spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                  {item.public_metadata.tags.slice(0, 2).map((tag) => (
                    <Chip
                      key={tag}
                      size='sm'
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        color: 'white'
                      }}
                    >
                      {tag}
                    </Chip>
                  ))}
                  {item.public_metadata.tags.length > 2 && (
                    <Chip
                      size='sm'
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        color: 'white'
                      }}
                    >
                      +{item.public_metadata.tags.length - 2}
                    </Chip>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default MyLikes

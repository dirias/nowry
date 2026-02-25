import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Container,
  Typography,
  Box,
  Button,
  Stack,
  Chip,
  Divider,
  Card,
  Skeleton,
  IconButton,
  Grid,
  Sheet,
  List,
  ListItem,
  ListItemButton
} from '@mui/joy'
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  CallSplit as ForkIcon,
  Flag as ReportIcon,
  ArrowBack as BackIcon,
  Visibility as ViewIcon,
  Person as PersonIcon
} from '@mui/icons-material'
import { publicContentService } from '../api/services'
import { useAuth } from '../context/AuthContext'
import ReportModal from '../components/Public/ReportModal'
import { SuccessWindow, Error as ErrorMsg } from '../components/Messages'
import ContentRenderer from '../components/Public/ContentRenderer'
import { extractTableOfContents, calculateReadingStats } from '../utils/lexicalHelpers'

const PublicView = () => {
  const { t } = useTranslation()
  const { type, id } = useParams() // type = 'books' or 'decks'
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [content, setContent] = useState(null)
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [message, setMessage] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [activeHeading, setActiveHeading] = useState(null)

  useEffect(() => {
    fetchContent()
  }, [type, id])

  const fetchContent = async () => {
    setLoading(true)
    try {
      const service = type === 'books' ? publicContentService.getPublicBook : publicContentService.getPublicDeck
      const data = await service(id)
      setContent(data)

      // Check if user liked (if authenticated)
      if (isAuthenticated && data.user_liked) {
        setIsLiked(true)
      }

      // If it's a deck, fetch the cards
      if (type === 'decks') {
        fetchDeckCards()
      }
    } catch (error) {
      console.error('Error fetching content:', error)
      showMessage('error', 'Failed to load content')
    } finally {
      setLoading(false)
    }
  }

  const fetchDeckCards = async () => {
    try {
      const token = localStorage.getItem('firebase_token')
      const response = await fetch(`http://localhost:8000/decks/${id}/cards?limit=100`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (response.ok) {
        const data = await response.json()
        setCards(data.items || [])
      }
    } catch (error) {
      console.error('Error fetching deck cards:', error)
    }
  }

  // Extract headings from Lexical content for TOC (reuses shared utility)
  const tableOfContents = useMemo(() => {
    if (!content?.full_content || type !== 'books') return []
    return extractTableOfContents(content.full_content)
  }, [content, type])

  // Calculate reading stats (optional - can be displayed if needed)
  const readingStats = useMemo(() => {
    if (!content?.full_content || type !== 'books') return null
    return calculateReadingStats(content.full_content)
  }, [content, type])

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleLike = async () => {
    if (!isAuthenticated) {
      showMessage('error', 'Please login to like content')
      return
    }

    setActionLoading(true)
    try {
      const service = type === 'books' ? publicContentService : publicContentService
      if (isLiked) {
        await (type === 'books' ? service.unlikeBook(id) : service.unlikeDeck(id))
        setIsLiked(false)
        setContent((prev) => ({
          ...prev,
          public_metadata: {
            ...prev.public_metadata,
            likes: Math.max(0, (prev.public_metadata?.likes || 0) - 1)
          }
        }))
        showMessage('success', t('public.unlikeSuccess'))
      } else {
        await (type === 'books' ? service.likeBook(id) : service.likeDeck(id))
        setIsLiked(true)
        setContent((prev) => ({
          ...prev,
          public_metadata: {
            ...prev.public_metadata,
            likes: (prev.public_metadata?.likes || 0) + 1
          }
        }))
        showMessage('success', t('public.likeSuccess'))
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      showMessage('error', error.response?.data?.detail || 'Failed to update like')
    } finally {
      setActionLoading(false)
    }
  }

  const handleFork = async () => {
    if (!isAuthenticated) {
      showMessage('error', 'Please login to fork content')
      return
    }

    if (!window.confirm(t('public.forkConfirm'))) {
      return
    }

    setActionLoading(true)
    try {
      const service = type === 'books' ? publicContentService.forkBook : publicContentService.forkDeck
      const forked = await service(id)
      showMessage('success', t('public.forkSuccess'))

      // Navigate to forked content after 1 second
      setTimeout(() => {
        navigate(type === 'books' ? `/book/${forked._id}` : `/decks`)
      }, 1000)
    } catch (error) {
      console.error('Error forking content:', error)
      showMessage('error', error.response?.data?.detail || 'Failed to fork')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReport = async (reportData) => {
    try {
      await publicContentService.reportContent(type === 'books' ? 'book' : 'deck', id, reportData)
      showMessage('success', t('public.reportSuccess'))
      setShowReportModal(false)
    } catch (error) {
      console.error('Error reporting content:', error)
      showMessage('error', error.response?.data?.detail || 'Failed to submit report')
    }
  }

  const scrollToHeading = (headingId) => {
    const element = document.getElementById(headingId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveHeading(headingId)
    }
  }

  if (loading) {
    return (
      <Container maxWidth='xl' sx={{ py: { xs: 2, md: 4 } }}>
        <Skeleton variant='rectangular' height={60} sx={{ mb: 2, borderRadius: 'md' }} />
        <Skeleton variant='rectangular' height={200} sx={{ mb: 2, borderRadius: 'md' }} />
        <Grid container spacing={2}>
          <Grid xs={12} md={3}>
            <Skeleton variant='rectangular' height={300} sx={{ borderRadius: 'md' }} />
          </Grid>
          <Grid xs={12} md={9}>
            <Skeleton variant='rectangular' height={500} sx={{ borderRadius: 'md' }} />
          </Grid>
        </Grid>
      </Container>
    )
  }

  if (!content) {
    return (
      <Container maxWidth='lg' sx={{ py: { xs: 2, md: 4 } }}>
        <Typography level='h3'>Content not found</Typography>
      </Container>
    )
  }

  const contentType = type === 'books' ? 'book' : 'deck'

  return (
    <>
      {message && (
        <Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 10000 }}>
          {message.type === 'success' ? <SuccessWindow message={message.text} /> : <ErrorMsg message={message.text} />}
        </Box>
      )}

      <ReportModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReport}
        contentType={contentType}
        contentTitle={content.title}
      />

      <Container maxWidth='xl' sx={{ py: { xs: 2, md: 4 } }}>
        {/* Back Button */}
        <Button variant='plain' startDecorator={<BackIcon />} onClick={() => navigate('/browse')} size='sm' sx={{ mb: 3 }}>
          {t('common.back', { defaultValue: 'Back' })}
        </Button>

        {/* HEADER - Minimalist & Premium */}
        <Box sx={{ mb: 4 }}>
          {/* Title */}
          <Typography
            level='h1'
            sx={{
              mb: 2,
              fontWeight: 700,
              fontSize: { xs: '2rem', md: '2.5rem' },
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
              bgcolor: 'transparent'
            }}
          >
            {content.title || content.name}
          </Typography>

          {/* Meta Row - Author, Stats, Tags in one clean line */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 2, sm: 3 }}
            sx={{
              alignItems: { xs: 'flex-start', sm: 'center' },
              flexWrap: 'wrap',
              gap: { xs: 1.5, sm: 0 }
            }}
          >
            {/* Author */}
            {content.author_name && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon sx={{ fontSize: 16, color: 'text.tertiary' }} />
                <Typography level='body-sm' sx={{ color: 'text.secondary', bgcolor: 'transparent' }}>
                  {content.author_name}
                </Typography>
              </Box>
            )}

            {/* Divider */}
            {content.author_name && <Box sx={{ display: { xs: 'none', sm: 'block' }, width: '1px', height: '16px', bgcolor: 'divider' }} />}

            {/* Stats - Compact */}
            <Stack direction='row' spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ViewIcon sx={{ fontSize: 16, color: 'text.tertiary' }} />
                <Typography level='body-sm' sx={{ color: 'text.secondary', bgcolor: 'transparent' }}>
                  {content.public_metadata?.views || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FavoriteIcon sx={{ fontSize: 16, color: 'text.tertiary' }} />
                <Typography level='body-sm' sx={{ color: 'text.secondary', bgcolor: 'transparent' }}>
                  {content.public_metadata?.likes || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ForkIcon sx={{ fontSize: 16, color: 'text.tertiary' }} />
                <Typography level='body-sm' sx={{ color: 'text.secondary', bgcolor: 'transparent' }}>
                  {content.public_metadata?.forks || 0}
                </Typography>
              </Box>
            </Stack>

            {/* Divider */}
            {(content.public_metadata?.category || content.public_metadata?.tags?.length > 0) && (
              <Box sx={{ display: { xs: 'none', sm: 'block' }, width: '1px', height: '16px', bgcolor: 'divider' }} />
            )}

            {/* Tags - Minimal */}
            {(content.public_metadata?.category || content.public_metadata?.tags?.length > 0) && (
              <Stack direction='row' spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                {content.public_metadata.category && (
                  <Chip
                    variant='soft'
                    color='primary'
                    size='sm'
                    sx={{
                      fontWeight: 500,
                      fontSize: 'xs',
                      height: '24px'
                    }}
                  >
                    {t(`public.categories.${content.public_metadata.category.toLowerCase()}`, {
                      defaultValue: content.public_metadata.category.charAt(0).toUpperCase() + content.public_metadata.category.slice(1)
                    })}
                  </Chip>
                )}
                {content.public_metadata.tags?.slice(0, 2).map((tag) => (
                  <Chip
                    key={tag}
                    variant='soft'
                    size='sm'
                    sx={{
                      fontWeight: 500,
                      fontSize: 'xs',
                      height: '24px'
                    }}
                  >
                    {tag}
                  </Chip>
                ))}
              </Stack>
            )}
          </Stack>

          {/* Summary - Clean, if exists */}
          {content.summary && (
            <Typography
              level='body-md'
              sx={{
                mt: 2.5,
                color: 'text.secondary',
                lineHeight: 1.7,
                maxWidth: '800px',
                bgcolor: 'transparent'
              }}
            >
              {content.summary}
            </Typography>
          )}

          {/* Action Buttons - Minimal */}
          <Stack direction='row' spacing={1.5} sx={{ mt: 3 }}>
            <Button
              variant={isLiked ? 'solid' : 'outlined'}
              color={isLiked ? 'danger' : 'neutral'}
              size='sm'
              startDecorator={<FavoriteIcon />}
              onClick={handleLike}
              disabled={!isAuthenticated || actionLoading}
              sx={{
                minWidth: '80px',
                fontWeight: 500
              }}
            >
              {isLiked ? t('public.liked', { defaultValue: 'Liked' }) : t('public.like', { defaultValue: 'Like' })}
            </Button>

            {isAuthenticated && (
              <Button
                variant='outlined'
                color='neutral'
                size='sm'
                startDecorator={<ForkIcon />}
                onClick={handleFork}
                disabled={actionLoading}
                sx={{
                  minWidth: '80px',
                  fontWeight: 500
                }}
              >
                {t('public.fork', { defaultValue: 'Fork' })}
              </Button>
            )}

            <Button
              variant='plain'
              color='neutral'
              size='sm'
              startDecorator={<ReportIcon />}
              onClick={() => setShowReportModal(true)}
              sx={{
                fontWeight: 500,
                color: 'text.tertiary',
                '&:hover': {
                  bgcolor: 'background.level1'
                }
              }}
            >
              {t('public.report', { defaultValue: 'Report' })}
            </Button>
          </Stack>
        </Box>

        {/* Deck Cards Preview (for decks only) */}
        {type === 'decks' && cards.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography level='h4' sx={{ mb: 2.5, fontWeight: 600, bgcolor: 'transparent' }}>
              {t('public.cards', { defaultValue: 'Cards' })} ({cards.length})
            </Typography>
            <Grid container spacing={2}>
              {cards.map((card, index) => (
                <Grid key={card._id} xs={12} sm={6} md={4}>
                  <Card
                    variant='outlined'
                    sx={{
                      p: 2.5,
                      bgcolor: 'background.surface',
                      transition: 'all 0.2s ease',
                      height: '100%',
                      '&:hover': {
                        borderColor: 'primary.outlinedBorder',
                        transform: 'translateY(-4px)',
                        boxShadow: 'md'
                      }
                    }}
                  >
                    {/* Card number */}
                    <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 1.5, fontWeight: 600, bgcolor: 'transparent' }}>
                      Card {index + 1}
                    </Typography>

                    {/* Card title/front */}
                    {card.title && (
                      <Typography
                        level='title-sm'
                        sx={{
                          mb: 1.5,
                          fontWeight: 600,
                          color: 'text.primary',
                          minHeight: '2.5em',
                          lineHeight: 1.4,
                          bgcolor: 'transparent'
                        }}
                      >
                        {card.title}
                      </Typography>
                    )}

                    {/* Card content/back */}
                    {card.content && (
                      <Typography
                        level='body-sm'
                        sx={{
                          color: 'text.secondary',
                          bgcolor: 'background.level1',
                          p: 1.5,
                          borderRadius: 'sm',
                          border: '1px solid',
                          borderColor: 'divider',
                          minHeight: '3em',
                          lineHeight: 1.5
                        }}
                      >
                        {card.content}
                      </Typography>
                    )}

                    {/* Card tags */}
                    {card.tags && card.tags.length > 0 && (
                      <Stack direction='row' spacing={0.5} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                        {card.tags.slice(0, 3).map((tag) => (
                          <Chip key={tag} size='sm' variant='soft' sx={{ fontSize: '0.65rem' }}>
                            {tag}
                          </Chip>
                        ))}
                      </Stack>
                    )}
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* BOOK CONTENT - Sidebar (TOC) + Content (like BookEditor) */}
        {type === 'books' && content.full_content && (
          <Grid container spacing={2} sx={{ minHeight: '60vh', alignItems: 'flex-start' }}>
            {/* Left Sidebar: Table of Contents */}
            <Grid xs={12} md={3}>
              <Sheet
                variant='outlined'
                sx={{
                  p: 3,
                  bgcolor: 'background.surface',
                  position: { md: 'sticky' },
                  top: { md: 80 },
                  borderRadius: 'md',
                  maxHeight: { md: 'calc(100vh - 100px)' },
                  overflow: 'auto',
                  '&::-webkit-scrollbar': {
                    width: '4px'
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'transparent'
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'divider',
                    borderRadius: '8px'
                  }
                }}
              >
                <Stack spacing={2}>
                  {/* Header - Minimal */}
                  <Typography
                    level='body-xs'
                    sx={{
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: 'text.tertiary',
                      bgcolor: 'transparent'
                    }}
                  >
                    {t('books.tableOfContents')}
                  </Typography>

                  {/* Reading Stats - Compact Chips at TOP */}
                  {readingStats && readingStats.wordCount > 0 && (
                    <Stack direction='row' spacing={1} alignItems='center'>
                      <Chip
                        size='sm'
                        variant='soft'
                        sx={{
                          fontSize: 'xs',
                          fontWeight: 500,
                          bgcolor: 'background.level1',
                          color: 'text.secondary'
                        }}
                      >
                        ⏱️ {readingStats.readingTime} min
                      </Chip>
                      <Chip
                        size='sm'
                        variant='soft'
                        sx={{
                          fontSize: 'xs',
                          fontWeight: 500,
                          bgcolor: 'background.level1',
                          color: 'text.secondary'
                        }}
                      >
                        📖 {tableOfContents.length} sections
                      </Chip>
                    </Stack>
                  )}

                  <Divider />

                  {/* TOC List - Clean with border-left indicator */}
                  {tableOfContents.length > 0 ? (
                    <List size='sm' sx={{ p: 0, '--List-gap': '0px' }}>
                      {tableOfContents.map((heading) => {
                        const isActive = activeHeading === heading.id
                        const isH1 = heading.level === 1
                        const isH3 = heading.level === 3

                        return (
                          <ListItem key={heading.id} sx={{ p: 0 }}>
                            <ListItemButton
                              onClick={() => scrollToHeading(heading.id)}
                              sx={{
                                pl: isH3 ? 3 : isH1 ? 1 : 2,
                                py: 0.75,
                                borderLeft: isActive ? '2px solid' : '2px solid transparent',
                                borderColor: isActive ? 'primary.solidBg' : 'transparent',
                                bgcolor: 'transparent',
                                transition: 'all 0.15s ease',
                                '&:hover': {
                                  bgcolor: 'background.level1',
                                  borderLeftColor: 'primary.300'
                                }
                              }}
                            >
                              <Typography
                                level={isH1 ? 'body-sm' : 'body-xs'}
                                sx={{
                                  fontWeight: isH1 ? 600 : isActive ? 500 : 400,
                                  color: isActive ? 'text.primary' : 'text.secondary',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontSize: isH1 ? '0.875rem' : isH3 ? '0.75rem' : '0.8125rem',
                                  bgcolor: 'transparent'
                                }}
                              >
                                {heading.text}
                              </Typography>
                            </ListItemButton>
                          </ListItem>
                        )
                      })}
                    </List>
                  ) : (
                    <Typography level='body-sm' sx={{ color: 'text.tertiary', fontStyle: 'italic', bgcolor: 'transparent' }}>
                      {t('books.noHeadings')}
                    </Typography>
                  )}
                </Stack>
              </Sheet>
            </Grid>

            {/* Right: Content Area */}
            <Grid xs={12} md={9}>
              <Card
                variant='outlined'
                sx={{
                  bgcolor: 'background.surface',
                  minHeight: '60vh',
                  overflow: 'hidden',
                  borderRadius: 'md'
                }}
              >
                {/* Content with A4-style padding */}
                <Box
                  sx={{
                    px: { xs: 3, md: 6 },
                    py: { xs: 3, md: 5 },
                    '& h2, & h3, & h4': {
                      scrollMarginTop: '20px'
                    }
                  }}
                >
                  <EnhancedContentRenderer
                    content={typeof content.full_content === 'string' ? content.full_content : JSON.stringify(content.full_content)}
                    headings={tableOfContents}
                  />
                </Box>
              </Card>

              {/* Fork CTA */}
              {isAuthenticated && (
                <Card
                  variant='outlined'
                  sx={{
                    mt: 2,
                    p: 3,
                    bgcolor: 'primary.softBg',
                    borderColor: 'primary.outlinedBorder',
                    textAlign: 'center',
                    borderRadius: 'md'
                  }}
                >
                  <Typography level='title-lg' sx={{ mb: 1, color: 'primary.solidBg', fontWeight: 700, bgcolor: 'transparent' }}>
                    💡 {t('public.likeThis', { defaultValue: 'Like what you see?' })}
                  </Typography>
                  <Typography level='body-sm' sx={{ mb: 2.5, color: 'text.secondary', bgcolor: 'transparent' }}>
                    {t('public.forkMessage', { defaultValue: 'Fork this to your library to edit and make it yours' })}
                  </Typography>
                  <Button
                    variant='solid'
                    color='primary'
                    startDecorator={<ForkIcon />}
                    onClick={handleFork}
                    loading={actionLoading}
                    size='lg'
                  >
                    {t('public.forkToLibrary', { defaultValue: 'Fork to My Library' })}
                  </Button>
                </Card>
              )}
            </Grid>
          </Grid>
        )}
      </Container>
    </>
  )
}

// Enhanced Content Renderer with heading IDs - Handles both Lexical JSON and HTML
const EnhancedContentRenderer = ({ content, headings }) => {
  const parsedContent = useMemo(() => {
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content

      // Validate it's Lexical format
      if (parsed?.root?.children) {
        return { type: 'lexical', data: parsed }
      }
      return { type: 'unknown', data: null }
    } catch (error) {
      // If JSON parse fails, it might be HTML or plain text
      if (typeof content === 'string') {
        // Check if it looks like HTML
        if (content.trim().startsWith('<')) {
          return { type: 'html', data: content }
        }
        return { type: 'text', data: content }
      }
      return { type: 'unknown', data: null }
    }
  }, [content])

  // Handle HTML content
  if (parsedContent.type === 'html') {
    return (
      <Box
        sx={{
          '& p': { mb: 2, color: 'text.primary' },
          '& h1, & h2, & h3, & h4, & h5, & h6': {
            mb: 2,
            mt: 4,
            fontWeight: 600,
            color: 'text.primary',
            scrollMarginTop: '20px'
          },
          '& ul, & ol': { mb: 2, pl: 3, color: 'text.primary' },
          '& li': { mb: 0.5 },
          '& pre': {
            p: 2,
            mb: 2,
            borderRadius: 'sm',
            bgcolor: 'background.level1',
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'divider'
          },
          '& code': {
            fontFamily: 'monospace',
            fontSize: '0.875rem'
          },
          '& a': {
            color: 'primary.solidBg',
            textDecoration: 'underline',
            '&:hover': {
              color: 'primary.solidHoverBg'
            }
          },
          '& blockquote': {
            borderLeft: '4px solid',
            borderColor: 'primary.outlinedBorder',
            pl: 2.5,
            py: 1.5,
            mb: 2,
            fontStyle: 'italic',
            color: 'text.secondary'
          },
          '& hr': {
            my: 3,
            border: 'none',
            borderTop: '1px solid',
            borderColor: 'divider'
          }
        }}
        dangerouslySetInnerHTML={{ __html: parsedContent.data }}
      />
    )
  }

  // Handle plain text
  if (parsedContent.type === 'text') {
    return (
      <Typography level='body-md' sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', bgcolor: 'transparent' }}>
        {parsedContent.data}
      </Typography>
    )
  }

  // Handle unknown format
  if (parsedContent.type === 'unknown') {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography level='body-sm' sx={{ color: 'text.tertiary', bgcolor: 'transparent' }}>
          Content format not recognized
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 1, bgcolor: 'transparent' }}>
          This book may use an older format
        </Typography>
      </Box>
    )
  }

  // Handle Lexical JSON
  if (!parsedContent.data?.root?.children) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography level='body-sm' sx={{ color: 'text.tertiary', bgcolor: 'transparent' }}>
          Content has no data to display
        </Typography>
      </Box>
    )
  }

  let headingIndex = 0
  const lexicalData = parsedContent.data

  const renderNode = (node, index = 0) => {
    if (!node) return null

    // Text node
    if (node.type === 'text') {
      let text = node.text || ''
      let sx = {}

      if (node.format) {
        if (node.format & 1) sx.fontWeight = 'bold'
        if (node.format & 2) sx.fontStyle = 'italic'
        if (node.format & 8) sx.textDecoration = 'underline'
        if (node.format & 16) sx.textDecoration = 'line-through'
        if (node.format & 32) sx.fontFamily = 'monospace'
      }

      return (
        <Box key={index} component='span' sx={sx}>
          {text}
        </Box>
      )
    }

    // Paragraph
    if (node.type === 'paragraph') {
      return (
        <Typography key={index} level='body-md' sx={{ mb: 2, color: 'text.primary', bgcolor: 'transparent' }}>
          {node.children?.map((child, i) => renderNode(child, i))}
        </Typography>
      )
    }

    // Headings with IDs for scroll navigation
    if (node.type === 'heading') {
      const levelMap = {
        h1: 'h2',
        h2: 'h3',
        h3: 'h4',
        h4: 'title-lg',
        h5: 'title-md',
        h6: 'title-sm'
      }
      const level = levelMap[node.tag] || 'h4'
      const headingId = headings[headingIndex]?.id || `heading-${index}`
      headingIndex++

      return (
        <Typography
          key={index}
          level={level}
          id={headingId}
          sx={{ mb: 2, mt: 4, fontWeight: 600, color: 'text.primary', bgcolor: 'transparent' }}
        >
          {node.children?.map((child, i) => renderNode(child, i))}
        </Typography>
      )
    }

    // List (ordered/unordered)
    if (node.type === 'list') {
      const Component = node.listType === 'number' ? 'ol' : 'ul'
      return (
        <Box
          key={index}
          component={Component}
          sx={{
            mb: 2,
            pl: 3,
            '& li': {
              mb: 0.5,
              color: 'text.primary'
            }
          }}
        >
          {node.children?.map((child, i) => renderNode(child, i))}
        </Box>
      )
    }

    // List item
    if (node.type === 'listitem') {
      return (
        <Box key={index} component='li'>
          {node.children?.map((child, i) => renderNode(child, i))}
        </Box>
      )
    }

    // Quote
    if (node.type === 'quote') {
      return (
        <Box
          key={index}
          sx={{
            borderLeft: '4px solid',
            borderColor: 'primary.outlinedBorder',
            pl: 2.5,
            py: 1.5,
            mb: 2,
            fontStyle: 'italic',
            color: 'text.secondary',
            bgcolor: 'transparent'
          }}
        >
          {node.children?.map((child, i) => renderNode(child, i))}
        </Box>
      )
    }

    // Code block
    if (node.type === 'code') {
      return (
        <Box
          key={index}
          component='pre'
          sx={{
            p: 2.5,
            mb: 2,
            borderRadius: 'sm',
            bgcolor: 'background.level1',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            color: 'text.primary'
          }}
        >
          <Box component='code'>{node.children?.map((child, i) => (child.text ? child.text : ''))}</Box>
        </Box>
      )
    }

    // Link
    if (node.type === 'link') {
      return (
        <Box
          key={index}
          component='a'
          href={node.url}
          target='_blank'
          rel='noopener noreferrer'
          sx={{
            color: 'primary.solidBg',
            textDecoration: 'underline',
            '&:hover': {
              color: 'primary.solidHoverBg'
            }
          }}
        >
          {node.children?.map((child, i) => renderNode(child, i))}
        </Box>
      )
    }

    // Horizontal rule
    if (node.type === 'horizontalrule') {
      return <Box key={index} component='hr' sx={{ my: 3, border: 'none', borderTop: '1px solid', borderColor: 'divider' }} />
    }

    // Fallback
    if (node.children) {
      return <React.Fragment key={index}>{node.children.map((child, i) => renderNode(child, i))}</React.Fragment>
    }

    return null
  }

  return <Box>{lexicalData.root.children.map((node, index) => renderNode(node, index))}</Box>
}

export default PublicView

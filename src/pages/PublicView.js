import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
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
  ListItemButton,
  Drawer,
  LinearProgress,
  Tooltip,
  Snackbar,
  Alert
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
import ContentRenderer from '../components/Public/ContentRenderer'
import Editor from '../components/Books/Editor'
import { extractTableOfContents, calculateReadingStats } from '../utils/lexicalHelpers'

const PublicView = () => {
  const { t } = useTranslation()
  const { type, id } = useParams() // type = 'books' or 'decks'
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  const [content, setContent] = useState(null)
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', color: 'success' })
  const [actionLoading, setActionLoading] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [activeHeading, setActiveHeading] = useState(null)

  // New state
  const [scrollPercent, setScrollPercent] = useState(0)
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 900 : false))
  const [mobileTocOpen, setMobileTocOpen] = useState(false)
  const scrollRef = useRef(null)

  const showMessage = useCallback((type, text) => {
    const colorMap = { success: 'success', error: 'danger', warning: 'warning', info: 'neutral' }
    setSnackbar({ open: true, message: text, color: colorMap[type] || 'neutral' })
  }, [])

  const fetchDeckCards = useCallback(async () => {
    try {
      const data = await publicContentService.getPublicDeckCards(id, 10)
      setCards(data.cards || [])
    } catch (error) {
      console.error('Error fetching deck cards:', error)
    }
  }, [id])

  const fetchContent = useCallback(async () => {
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
      showMessage('error', t('common.errorGeneric', { defaultValue: 'Something went wrong' }))
    } finally {
      setLoading(false)
    }
  }, [type, id, isAuthenticated, showMessage, t, fetchDeckCards])

  useEffect(() => {
    fetchContent()
  }, [fetchContent])

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

  const handleLike = async () => {
    if (!isAuthenticated) {
      showMessage('error', t('auth.loginRequired', { defaultValue: 'Please log in to continue' }))
      return
    }

    setLikeLoading(true)
    try {
      if (isLiked) {
        await (type === 'books' ? publicContentService.unlikeBook(id) : publicContentService.unlikeDeck(id))
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
        await (type === 'books' ? publicContentService.likeBook(id) : publicContentService.likeDeck(id))
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
      showMessage('error', error.response?.data?.detail || t('common.errorGeneric', { defaultValue: 'Something went wrong' }))
    } finally {
      setLikeLoading(false)
    }
  }

  const handleFork = async () => {
    if (!isAuthenticated) {
      showMessage('error', t('auth.loginRequired', { defaultValue: 'Please log in to continue' }))
      return
    }

    setActionLoading(true)
    try {
      const forkService = type === 'books' ? publicContentService.forkBook : publicContentService.forkDeck
      const forked = await forkService(id)
      showMessage('success', t('public.forkSuccess'))

      // Navigate to forked content after 1 second
      setTimeout(() => {
        navigate(type === 'books' ? `/book/${forked._id}` : `/study`)
      }, 1000)
    } catch (error) {
      console.error('Error forking content:', error)
      const status = error.response?.status
      const detail = error.response?.data?.detail

      if (status === 400 && detail === 'cannot_fork_own_content') {
        showMessage('warning', t('public.forkOwnContent'))
        return
      }

      if (status === 409 && detail?.code === 'already_forked') {
        const existingId = detail.forked_content_id
        showMessage('info', t('public.alreadyForked'))
        setTimeout(() => {
          navigate(type === 'books' ? `/book/${existingId}` : `/study`)
        }, 1500)
        return
      }

      showMessage('error', error.response?.data?.detail || t('common.errorGeneric', { defaultValue: 'Something went wrong' }))
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
      showMessage('error', error.response?.data?.detail || t('common.errorGeneric', { defaultValue: 'Something went wrong' }))
    }
  }

  const scrollToHeading = (headingId) => {
    const element = document.getElementById(headingId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveHeading(headingId)
    }
  }

  // Mobile resize listener
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 900)
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Scroll progress tracker
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const total = scrollHeight - clientHeight
      setScrollPercent(total > 0 ? Math.round((scrollTop / total) * 100) : 0)
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [loading])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Box sx={{ height: 52, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.surface' }} />
        <Box sx={{ flexGrow: 1, bgcolor: 'background.level2', display: 'flex', pt: 4, px: 0 }}>
          <Box sx={{ width: 260, display: { xs: 'none', md: 'block' } }} />
          <Box sx={{ flexGrow: 1 }}>
            <Skeleton
              variant='rectangular'
              sx={{ width: { xs: 'calc(100% - 16px)', md: 559 }, mx: 'auto', height: 800, borderRadius: '3px' }}
            />
          </Box>
        </Box>
      </Box>
    )
  }

  if (!content) {
    return (
      <Container maxWidth='lg' sx={{ py: { xs: 2, md: 4 } }}>
        <Typography level='h3'>{t('public.contentNotFound')}</Typography>
      </Container>
    )
  }

  const contentType = type === 'books' ? 'book' : 'deck'
  const isOwnContent = isAuthenticated && user?.uid && content?.user_id === user.uid

  return (
    <>
      <ReportModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReport}
        contentType={contentType}
        contentTitle={content.title}
      />

      {/* DECK VIEW — untouched */}
      {type === 'decks' && (
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
                lineHeight: 1.2
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
                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                    {content.author_name}
                  </Typography>
                </Box>
              )}

              {/* Divider */}
              {content.author_name && (
                <Box sx={{ display: { xs: 'none', sm: 'block' }, width: '1px', height: '16px', bgcolor: 'divider' }} />
              )}

              {/* Stats - Views only (likes and forks shown on interactive buttons) */}
              <Stack direction='row' spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ViewIcon sx={{ fontSize: 16, color: 'text.tertiary' }} />
                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                    {content.public_metadata?.views || 0}
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
                  maxWidth: '800px'
                }}
              >
                {content.summary}
              </Typography>
            )}

            {/* Fork attribution — shown when this published item is itself a fork */}
            {content?.forked_from && (
              <Stack direction='row' spacing={0.75} alignItems='center' sx={{ mt: 1.5 }}>
                <ForkIcon sx={{ fontSize: 13, color: 'text.tertiary' }} />
                <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                  {t('public.forkedFrom', {
                    title: content.forked_from.title,
                    author: content.forked_from.author_name || t('public.unknownAuthor')
                  })}
                </Typography>
              </Stack>
            )}

            {/* Action Buttons - Minimal */}
            <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mt: 3 }}>
              <Stack direction='row' alignItems='center' spacing={0.5}>
                <Tooltip title={t(isLiked ? 'public.unlike' : 'public.like')} size='sm' variant='soft' placement='top'>
                  <IconButton
                    size='sm'
                    variant='plain'
                    color={isLiked ? 'danger' : 'neutral'}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLike()
                    }}
                    disabled={!isAuthenticated || likeLoading}
                    aria-label={t(isLiked ? 'public.unlike' : 'public.like')}
                    sx={{
                      transition: 'transform 0.15s ease',
                      '&:active': { transform: 'scale(0.9)' },
                      '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder' }
                    }}
                  >
                    {isLiked ? (
                      <FavoriteIcon sx={{ fontSize: 18, color: 'danger.plainColor' }} />
                    ) : (
                      <FavoriteBorderIcon sx={{ fontSize: 18 }} />
                    )}
                  </IconButton>
                </Tooltip>
                <Typography level='body-sm' sx={{ color: 'text.secondary', fontWeight: 500, minWidth: '1ch' }}>
                  {content?.public_metadata?.likes || 0}
                </Typography>
              </Stack>

              {isAuthenticated && !isOwnContent && (
                <Button
                  variant='outlined'
                  color='neutral'
                  size='sm'
                  startDecorator={<ForkIcon sx={{ fontSize: 16 }} />}
                  onClick={handleFork}
                  loading={actionLoading}
                  aria-label={t('public.fork')}
                  sx={{
                    fontWeight: 500,
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '3px' }
                  }}
                >
                  {t('public.fork')}
                  {(content?.public_metadata?.forks || 0) > 0 && (
                    <Typography component='span' level='body-xs' sx={{ ml: 0.75, opacity: 0.55, fontWeight: 500 }}>
                      {content.public_metadata.forks}
                    </Typography>
                  )}
                </Button>
              )}

              <Button
                variant='plain'
                color='neutral'
                size='sm'
                startDecorator={<ReportIcon sx={{ fontSize: 16 }} />}
                onClick={() => setShowReportModal(true)}
                sx={{
                  fontWeight: 500,
                  color: 'text.tertiary',
                  '&:hover': { bgcolor: 'background.level1' },
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '3px' }
                }}
              >
                {t('public.report')}
              </Button>
            </Stack>
          </Box>

          {/* Deck Cards Preview (for decks only) */}
          {cards.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography level='h4' sx={{ mb: 2.5, fontWeight: 600 }}>
                {t('public.cards')} ({cards.length})
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
                      <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 1.5, fontWeight: 600 }}>
                        {t('public.cards')} {index + 1}
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
                            lineHeight: 1.4
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
        </Container>
      )}

      {/* BOOK VIEW */}
      {type === 'books' && content && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
          {/* Single-row header: back · title · like · CTA */}
          <Sheet
            variant='plain'
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 100,
              height: 52,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              px: { xs: 1.5, md: 2 },
              gap: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.surface'
            }}
          >
            {/* Back */}
            <Tooltip title={t('public.backToBrowse', 'Back to Browse')} size='sm' variant='soft' placement='bottom'>
              <IconButton
                size='sm'
                variant='plain'
                color='neutral'
                onClick={() => navigate('/browse')}
                aria-label={t('public.backToBrowse', 'Back to Browse')}
              >
                <BackIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>

            {/* Book title — centered, truncated */}
            <Box sx={{ flex: 1, minWidth: 0, px: 1 }}>
              <Typography level='title-sm' noWrap sx={{ fontWeight: 600, letterSpacing: '-0.01em', color: 'text.primary' }}>
                {content.title || content.name}
              </Typography>
              {content.author_name && (
                <Typography level='body-xs' noWrap sx={{ color: 'text.tertiary', lineHeight: 1.2 }}>
                  {content.author_name}
                </Typography>
              )}
              {content?.forked_from && (
                <Typography level='body-xs' noWrap sx={{ color: 'text.tertiary', lineHeight: 1.2 }}>
                  <ForkIcon sx={{ fontSize: 11, verticalAlign: 'middle', mr: 0.5 }} />
                  {t('public.forkedFrom', {
                    title: content.forked_from.title,
                    author: content.forked_from.author_name || t('public.unknownAuthor')
                  })}
                </Typography>
              )}
            </Box>

            {/* Views */}
            <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
              <ViewIcon sx={{ fontSize: 15, color: 'text.tertiary' }} />
              <Typography level='body-xs' sx={{ color: 'text.tertiary', minWidth: 12 }}>
                {content.public_metadata?.views || 0}
              </Typography>
            </Stack>

            {/* Like with count */}
            <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
              <Tooltip title={t(isLiked ? 'public.unlike' : 'public.like')} size='sm' variant='soft' placement='bottom'>
                <IconButton
                  size='sm'
                  variant='plain'
                  color={isLiked ? 'danger' : 'neutral'}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleLike()
                  }}
                  disabled={likeLoading}
                  aria-label={t(isLiked ? 'public.unlike' : 'public.like')}
                  sx={{
                    transition: 'transform 0.15s ease',
                    '&:active': { transform: 'scale(0.9)' },
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder' }
                  }}
                >
                  {isLiked ? (
                    <FavoriteIcon sx={{ fontSize: 16, color: 'danger.plainColor' }} />
                  ) : (
                    <FavoriteBorderIcon sx={{ fontSize: 16 }} />
                  )}
                </IconButton>
              </Tooltip>
              <Typography level='body-xs' sx={{ color: 'text.secondary', minWidth: 12, fontWeight: 500 }}>
                {content.public_metadata?.likes || 0}
              </Typography>
            </Stack>

            {/* Primary CTA */}
            {isAuthenticated && !isOwnContent ? (
              <Button
                size='sm'
                variant='outlined'
                color='neutral'
                startDecorator={<ForkIcon sx={{ fontSize: 15 }} />}
                onClick={handleFork}
                loading={actionLoading}
                aria-label={t('public.fork')}
                sx={{
                  flexShrink: 0,
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '3px' }
                }}
              >
                {t('public.fork')}
                {(content?.public_metadata?.forks || 0) > 0 && (
                  <Typography component='span' level='body-xs' sx={{ ml: 0.75, opacity: 0.55, fontWeight: 500 }}>
                    {content.public_metadata.forks}
                  </Typography>
                )}
              </Button>
            ) : !isAuthenticated ? (
              <Button size='sm' variant='soft' color='primary' onClick={() => navigate('/register')} sx={{ flexShrink: 0 }}>
                {t('public.signUpFree')}
              </Button>
            ) : null}
          </Sheet>

          {/* Reading progress */}
          <LinearProgress
            determinate
            value={scrollPercent}
            size='sm'
            color='primary'
            sx={{
              position: 'fixed',
              top: 52,
              left: 0,
              right: 0,
              zIndex: 99,
              borderRadius: 0,
              height: '2px',
              '--LinearProgress-radius': '0px'
            }}
          />

          {/* Scrollable body */}
          <Box ref={scrollRef} sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {/* Desk */}
            <Box
              sx={{ bgcolor: 'background.level2', display: 'flex', pt: { xs: 2, md: 4 }, pb: { xs: 12, md: 16 }, px: 0, minHeight: '60vh' }}
            >
              {/* TOC Sidebar — desktop */}
              {tableOfContents.length > 0 && (
                <Box
                  sx={{
                    width: 260,
                    flexShrink: 0,
                    display: { xs: 'none', md: 'block' },
                    position: 'sticky',
                    top: 54,
                    alignSelf: 'flex-start',
                    maxHeight: 'calc(100vh - 56px)',
                    overflowY: 'auto',
                    px: 2,
                    py: 2
                  }}
                >
                  <Typography
                    level='body-xs'
                    sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.tertiary', mb: 1.5 }}
                  >
                    {t('books.tableOfContents', 'Contents')}
                  </Typography>
                  <List size='sm' sx={{ p: 0, '--List-gap': '0px' }}>
                    {tableOfContents.map((heading) => {
                      const isActive = activeHeading === heading.id
                      return (
                        <ListItem key={heading.id} sx={{ p: 0 }}>
                          <ListItemButton
                            onClick={() => scrollToHeading(heading.id)}
                            sx={{
                              pl: heading.level === 3 ? 3 : heading.level === 1 ? 1 : 2,
                              py: 0.625,
                              borderLeft: '2px solid',
                              borderColor: isActive ? 'primary.solidBg' : 'transparent',
                              borderRadius: 0,
                              transition: 'all 0.15s ease',
                              '&:hover': { bgcolor: 'background.level1' }
                            }}
                          >
                            <Typography
                              level='body-xs'
                              sx={{
                                fontWeight: isActive ? 600 : heading.level === 1 ? 500 : 400,
                                color: isActive ? 'text.primary' : 'text.secondary',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: heading.level === 1 ? '0.8125rem' : heading.level === 3 ? '0.6875rem' : '0.75rem'
                              }}
                            >
                              {heading.text}
                            </Typography>
                          </ListItemButton>
                        </ListItem>
                      )
                    })}
                  </List>
                </Box>
              )}

              {/* Content */}
              <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Editor
                  initialContent={content.full_content}
                  book={content}
                  onSave={() => {}}
                  isReadOnly={true}
                  pageSize={content.page_size || 'a4'}
                  pageZoom={1.0}
                />

                {/* End CTA */}
                <Box sx={{ maxWidth: 559, mx: 'auto', px: 2, pb: 6, textAlign: 'center' }}>
                  <Divider sx={{ mb: 3, opacity: 0.4 }} />
                  <Typography level='body-xs' sx={{ color: 'text.tertiary', lineHeight: 1.7 }}>
                    {isAuthenticated
                      ? t('public.endCTAAuth', 'Fork this book to your library to edit and make it yours')
                      : t('public.endCTAGuest', 'Written with Nowry · Start your own book for free')}
                  </Typography>
                  {!isOwnContent && (
                    <Button
                      size='sm'
                      variant='solid'
                      color='primary'
                      loading={isAuthenticated ? actionLoading : false}
                      sx={{
                        mt: 1.5,
                        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '3px' }
                      }}
                      onClick={isAuthenticated ? handleFork : () => navigate('/register')}
                    >
                      {isAuthenticated ? t('public.forkToLibrary') : t('public.startWriting')}
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
          {/* end scrollable body */}

          {/* Mobile TOC chip */}
          {isMobile && tableOfContents.length > 0 && (
            <Chip
              size='sm'
              variant='soft'
              color='neutral'
              onClick={() => setMobileTocOpen(true)}
              sx={{
                position: 'fixed',
                bottom: 90,
                left: 16,
                zIndex: 200,
                display: { xs: 'flex', md: 'none' },
                boxShadow: 'sm',
                cursor: 'pointer'
              }}
            >
              {t('books.tableOfContents', 'Contents')}
            </Chip>
          )}

          {/* Mobile TOC Drawer */}
          <Drawer
            anchor='bottom'
            open={mobileTocOpen}
            onClose={() => setMobileTocOpen(false)}
            size='sm'
            sx={{ display: { xs: 'flex', md: 'none' } }}
          >
            <Box sx={{ p: 2, pt: 3 }}>
              <Typography level='title-sm' sx={{ mb: 2, fontWeight: 600 }}>
                {t('books.tableOfContents', 'Contents')}
              </Typography>
              <List size='sm' sx={{ p: 0 }}>
                {tableOfContents.map((heading) => (
                  <ListItem key={heading.id} sx={{ p: 0 }}>
                    <ListItemButton
                      onClick={() => {
                        scrollToHeading(heading.id)
                        setMobileTocOpen(false)
                      }}
                      sx={{ pl: heading.level === 3 ? 3 : heading.level === 1 ? 1 : 2, py: 0.75 }}
                    >
                      <Typography level='body-sm' sx={{ fontWeight: heading.level === 1 ? 500 : 400, color: 'text.secondary' }}>
                        {heading.text}
                      </Typography>
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          </Drawer>
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ zIndex: 10000 }}
      >
        <Alert variant='soft' color={snackbar.color} size='sm' sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default PublicView

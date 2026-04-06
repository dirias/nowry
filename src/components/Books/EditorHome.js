import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Editor from './Editor'
import ContentNavigator from '../Editor/ContentNavigator'
import EditorSkeleton from './EditorSkeleton'
import { useParams, useLocation } from 'react-router-dom'
import { Save, Check, Loader2, CloudOff, AlertTriangle, Minus, Plus, Lock, Unlock, Timer } from 'lucide-react'
import { booksService, publicContentService } from '../../api/services'
import { Box, Input, IconButton, Button, Sheet, Stack, Typography, Divider, Drawer, Tooltip, Snackbar } from '@mui/joy'
import { LexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import Toolbar from './Toolbar'
import { useAutoSave, SAVE_STATUS } from '../../hooks/useAutoSave'
import { Menu as MenuIcon } from 'lucide-react'
import PublicIcon from '@mui/icons-material/Public'
import PublicOffIcon from '@mui/icons-material/PublicOff'
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal'
import { useTranslation } from 'react-i18next'

export default function EditorHome() {
  const { id } = useParams()
  const location = useLocation()
  const { t } = useTranslation()

  const [showMobileSidebar, setShowMobileSidebar] = useState(false)

  // book might be stale from location state if we just navigated
  const [book, setBook] = useState(location.state?.book || null)
  const [bookName, setBookName] = useState(book?.title || '')

  // Success/Error Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', color: 'success' })
  const [confirmUnpublishOpen, setConfirmUnpublishOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Flow content state (TOC and reading stats)
  const [tocData, setTocData] = useState([])
  const [readingStats, setReadingStats] = useState({ wordCount: 0, readingTime: 0 })

  // refs to prevent redundant fetches and handle cleanup
  const fetchedIdRef = useRef(null)
  const abortControllerRef = useRef(null)

  // Swipe Gesture Ref
  const touchStart = useRef(null)
  const touchEnd = useRef(null)

  // Minimum swipe distance (px)
  const minSwipeDistance = 75

  const handleTouchStart = (e) => {
    touchEnd.current = null
    touchStart.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return
    const distance = touchStart.current - touchEnd.current
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    // Left Sidebar: Swipe Right (drag from left) to Open
    // NOTE: User said "swipe left", but standard for Left Menu is Swipe Right.
    // If "swipe left" typically means "move finger left", that means "reveal right content".
    // Assuming Standard Left Menu for now.

    // Swipe Right -> Open Left Sidebar
    if (isRightSwipe) setShowMobileSidebar(true)

    // Swipe Left -> Close Sidebar (optional if not overlapping)
    if (isLeftSwipe) setShowMobileSidebar(false)
  }

  // Track touch move to update end position
  const handleTouchMove = (e) => (touchEnd.current = e.targetTouches[0].clientX)

  const [content, setContent] = useState('')
  const [pageSize, setPageSize] = useState('a4')

  // Wrapped setPageSize with logging
  const handlePageSizeChange = (newSize) => {
    console.log('📐 Page size changing from', pageSize, 'to', newSize)
    setPageSize(newSize)
  }

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false)

  // Dynamic zoom based on device - mobile gets 0.75x for better overview
  const [zoom, setZoom] = useState(1.0)

  // Set locked by default on mobile, unlocked on desktop
  const [isLocked, setIsLocked] = useState(false)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false)
  const [focusedEditor, setFocusedEditor] = useState(null)
  const [loading, setLoading] = useState(true)

  // Detect mobile device and set appropriate zoom + locked state
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 900 // md breakpoint
      setIsMobile(mobile)

      // Set optimal zoom for mobile reading (0.75x gives better page overview)
      if (mobile) {
        setZoom(0.75)
        // Set locked on mobile for read-first experience
        if (!book) {
          setIsLocked(true)
        }
      } else {
        setZoom(1.0) // Reset to normal on desktop
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Set locked on mobile when book loads
  useEffect(() => {
    if (book && isMobile) {
      setIsLocked(true)
    }
  }, [book, isMobile])

  const handleSaveBook = useCallback(
    async (currentContent) => {
      try {
        // Prepare content for saving
        let contentToSave = currentContent

        // If content is a JSON object, stringify it
        if (typeof currentContent === 'object' && currentContent !== null) {
          contentToSave = JSON.stringify(currentContent)
        }

        const updateData = {
          title: bookName,
          page_size: pageSize,
          full_content: contentToSave,
          auto_save_enabled: autoSaveEnabled
        }

        console.log('💾 Saving book (JSON Content-First format)')
        console.log('  - Page size:', pageSize)
        console.log('  - Content size:', contentToSave.length, 'bytes')
        await booksService.update(id, updateData)
        console.log('✓ Save successful')
      } catch (e) {
        console.error('❌ Error updating book:', e)
      }
    },
    [id, bookName, pageSize, autoSaveEnabled]
  )

  // Manual save that always executes (bypasses auto-save "no changes" check)
  const handleManualSave = async () => {
    try {
      console.log('Manual save triggered')
      console.log('Current pageSize state:', pageSize)
      console.log('Current content length:', content?.length)
      await handleSaveBook(content)
      // Update the auto-save baseline to prevent redundant saves
      resetBaseline(content)
    } catch (e) {
      console.error('Manual save failed:', e)
    }
  }

  // Toggle auto-save and save preference immediately
  const handleToggleAutoSave = async () => {
    const newAutoSaveState = !autoSaveEnabled
    setAutoSaveEnabled(newAutoSaveState)

    try {
      // Save the preference immediately
      await booksService.update(id, { auto_save_enabled: newAutoSaveState })
      console.log('Auto-save preference updated:', newAutoSaveState)
    } catch (e) {
      console.error('Failed to save auto-save preference:', e)
      // Revert on error
      setAutoSaveEnabled(!newAutoSaveState)
    }
  }

  const handleContentChange = useCallback((newHtml) => {
    setContent(newHtml)
  }, [])

  // Auto-Save Hook
  const {
    status,
    saveNow,
    lastSaved,
    error: saveError,
    resetBaseline
  } = useAutoSave({
    id: book?._id,
    content,
    onSave: (html) => handleSaveBook(html),
    debounceMs: autoSaveEnabled ? 2000 : null, // Enable auto-save if toggled on
    forceSaveMs: autoSaveEnabled ? 30000 : null // Enable force save if toggled on
  })

  // Note: Page size is saved when user manually saves or when autosave is enabled
  // No need for separate auto-save effect here

  // Load Book & Migrate if needed
  useEffect(() => {
    // If we already have the book with this ID, and it's not stale, we can skip initial skeleton
    const hasCorrectBook = book && book._id === id

    const fetchBook = async () => {
      // Prevent redundant fetches for the same ID within the same mount cycle
      // (Handles React StrictMode and rapid re-renders)
      if (fetchedIdRef.current === id) return

      // Cancel any existing fetch for previous ID
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      try {
        // Only show skeleton if we don't have the book data yet
        if (!hasCorrectBook) {
          setLoading(true)
        }

        console.log(`🔗 Fetching book data for ID: ${id}`)
        const fullBook = await booksService.getById(id)

        // Final check to ensure we didn't navigate away during fetch
        if (fetchedIdRef.current === id) return

        setBook(fullBook)
        setBookName(fullBook.title)

        // Load page size preference
        if (fullBook.page_size) {
          console.log('📚 Page size:', fullBook.page_size)
          setPageSize(fullBook.page_size)
        }

        // Load auto-save preference
        if (fullBook.auto_save_enabled !== undefined) {
          setAutoSaveEnabled(fullBook.auto_save_enabled)
        }

        const initialHtml = fullBook.full_content || ''
        setContent(initialHtml)
        resetBaseline(initialHtml)

        // Mark as successfully fetched
        fetchedIdRef.current = id
      } catch (e) {
        if (e.name === 'CanceledError' || e.name === 'AbortError') {
          console.log('Fetch aborted - user navigated away')
          return
        }
        console.error('Error fetching book:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchBook()

    return () => {
      // Clean up on unmount or ID change
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [id, resetBaseline, book]) // Added book to check if we can skip loading

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Publish/Unpublish handlers
  const handlePublish = async () => {
    try {
      setIsProcessing(true)
      // Auto-populate with smart defaults
      const metadata = {
        category: 'Other', // Default category
        tags: [], // Empty tags is fine
        language: 'en',
        difficulty_level: null, // Optional
        license_type: 'all_rights_reserved',
        is_original_content: true
      }

      await publicContentService.publishBook(book._id, metadata)
      setSnackbar({
        open: true,
        message: t('public.publishSuccess', { defaultValue: '✅ Published successfully!' }),
        color: 'success'
      })
      // Refresh book to get updated is_public status
      const updatedBook = await booksService.getById(id)
      setBook(updatedBook)
    } catch (error) {
      console.error('Error publishing book:', error)
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || t('errors.generic', { defaultValue: 'Failed to publish' }),
        color: 'danger'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUnpublish = async () => {
    try {
      setIsProcessing(true)
      await publicContentService.unpublishBook(book?._id)
      setSnackbar({
        open: true,
        message: t('public.unpublishSuccess', { defaultValue: '✅ Unpublished successfully!' }),
        color: 'success'
      })
      // Refresh book to get updated is_public status
      const updatedBook = await booksService.getById(id)
      setBook(updatedBook)
      setConfirmUnpublishOpen(false)
    } catch (error) {
      console.error('Error unpublishing book:', error)
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || t('errors.generic', { defaultValue: 'Failed to unpublish' }),
        color: 'danger'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Status Badge Component
  const StatusBadge = () => {
    if (status === SAVE_STATUS.SAVING) {
      return (
        <Stack direction='row' spacing={0.75} alignItems='center'>
          <Loader2 size={13} style={{ color: 'var(--joy-palette-text-tertiary)' }} className='animate-spin' />
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            {t('books.status.saving', { defaultValue: 'Saving…' })}
          </Typography>
        </Stack>
      )
    }
    if (status === SAVE_STATUS.SAVED) {
      return (
        <Stack direction='row' spacing={0.75} alignItems='center'>
          <Check size={13} style={{ color: 'var(--joy-palette-success-plainColor)' }} />
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            {autoSaveEnabled
              ? t('books.status.saved', { defaultValue: 'Saved' })
              : t('books.status.manualSave', { defaultValue: 'Manual save' })}
          </Typography>
        </Stack>
      )
    }
    if (status === SAVE_STATUS.ERROR) {
      return (
        <Stack direction='row' spacing={0.75} alignItems='center'>
          <AlertTriangle size={13} style={{ color: 'var(--joy-palette-danger-plainColor)' }} />
          <Typography level='body-xs' sx={{ color: 'danger.plainColor' }}>
            {t('books.status.saveFailed', { defaultValue: 'Save failed' })}
          </Typography>
        </Stack>
      )
    }
    if (status === SAVE_STATUS.UNSAVED) {
      if (autoSaveEnabled) {
        return (
          <Typography level='body-xs' sx={{ color: 'text.tertiary', fontStyle: 'italic' }}>
            {t('books.status.unsaved', { defaultValue: 'Unsaved changes…' })}
          </Typography>
        )
      }
      return (
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t('books.status.manualSave', { defaultValue: 'Manual save' })}
        </Typography>
      )
    }
    return null
  }

  // Page Overview Logic
  const [pagesData, setPagesData] = useState([])
  const [activePageIndex, setActivePageIndex] = useState(0)

  const handlePageUpdate = useCallback((data) => {
    setPagesData(data)
  }, [])

  // Pages data comes from pagination plugin; no placeholders to avoid stale counts

  const handleScrollToPage = (index) => {
    const pages = document.querySelectorAll('.editor-page')
    if (pages[index]) {
      pages[index].scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActivePageIndex(index)
    }
  }

  // Active page detection on scroll
  useEffect(() => {
    const container = document.querySelector('.editor-scroll-container')
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pages = Array.from(document.querySelectorAll('.editor-page'))
            const index = pages.indexOf(entry.target)
            if (index !== -1) {
              setActivePageIndex(index)
            }
          }
        })
      },
      {
        root: container,
        threshold: 0.5
      }
    )

    // Observe all existing pages
    const observePages = () => {
      const pages = document.querySelectorAll('.editor-page')
      pages.forEach((page) => observer.observe(page))
    }

    // Initial observation
    observePages()

    // Re-observe when pages are added/removed (e.g., after paste)
    const mutationObserver = new MutationObserver(() => {
      // Disconnect and re-observe all pages
      observer.disconnect()
      observePages()
    })

    mutationObserver.observe(container, {
      childList: true,
      subtree: true
    })

    return () => {
      observer.disconnect()
      mutationObserver.disconnect()
    }
  }, [pagesData.length])

  if (loading) {
    return <EditorSkeleton />
  }

  if (!book) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 2 }}>
        <CloudOff size={48} color='var(--joy-palette-neutral-500)' />
        <Typography level='h4' color='neutral'>
          Book not found or could not be loaded
        </Typography>
      </Box>
    )
  }

  const handleImageUpload = () => {
    // User requested manual save only.
    // We do nothing here, user must click Save.
    console.log('Image uploaded. User must save manually.')
  }

  return (
    <>
      {/* Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        color={snackbar.color}
        variant='soft'
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        {snackbar.message}
      </Snackbar>

      {/* Unpublish Confirmation Modal */}
      {confirmUnpublishOpen && (
        <DeleteConfirmationModal
          open={confirmUnpublishOpen}
          onClose={() => setConfirmUnpublishOpen(false)}
          onConfirm={handleUnpublish}
          loading={isProcessing}
          variant='warning'
          title={t('public.unpublish', { defaultValue: 'Unpublish Book' })}
          description={t('public.unpublishConfirm', {
            defaultValue: 'Are you sure you want to unpublish this book? It will no longer be visible in the public library.'
          })}
          confirmText={t('public.unpublish', { defaultValue: 'Unpublish' })}
        />
      )}

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          minHeight: 0,
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: 'background.level2'
        }}
      >
        {/* 🏛 Top Header & Formatting Ribbon */}
        <Sheet
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.surface',
            zIndex: 1000,
            boxShadow: 'sm',
            flexShrink: 0
          }}
        >
          {/* Row 1: Book Info */}
          <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ height: 50, px: { xs: 2, md: 3 } }}>
            <Stack direction='row' alignItems='center' spacing={2} sx={{ flexGrow: 1 }}>
              {/* Mobile Menu Button */}
              <IconButton
                variant='plain'
                color='neutral'
                onClick={() => setShowMobileSidebar(true)}
                sx={{ display: { xs: 'inline-flex', md: 'none' }, mr: 1 }}
              >
                <MenuIcon />
              </IconButton>

              <Input
                value={bookName}
                onChange={(e) => setBookName(e.target.value)}
                disabled={isLocked}
                variant='plain'
                sx={{
                  fontSize: 'lg',
                  fontWeight: 'bold',
                  bgcolor: 'transparent',
                  '&:hover': { bgcolor: isLocked ? 'transparent' : 'background.level1' },
                  px: 1,
                  width: '100%',
                  maxWidth: { xs: 150, md: 400 },
                  textOverflow: 'ellipsis',
                  '&.Mui-disabled': { color: 'text.primary' }
                }}
              />
              <Divider orientation='vertical' sx={{ height: 20, display: { xs: 'none', md: 'block' } }} />
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <StatusBadge />
              </Box>
              {saveError && (
                <Typography level='body-xs' color='danger' sx={{ display: { xs: 'none', sm: 'block' } }}>
                  {saveError}
                </Typography>
              )}
            </Stack>

            <Stack direction='row' spacing={1.5} alignItems='center'>
              {/* Publish/Unpublish Button - One Click! */}
              {book?.is_public ? (
                <Tooltip title={t('public.unpublish', { defaultValue: 'Unpublish' })}>
                  <Button
                    variant='soft'
                    color='success'
                    onClick={() => setConfirmUnpublishOpen(true)}
                    size='sm'
                    startDecorator={<PublicIcon />}
                    loading={isProcessing}
                  >
                    {t('public.published', { defaultValue: 'Published' })}
                  </Button>
                </Tooltip>
              ) : (
                <Tooltip title={t('public.publishInstant', { defaultValue: 'Share with community' })}>
                  <Button
                    variant='outlined'
                    color='primary'
                    onClick={handlePublish}
                    size='sm'
                    startDecorator={<PublicIcon />}
                    loading={isProcessing}
                  >
                    {t('public.publish', { defaultValue: 'Publish' })}
                  </Button>
                </Tooltip>
              )}

              <Divider orientation='vertical' sx={{ height: 20, display: { xs: 'none', sm: 'block' } }} />

              {/* Zoom Controls */}
              <Stack direction='row' alignItems='center' spacing={0.5} sx={{ display: { xs: 'none', sm: 'flex' } }}>
                <IconButton
                  size='sm'
                  variant='plain'
                  onClick={() => setZoom((prev) => Math.max(0.25, prev - 0.25))}
                  disabled={zoom <= 0.25}
                >
                  <Minus size={14} />
                </IconButton>
                <Typography level='body-xs' sx={{ minWidth: 40, textAlign: 'center' }}>
                  {Math.round(zoom * 100)}%
                </Typography>
                <IconButton size='sm' variant='plain' onClick={() => setZoom((prev) => Math.min(2.0, prev + 0.25))} disabled={zoom >= 2.0}>
                  <Plus size={14} />
                </IconButton>
              </Stack>
              <Divider orientation='vertical' sx={{ height: 20, display: { xs: 'none', sm: 'block' } }} />

              <Button
                variant={autoSaveEnabled ? 'soft' : 'plain'}
                color={autoSaveEnabled ? 'primary' : 'neutral'}
                onClick={handleToggleAutoSave}
                size='sm'
                startDecorator={<Timer size={14} />}
                sx={{ fontSize: 'xs', fontWeight: 500 }}
              >
                {t('books.autosave', { defaultValue: 'Autosave' })}
              </Button>

              <IconButton variant='outlined' color='neutral' onClick={handleManualSave} size='sm' sx={{ borderRadius: 'md' }}>
                <Save size={16} />
              </IconButton>

              <IconButton
                variant='outlined'
                color='neutral'
                onClick={() => setIsLocked(!isLocked)}
                size='sm'
                sx={{
                  borderRadius: 'md',
                  bgcolor: isLocked ? 'background.level1' : 'transparent',
                  '&:hover': { bgcolor: 'background.level2' }
                }}
              >
                {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
              </IconButton>
            </Stack>
          </Stack>

          <Divider />

          {/* Row 2: Formatting Ribbon - Only show when unlocked */}
          {!isLocked && (
            <Box sx={{ height: 50, display: 'flex', alignItems: 'center', px: { xs: 2, md: 3 }, overflowX: 'auto' }}>
              {focusedEditor ? (
                <LexicalComposerContext.Provider value={[focusedEditor, {}]}>
                  <Toolbar onSave={handleManualSave} disabled={isLocked} />
                </LexicalComposerContext.Provider>
              ) : null}
            </Box>
          )}
        </Sheet>

        <Box
          sx={{ display: 'flex', flexDirection: 'row', flexGrow: 1, overflow: 'hidden', minHeight: 0 }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* 📋 Left Sidebar - Content Navigator (Desktop) */}
          <Box
            sx={{
              width: 280,
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.surface',
              display: { xs: 'none', md: 'block' },
              overflow: 'hidden'
            }}
          >
            <ContentNavigator toc={tocData} readingTime={readingStats.readingTime} />
          </Box>

          {/* 📋 Sidebar (Mobile Drawer) */}
          <Drawer open={showMobileSidebar} onClose={() => setShowMobileSidebar(false)} size='sm'>
            <Box sx={{ height: '100%', overflow: 'hidden', pt: 2 }}>
              <ContentNavigator toc={tocData} readingTime={readingStats.readingTime} />
            </Box>
          </Drawer>

          {/* 📄 Editor Workspace */}
          <Box
            className='editor-scroll-container'
            sx={{
              flexGrow: 1,
              bgcolor: 'background.level2',
              pt: { xs: 3, md: 6 }, // 24px mobile (following 8px grid), 48px desktop
              pb: { xs: 8, md: 15 }, // More bottom space on mobile for comfortable scrolling
              px: { xs: 2, md: 4 }, // 16px mobile padding (8px grid), 32px desktop
              overflowY: 'auto',
              overflowX: 'hidden', // Prevent horizontal scroll
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: { xs: 3, md: 6 }, // 24px gap on mobile (breathing room between pages), 48px desktop
              scrollBehavior: 'smooth'
            }}
          >
            <Editor
              key={book._id} // Re-mount if book changes
              initialContent={content}
              book={book}
              onSave={handleContentChange}
              onImageUpload={handleImageUpload}
              pageSize={pageSize}
              pageZoom={zoom}
              isReadOnly={isLocked}
              onFocus={(editor) => setFocusedEditor(editor)}
              onPageCountChange={handlePageUpdate}
              onTOCChange={setTocData}
              onReadingStatsChange={(stats) => setReadingStats({ wordCount: stats.wordCount || 0, readingTime: stats.readingTime || 0 })}
            />
          </Box>

          {/* Floating word count badge */}
          {readingStats.wordCount > 0 && (
            <Box
              sx={{
                position: 'fixed',
                bottom: { xs: 16, md: 24 },
                right: { xs: 16, md: 32 },
                zIndex: 100,
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.625,
                borderRadius: 'xl',
                bgcolor: 'background.surface',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 'sm',
                opacity: 0.75,
                transition: 'opacity 0.2s ease',
                '&:hover': { opacity: 1 },
                pointerEvents: 'none'
              }}
            >
              <Typography level='body-xs' sx={{ color: 'text.tertiary', fontVariantNumeric: 'tabular-nums' }}>
                {readingStats.wordCount.toLocaleString()} {t('editor.stats.words', 'words')}
              </Typography>
              <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.tertiary', opacity: 0.4 }} />
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {readingStats.readingTime} {t('editor.stats.minRead', 'min read')}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </>
  )
}

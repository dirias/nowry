import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Editor from './Editor'
import ContentNavigator from '../Editor/ContentNavigator'
import EditorSkeleton from './EditorSkeleton'
import { useParams, useLocation } from 'react-router-dom'
import { Save, Check, Loader2, CloudOff, AlertTriangle, Minus, Plus, Lock, Unlock, Timer, PencilLine } from 'lucide-react'
import { booksService, publicContentService, cardsService, quizService } from '../../api/services'
import {
  Box,
  Input,
  IconButton,
  Button,
  Sheet,
  Stack,
  Typography,
  Divider,
  Drawer,
  Tooltip,
  Snackbar,
  LinearProgress,
  Chip,
  Alert,
  Dropdown,
  Menu,
  MenuButton,
  MenuItem,
  ListDivider,
  ListItemDecorator,
  CircularProgress
} from '@mui/joy'
import LockIcon from '@mui/icons-material/Lock'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import GeneratedCards from '../Cards/GeneratedCards'
import QuestionnaireModal from '../Cards/QuestionnaireModal'
import { useSubscription } from '../../hooks/useSubscription'
import { useSubscriptionContext } from '../../context/SubscriptionContext'
import { LexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import Toolbar from './Toolbar'
import { useAutoSave, SAVE_STATUS } from '../../hooks/useAutoSave'
import { Menu as MenuIcon, MoreVertical } from 'lucide-react'
import PublicIcon from '@mui/icons-material/Public'
import PublicOffIcon from '@mui/icons-material/PublicOff'
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal'
import { useTranslation } from 'react-i18next'
import MobileBottomActionStrip from '../Editor/plugins/MobileBottomActionStrip'
import { usePet } from '../../context/AgentContext'

// Explicit keyboard focus ring — never rely on the browser default.
const focusRingSx = {
  '&:focus-visible': {
    outline: '2px solid',
    outlineOffset: '2px',
    outlineColor: 'primary.outlinedBorder'
  }
}

// Header icon buttons: 44px touch target on mobile, compact on desktop.
const headerIconButtonSx = {
  borderRadius: 'md',
  flexShrink: 0,
  minWidth: { xs: 44, md: 32 },
  minHeight: { xs: 44, md: 32 },
  ...focusRingSx
}

// Actions with long labels only fit inline once the viewport is wide.
// Below `lg` they live in the header overflow menu instead.
const wideOnlySx = { display: { xs: 'none', lg: 'inline-flex' } }
const desktopOnlySx = { display: { xs: 'none', md: 'inline-flex' } }
const compactOnlySx = { display: { xs: 'inline-flex', md: 'none' } }

export default function EditorHome() {
  const { id } = useParams()
  const location = useLocation()
  const { t } = useTranslation()
  const { setViewContext } = usePet()
  const { tier } = useSubscription()
  const { openUpgradeModal } = useSubscriptionContext()

  const [showMobileSidebar, setShowMobileSidebar] = useState(false)

  // book might be stale from location state if we just navigated
  const [book, setBook] = useState(location.state?.book || null)
  const [bookName, setBookName] = useState(book?.title || '')

  // Success/Error Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', color: 'success' })
  const [confirmUnpublishOpen, setConfirmUnpublishOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Tier gate — Plus+ required for book-wide AI generation
  const isPlusLocked = tier === 'free'

  // Generate Cards from Book state
  const [isGeneratingCards, setIsGeneratingCards] = useState(false)
  const [generatedCards, setGeneratedCards] = useState([])
  const [showGeneratedCards, setShowGeneratedCards] = useState(false)
  const [generateCardsError, setGenerateCardsError] = useState(null)

  // Generate Quiz from Book state
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)
  const [generatedQuizQuestions, setGeneratedQuizQuestions] = useState([])
  const [showGeneratedQuiz, setShowGeneratedQuiz] = useState(false)
  const [generateQuizError, setGenerateQuizError] = useState(null)

  // Flow content state (TOC and reading stats)
  const [tocData, setTocData] = useState([])
  const [readingStats, setReadingStats] = useState({ wordCount: 0, readingTime: 0 })

  // Lexical editor instance ref — populated via onEditorReady callback from Editor/EditorRefPlugin
  const editorRef = useRef(null)

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
  const [pageSize, setPageSize] = useState('a5')

  // TTS language — lifted here so it's shared between the desktop sidebar and the
  // mobile Drawer instance of ContentNavigator (previously each held its own disconnected state).
  const [ttsLanguage, setTtsLanguage] = useState('en-US')

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
  const [scrollPercent, setScrollPercent] = useState(0)

  // Detect mobile device and set appropriate zoom + locked state
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 900 // md breakpoint
      setIsMobile(mobile)

      // Set locked on mobile for read-first experience
      if (mobile) {
        if (!book) {
          setIsLocked(true)
        }
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [book, isMobile])

  // Set locked on mobile when book loads
  useEffect(() => {
    if (book && isMobile) {
      setIsLocked(true)
    }
  }, [book, isMobile])

  // Reading progress bar — track scroll position on mobile
  useEffect(() => {
    if (!isMobile) return
    const container = document.querySelector('.editor-scroll-container')
    if (!container) return
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const total = scrollHeight - clientHeight
      setScrollPercent(total > 0 ? Math.round((scrollTop / total) * 100) : 0)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [isMobile, loading])

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

  const handleGenerateCards = async () => {
    setIsGeneratingCards(true)
    setGenerateCardsError(null)
    try {
      const { cards } = await cardsService.generateFromBook(book?._id || book?.id)
      setGeneratedCards(cards)
      setShowGeneratedCards(true)
    } catch (err) {
      console.error('Error generating cards from book:', err)
      const status = err.response?.status
      if (status === 403) {
        openUpgradeModal(t('upgrade.headlines.generateFromBook'))
      } else {
        const isAiServiceError = status === 503 || status === 502 || status === 429
        setGenerateCardsError(
          isAiServiceError
            ? t('aiMagic.generateFromBook.errorAiService')
            : err.response?.data?.detail || t('aiMagic.generateFromBook.error')
        )
      }
    } finally {
      setIsGeneratingCards(false)
    }
  }

  // Single entry point for the card action — used by both the inline button and
  // the overflow menu, so the tier gate behaves identically everywhere.
  const handleGenerateCardsAction = () => {
    if (isPlusLocked) {
      openUpgradeModal(t('upgrade.headlines.generateFromBook'))
      return
    }
    handleGenerateCards()
  }

  const handleGenerateQuiz = async () => {
    setIsGeneratingQuiz(true)
    setGenerateQuizError(null)
    try {
      const { questions } = await quizService.generateFromBook(book?._id || book?.id)
      setGeneratedQuizQuestions(questions)
      setShowGeneratedQuiz(true)
    } catch (err) {
      console.error('Error generating quiz from book:', err)
      const status = err.response?.status
      if (status === 403) {
        openUpgradeModal(t('upgrade.headlines.generateQuizFromBook'))
      } else {
        const isAiServiceError = status === 503 || status === 502 || status === 429
        setGenerateQuizError(
          isAiServiceError
            ? t('aiMagic.generateFromBook.errorAiService')
            : err.response?.data?.detail || t('aiMagic.generateFromBook.errorQuiz')
        )
      }
    } finally {
      setIsGeneratingQuiz(false)
    }
  }

  const handleGenerateQuizAction = () => {
    if (isPlusLocked) {
      openUpgradeModal(t('upgrade.headlines.generateQuizFromBook'))
      return
    }
    handleGenerateQuiz()
  }

  // Manual save always uses the latest content ref to avoid stale React state
  const handleManualSave = async () => {
    try {
      const latestContent = latestContentRef.current || content
      console.log('Manual save triggered')
      console.log('Current pageSize state:', pageSize)
      console.log('Current content length:', latestContent?.length)
      await handleSaveBook(latestContent)
      // Update the auto-save baseline to prevent redundant saves
      resetBaseline(latestContent)
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

  const latestContentRef = useRef('')

  const handleContentChange = useCallback((newContent) => {
    latestContentRef.current = newContent
    setContent(newContent)
  }, [])

  // Callback fired by EditorRefPlugin when Lexical mounts — stores instance for TTS use
  const handleEditorReady = useCallback((editor) => {
    editorRef.current = editor
  }, [])

  // Illustration count — derived from book state, incremented locally on insert
  // so the TextMenu lock re-evaluates without a full book refetch.
  const illustrationCount = book?.illustration_count ?? 0
  const handleDiagramInserted = useCallback(() => {
    setBook((prev) => (prev ? { ...prev, illustration_count: (prev.illustration_count ?? 0) + 1 } : prev))
  }, [])

  // Tell the pet which book is open. The backend handles RAG retrieval —
  // we only need to send the book_id and title, not the content.
  useEffect(() => {
    if (!book) return
    setViewContext({
      page: 'book',
      book_id: id,
      book_title: bookName || book.title
    })
    return () => setViewContext(null)
  }, [id, bookName, book, setViewContext])

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

        fetchedIdRef.current = id
        console.log(`🔗 Fetching book data for ID: ${id}`)
        const fullBook = await booksService.getById(id)

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
      fetchedIdRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, resetBaseline])

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

  const handleReadingStatsChange = useCallback((stats) => {
    setReadingStats({ wordCount: stats.wordCount || 0, readingTime: stats.readingTime || 0 })
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

  // Derived header labels — every one of them is also used as an aria-label,
  // so they must always come from t().
  const isPublished = !!book?.is_public
  const publishLabel = isPublished
    ? t('public.unpublish', { defaultValue: 'Unpublish' })
    : t('public.publishInstant', { defaultValue: 'Share with community' })
  const handlePublishToggle = () => (isPublished ? setConfirmUnpublishOpen(true) : handlePublish())
  const autosaveLabel = autoSaveEnabled ? t('editor.header.disableAutosave') : t('editor.header.enableAutosave')
  const lockLabel = isLocked ? t('editor.header.unlockEditing') : t('editor.header.lockEditing')
  const isGeneratingAny = isGeneratingCards || isGeneratingQuiz

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
          {/* Row 1: Book Info + actions.
              Mobile-first: the row never wraps and never scrolls — long-labelled
              actions collapse to icon buttons and then into the overflow menu. */}
          <Stack
            direction='row'
            alignItems='center'
            justifyContent='space-between'
            sx={{ height: 50, px: { xs: 1, md: 3 }, gap: 1, minWidth: 0 }}
          >
            {/* Left: navigator, title, save status. minWidth:0 lets the title shrink
                instead of pushing the action cluster off-screen. */}
            <Stack direction='row' alignItems='center' sx={{ flex: 1, minWidth: 0, gap: { xs: 0.5, md: 2 } }}>
              {/* Mobile Menu Button */}
              <Tooltip title={t('editor.header.openNavigator')} variant='soft' size='sm'>
                <IconButton
                  variant='plain'
                  color='neutral'
                  size='sm'
                  onClick={() => setShowMobileSidebar(true)}
                  aria-label={t('editor.header.openNavigator')}
                  sx={{ ...headerIconButtonSx, ...compactOnlySx }}
                >
                  <MenuIcon size={18} />
                </IconButton>
              </Tooltip>

              <Input
                value={bookName}
                onChange={(e) => setBookName(e.target.value)}
                disabled={isLocked}
                variant='plain'
                aria-label={t('editor.header.bookTitle')}
                sx={{
                  fontSize: 'lg',
                  fontWeight: 'bold',
                  bgcolor: 'transparent',
                  '&:hover': { bgcolor: isLocked ? 'transparent' : 'background.level1' },
                  px: 1,
                  flex: 1,
                  minWidth: 0,
                  maxWidth: { xs: 'none', md: 400 },
                  '& input': { textOverflow: 'ellipsis' },
                  '&.Mui-disabled': { color: 'text.primary' },
                  ...focusRingSx
                }}
              />
              <Divider orientation='vertical' sx={{ height: 20, display: { xs: 'none', md: 'block' } }} />
              <Box sx={{ display: { xs: 'none', md: 'block' }, flexShrink: 0 }}>
                <StatusBadge />
              </Box>
              {saveError && (
                <Typography level='body-xs' color='danger' sx={{ display: { xs: 'none', lg: 'block' } }}>
                  {saveError}
                </Typography>
              )}
            </Stack>

            <Stack direction='row' alignItems='center' sx={{ flexShrink: 0, gap: { xs: 0.5, md: 1.5 } }}>
              {/* Publish/Unpublish — icon-only on mobile so it stays one tap away */}
              <Tooltip title={publishLabel} variant='soft' size='sm'>
                <IconButton
                  variant={isPublished ? 'soft' : 'outlined'}
                  color={isPublished ? 'success' : 'primary'}
                  onClick={handlePublishToggle}
                  size='sm'
                  loading={isProcessing}
                  aria-label={publishLabel}
                  sx={{ ...headerIconButtonSx, ...compactOnlySx }}
                >
                  {isPublished ? <PublicIcon sx={{ fontSize: 18 }} /> : <PublicOffIcon sx={{ fontSize: 18 }} />}
                </IconButton>
              </Tooltip>

              <Tooltip title={publishLabel} variant='soft' size='sm'>
                <Button
                  variant={isPublished ? 'soft' : 'outlined'}
                  color={isPublished ? 'success' : 'primary'}
                  onClick={handlePublishToggle}
                  size='sm'
                  startDecorator={<PublicIcon />}
                  loading={isProcessing}
                  sx={{ ...desktopOnlySx, whiteSpace: 'nowrap', ...focusRingSx }}
                >
                  {isPublished ? t('public.published', { defaultValue: 'Published' }) : t('public.publish', { defaultValue: 'Publish' })}
                </Button>
              </Tooltip>

              <Divider orientation='vertical' sx={{ height: 20, display: { xs: 'none', md: 'block' } }} />

              {/* Zoom Controls */}
              <Stack direction='row' alignItems='center' spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
                <IconButton
                  size='sm'
                  variant='plain'
                  onClick={() => setZoom((prev) => Math.max(0.25, prev - 0.25))}
                  disabled={zoom <= 0.25}
                  aria-label={t('editor.header.zoomOut')}
                  sx={focusRingSx}
                >
                  <Minus size={14} />
                </IconButton>
                <Typography level='body-xs' sx={{ minWidth: 40, textAlign: 'center' }}>
                  {Math.round(zoom * 100)}%
                </Typography>
                <IconButton
                  size='sm'
                  variant='plain'
                  onClick={() => setZoom((prev) => Math.min(2.0, prev + 0.25))}
                  disabled={zoom >= 2.0}
                  aria-label={t('editor.header.zoomIn')}
                  sx={focusRingSx}
                >
                  <Plus size={14} />
                </IconButton>
              </Stack>
              <Divider orientation='vertical' sx={{ height: 20, display: { xs: 'none', lg: 'block' } }} />

              {/* Generate Cards from Book — Plus+ only. Inline from lg, in the overflow menu below. */}
              <Tooltip title={isPlusLocked ? t('aiMagic.generateFromBook.lockedTooltip') : ''} variant='soft' size='sm'>
                <Box component='span' sx={wideOnlySx}>
                  <Button
                    size='sm'
                    variant={isPlusLocked ? 'outlined' : 'soft'}
                    color={isPlusLocked ? 'neutral' : 'primary'}
                    startDecorator={isPlusLocked ? <LockIcon sx={{ fontSize: 16 }} /> : <AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />}
                    endDecorator={
                      isPlusLocked ? (
                        <Chip size='sm' color='warning' variant='soft'>
                          {t('plans.plus')}
                        </Chip>
                      ) : null
                    }
                    onClick={handleGenerateCardsAction}
                    loading={isGeneratingCards}
                    loadingPosition='start'
                    sx={{ minWidth: 160, whiteSpace: 'nowrap', ...focusRingSx }}
                    aria-label={isPlusLocked ? t('aiMagic.generateFromBook.lockedAriaLabel') : t('aiMagic.generateFromBook.ariaLabel')}
                  >
                    {isGeneratingCards ? t('aiMagic.generateFromBook.generating') : t('aiMagic.generateFromBook.label')}
                  </Button>
                </Box>
              </Tooltip>

              {/* Generate Quiz from Book — Plus+ only. Inline from lg, in the overflow menu below. */}
              <Tooltip title={isPlusLocked ? t('aiMagic.generateFromBook.lockedTooltip') : ''} variant='soft' size='sm'>
                <Box component='span' sx={wideOnlySx}>
                  <Button
                    size='sm'
                    variant={isPlusLocked ? 'outlined' : 'soft'}
                    color={isPlusLocked ? 'neutral' : 'primary'}
                    startDecorator={isPlusLocked ? <LockIcon sx={{ fontSize: 16 }} /> : <AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />}
                    endDecorator={
                      isPlusLocked ? (
                        <Chip size='sm' color='warning' variant='soft'>
                          {t('plans.plus')}
                        </Chip>
                      ) : null
                    }
                    onClick={handleGenerateQuizAction}
                    loading={isGeneratingQuiz}
                    loadingPosition='start'
                    sx={{ minWidth: 160, whiteSpace: 'nowrap', ...focusRingSx }}
                    aria-label={
                      isPlusLocked ? t('aiMagic.generateFromBook.lockedAriaLabelQuiz') : t('aiMagic.generateFromBook.ariaLabelQuiz')
                    }
                  >
                    {isGeneratingQuiz ? t('aiMagic.generateFromBook.generatingQuiz') : t('aiMagic.generateFromBook.labelQuiz')}
                  </Button>
                </Box>
              </Tooltip>

              {/* AI generation hint — only where there is room for it */}
              {isGeneratingAny && (
                <Typography level='body-xs' sx={{ color: 'text.tertiary', display: { xs: 'none', xl: 'block' }, whiteSpace: 'nowrap' }}>
                  {t('aiMagic.generateFromBook.generatingHint')}
                </Typography>
              )}

              {/* Autosave — a preference, not a frequent action: below md it lives
                  in the overflow menu so the mobile bar stays at three controls. */}
              <Tooltip title={autosaveLabel} variant='soft' size='sm'>
                <Button
                  variant={autoSaveEnabled ? 'soft' : 'plain'}
                  color={autoSaveEnabled ? 'primary' : 'neutral'}
                  onClick={handleToggleAutoSave}
                  size='sm'
                  startDecorator={<Timer size={14} />}
                  aria-pressed={autoSaveEnabled}
                  sx={{ ...desktopOnlySx, fontSize: 'xs', fontWeight: 500, whiteSpace: 'nowrap', ...focusRingSx }}
                >
                  {t('books.autosave', { defaultValue: 'Autosave' })}
                </Button>
              </Tooltip>

              <Tooltip title={t('editor.header.saveNow')} variant='soft' size='sm'>
                <IconButton
                  variant='outlined'
                  color='neutral'
                  onClick={handleManualSave}
                  size='sm'
                  aria-label={t('editor.header.saveNow')}
                  sx={headerIconButtonSx}
                >
                  <Save size={16} />
                </IconButton>
              </Tooltip>

              <Tooltip title={lockLabel} variant='soft' size='sm'>
                <IconButton
                  variant='outlined'
                  color='neutral'
                  onClick={() => setIsLocked(!isLocked)}
                  size='sm'
                  aria-label={lockLabel}
                  aria-pressed={isLocked}
                  sx={{
                    ...headerIconButtonSx,
                    ...desktopOnlySx,
                    bgcolor: isLocked ? 'background.level1' : 'transparent',
                    '&:hover': { bgcolor: 'background.level2' }
                  }}
                >
                  {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                </IconButton>
              </Tooltip>

              {/* Overflow menu — holds the long-labelled actions below lg */}
              <Dropdown>
                <Tooltip title={t('common.moreActions')} variant='soft' size='sm'>
                  <MenuButton
                    slots={{ root: IconButton }}
                    slotProps={{
                      root: {
                        variant: 'plain',
                        color: 'neutral',
                        size: 'sm',
                        'aria-label': t('common.moreActions'),
                        sx: { ...headerIconButtonSx, display: { xs: 'inline-flex', lg: 'none' } }
                      }
                    }}
                  >
                    {isGeneratingAny ? <CircularProgress size='sm' /> : <MoreVertical size={18} />}
                  </MenuButton>
                </Tooltip>
                <Menu placement='bottom-end' size='sm' sx={{ minWidth: 240, zIndex: 1300 }}>
                  <MenuItem onClick={handleGenerateCardsAction} disabled={isGeneratingCards}>
                    <ListItemDecorator>
                      {isGeneratingCards ? (
                        <CircularProgress size='sm' />
                      ) : isPlusLocked ? (
                        <LockIcon sx={{ fontSize: 18 }} />
                      ) : (
                        <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: 'primary.plainColor' }} />
                      )}
                    </ListItemDecorator>
                    {isGeneratingCards ? t('aiMagic.generateFromBook.generating') : t('aiMagic.generateFromBook.label')}
                    {isPlusLocked && (
                      <Chip size='sm' color='warning' variant='soft' sx={{ ml: 'auto' }}>
                        {t('plans.plus')}
                      </Chip>
                    )}
                  </MenuItem>

                  <MenuItem onClick={handleGenerateQuizAction} disabled={isGeneratingQuiz}>
                    <ListItemDecorator>
                      {isGeneratingQuiz ? (
                        <CircularProgress size='sm' />
                      ) : isPlusLocked ? (
                        <LockIcon sx={{ fontSize: 18 }} />
                      ) : (
                        <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: 'primary.plainColor' }} />
                      )}
                    </ListItemDecorator>
                    {isGeneratingQuiz ? t('aiMagic.generateFromBook.generatingQuiz') : t('aiMagic.generateFromBook.labelQuiz')}
                    {isPlusLocked && (
                      <Chip size='sm' color='warning' variant='soft' sx={{ ml: 'auto' }}>
                        {t('plans.plus')}
                      </Chip>
                    )}
                  </MenuItem>

                  {/* Autosave toggle — only below md, where it has no inline button */}
                  <ListDivider sx={{ display: { xs: 'block', md: 'none' } }} />
                  <MenuItem
                    onClick={handleToggleAutoSave}
                    selected={autoSaveEnabled}
                    aria-label={autosaveLabel}
                    sx={{ display: { xs: 'flex', md: 'none' } }}
                  >
                    <ListItemDecorator>{autoSaveEnabled ? <Check size={18} /> : <Timer size={18} />}</ListItemDecorator>
                    {t('books.autosave', { defaultValue: 'Autosave' })}
                  </MenuItem>

                  {isGeneratingAny && (
                    <MenuItem disabled sx={{ whiteSpace: 'normal' }}>
                      <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                        {t('aiMagic.generateFromBook.generatingHint')}
                      </Typography>
                    </MenuItem>
                  )}
                </Menu>
              </Dropdown>
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

        {isMobile && (
          <LinearProgress
            determinate
            value={scrollPercent}
            size='sm'
            color='primary'
            sx={{
              borderRadius: 0,
              height: '2px',
              display: { xs: 'block', md: 'none' },
              '--LinearProgress-radius': '0px',
              flexShrink: 0
            }}
          />
        )}

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
            <ContentNavigator
              toc={tocData}
              readingTime={readingStats.readingTime}
              editorInstanceRef={editorRef}
              bookId={book?._id}
              tier={tier}
              ttsLanguage={ttsLanguage}
              onTtsLanguageChange={setTtsLanguage}
            />
          </Box>

          {/* 📋 Sidebar (Mobile Drawer) */}
          <Drawer open={showMobileSidebar} onClose={() => setShowMobileSidebar(false)} size='sm'>
            <Box sx={{ height: '100%', overflow: 'hidden', pt: 2 }}>
              <ContentNavigator
                toc={tocData}
                readingTime={readingStats.readingTime}
                editorInstanceRef={editorRef}
                bookId={book?._id}
                tier={tier}
                ttsLanguage={ttsLanguage}
                onTtsLanguageChange={setTtsLanguage}
              />
            </Box>
          </Drawer>

          {/* 📄 Editor Workspace */}
          <Box
            className='editor-scroll-container'
            sx={{
              flexGrow: 1,
              bgcolor: 'background.level2',
              pt: { xs: 2, md: 6 },
              pb: { xs: 12, md: 16 },
              px: 0,
              overflowY: 'auto',
              overflowX: 'hidden', // Prevent horizontal scroll
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: { xs: 3, md: 6 },
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
              onFocus={setFocusedEditor}
              onPageCountChange={handlePageUpdate}
              onTOCChange={setTocData}
              onReadingStatsChange={handleReadingStatsChange}
              onEditorReady={handleEditorReady}
              illustrationCount={illustrationCount}
              onDiagramInserted={handleDiagramInserted}
              tier={tier}
              ttsLanguage={ttsLanguage}
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

        {/* Mobile FAB — edit/done toggle, replaces Lock button on mobile */}
        {isMobile && !loading && (
          <Box
            sx={{
              position: 'fixed',
              bottom: 90,
              right: 20,
              zIndex: 200,
              display: { xs: 'flex', md: 'none' }
            }}
          >
            <Tooltip
              title={isLocked ? t('editor.mobile.editMode', 'Edit') : t('editor.mobile.doneEditing', 'Done')}
              placement='left'
              variant='soft'
              size='sm'
            >
              <IconButton
                size='lg'
                variant='soft'
                color={isLocked ? 'neutral' : 'primary'}
                onClick={() => setIsLocked(!isLocked)}
                aria-label={isLocked ? t('editor.mobile.editMode', 'Edit') : t('editor.mobile.doneEditing', 'Done')}
                sx={{
                  borderRadius: '50%',
                  width: 56,
                  height: 56,
                  boxShadow: 'md',
                  opacity: isLocked ? 0.72 : 1,
                  transition: 'opacity 0.2s ease, background-color 0.2s ease'
                }}
              >
                {isLocked ? <PencilLine size={22} /> : <Check size={22} />}
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Mobile bottom action strip — appears in edit mode above keyboard */}
        {isMobile && !isLocked && focusedEditor && <MobileBottomActionStrip editor={focusedEditor} />}
      </Box>

      {/* Generate Cards from Book — results modal */}
      {showGeneratedCards && (
        <GeneratedCards
          cards={generatedCards}
          book={book}
          onCancel={() => {
            setShowGeneratedCards(false)
            setGeneratedCards([])
          }}
        />
      )}

      {/* Generate Quiz from Book — results modal */}
      {showGeneratedQuiz && (
        <QuestionnaireModal
          questions={generatedQuizQuestions}
          onCancel={() => {
            setShowGeneratedQuiz(false)
            setGeneratedQuizQuestions([])
          }}
        />
      )}

      {/* Error snackbars for book-wide AI generation */}
      <Snackbar
        open={!!generateCardsError}
        autoHideDuration={4000}
        onClose={() => setGenerateCardsError(null)}
        color='danger'
        variant='soft'
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert color='danger' variant='soft'>
          {generateCardsError}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!generateQuizError}
        autoHideDuration={4000}
        onClose={() => setGenerateQuizError(null)}
        color='danger'
        variant='soft'
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert color='danger' variant='soft'>
          {generateQuizError}
        </Alert>
      </Snackbar>
    </>
  )
}

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Editor from './Editor'
import PageOverview from './PageOverview'
import EditorSkeleton from './EditorSkeleton'
import { useParams, useLocation } from 'react-router-dom'
import { Save, Check, Loader2, CloudOff, AlertTriangle, Minus, Plus, Lock, Unlock, Timer } from 'lucide-react'
import { booksService } from '../../api/services'
import { Box, Input, IconButton, Button, Sheet, Stack, Typography, Divider, Drawer } from '@mui/joy'
import { LexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import Toolbar from './Toolbar'
import { useAutoSave, SAVE_STATUS } from '../../hooks/useAutoSave'
import { Menu as MenuIcon } from 'lucide-react'

export default function EditorHome() {
  const { id } = useParams()
  const location = useLocation()

  const [showMobileSidebar, setShowMobileSidebar] = useState(false)

  // book might be stale from location state if we just navigated
  const [book, setBook] = useState(location.state?.book || null)
  const [bookName, setBookName] = useState(book?.title || '')
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

  const [zoom, setZoom] = useState(1.0)
  const [isLocked, setIsLocked] = useState(false)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false)
  const [focusedEditor, setFocusedEditor] = useState(null)
  const [loading, setLoading] = useState(true)

  const handleSaveBook = async (currentContent) => {
    try {
      const updateData = {
        title: bookName,
        page_size: pageSize,
        full_content: currentContent,
        auto_save_enabled: autoSaveEnabled
      }

      console.log('Saving book with page_size:', pageSize)
      await booksService.update(id, updateData)
      console.log('Save successful')
    } catch (e) {
      console.error('Error updating book:', e)
    }
  }

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

  const handleContentChange = (newHtml) => {
    setContent(newHtml)
  }

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
    const fetchBook = async () => {
      try {
        setLoading(true)
        const fullBook = await booksService.getById(id)
        setBook(fullBook)
        setBookName(fullBook.title)

        // Load page size preference
        if (fullBook.page_size) {
          console.log('📚 Loading page size from book:', fullBook.page_size)
          setPageSize(fullBook.page_size) // Use setPageSize directly here to avoid logging on load
        }

        // Load auto-save preference
        if (fullBook.auto_save_enabled !== undefined) {
          setAutoSaveEnabled(fullBook.auto_save_enabled)
        }

        const initialHtml = fullBook.full_content || ''
        setContent(initialHtml)
        resetBaseline(initialHtml)
      } catch (e) {
        console.error('Error fetching book:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchBook()
  }, [id, resetBaseline])

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Status Badge Component
  const StatusBadge = () => {
    if (status === SAVE_STATUS.SAVING) {
      return (
        <Stack direction='row' spacing={1} alignItems='center'>
          <Loader2 size={14} className='animate-spin' />
          <Typography level='body-xs' color='neutral'>
            Saving...
          </Typography>
        </Stack>
      )
    }
    if (status === SAVE_STATUS.SAVED) {
      return (
        <Stack direction='row' spacing={1} alignItems='center'>
          {autoSaveEnabled ? (
            <Check size={14} color='var(--joy-palette-success-500)' />
          ) : (
            <AlertTriangle size={14} color='var(--joy-palette-danger-500)' />
          )}
          <Typography level='body-xs' color='neutral'>
            {autoSaveEnabled ? 'Saved' : 'Autosave Inactive'}
          </Typography>
        </Stack>
      )
    }
    if (status === SAVE_STATUS.ERROR) {
      return (
        <Stack direction='row' spacing={1} alignItems='center'>
          <AlertTriangle size={14} color='var(--joy-palette-danger-500)' />
          <Typography level='body-xs' color='danger'>
            Save Failed
          </Typography>
        </Stack>
      )
    }
    if (status === SAVE_STATUS.UNSAVED) {
      // Don't show "Unsaved changes" if autosave is disabled - user is in manual mode
      if (!autoSaveEnabled) {
        return (
          <Stack direction='row' spacing={1} alignItems='center'>
            <AlertTriangle size={14} color='var(--joy-palette-danger-500)' />
            <Typography level='body-xs' color='neutral'>
              Autosave Inactive
            </Typography>
          </Stack>
        )
      }
      return (
        <Typography level='body-xs' color='neutral' sx={{ fontStyle: 'italic' }}>
          Unsaved changes...
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

    const pages = document.querySelectorAll('.editor-page')
    pages.forEach((p) => observer.observe(p))

    return () => observer.disconnect()
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
            <Typography level='body-xs' sx={{ color: 'text.tertiary', display: { xs: 'none', md: 'block' } }}>
              {pagesData.length || 1} Pages • {pageSize.toUpperCase()}
            </Typography>
            <Divider orientation='vertical' sx={{ height: 20, display: { xs: 'none', md: 'block' } }} />
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <StatusBadge />
            </Box>
          </Stack>

          <Stack direction='row' spacing={1.5} alignItems='center'>
            {/* Zoom Controls */}
            <Stack direction='row' alignItems='center' spacing={0.5} sx={{ display: { xs: 'none', sm: 'flex' } }}>
              <IconButton size='sm' variant='plain' onClick={() => setZoom((prev) => Math.max(0.25, prev - 0.25))} disabled={zoom <= 0.25}>
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
              variant='plain'
              color='neutral'
              onClick={handleToggleAutoSave}
              size='sm'
              startDecorator={<Timer size={14} />}
              sx={{
                fontSize: 'xs',
                fontWeight: autoSaveEnabled ? 'lg' : 'md',
                textDecoration: autoSaveEnabled ? 'underline' : 'none',
                textUnderlineOffset: '4px',
                textDecorationThickness: '2px',
                '&:hover': {
                  textDecoration: 'underline',
                  textUnderlineOffset: '4px'
                }
              }}
            >
              Autosave
            </Button>

            <IconButton variant='outlined' color='neutral' onClick={handleManualSave} size='sm' sx={{ borderRadius: 'md' }}>
              <Save size={16} />
            </IconButton>

            <IconButton
              variant={isLocked ? 'solid' : 'outlined'}
              color={isLocked ? 'danger' : 'neutral'}
              onClick={() => setIsLocked(!isLocked)}
              size='sm'
              sx={{ borderRadius: 'md' }}
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
                <Toolbar onSave={handleManualSave} pageSize={pageSize} setPageSize={handlePageSizeChange} disabled={isLocked} />
              </LexicalComposerContext.Provider>
            ) : (
              <Typography level='body-sm' sx={{ color: 'text.tertiary', fontStyle: 'italic' }}>
                Editor Ready
              </Typography>
            )}
          </Box>
        )}
      </Sheet>

      <Box
        sx={{ display: 'flex', flexDirection: 'row', flexGrow: 1, overflow: 'hidden', minHeight: 0 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 📋 Sidebar (Desktop) */}
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
          <PageOverview pagesData={pagesData} pageSize={pageSize} onPageClick={handleScrollToPage} activePageIndex={activePageIndex} />
        </Box>

        {/* 📋 Sidebar (Mobile Drawer) */}
        <Drawer open={showMobileSidebar} onClose={() => setShowMobileSidebar(false)} size='sm'>
          <Box sx={{ height: '100%', overflow: 'hidden', pt: 6 }}>
            <PageOverview
              pagesData={pagesData}
              pageSize={pageSize}
              onPageClick={(idx) => {
                handleScrollToPage(idx)
                setShowMobileSidebar(false)
              }}
              activePageIndex={activePageIndex}
            />
          </Box>
        </Drawer>

        {/* 📄 Editor Workspace */}
        <Box
          className='editor-scroll-container'
          sx={{
            flexGrow: 1,
            bgcolor: 'background.level2',
            pt: 6,
            pb: 15,
            px: { xs: 1, md: 4 }, // Responsive content padding
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
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
          />
        </Box>
      </Box>
    </Box>
  )
}

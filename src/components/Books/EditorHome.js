import React, { useState, useEffect, useMemo, useRef } from 'react'
import Editor from './Editor'
import PageOverview from './PageOverview'
import { useParams, useLocation } from 'react-router-dom'
import { Save } from 'lucide-react'
import { booksService, pagesService } from '../../api/services'
import { Box, Input, IconButton, Sheet, Stack } from '@mui/joy'

// Simple utility for a stable local key when _id is not yet available
const genClientKey = () => `ck_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
const pageKey = (p) => String(p?._id ?? p?.clientKey ?? p?.page_number ?? '') // always as string

export default function EditorHome() {
  const { id } = useParams()
  const location = useLocation()
  const { book } = location.state

  // On mount, add clientKey to any page that doesn't have an _id yet
  const withKeys = (list = []) => (list || []).map((p) => (p._id ? p : { ...p, clientKey: p.clientKey || genClientKey() }))

  const [pages, setPages] = useState(withKeys(book.pages))
  const [activePage, setActivePage] = useState(pages[0] || null)
  const [activeKey, setActiveKey] = useState(pageKey(pages[0]) || null)
  const [content, setContent] = useState(activePage?.content || '')
  const [bookName, setBookName] = useState(book.title)
  const [pageSize, setPageSize] = useState('a4')

  const [loading, setLoading] = useState(true)
  const isOverflowing = useRef(false) // Lock to prevent race conditions during overflow code splitting

  // When the active page changes, reflect its key
  useEffect(() => {
    setActiveKey(pageKey(activePage) || null)
  }, [activePage])

  // Load the complete book (and normalize keys)
  useEffect(() => {
    const fetchBook = async () => {
      try {
        setLoading(true)
        const full = await booksService.getById(id)
        const list = withKeys(full.pages)
        setPages(list)
        const first = list?.[0] || null
        setActivePage(first)
        setContent(first?.content || '')
      } catch (e) {
        console.error('Error fetching book:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchBook()
  }, [id])

  const handleSwitchPage = async (targetPage) => {
    // 1. Save current page content before switching
    if (activePage && pageKey(activePage) !== pageKey(targetPage)) {
      const updatedCurrent = { ...activePage, content }

      // Optimistic update
      setPages((prev) => prev.map((p) => (pageKey(p) === pageKey(updatedCurrent) ? updatedCurrent : p)))

      try {
        await pagesService.savePage(updatedCurrent)
      } catch (e) {
        console.error('Failed to auto-save on switch', e)
      }
    }

    // 2. Switch
    setActivePage(targetPage)
    setContent(targetPage.content || '')
  }

  const handleSavePage = async (page, contentOverride = null) => {
    try {
      // 1. Save Book Title if changed
      if (bookName && bookName !== book.title) {
        try {
          await booksService.update(id, { title: bookName })
          // We don't update local 'book' state here because it comes from location.state
          // but the next time we load this book, it will have the new title.
        } catch (e) {
          console.error('Error updating book title:', e)
        }
      }

      if (!page) {
        // Create a new "empty" page
        const draft = {
          book_id: id,
          page_number: (pages?.length || 0) + 1,
          content: contentOverride || '<p></p>'
        }
        // 1) Add optimistically with a clientKey so the UI updates immediately
        const optimistic = { ...draft, clientKey: genClientKey() }
        setPages((prev) => [...prev, optimistic])
        setActivePage(optimistic)
        setContent(optimistic.content)

        // 2) Save to backend
        const created = await pagesService.savePage(draft)

        // 3) Replace the optimistic version with the definitive one (with _id) while keeping the same clientKey
        setPages((prev) => prev.map((p) => (p.clientKey === optimistic.clientKey ? { ...created, clientKey: optimistic.clientKey } : p)))

        // If we're still on that same page, update activePage with the final version
        setActivePage((curr) => (curr && pageKey(curr) === pageKey(optimistic) ? { ...created, clientKey: optimistic.clientKey } : curr))
      } else {
        // Update existing page
        const toSave = { ...page, content }
        await pagesService.savePage(toSave)
        setPages((prev) => prev.map((p) => (pageKey(p) === pageKey(page) ? toSave : p)))
      }
    } catch (e) {
      console.error('Error saving page:', e)
    }
  }

  const handlePageOverflow = async (remainingHtml, movedHtml, shouldSwitch = true) => {
    if (isOverflowing.current) return
    isOverflowing.current = true

    try {
      // 1. Save current page with REMAINING content (remove overflowing part)
      if (activePage) {
        const updatedCurrent = { ...activePage, content: remainingHtml }
        await pagesService.savePage(updatedCurrent)
        setPages((prev) => prev.map((p) => (pageKey(p) === pageKey(updatedCurrent) ? updatedCurrent : p)))

        // If we represent the Active Page, update it.
        // If we are NOT switching, we must update the local activePage state to reflect the trim.
        // Using ID as trigger prevents Editor reload.
        if (!shouldSwitch) {
          setActivePage(updatedCurrent)
          setContent(remainingHtml)
        }
      }

      // 2. Add overflow to NEXT page (or create new)
      const currentIndex = pages.findIndex((p) => pageKey(p) === pageKey(activePage))

      if (currentIndex !== -1 && currentIndex < pages.length - 1) {
        // Next page exists - Prepend content
        const targetPage = pages[currentIndex + 1]
        const mergedContent = (movedHtml || '') + (targetPage.content || '')
        const updatedTarget = { ...targetPage, content: mergedContent }

        // Save target
        await pagesService.savePage(updatedTarget)
        setPages((prev) => prev.map((p) => (pageKey(p) === pageKey(updatedTarget) ? updatedTarget : p)))

        // Switch if needed
        if (shouldSwitch) {
          setActivePage(updatedTarget)
          setContent(mergedContent)
        }
      } else {
        // Create new page with moved content
        // If shouldSwitch is true, we switch (default behavior of handleSavePage)
        handleSavePage(null, movedHtml)
      }
    } catch (error) {
      console.error('Overflow handling failed', error)
    } finally {
      isOverflowing.current = false
    }
  }

  const handleMergeBack = async () => {
    if (!activePage) return
    const currentIndex = pages.findIndex((p) => pageKey(p) === pageKey(activePage))
    if (currentIndex <= 0) return // No previous page

    const prevPage = pages[currentIndex - 1]
    const currentPage = pages[currentIndex]

    // Merge Content
    const prevContent = prevPage.content || ''
    const currentContent = currentPage.content || ''
    const mergedContent = prevContent + currentContent

    // 1. Delete Current Page
    if (currentPage._id) {
      try {
        await pagesService.deletePage(currentPage._id)
      } catch (e) {
        console.error('Failed to delete page', e)
      }
    }

    // 2. Update Previous Page with merged content
    const updatedPrev = { ...prevPage, content: mergedContent }
    await pagesService.savePage(updatedPrev)

    // 3. Update State
    // Remove current, update prev
    const newPages = pages
      .filter((p) => pageKey(p) !== pageKey(currentPage))
      .map((p) => (pageKey(p) === pageKey(prevPage) ? updatedPrev : p))

    setPages(newPages)
    setActivePage(updatedPrev)
    setContent(mergedContent)
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'row', height: 'calc(100vh - 140px)', width: '100%' }}>
        {/* Sidebar Skeleton */}
        <Box sx={{ width: 320, p: 2, borderRight: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ width: '60%', height: 24, bgcolor: 'neutral.100', borderRadius: 'sm', mb: 3 }} />
          <Stack spacing={2}>
            {[1, 2, 3].map((i) => (
              <Box key={i} sx={{ width: '100%', height: 200, bgcolor: 'neutral.50', borderRadius: 'md' }} />
            ))}
          </Stack>
        </Box>

        {/* Editor Skeleton */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ height: 60, borderBottom: '1px solid', borderColor: 'divider', px: 4, display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: 200, height: 24, bgcolor: 'neutral.100', borderRadius: 'sm' }} />
          </Box>
          <Box sx={{ flexGrow: 1, bgcolor: 'background.level1', p: 4, display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ width: '21cm', height: '80%', bgcolor: 'white', borderRadius: 'md', boxShadow: 'sm' }} />
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', height: 'calc(100vh - 140px)' }}>
      <PageOverview
        // ... params
        pages={pages}
        activeKey={activeKey}
        setActivePage={handleSwitchPage}
        setContent={setContent}
        handleSavePage={handleSavePage}
        liveContent={content}
        liveKey={activeKey}
        pageSize={pageSize}
      />

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Sheet
          variant='outlined'
          sx={{
            px: 4,
            py: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          {/* First Row: Title and Save Button */}
          <Stack direction='row' justifyContent='space-between' alignItems='center'>
            <Input
              placeholder='Book title'
              value={bookName}
              onChange={(e) => setBookName(e.target.value)}
              variant='plain'
              sx={{ fontSize: 'lg', fontWeight: 'bold', border: 'none', px: 0 }}
            />
            <IconButton variant='soft' color='success' onClick={() => handleSavePage(activePage)}>
              <Save />
            </IconButton>
          </Stack>
        </Sheet>

        <Editor
          key={pageKey(activePage) || 'editor'}
          activePage={activePage}
          book={book}
          content={content}
          setContent={setContent}
          onSave={() => handleSavePage(activePage)}
          pageSize={pageSize}
          setPageSize={setPageSize}
          onPageOverflow={handlePageOverflow}
          onMergeBack={handleMergeBack}
        />
      </Box>
    </Box>
  )
}

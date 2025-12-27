import React, { useState, useEffect, useMemo } from 'react'
import Editor from './Editor'
import PageOverview from './PageOverview'
import { useParams, useLocation } from 'react-router-dom'
import { Save } from 'lucide-react'
import { saveBookPage, getBookById } from '../../api/Books'
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

  // When the active page changes, reflect its key
  useEffect(() => {
    setActiveKey(pageKey(activePage) || null)
  }, [activePage])

  // Load the complete book (and normalize keys)
  useEffect(() => {
    const fetchBook = async () => {
      try {
        const full = await getBookById(id)
        const list = withKeys(full.pages)
        setPages(list)
        const first = list?.[0] || null
        setActivePage(first)
        setContent(first?.content || '')
      } catch (e) {
        console.error('Error fetching book:', e)
      }
    }
    fetchBook()
  }, [id])

  const handleSavePage = async (page) => {
    try {
      if (!page) {
        // Create a new "empty" page
        const draft = {
          book_id: id,
          page_number: (pages?.length || 0) + 1,
          content: '<p></p>'
        }
        // 1) Add optimistically with a clientKey so the UI updates immediately
        const optimistic = { ...draft, clientKey: genClientKey() }
        setPages((prev) => [...prev, optimistic])
        setActivePage(optimistic)
        setContent(optimistic.content)

        // 2) Save to backend
        const created = await saveBookPage(draft)

        // 3) Replace the optimistic version with the definitive one (with _id) while keeping the same clientKey
        setPages((prev) => prev.map((p) => (p.clientKey === optimistic.clientKey ? { ...created, clientKey: optimistic.clientKey } : p)))

        // If we're still on that same page, update activePage with the final version
        setActivePage((curr) => (curr && pageKey(curr) === pageKey(optimistic) ? { ...created, clientKey: optimistic.clientKey } : curr))
      } else {
        // Update existing page
        const toSave = { ...page, content }
        await saveBookPage(toSave)
        setPages((prev) => prev.map((p) => (pageKey(p) === pageKey(page) ? toSave : p)))
      }
    } catch (e) {
      console.error('Error saving page:', e)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', height: '100vh' }}>
      <PageOverview
        pages={pages}
        activeKey={activeKey} // ← active id/key (string)
        setActivePage={setActivePage}
        setContent={setContent}
        handleSavePage={handleSavePage}
        liveContent={content} // ← live editor content
        liveKey={activeKey} // ← page key receiving live updates
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
          key={activeKey || 'editor'}
          activePage={activePage}
          content={content}
          setContent={setContent}
          onSave={() => handleSavePage(activePage)}
        />
      </Box>
    </Box>
  )
}

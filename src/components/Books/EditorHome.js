import React, { useState, useEffect } from 'react'
import Editor from './Editor'
import PageOverview from './PageOverview'
import { useParams, useLocation } from 'react-router-dom'
import { CircleArrowLeft, CircleArrowRight, Save } from 'lucide-react'
import { saveBookPage, getBookById } from '../../api/Books'
import { Box, Typography, Input, IconButton, Sheet, Stack } from '@mui/joy'

export default function EditorHome() {
  const { id } = useParams()
  const location = useLocation()
  const { book } = location.state

  const [activePage, setActivePage] = useState({})
  const [pages, setPages] = useState(book.pages)
  const [content, setContent] = useState('')
  const [bookName, setBookName] = useState(book.title)

  const handleSavePage = async (page) => {
    if (!page) {
      const newPage = await saveBookPage({
        book_id: id,
        page_number: pages.length + 1,
        content: '<p></p>'
      })
      setPages([...pages, newPage])
      setActivePage(newPage)
      setContent(newPage.content)
    } else {
      page.content = content
      await saveBookPage(page)
    }
  }

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const fullBook = await getBookById(id)
        setPages(fullBook.pages)
        setActivePage(fullBook.pages[0])
        setContent(fullBook.pages[0]?.content || '')
      } catch (error) {
        console.error('Error fetching book:', error)
      }
    }
    fetchBook()
  }, [id])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', height: '100vh' }}>
      <PageOverview pages={pages} setActivePage={setActivePage} setContent={setContent} handleSavePage={handleSavePage} />

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Sheet
          variant='outlined'
          sx={{
            px: 4,
            py: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Input
            placeholder='Book title'
            value={bookName}
            onChange={(e) => setBookName(e.target.value)}
            variant='plain'
            sx={{ fontSize: 'lg', fontWeight: 'bold', border: 'none', px: 0 }}
          />

          <Stack direction='row' spacing={1}>
            <IconButton variant='soft' color='success' onClick={() => handleSavePage(activePage)}>
              <Save />
            </IconButton>
            <IconButton variant='outlined'>
              <CircleArrowLeft />
            </IconButton>
            <IconButton variant='outlined'>
              <CircleArrowRight />
            </IconButton>
          </Stack>
        </Sheet>

        <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
          <Editor
            activePage={activePage}
            setActivePage={setActivePage}
            content={content}
            setContent={setContent}
            wordLimit={250}
            lineLimit={10}
          />
        </Box>
      </Box>
    </Box>
  )
}

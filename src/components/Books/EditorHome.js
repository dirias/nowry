import React, { useState, useEffect } from 'react'
import Editor from './Editor'
import PageOverview from './PageOverview'
import { useParams, useLocation } from 'react-router-dom'
import { CircleArrowLeft, CircleArrowRight, Save } from 'lucide-react'
import { saveBookPage, getBookById } from '../../api/Books'

export default function EditorHome() {
  const { id } = useParams()
  const location = useLocation()
  const { book } = location.state

  const [activePage, setActivePage] = useState({})
  const [pages, setPages] = useState(book.pages)
  const [content, setContent] = useState('')
  const [bookName, setBookName] = useState(book.title) // Initialize bookName state with the book title

  const handleSavePage = async (page) => {
    if (!page) {
      page = {
        book_id: id,
        page_number: pages.length + 1,
        content: '<p></p>' // issue not here
      }
      console.log('Page to add:', page)
      const newPage = await saveBookPage(page)
      setPages((prevPages) => [...prevPages, newPage]) // Add the new page to the list
      setActivePage(newPage) // Set the new page as active
      setContent(newPage.content) // Update content state
    } else {
      page.content = content // Update page content before saving
      console.log('Updating page:', page)
      await saveBookPage(page)
    }
  }

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const book = await getBookById(id)
        setPages(book.pages)

        setActivePage(book.pages[0])
        setContent(book.pages[0]?.content || '') // Initialize content with the first page's content
      } catch (error) {
        console.error('Error fetching book:', error)
      }
    }

    fetchBook()
  }, [id])

  return (
    <div className='book-container'>
      <PageOverview pages={pages} setActivePage={setActivePage} setContent={setContent} handleSavePage={handleSavePage} />
      <div className='book-main'>
        <div className='book-header'>
          <div className='book-title'>
            <input
              type='text'
              className='book-title-input'
              value={bookName} // Use bookName state
              onChange={(e) => setBookName(e.target.value)} // Update bookName state on change
            />
          </div>
          <div className='book-pagination'>
            <Save className='book-button' onClick={() => handleSavePage(activePage)} />
            <button className='book-button'>
              <CircleArrowLeft />
            </button>
            <button className='book-button'>
              <CircleArrowRight />
            </button>
          </div>
        </div>
        <div className='content'>
          <Editor
            activePage={activePage}
            setActivePage={setActivePage}
            content={content}
            setContent={setContent}
            wordLimit={250}
            lineLimit={10}
          />
        </div>
      </div>
    </div>
  )
}

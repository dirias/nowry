import React, { useState, useEffect } from 'react';
import Editor from './Editor';
import PageOverview from './PageOverview';
import { useParams, useLocation } from 'react-router-dom';
import { CircleArrowLeft, CircleArrowRight, Save } from 'lucide-react';
import { saveBookPage, getBookById } from '../../api/Books';

export default function Book() {
  const { id } = useParams();
  const location = useLocation();
  const { book } = location.state;

  const [activePage, setActivePage] = useState({});
  const [pages, setPages] = useState(book.pages);
  const [content, setContent] = useState('');
  const [bookName, setBookName] = useState('Book name');
  const [typingTimeout, setTypingTimeout] = useState(null);
  
  const handlePreviousPage = async () => {
    if (activePage > 0) {
      //await savePageContent(activePage);
      setActivePage(activePage - 1);
    }
  };

  const handleSavePage = async (page) => {
    console.log("Content", content)
    
    if (!page){
      page = {
        book_id: id,
        page_number: pages.length + 1,
        content: "<p></p>" //issue not here
      }
      console.log("Page to add:", page)
      const newPage = await saveBookPage(page);
      setActivePage(pages.push(newPage))
    }
    else 
    {
      activePage.content = content
      page = activePage
      console.log("Updating page:", page)
      await saveBookPage(page);
    }
      //const newPage = await saveBookPage(page);
      //setPages.push(newPage) ? newPage not in pages : update
  };

  const handleNextPage = async () => {
    if (content.length > 0 && activePage < content.length - 1) {
      //await savePageContent(activePage);
      setActivePage(activePage + 1);
    }
  };

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const book = await getBookById(id);
        setPages(book.pages);
        console.log('activa page before', activePage)
        console.log('pages before', pages)
        
        setActivePage(book.pages[0])
        setBookName(book.title);
        
      } catch (error) {
        console.error('Error fetching book:', error);
      }
    };

    fetchBook();

    return () => {
      clearTimeout(typingTimeout);
    };
  }, []);

  return (
    <div className="book-container">
      <PageOverview pages={pages} setActivePage={setActivePage} setContent={setContent} handleSavePage={handleSavePage}/>
      <div className="book-main">
        <div className="book-header">
          <div className="book-title">
            <input
              type="text"
              className="book-title-input"
              value={bookName}
              onChange={(e) => setBookName(e.target.value)}
            />
          </div>
          <div className="book-pagination">
              <Save className="book-button" onClick={ handleSavePage} />
              <button className="book-button">
              <CircleArrowLeft/>
            </button>
            <button className="book-button">
              <CircleArrowRight />
            </button>
          </div>
        </div>
        <div className="content">
          <Editor
            activePage={activePage}
            content={activePage.content || ''}
            setContent={setContent}
            wordLimit={250}
            lineLimit={10}
          />
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import Editor from './Editor';
import { useParams } from 'react-router-dom';
import { CircleArrowLeft, CircleArrowRight, Save } from 'lucide-react';
import { saveBookPage, getBookById } from '../../api/Books';

export default function Book() {
  const { id } = useParams();
  const [activePage, setActivePage] = useState(0);
  const [pages, setPages] = useState([]);
  const [content, setContent] = useState(['']);
  const [bookName, setBookName] = useState('Book name');
  const [typingTimeout, setTypingTimeout] = useState(null);

  const handlePreviousPage = async () => {
    if (activePage > 0) {
      await savePageContent(activePage);
      setActivePage(activePage - 1);
    }
  };

  const handleSavePage = async () => {
    console.log("Content", content)
    console.log("Active", activePage)
      await savePageContent(activePage, content);
  };

  const handleNextPage = async () => {
    if (content.length > 0 && activePage < content.length - 1) {
      await savePageContent(activePage);
      setActivePage(activePage + 1);
    }
  };

  const savePageContent = async (pageIndex) => {
    const updatedContent = [...content];
    updatedContent[pageIndex] = content[activePage];
    setContent(updatedContent);
    console.log('Book id', id)
    console.log('updatedContent', updatedContent)
    await saveBookPage(pageIndex, content[0], id); //Change to book_id
  };

  const handleEditorChange = (newContent) => {
    const updatedContent = [...content];
    updatedContent[activePage] = newContent;
    setContent(updatedContent);
    clearTimeout(typingTimeout);
    const timeout = setTimeout(() => console.log('Autosave')/*savePageContent(activePage)*/, 5000);
    setTypingTimeout(timeout);
  };

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const book = await getBookById(id);
        setPages(book.pages)
        console.log('Pages', pages)
        console.log("Books s", book)
        setBookName(book.title);
        setContent(book.content || ['']);
      } catch (error) {
        console.error('Error fetching book:', error);
      }
    };

    fetchBook();

    return () => {
      clearTimeout(typingTimeout);
    };
  }, [id]);

  return (
    <div className="book-container">
      <div className="book-sidebar">
        <h2>Pages Overview</h2>
        <ul>
          {content.map((page, index) => (
            <li key={index} className={index === activePage ? 'active-page' : ''}>
              Page {index + 1}
            </li>
          ))}
        </ul>
      </div>
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
            <button className="book-button" onClick={handlePreviousPage}>
              <CircleArrowLeft/>
            </button>
            <button className="book-button" onClick={handleNextPage}>
              <CircleArrowRight />
            </button>
          </div>
        </div>
        <div className="content">
          <Editor
            activePage={activePage}
            content={content}
            setContent={handleEditorChange}
            wordLimit={250}
            lineLimit={10}
          />
        </div>
      </div>
    </div>
  );
}

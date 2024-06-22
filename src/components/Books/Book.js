import React, { useState, useEffect } from 'react';
import Editor from './Editor';
import { useParams } from 'react-router-dom';
import { saveBookPage, getBookById } from '../../api/Books';

export default function Book() {
  const { id } = useParams();
  const [activePage, setActivePage] = useState(0);
  const [content, setContent] = useState(['']);
  const [bookName, setBookName] = useState('Book name');
  const [typingTimeout, setTypingTimeout] = useState(null);

  const handlePreviousPage = async () => {
    if (activePage > 0) {
      await savePageContent(activePage);
      setActivePage(activePage - 1);
    }
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
    await saveBookPage(pageIndex, updatedContent[pageIndex]);
  };

  const handleEditorChange = (newContent) => {
    const updatedContent = [...content];
    updatedContent[activePage] = newContent;
    setContent(updatedContent);
    clearTimeout(typingTimeout);
    const timeout = setTimeout(() => savePageContent(activePage), 5000);
    setTypingTimeout(timeout);
  };

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const book = await getBookById(id);
        console.log(book)
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
            <button className="book-button" onClick={handlePreviousPage}>
              Previous Page
            </button>
            <button className="book-button" onClick={handleNextPage}>
              Next Page
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

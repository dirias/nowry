import React, { useState, useEffect } from 'react';
import Editor from './Editor';
import { saveBookPage } from '../../api/Books';

export default function Book() {
  const [activePage, setActivePage] = useState(0);
  const [content, setContent] = useState(['']);
  const [bookName, setBookName] = useState('Book name');
  const [typingTimeout, setTypingTimeout] = useState(null); // State for typing timeout

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
    saveBookPage(pageIndex, content);
  };

  const handleEditorChange = (newContent) => {
    setContent(newContent);
    clearTimeout(typingTimeout); // Clear previous timeout
    const timeout = setTimeout(() => savePageContent(activePage), 5000); // Save after 5 seconds of no typing
    setTypingTimeout(timeout); // Update typing timeout
  };

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeout); // Cleanup timeout on component unmount
    };
  }, [typingTimeout]); // Watch for changes in typingTimeout

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

import React, { useState, useEffect } from 'react';
import Editor from './Editor';
import { saveBookPage } from '../../api/Books';

export default function Book() {
  const [activePage, setActivePage] = useState(0);
  const [content, setContent] = useState(['']); // Initialize with an empty array with at least one empty string

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
    // Ensure content is always an array and not undefined
    const updatedContent = content || [];
    updatedContent[pageIndex] = content[activePage];
    setContent(updatedContent);
    saveBookPage(pageIndex, content);
  };

  return (
    <div>
      <div className="book-header">
        <div className="book-title">
          <h2>Book name</h2>
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
          setContent={(newContent) => {
            // Update the content state when the editor's content changes
            const updatedContent = [...content];
            updatedContent[activePage] = newContent;
            setContent(updatedContent);
          }}
        />
      </div>
    </div>
  );
}

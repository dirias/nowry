import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllBooks, createBook, deleteBook } from '../../api/Books';
import { WarningWindow, SuccessWindow } from '../Messages';
import BookEditor from './BookEditor';
import Book from './Book'; // Import the BookEditor component

export default function BookHome() {
  const [books, setBooks] = useState([]);
  const [allBooks, setAllBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, book: null });
  const [showWarning, setShowWarning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);

  const [showEditor, setShowEditor] = useState(false);
  const [bookToEdit, setBookToEdit] = useState(null);

  const navigate = useNavigate();

  const fetchBooks = async () => {
    try {
      const fetchedBooks = await getAllBooks();
      setBooks(fetchedBooks);
      setAllBooks(fetchedBooks);
    } catch (error) {
      console.error('Error fetching books:', error);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleCreateBook = async () => {
    try {
      const newBook = await createBook(`New book ${books.length}`, localStorage.getItem('username'), 'ISBN Number');
      setBooks(prevBooks => [...prevBooks, newBook]);
      setAllBooks(prevBooks => [...prevBooks, newBook]);
    } catch (error) {
      console.error('Error creating book:', error);
    }
  };

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term) {
      const filteredBooks = allBooks.filter(book => book.title.toLowerCase().includes(term.toLowerCase()));
      setBooks(filteredBooks);
    } else {
      setBooks(allBooks);
    }
  };

  const handleBookClick = (book) => {
    navigate(`/book/${book._id}`, { state: { book } });
  };

  const handleContextMenu = (event, book) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      book
    });
  };

  const handleClickOutside = () => {
    setContextMenu({ visible: false, x: 0, y: 0, book: null });
  };

  const handleMenuClick = (action) => {
    setContextMenu({ visible: false, x: 0, y: 0, book: null });
    if (action === 'delete') {
      setBookToDelete(contextMenu.book);
      setShowWarning(true);
    } else if (action === 'edit') {
      setBookToEdit(contextMenu.book);
      setShowEditor(true);
    }
  };

  const handleDeleteBook = async () => {
    try {
      await deleteBook(bookToDelete._id);
      setBooks(prevBooks => prevBooks.filter(book => book._id !== bookToDelete._id));
      setAllBooks(prevBooks => prevBooks.filter(book => book._id !== bookToDelete._id));
      setShowWarning(false);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error deleting book:', error);
    }
  };

  const handleWarningClose = () => {
    setShowWarning(false);
    setBookToDelete(null);
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setBookToEdit(null);
  };

  const handleSaveChanges = (updatedBookData) => {
    setBooks(prevBooks =>
      prevBooks.map(book => (book._id === bookToEdit._id ? { ...book, ...updatedBookData } : book))
    );
    setAllBooks(prevBooks =>
      prevBooks.map(book => (book._id === bookToEdit._id ? { ...book, ...updatedBookData } : book))
    );
    handleEditorClose();
  };

  return (
    <section className='booksHome' onClick={handleClickOutside}>
      <div className='searchSection'>
        <input
          type='text'
          placeholder='Search by title'
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>

      {searchTerm && books.length === 0 ? (
        <div className='noBooksMsg'>
          <p>No books match your search.</p>
        </div>
      ) : (
        <div className='booksCreated'>
          {!searchTerm && (
            <button className='createBookBtn' onClick={handleCreateBook}>Create new book</button>
          )}
          {books.map(book => (
            <Book 
            book={book}
            handleBookClick={handleBookClick}
            handleContextMenu={handleContextMenu}
            />
          ))}
        </div>
      )}
      {contextMenu.visible && (
        <div
          className='contextMenu'
          style={{ top: contextMenu.y, left: contextMenu.x, position: 'absolute', backgroundColor: 'white', border: '1px solid #ccc', zIndex: 1000 }}
        >
          <div onClick={() => handleMenuClick('edit')}>Edit</div>
          <div onClick={() => handleMenuClick('delete')}>Delete</div>
        </div>
      )}
      {showWarning && (
        <WarningWindow
          title="Confirm Deletion"
          error_msg="Do you really want to delete this book?\nThis operation will delete the book along with its pages."
          onClose={handleWarningClose}
          onConfirm={handleDeleteBook}
        />
      )}
      {showSuccess && (
        <SuccessWindow
          title="Success"
          success_msg="Book was successfully deleted."
          onClose={handleSuccessClose}
        />
      )}
      {showEditor && bookToEdit && (
        <div className="modal-overlay">
          <BookEditor
            initialTitle={bookToEdit.title}
            initialAuthor={bookToEdit.author}
            initialCreatedAt={bookToEdit.createdAt}
            initialUpdatedAt={bookToEdit.updatedAt}
            initialPages={bookToEdit.pages}
            initialPageLimit={bookToEdit.pageLimit}
            initialTags={bookToEdit.tags}
            initialSummary={bookToEdit.summary}
            initialCoverImage={bookToEdit.coverImage}
            initialCoverColor={bookToEdit.coverColor}
            onSave={handleSaveChanges}
            onCancel={handleEditorClose}
          />
        </div>
      )}
    </section>
  );
}

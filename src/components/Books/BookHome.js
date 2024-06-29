import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllBooks, createBook, searchBooks } from '../../api/Books';

export default function BookHome() {
    const [books, setBooks] = useState([]);
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const fetchBooks = async () => {
        try {
            const fetchedBooks = await getAllBooks();
            setBooks(fetchedBooks); 
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
            console.log('Book created successfully');
            setBooks(books => [...books, newBook]);
        } catch (error) {
            console.error('Error creating book:', error);
        }
    };

    const handleSearch = async () => {
        try {
            const searchedBooks = await searchBooks(searchTerm);
            setBooks(searchedBooks);
        } catch (error) {
            console.error('Error searching books:', error);
        }
    };

    const handleBookClick = (book) => {
        console.log(book)
        navigate(`/book/${book._id}`, { state: { book } });
    };

    return (
        <section className='booksHome'>

        {
            books.length >= 1 && <div className='searchSection'>
                <input
                    type='text'
                    placeholder='Search by title'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <button onClick={handleSearch}>Search</button>
            </div>}

            {books.length === 0 ? (
                <div className='noBooksMsg'>
                    <p>You have no books created, please create one.</p>
                    <button className='createBookBtn' onClick={handleCreateBook}>Create new book</button>
                </div>
            ) : (
                <div className='booksCreated'>
                    <button className='createBookBtn' onClick={handleCreateBook}>Create new book</button>
                    {books.map(book => (
                        <div  className='book'key={book._id}  onClick={() => handleBookClick(book)}>
                            <div>{book.title}</div>
                            <div>{book.author}</div>
                            <div>{book.isbn}</div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

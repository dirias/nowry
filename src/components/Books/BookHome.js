import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { booksService } from '../../api/services'
import { WarningWindow, SuccessWindow } from '../Messages'
import BookEditor from './BookEditor'
import Book from './Book'
import { Box, Typography, Input, Button, Sheet, Stack, IconButton, Menu, MenuItem, Skeleton } from '@mui/joy'
import MoreVertIcon from '@mui/icons-material/MoreVert'

export default function BookHome() {
  const [books, setBooks] = useState([])
  const [allBooks, setAllBooks] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [contextBook, setContextBook] = useState(null)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [showWarning, setShowWarning] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [bookToDelete, setBookToDelete] = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const [bookToEdit, setBookToEdit] = useState(null)
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()

  const fetchBooks = async () => {
    try {
      const fetchedBooks = await booksService.getAll()
      setBooks(fetchedBooks)
      setAllBooks(fetchedBooks)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching books:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBooks()
  }, [])

  const handleCreateBook = async () => {
    try {
      const newBook = await booksService.create({
        title: `New book ${books.length}`,
        author: localStorage.getItem('username'),
        isbn: 'ISBN Number'
      })
      const updatedBooks = [...books, newBook]
      setBooks(updatedBooks)
      setAllBooks(updatedBooks)
    } catch (error) {
      console.error('Error creating book:', error)
    }
  }

  const handleSearch = (e) => {
    const term = e.target.value
    setSearchTerm(term)
    if (term) {
      const filtered = allBooks.filter((b) => b.title.toLowerCase().includes(term.toLowerCase()))
      setBooks(filtered)
    } else {
      setBooks(allBooks)
    }
  }

  const handleBookClick = (book) => {
    navigate(`/book/${book._id}`, { state: { book } })
  }

  const openMenu = (event, book) => {
    setContextBook(book)
    setMenuAnchor(event.currentTarget)
  }

  const handleContextMenu = (event, book) => {
    event.preventDefault()
    openMenu(event, book)
  }

  const closeMenu = () => {
    setMenuAnchor(null)
  }

  const handleMenuAction = (action) => {
    closeMenu()
    if (action === 'edit') {
      setBookToEdit(contextBook)
      setShowEditor(true)
    } else if (action === 'delete') {
      setBookToDelete(contextBook)
      setShowWarning(true)
    }
  }

  const handleDeleteBook = async () => {
    try {
      await booksService.delete(bookToDelete._id)
      const updated = books.filter((b) => b._id !== bookToDelete._id)
      setBooks(updated)
      setAllBooks(updated)
      setShowWarning(false)
      setShowSuccess(true)
    } catch (error) {
      console.error('Error deleting book:', error)
    }
  }

  return (
    <Box sx={{ p: 4 }}>
      <Stack direction='row' spacing={2} justifyContent='space-between' alignItems='center' mb={3}>
        <Typography level='h3'>Tus libros</Typography>
        <Button onClick={handleCreateBook}>Crear nuevo libro</Button>
      </Stack>

      {!loading && allBooks.length > 0 && (
        <Input placeholder='Buscar por título' value={searchTerm} onChange={handleSearch} fullWidth sx={{ mb: 3 }} />
      )}

      {!loading && allBooks.length === 0 ? (
        <Typography color='neutral'>Aún no has creado ningún libro.</Typography>
      ) : searchTerm && books.length === 0 && !loading ? (
        <Typography>No hay libros que coincidan con la búsqueda.</Typography>
      ) : (
        <Stack direction='row' spacing={2} flexWrap='wrap'>
          {(loading ? Array.from({ length: 4 }) : books).map((book, idx) => (
            <Sheet
              key={idx}
              variant='outlined'
              sx={{
                p: 2,
                borderRadius: 'md',
                minWidth: 200,
                position: 'relative',
                transition: '0.2s ease-in-out',
                '&:hover': { boxShadow: 'md', transform: 'translateY(-4px)' }
              }}
            >
              {loading ? (
                <Skeleton variant='rectangular' height={100} sx={{ borderRadius: 'sm', mb: 1 }} />
              ) : (
                <>
                  <IconButton size='sm' sx={{ position: 'absolute', top: 8, right: 8 }} onClick={(e) => openMenu(e, book)}>
                    <MoreVertIcon />
                  </IconButton>
                  <Book book={book} handleBookClick={handleBookClick} handleContextMenu={handleContextMenu} />
                </>
              )}
            </Sheet>
          ))}
        </Stack>
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={() => handleMenuAction('edit')}>Editar</MenuItem>
        <MenuItem onClick={() => handleMenuAction('delete')}>Eliminar</MenuItem>
      </Menu>

      {showWarning && (
        <WarningWindow
          title='Confirmar eliminación'
          error_msg='¿Deseas eliminar este libro y todas sus páginas?'
          onClose={() => setShowWarning(false)}
          onConfirm={handleDeleteBook}
        />
      )}

      {showSuccess && (
        <SuccessWindow title='Éxito' success_msg='El libro fue eliminado exitosamente.' onClose={() => setShowSuccess(false)} />
      )}

      {showEditor && bookToEdit && (
        <div className='modal-overlay'>
          <BookEditor book={bookToEdit} refreshBooks={fetchBooks} onCancel={() => setShowEditor(false)} />
        </div>
      )}
    </Box>
  )
}

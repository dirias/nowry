import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { booksService } from '../../api/services'
import { WarningWindow, SuccessWindow, Error as ErrorWindow } from '../Messages'
import BookEditor from './BookEditor'
import Book from './Book'
import ImportPreviewModal from './ImportPreviewModal'
import {
  Box,
  Typography,
  Input,
  Button,
  Sheet,
  Stack,
  IconButton,
  Menu,
  MenuItem,
  Skeleton,
  Card,
  CardContent,
  Chip,
  Grid,
  Container,
  AspectRatio
} from '@mui/joy'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import AddIcon from '@mui/icons-material/Add'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import SearchIcon from '@mui/icons-material/Search'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import MenuBookIcon from '@mui/icons-material/MenuBook'

export default function BookHome() {
  const [books, setBooks] = useState([])
  const [allBooks, setAllBooks] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [contextBook, setContextBook] = useState(null)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [showWarning, setShowWarning] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [bookToDelete, setBookToDelete] = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const [bookToEdit, setBookToEdit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // Preview modal state
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [pendingFiles, setPendingFiles] = useState([])
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [confirmingImport, setConfirmingImport] = useState(false)

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
        isbn: 'Sin ISBN'
      })
      const updatedBooks = [...books, newBook]
      setBooks(updatedBooks)
      setAllBooks(updatedBooks)
      setSuccessMessage('Libro creado exitosamente')
      setShowSuccess(true)
    } catch (error) {
      console.error('Error creating book:', error)
    }
  }

  const onDrop = useCallback(
    async (acceptedFiles) => {
      setUploading(true)
      const username = localStorage.getItem('username') || 'Unknown'

      try {
        // Store files for processing
        setPendingFiles(acceptedFiles)
        setCurrentFileIndex(0)

        // Get preview for first file
        const file = acceptedFiles[0]
        const preview = await booksService.importFile(file, username, true) // preview=true

        setPreviewData(preview)
        setShowPreview(true)
        setUploading(false)
      } catch (error) {
        console.error('Error getting preview:', error)
        setErrorMessage(error.response?.data?.detail || 'Error al procesar el archivo. Por favor, inténtalo de nuevo.')
        setShowError(true)
        setUploading(false)
      }
    },
    [books]
  )

  const handleConfirmImport = async () => {
    setConfirmingImport(true)
    const username = localStorage.getItem('username') || 'Unknown'

    try {
      const importedBooks = []

      for (const file of pendingFiles) {
        // Actually import with preview=false
        const result = await booksService.importFile(file, username, false)
        importedBooks.push(result)
      }

      // Close preview modal
      setShowPreview(false)
      setPreviewData(null)
      setPendingFiles([])

      // Refresh book list
      await fetchBooks()

      setSuccessMessage(
        `${importedBooks.length} ${importedBooks.length === 1 ? 'libro importado' : 'libros importados'} exitosamente! ${importedBooks.reduce((sum, book) => sum + book.page_count, 0)} páginas totales.`
      )
      setShowSuccess(true)
      setConfirmingImport(false)
    } catch (error) {
      console.error('Error importing files:', error)
      setErrorMessage(error.response?.data?.detail || 'Error al importar archivos. Por favor, inténtalo de nuevo.')
      setShowError(true)
      setConfirmingImport(false)
      setShowPreview(false)
    }
  }

  const handleCancelPreview = () => {
    setShowPreview(false)
    setPreviewData(null)
    setPendingFiles([])
    setCurrentFileIndex(0)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc']
    },
    multiple: true,
    noClick: false
  })

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
      setSuccessMessage('Libro eliminado exitosamente')
      setShowSuccess(true)
    } catch (error) {
      console.error('Error deleting book:', error)
    }
  }

  return (
    <Container maxWidth='xl' sx={{ py: 4 }}>
      {/* Header with Stats */}
      <Box sx={{ mb: 4 }}>
        <Stack direction='row' spacing={2} justifyContent='space-between' alignItems='center' mb={3}>
          <Box>
            <Typography level='h2' fontWeight={700} sx={{ mb: 0.5 }}>
              📚 Library
            </Typography>
            <Typography level='body-sm' sx={{ color: 'neutral.600' }}>
              Your personal collection
            </Typography>
          </Box>

          <Stack direction='row' spacing={1.5}>
            <Button
              startDecorator={<AddIcon />}
              onClick={handleCreateBook}
              size='md'
              variant='solid'
              color='primary'
              sx={{ borderRadius: 'md' }}
            >
              Create Book
            </Button>
            <Button
              startDecorator={<UploadFileIcon />}
              {...getRootProps()}
              size='md'
              variant='soft'
              color='success'
              loading={uploading}
              sx={{ borderRadius: 'md' }}
            >
              <input {...getInputProps()} />
              Import
            </Button>
          </Stack>
        </Stack>

        {/* Stats Dashboard */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid xs={12} sm={4}>
            <Card variant='soft' color='primary'>
              <CardContent>
                <Stack direction='row' spacing={2} alignItems='center'>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 'md',
                      bgcolor: 'primary.solidBg',
                      color: 'primary.solidColor'
                    }}
                  >
                    <AutoStoriesIcon />
                  </Box>
                  <Box>
                    <Typography level='h3' fontWeight={700}>
                      {allBooks.length}
                    </Typography>
                    <Typography level='body-sm' sx={{ color: 'primary.600' }}>
                      Total Books
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid xs={12} sm={4}>
            <Card variant='soft' color='success'>
              <CardContent>
                <Stack direction='row' spacing={2} alignItems='center'>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 'md',
                      bgcolor: 'success.solidBg',
                      color: 'success.solidColor'
                    }}
                  >
                    <MenuBookIcon />
                  </Box>
                  <Box>
                    <Typography level='h3' fontWeight={700}>
                      {
                        allBooks.filter((b) => {
                          if (!b.updated_at) return false
                          const daysSince = (Date.now() - new Date(b.updated_at).getTime()) / (1000 * 60 * 60 * 24)
                          return daysSince <= 7
                        }).length
                      }
                    </Typography>
                    <Typography level='body-sm' sx={{ color: 'success.600' }}>
                      Updated This Week
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid xs={12} sm={4}>
            <Card variant='soft' color='warning'>
              <CardContent>
                <Stack direction='row' spacing={2} alignItems='center'>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 'md',
                      bgcolor: 'warning.solidBg',
                      color: 'warning.solidColor'
                    }}
                  >
                    <CloudUploadIcon />
                  </Box>
                  <Box>
                    <Typography level='h3' fontWeight={700}>
                      {allBooks.reduce((sum, b) => sum + (b.page_count || 0), 0)}
                    </Typography>
                    <Typography level='body-sm' sx={{ color: 'warning.600' }}>
                      Total Pages
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search and Filter Bar */}
        {allBooks.length > 0 && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
            <Input
              placeholder='Search by title, author, or ISBN...'
              value={searchTerm}
              onChange={handleSearch}
              startDecorator={<SearchIcon />}
              size='md'
              sx={{
                flex: 1,
                '--Input-focusedThickness': '0.25rem',
                borderRadius: 'md'
              }}
            />
          </Stack>
        )}
      </Box>

      {/* Empty State / Drop Zone */}
      {allBooks.length === 0 && !loading && (
        <Card
          {...getRootProps()}
          variant='soft'
          sx={{
            mb: 4,
            textAlign: 'center',
            py: 8,
            cursor: 'pointer',
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.500' : 'neutral.300',
            backgroundColor: isDragActive ? 'primary.softBg' : 'neutral.softBg',
            transition: 'all 0.3s ease',
            '&:hover': {
              borderColor: 'primary.400',
              backgroundColor: 'primary.softBg'
            }
          }}
        >
          <input {...getInputProps()} />
          <CardContent>
            <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.500', mb: 2 }} />
            <Typography level='h4' sx={{ mb: 1 }}>
              {isDragActive ? 'Drop files here!' : 'Drag files or click to import'}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'neutral.600', mb: 3 }}>
              Supports PDF, DOCX, DOC, TXT
            </Typography>
            <Stack direction='row' spacing={1} justifyContent='center'>
              <Chip size='sm' color='primary' variant='soft'>
                PDF
              </Chip>
              <Chip size='sm' color='primary' variant='soft'>
                Word
              </Chip>
              <Chip size='sm' color='primary' variant='soft'>
                TXT
              </Chip>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Books Grid */}
      {!loading && allBooks.length === 0 ? (
        <Card
          variant='outlined'
          sx={{
            textAlign: 'center',
            py: 6
          }}
        >
          <CardContent>
            <AutoStoriesIcon sx={{ fontSize: 64, color: 'neutral.400', mb: 2 }} />
            <Typography level='h4' sx={{ mb: 1 }}>
              Your library is empty
            </Typography>
            <Typography level='body-md' sx={{ color: 'neutral.600', mb: 3 }}>
              Create a new book or import documents to get started
            </Typography>
            <Stack direction='row' spacing={2} justifyContent='center'>
              <Button startDecorator={<AddIcon />} onClick={handleCreateBook} size='lg'>
                Create Book
              </Button>
              <Button startDecorator={<UploadFileIcon />} {...getRootProps()} variant='soft' size='lg' loading={uploading}>
                <input {...getInputProps()} />
                Import File
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ) : searchTerm && books.length === 0 && !loading ? (
        <Card variant='outlined' sx={{ textAlign: 'center', py: 4 }}>
          <CardContent>
            <Typography level='body-lg'>No books match &quot;{searchTerm}&quot;</Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2.5}>
          {(loading ? Array.from({ length: 8 }) : books).map((book, idx) => (
            <Grid key={idx} xs={12} sm={6} md={4} lg={2.4}>
              {loading ? (
                <Card variant='outlined'>
                  <Skeleton variant='rectangular' height={180} sx={{ borderRadius: 'sm', mb: 2 }} />
                  <Skeleton variant='text' level='h4' sx={{ mb: 1 }} />
                  <Skeleton variant='text' level='body-sm' width='60%' />
                </Card>
              ) : (
                <Card
                  variant='outlined'
                  sx={{
                    position: 'relative',
                    transition: 'all 0.25s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 'lg',
                      transform: 'translateY(-4px)',
                      borderColor: 'primary.400'
                    }
                  }}
                  onClick={() => handleBookClick(book)}
                >
                  <IconButton
                    size='sm'
                    variant='soft'
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      zIndex: 10,
                      bgcolor: 'background.surface'
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      openMenu(e, book)
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>

                  <CardContent sx={{ p: 0 }}>
                    {/* Book Cover */}
                    <AspectRatio ratio='2/3' sx={{ mb: 1.5 }}>
                      {book.cover_image ? (
                        <img src={book.cover_image} alt={book.title} loading='lazy' style={{ objectFit: 'cover' }} />
                      ) : (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: book.cover_color || 'primary.softBg',
                            color: 'primary.solidColor'
                          }}
                        >
                          <MenuBookIcon sx={{ fontSize: 48 }} />
                        </Box>
                      )}
                    </AspectRatio>

                    {/* Book Info */}
                    <Box sx={{ px: 2, pb: 2 }}>
                      <Typography level='title-sm' fontWeight={600} noWrap sx={{ mb: 0.5 }}>
                        {book.title}
                      </Typography>
                      <Typography level='body-xs' sx={{ color: 'neutral.600', mb: 1 }} noWrap>
                        {book.author || 'Unknown Author'}
                      </Typography>

                      {/* Last Updated */}
                      {book.updated_at && (
                        <Typography level='body-xs' sx={{ color: 'neutral.500' }}>
                          Updated {new Date(book.updated_at).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Grid>
          ))}
        </Grid>
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={() => handleMenuAction('edit')}>Editar</MenuItem>
        <MenuItem onClick={() => handleMenuAction('delete')} color='danger'>
          Eliminar
        </MenuItem>
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
        <SuccessWindow
          title='¡Éxito!'
          success_msg={successMessage}
          onClose={() => {
            setShowSuccess(false)
            setSuccessMessage('')
          }}
        />
      )}

      {showError && (
        <div className='backdrop'>
          <ErrorWindow
            title='Error'
            error_msg={errorMessage}
            onClose={() => {
              setShowError(false)
              setErrorMessage('')
            }}
          />
        </div>
      )}

      {showEditor && bookToEdit && (
        <div className='modal-overlay'>
          <BookEditor book={bookToEdit} refreshBooks={fetchBooks} onCancel={() => setShowEditor(false)} />
        </div>
      )}

      {/* Import Preview Modal */}
      <ImportPreviewModal
        open={showPreview}
        onClose={handleCancelPreview}
        previewData={previewData}
        onConfirm={handleConfirmImport}
        loading={confirmingImport}
      />
    </Container>
  )
}

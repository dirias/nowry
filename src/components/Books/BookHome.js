import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDropzone } from 'react-dropzone'
import { booksService } from '../../api/services'
import { WarningWindow, SuccessWindow, Error as ErrorWindow } from '../Messages'
import BookEditor from './BookEditor'
import { useThemePreferences } from '../../theme/DynamicThemeProvider'
import { useAuth } from '../../context/AuthContext'
import Book from './Book'
import ImportPreviewModal from './ImportPreviewModal'
import { Box, Typography, Input, Button, Stack, IconButton, Card, Grid, Container, Chip, Modal, ModalDialog } from '@mui/joy'
import AddIcon from '@mui/icons-material/Add'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import SearchIcon from '@mui/icons-material/Search'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'

export default function BookHome() {
  const [books, setBooks] = useState([])
  const [allBooks, setAllBooks] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

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
  const { t } = useTranslation()
  const { themeColor } = useThemePreferences()
  const { user } = useAuth()

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
        author: user?.username || 'Unknown',
        isbn: 'Sin ISBN'
      })
      const updatedBooks = [...books, newBook]
      setBooks(updatedBooks)
      setAllBooks(updatedBooks)
      // Redirect immediately to the new book (Minimalist flow)
      navigate(`/book/${newBook._id}`, { state: { book: newBook } })
    } catch (error) {
      console.error('Error creating book:', error)
      let msg = error.response?.data?.detail || t('subscription.errors.genericCreate')
      if (error.response?.status === 403) {
        msg = t('subscription.errors.bookLimit')
      }
      setErrorMessage(msg)
      setShowError(true)
    }
  }

  const onDrop = useCallback(
    async (acceptedFiles) => {
      setUploading(true)
      const username = user?.username || 'Unknown'

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
    const username = user?.username || 'Unknown'

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
        t('books.successImport_plural', {
          count: importedBooks.length,
          pages: importedBooks.reduce((sum, book) => sum + book.page_count, 0)
        })
      )
      setShowSuccess(true)
      setConfirmingImport(false)
    } catch (error) {
      console.error('Error importing files:', error)
      setErrorMessage(error.response?.data?.detail || t('books.errorImport'))
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

  const handleDeleteBook = async () => {
    try {
      await booksService.delete(bookToDelete._id)
      const updated = books.filter((b) => b._id !== bookToDelete._id)
      setBooks(updated)
      setAllBooks(updated)
      setShowWarning(false)
      // Redirect immediately to the new book (Minimalist flow)
      // Note: The original instruction provided a navigate call that seemed intended for book creation.
      // For a delete operation, navigating to the home page or refreshing the list is more appropriate.
      // Assuming the intent was to remove success message and potentially navigate away or refresh.
      // If a specific navigation target was intended, please clarify.
      // For now, we'll just remove the success message logic.
      // setSuccessMessage(t('books.successDelete'))
      // setShowSuccess(true)
    } catch (error) {
      console.error('Error deleting book:', error)
    }
  }

  return (
    <Container maxWidth='xl' sx={{ py: 4 }}>
      {/* Minimalist Header */}
      <Box sx={{ mb: 3 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          justifyContent='space-between'
          alignItems={{ xs: 'start', md: 'center' }}
          mb={6}
        >
          {/* Left: Title */}
          <Typography level='h2' fontWeight={600} sx={{ mb: 0.5 }}>
            {t('books.title')}
          </Typography>

          {/* Center: Subtitle */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', flex: 1 }}>
            <Typography level='body-sm' sx={{ color: 'text.tertiary', display: 'flex', alignItems: 'center', gap: 1 }}>
              {t('books.subtitle')}

              {allBooks.length > 0 && (
                <Typography component='span' level='body-xs' sx={{ color: 'text.tertiary' }}>
                  • 📚 {allBooks.length} {t('books.totalBooks')} • 📄 {allBooks.reduce((sum, b) => sum + (b.page_count || 0), 0)}{' '}
                  {t('books.totalPages')}
                </Typography>
              )}
            </Typography>
          </Box>

          {/* Mobile Only Subtitle */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, width: '100%', justifyContent: 'center' }}>
            <Typography level='body-sm' sx={{ color: 'text.tertiary', textAlign: 'center' }}>
              {t('books.subtitle')}
            </Typography>
          </Box>

          <Stack direction='row' spacing={1.5} alignItems='center' sx={{ width: { xs: '100%', md: 'auto' } }}>
            {/* Search Bar - Integrated in Header for minimalism */}
            {allBooks.length > 0 && (
              <Input
                placeholder={t('books.searchPlaceholder')}
                value={searchTerm}
                onChange={handleSearch}
                startDecorator={<SearchIcon />}
                size='sm'
                sx={{
                  width: { xs: '100%', md: 240 },
                  '--Input-focusedThickness': '1px',
                  borderRadius: 'md',
                  transition: 'width 0.2s',
                  '&:focus-within': { width: { xs: '100%', md: 280 } }
                }}
              />
            )}

            <Button
              startDecorator={<AddIcon />}
              onClick={handleCreateBook}
              size='sm'
              variant='solid'
              color='primary'
              sx={{ borderRadius: 'md', px: 2 }}
            >
              {t('books.create')}
            </Button>
            <Button
              startDecorator={<UploadFileIcon />}
              {...getRootProps()}
              size='sm'
              variant='soft'
              color='neutral'
              loading={uploading}
              sx={{ borderRadius: 'md', px: 2 }}
            >
              <input {...getInputProps()} />
              {t('books.import')}
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Unified Empty State & Drop Zone */}
      {allBooks.length === 0 && !loading && (
        <Card
          {...getRootProps()}
          variant='outlined'
          sx={{
            textAlign: 'center',
            py: 8,
            px: 4,
            cursor: 'pointer',
            borderStyle: 'dashed',
            borderColor: isDragActive ? 'primary.500' : 'neutral.300',
            backgroundColor: isDragActive ? 'primary.softBg' : 'transparent',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 400,
            '&:hover': {
              borderColor: 'primary.400',
              backgroundColor: 'neutral.softBg'
            }
          }}
        >
          <input {...getInputProps()} />
          <Box
            sx={{
              p: 2,
              borderRadius: '50%',
              bgcolor: 'neutral.softBg',
              mb: 3,
              color: 'neutral.500',
              transition: 'transform 0.2s',
              ...(isDragActive && { transform: 'scale(1.1)', bgcolor: 'primary.softBg', color: 'primary.500' })
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 48 }} />
          </Box>
          <Typography level='h4' fontWeight={600} sx={{ mb: 1 }}>
            {isDragActive ? 'Drop files here!' : t('books.dropTitle')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'neutral.600', mb: 4, maxWidth: 400 }}>
            {t('books.dropSubtitle')}
          </Typography>

          <Stack direction='row' spacing={1} justifyContent='center'>
            {['PDF', 'Word', 'TXT'].map((type) => (
              <Chip key={type} size='sm' variant='outlined' color='neutral'>
                {type}
              </Chip>
            ))}
          </Stack>
        </Card>
      )}

      {/* Books Grid - Filtered Results */}
      {!loading && allBooks.length > 0 && books.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography level='body-md' color='neutral'>
            No found books for &quot;{searchTerm}&quot;
          </Typography>
        </Box>
      )}

      {/* Books Grid */}
      {!loading && books.length > 0 && (
        <Grid container spacing={3}>
          {books.map((book) => (
            <Grid key={book._id} xs={12} sm={6} md={4} lg={3}>
              <Book
                book={book}
                handleBookClick={handleBookClick}
                onEdit={(b) => {
                  setBookToEdit(b)
                  setShowEditor(true)
                }}
                onDelete={(b) => {
                  setBookToDelete(b)
                  setShowWarning(true)
                }}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {showWarning && (
        <WarningWindow
          onClose={() => setShowWarning(false)}
          onConfirm={handleDeleteBook}
          title={t('books.deleteConfirmTitle')}
          error_msg={t('books.deleteConfirmMsg')}
        />
      )}

      <Modal
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false)
          setSuccessMessage('')
        }}
      >
        <ModalDialog
          variant='outlined'
          role='alertdialog'
          sx={{
            maxWidth: 500,
            borderRadius: 'xl',
            p: 4,
            boxShadow: 'lg',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid',
            borderColor: 'neutral.200'
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'success.100',
                color: 'success.500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
                fontSize: 32
              }}
            >
              🎉
            </Box>
            <Typography
              component='h2'
              level='h3'
              sx={{
                mb: 1,
                background: 'linear-gradient(45deg, #0B6BCB, #1F7A1F)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Import Successful!
            </Typography>
            <Typography level='body-md' color='neutral' sx={{ mb: 3 }}>
              {successMessage}
            </Typography>
            <Button
              variant='solid'
              color='primary'
              size='lg'
              onClick={() => {
                setShowSuccess(false)
                // Optionally navigate to the last imported book if we tracked it
                // navigate(/book/{lastBookId})
              }}
              sx={{ width: '100%', borderRadius: 'md' }}
            >
              Continue to Library
            </Button>
          </Box>
        </ModalDialog>
      </Modal>

      {showError && (
        <ErrorWindow
          title='Error'
          error_msg={errorMessage}
          onClose={() => {
            setShowError(false)
            setErrorMessage('')
          }}
        />
      )}

      {showEditor && bookToEdit && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1300, bgcolor: 'background.surface' }}>
          <BookEditor book={bookToEdit} refreshBooks={fetchBooks} onCancel={() => setShowEditor(false)} />
        </Box>
      )}

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

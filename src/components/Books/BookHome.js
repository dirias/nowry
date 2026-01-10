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
import { Box, Typography, Input, Button, Stack, IconButton, Card, Grid, Container, Chip, Modal, ModalDialog, Skeleton } from '@mui/joy'
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
  const [lastImportedBookId, setLastImportedBookId] = useState(null)

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

  const handleConfirmImport = async (inputTitle) => {
    setConfirmingImport(true)
    const username = user?.username || 'Unknown'

    try {
      const importedBooks = []

      // If we have a custom title and only one file, use it.
      // Otherwise, fallback to filename (backend default)
      const useTitle = pendingFiles.length === 1 && inputTitle ? inputTitle : null

      for (const file of pendingFiles) {
        // Actually import with preview=false
        const result = await booksService.importFile(file, username, false, useTitle)
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

      if (importedBooks.length === 1) {
        setLastImportedBookId(importedBooks[0]._id)
      }

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
    } catch (error) {
      console.error('Error deleting book:', error)
      // If book is already gone (404), sync UI to remove it
      if (error.response?.status === 404) {
        const updated = books.filter((b) => b._id !== bookToDelete._id)
        setBooks(updated)
        setAllBooks(updated)
        setShowWarning(false)
        return
      }
      // Otherwise show error
      setErrorMessage(t('books.errorDelete'))
      setShowError(true)
      setShowWarning(false)
    }
  }

  return (
    <Container maxWidth='xl' sx={{ py: 4 }}>
      {/* Minimalist Header */}
      <Stack spacing={4} sx={{ mb: 4 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent='space-between'
          alignItems={{ xs: 'start', md: 'center' }}
          spacing={2}
        >
          <Box>
            <Typography level='h2' fontWeight={600}>
              {t('books.title')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.tertiary', mt: 0.5 }}>
              {t('books.subtitle')}
            </Typography>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ width: { xs: '100%', md: 'auto' } }}
          >
            {allBooks.length > 0 && (
              <Input
                placeholder={t('books.searchPlaceholder')}
                value={searchTerm}
                onChange={handleSearch}
                startDecorator={<SearchIcon />}
                size='sm'
                variant='outlined'
                sx={{ width: { xs: '100%', md: 240 }, height: 32 }}
              />
            )}

            <Stack direction='row' spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
              <Button
                startDecorator={<AddIcon />}
                onClick={handleCreateBook}
                size='sm'
                variant='solid'
                color='primary'
                sx={{ height: 32, flex: { xs: 1, sm: 'initial' } }}
              >
                {t('books.create')}
              </Button>
              <Button
                startDecorator={<UploadFileIcon />}
                {...getRootProps()}
                size='sm'
                variant='plain'
                color='neutral'
                loading={uploading}
                sx={{ px: 2, height: 32, flex: { xs: 1, sm: 'initial' } }}
              >
                <input {...getInputProps()} />
                {t('books.import')}
              </Button>
            </Stack>
          </Stack>
        </Stack>

        {/* Minimalist Stats - Only show if useful */}
        {allBooks.length > 0 && (
          <Stack direction='row' spacing={3} sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
            <Typography level='body-xs' fontWeight='lg' sx={{ color: 'text.secondary' }}>
              📚 {allBooks.length} {t('books.totalBooks')}
            </Typography>
            <Typography level='body-xs' fontWeight='lg' sx={{ color: 'text.secondary' }}>
              📄 {allBooks.reduce((sum, b) => sum + (b.page_count || 0), 0)} {t('books.totalPages')}
            </Typography>
          </Stack>
        )}
      </Stack>

      <input {...getInputProps()} />

      {/* Loading Skeleton */}
      {loading && (
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Grid key={i} xs={12} sm={6} md={4} lg={3} sx={{ display: 'flex', justifyContent: 'center' }}>
              <Card
                variant='outlined'
                sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 200 }}
              >
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Skeleton variant='rectangular' width={60} height={80} sx={{ borderRadius: 'sm' }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant='text' level='title-md' width='80%' sx={{ mb: 1 }} />
                    <Skeleton variant='text' level='body-sm' width='40%' />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 'auto' }}>
                  <Skeleton variant='rectangular' width={60} height={24} sx={{ borderRadius: 'xs' }} />
                  <Skeleton variant='circular' width={24} height={24} />
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      {allBooks.length === 0 && !loading && (
        <Card
          {...getRootProps()}
          variant='outlined'
          sx={{
            textAlign: 'center',
            py: 12,
            px: 4,
            cursor: 'pointer',
            borderStyle: 'dashed',
            borderColor: isDragActive ? 'primary.500' : 'neutral.outlinedBorder',
            backgroundColor: isDragActive ? 'primary.softBg' : 'background.surface',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 400,
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'background.level1',
              boxShadow: 'sm'
            }
          }}
        >
          <Box
            sx={{
              p: 3,
              borderRadius: '50%',
              bgcolor: 'background.level2',
              mb: 3,
              color: 'text.tertiary',
              transition: 'transform 0.2s',
              ...(isDragActive && { transform: 'scale(1.1)', bgcolor: 'primary.softBg', color: 'primary.500' })
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 40 }} />
          </Box>
          <Typography level='h3' fontWeight={600} sx={{ mb: 1 }}>
            {isDragActive ? t('books.dropTitleActive') : t('books.dropTitle')}
          </Typography>
          <Typography level='body-md' sx={{ color: 'text.secondary', mb: 4, maxWidth: 450 }}>
            {t('books.dropSubtitle')}
          </Typography>

          <Stack direction='row' spacing={1} justifyContent='center'>
            {['PDF', 'Word', 'TXT'].map((type) => (
              <Chip key={type} size='md' variant='soft' color='neutral'>
                {type}
              </Chip>
            ))}
          </Stack>
        </Card>
      )}

      {/* Books Grid - Filtered Results */}
      {!loading && allBooks.length > 0 && books.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography level='body-md' color='text.secondary'>
            {t('books.noResults', { term: searchTerm })}
          </Typography>
        </Box>
      )}

      {/* Books Grid */}
      {!loading && books.length > 0 && (
        <Grid container spacing={2}>
          {books.map((book) => (
            <Grid key={book._id} xs={12} sm={6} md={4} lg={3} sx={{ display: 'flex', justifyContent: 'center' }}>
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
          setLastImportedBookId(null)
        }}
      >
        <ModalDialog
          variant='outlined'
          role='alertdialog'
          sx={{
            maxWidth: 400,
            borderRadius: 'lg',
            p: 3,
            boxShadow: 'lg'
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: 'success.softBg',
                color: 'success.solidBg',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
                fontSize: 24
              }}
            >
              🎉
            </Box>
            <Typography component='h2' level='title-lg' sx={{ mb: 1 }}>
              Import Successful
            </Typography>
            <Typography level='body-sm' color='neutral' sx={{ mb: 3 }}>
              {successMessage}
            </Typography>

            <Stack spacing={2}>
              {lastImportedBookId && (
                <Button
                  variant='solid'
                  color='primary'
                  onClick={() => {
                    setShowSuccess(false)
                    navigate(`/book/${lastImportedBookId}`)
                  }}
                  sx={{ width: '100%' }}
                >
                  Open Book
                </Button>
              )}

              <Button
                variant={lastImportedBookId ? 'plain' : 'solid'}
                color={lastImportedBookId ? 'neutral' : 'primary'}
                onClick={() => {
                  setShowSuccess(false)
                  setLastImportedBookId(null)
                }}
                sx={{ width: '100%' }}
              >
                Continue to Library
              </Button>
            </Stack>
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

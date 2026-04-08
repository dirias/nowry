import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDropzone } from 'react-dropzone'
import { booksService } from '../../api/services'
import { WarningWindow, SuccessWindow, Error as ErrorWindow } from '../Messages'
import BookEditor from './BookEditor'
import { useThemePreferences } from '../../theme/DynamicThemeProvider'
import { useAuth } from '../../context/AuthContext'
import useBooks from '../../hooks/useBooks'
import Book from './Book'
import ImportPreviewModal from './ImportPreviewModal'
import {
  Box,
  Typography,
  Input,
  Button,
  Stack,
  IconButton,
  Card,
  Grid,
  Container,
  Chip,
  Modal,
  ModalDialog,
  Skeleton,
  Avatar
} from '@mui/joy'
import AddIcon from '@mui/icons-material/Add'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import GridViewIcon from '@mui/icons-material/GridView'
import ViewListIcon from '@mui/icons-material/ViewList'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import MenuBookIcon from '@mui/icons-material/MenuBook'

export default function BookHome() {
  const { books: allBooks, loading, error: fetchError, reload: fetchBooks } = useBooks()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [viewMode, setViewMode] = useState(localStorage.getItem('book_view_mode') || 'grid')

  const [showWarning, setShowWarning] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [bookToDelete, setBookToDelete] = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const [bookToEdit, setBookToEdit] = useState(null)
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

  const handleViewChange = (newMode) => {
    setViewMode(newMode)
    localStorage.setItem('book_view_mode', newMode)
  }

  useEffect(() => {
    if (fetchError) {
      setErrorMessage(t('books.errorFetch', 'Error fetching books'))
      setShowError(true)
    }
  }, [fetchError, t])

  const availableTags = useMemo(() => {
    const tags = new Set()
    allBooks.forEach((book) => {
      if (book.tags) book.tags.forEach((t) => tags.add(t))
    })
    return Array.from(tags).sort()
  }, [allBooks])

  const books = useMemo(() => {
    return allBooks.filter((book) => {
      const matchesSearch =
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (book.author && book.author.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesTags = selectedTags.length === 0 || selectedTags.every((tag) => book.tags?.includes(tag))
      return matchesSearch && matchesTags
    })
  }, [allBooks, searchTerm, selectedTags])

  const toggleTag = (tag) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const handleCreateBook = async () => {
    try {
      const newBook = await booksService.create({
        title: `New book ${allBooks.length}`,
        author: user?.username || 'Unknown',
        isbn: 'Sin ISBN'
      })
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

  const handleBookClick = (book) => {
    navigate(`/book/${book._id}`, { state: { book } })
  }

  const handleDeleteBook = async () => {
    try {
      await booksService.delete(bookToDelete._id)
      await fetchBooks()
      setShowWarning(false)
      setBookToDelete(null)
    } catch (error) {
      console.error('Error deleting book:', error)
      if (error.response?.status === 404) {
        await fetchBooks()
        setShowWarning(false)
        setBookToDelete(null)
        return
      }
      // Otherwise show error
      setErrorMessage(t('books.errorDelete'))
      setShowError(true)
      setShowWarning(false)
    }
  }

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 3, md: 5 } }}>
      {/* Glass Hero Header */}
      <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
        <Typography level='h2' fontWeight={800} sx={{ mb: 1, letterSpacing: '-0.02em' }}>
          {t('books.title')}
        </Typography>
        <Typography level='body-md' sx={{ color: 'text.tertiary', mb: 4, maxWidth: 500, mx: 'auto' }}>
          {t('books.subtitle')}
        </Typography>

        <Box sx={{ maxWidth: 640, mx: 'auto' }}>
          {allBooks.length > 0 ? (
            <Input
              size='lg'
              placeholder={t('books.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              startDecorator={<SearchIcon sx={{ color: 'text.tertiary', ml: 1 }} />}
              endDecorator={
                <Stack direction='row' spacing={1} alignItems='center' sx={{ mr: 0.5 }}>
                  {searchTerm && (
                    <IconButton size='sm' variant='plain' color='neutral' onClick={() => setSearchTerm('')} sx={{ borderRadius: '50%' }}>
                      <CloseIcon />
                    </IconButton>
                  )}
                  <Button size='sm' variant='solid' color='primary' onClick={handleCreateBook} sx={{ borderRadius: 'md', fontWeight: 600 }}>
                    {t('books.create')}
                  </Button>
                </Stack>
              }
              sx={{
                width: '100%',
                borderRadius: 'xl',
                boxShadow: 'sm',
                bgcolor: 'rgba(var(--joy-palette-background-surfaceChannel) / 0.8)',
                backdropFilter: 'blur(12px)',
                '--Input-focusedThickness': '2px',
                p: 0.75,
                pl: 1
              }}
            />
          ) : (
            <Button size='lg' onClick={handleCreateBook} startDecorator={<AddIcon />} sx={{ borderRadius: 'lg', px: 4, boxShadow: 'sm' }}>
              {t('books.create')}
            </Button>
          )}
        </Box>
      </Box>

      {/* Controls & Tactile Carousel */}
      {allBooks.length > 0 && (
        <Stack spacing={3} sx={{ mb: 4 }}>
          <Stack direction='row' justifyContent='space-between' alignItems='center'>
            <Typography level='title-sm' fontWeight='lg' sx={{ color: 'text.secondary' }}>
              📚 {allBooks.length} {t('books.totalBooks')}
            </Typography>

            <Stack direction='row' spacing={0.5}>
              <IconButton
                size='sm'
                variant={viewMode === 'grid' ? 'solid' : 'plain'}
                color={viewMode === 'grid' ? 'primary' : 'neutral'}
                onClick={() => handleViewChange('grid')}
                sx={{ borderRadius: 'md' }}
              >
                <GridViewIcon fontSize='small' />
              </IconButton>
              <IconButton
                size='sm'
                variant={viewMode === 'list' ? 'solid' : 'plain'}
                color={viewMode === 'list' ? 'primary' : 'neutral'}
                onClick={() => handleViewChange('list')}
                sx={{ borderRadius: 'md' }}
              >
                <ViewListIcon fontSize='small' />
              </IconButton>
            </Stack>
          </Stack>

          {availableTags.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                gap: 1.5,
                overflowX: 'auto',
                pb: 1,
                px: 0.5,
                mx: -0.5,
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {selectedTags.length > 0 && (
                <Chip
                  variant='solid'
                  color='neutral'
                  size='lg'
                  onClick={() => setSelectedTags([])}
                  startDecorator={<CloseIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    cursor: 'pointer',
                    fontWeight: 600,
                    bgcolor: 'background.surface',
                    color: 'text.primary',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '12px',
                    boxShadow: 'sm',
                    py: 1,
                    px: 1.5,
                    flexShrink: 0,
                    scrollSnapAlign: 'start',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:active': { transform: 'scale(0.95)' },
                    '&:hover': { bgcolor: 'background.level1' }
                  }}
                >
                  Clear Search
                </Chip>
              )}
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag)
                return (
                  <Chip
                    key={tag}
                    variant={isSelected ? 'solid' : 'outlined'}
                    color={isSelected ? 'primary' : 'neutral'}
                    onClick={() => toggleTag(tag)}
                    size='lg'
                    sx={{
                      cursor: 'pointer',
                      fontWeight: isSelected ? 600 : 500,
                      py: 1,
                      px: 1.5,
                      borderRadius: '12px',
                      flexShrink: 0,
                      scrollSnapAlign: 'start',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:active': { transform: 'scale(0.95)' },
                      ...(isSelected
                        ? {
                            bgcolor: themeColor,
                            color: '#ffffff',
                            border: '1px solid',
                            borderColor: themeColor,
                            boxShadow: `0 4px 10px rgba(0,0,0,0.1)`,
                            '&:hover': { filter: 'brightness(0.9)' }
                          }
                        : {
                            bgcolor: 'background.surface',
                            border: '1px solid',
                            borderColor: 'divider',
                            color: 'text.secondary',
                            boxShadow: 'none',
                            '&:hover': { bgcolor: 'background.level1', borderColor: 'neutral.outlinedHoverBorder' }
                          })
                    }}
                  >
                    {tag}
                  </Chip>
                )
              })}
            </Box>
          )}
        </Stack>
      )}

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
          <Typography level='title-md' fontWeight={600} sx={{ mb: 1, color: 'text.secondary' }}>
            {isDragActive ? t('books.dropTitleActive') : t('books.dropTitle')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.tertiary', mb: 4, maxWidth: 450 }}>
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
          <Typography level='title-md' color='text.secondary'>
            {t('books.noResults', { term: searchTerm })}
          </Typography>
        </Box>
      )}

      {/* Books Grid/List */}
      {!loading && books.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(auto-fill, minmax(160px, 1fr))',
                  md: 'repeat(auto-fill, minmax(200px, 1fr))'
                },
                gap: { xs: 1.5, sm: 2, md: 3 },
                justifyItems: 'center'
              }}
            >
              {books.map((book) => (
                <Box key={book._id} sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
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
                </Box>
              ))}
            </Box>
          ) : (
            <Stack spacing={0}>
              {books.map((book) => (
                <Box
                  key={book._id}
                  onClick={() => handleBookClick(book)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    py: 1.5,
                    px: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'background.level1'
                    }
                  }}
                >
                  {/* Book Cover/Icon */}
                  <Box
                    sx={{
                      width: 40,
                      height: 56,
                      borderRadius: 'sm',
                      overflow: 'hidden',
                      flexShrink: 0,
                      bgcolor: book.cover_color || themeColor || 'primary.solidBg',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid',
                      borderColor: 'divider',
                      position: 'relative'
                    }}
                  >
                    {!book.cover_image && <MenuBookIcon sx={{ fontSize: 20, color: 'common.white', opacity: 0.8 }} />}
                    {book.cover_image && (
                      <img
                        src={book.cover_image}
                        alt={book.title}
                        loading='lazy'
                        style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                      />
                    )}
                  </Box>

                  {/* Title */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography level='title-sm' sx={{ fontWeight: 600 }}>
                      {book.title}
                    </Typography>
                    <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                      {book.author || 'Unknown Author'}
                    </Typography>
                  </Box>

                  {/* Tags (hide on mobile) */}
                  {book.tags && book.tags.length > 0 && (
                    <Stack
                      direction='row'
                      spacing={0.5}
                      sx={{ display: { xs: 'none', md: 'flex' }, flexWrap: 'wrap', gap: 0.5, maxWidth: 200 }}
                    >
                      {book.tags.slice(0, 2).map((tag, i) => (
                        <Chip key={i} size='sm' variant='soft' sx={{ fontSize: '0.7rem' }}>
                          {tag}
                        </Chip>
                      ))}
                    </Stack>
                  )}

                  {/* Page Count (hide on mobile) */}
                  <Typography level='body-xs' sx={{ display: { xs: 'none', sm: 'block' }, width: 80, color: 'text.tertiary' }}>
                    {book.page_count ? `${book.page_count} pages` : ''}
                  </Typography>

                  {/* Actions */}
                  <Stack direction='row' spacing={0.5}>
                    <IconButton
                      size='sm'
                      variant='plain'
                      onClick={(e) => {
                        e.stopPropagation()
                        setBookToEdit(book)
                        setShowEditor(true)
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </>
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
          sx={{
            width: { xs: '90%', sm: 450 },
            maxWidth: 450,
            borderRadius: { xs: 'lg', md: 'xl' },
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            p: 0
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              py: { xs: 2, md: 2.5 },
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.level1',
              textAlign: 'center'
            }}
          >
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
                mb: 1.5,
                fontSize: 24
              }}
            >
              🎉
            </Box>
            <Typography level='title-lg' sx={{ fontWeight: 700 }}>
              Import Successful
            </Typography>
          </Box>

          {/* Content */}
          <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, md: 3 }, textAlign: 'center' }}>
            <Typography level='body-md' sx={{ color: 'text.secondary' }}>
              {successMessage}
            </Typography>
          </Box>

          {/* Footer */}
          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              py: { xs: 2, md: 2.5 },
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.surface'
            }}
          >
            <Stack spacing={2}>
              {lastImportedBookId && (
                <Button
                  variant='solid'
                  color='primary'
                  onClick={() => {
                    setShowSuccess(false)
                    navigate(`/book/${lastImportedBookId}`)
                  }}
                  size='lg'
                  fullWidth
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
                size='lg'
                fullWidth
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

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDropzone } from 'react-dropzone'
import { booksService } from '../../api/services'
import { WarningWindow, SuccessWindow, Error as ErrorWindow } from '../Messages'
import BookEditSheet from './BookEditSheet'
import BookCreateSheet from './BookCreateSheet'
import { useAuth } from '../../context/AuthContext'
import { useSubscription } from '../../hooks/useSubscription'
import { useSubscriptionContext } from '../../context/SubscriptionContext'
import ContinueObject from './ContinueObject'
import AddMenu from './AddMenu'
import formatRelativeDate from '../../utils/formatRelativeDate'
import { pickContinue, resumeHref } from './libraryQuery'
import useBooks from '../../hooks/useBooks'
import Book from './Book'
import ImportPreviewModal from './ImportPreviewModal'
import { Box, Typography, Button, Stack, IconButton, Card, Grid, Container, Chip, Skeleton, Snackbar } from '@mui/joy'
import CloseIcon from '@mui/icons-material/Close'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
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
  const [showCreate, setShowCreate] = useState(false)
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
  const { user } = useAuth()
  const { tier } = useSubscription()
  const { openUpgradeModal } = useSubscriptionContext()
  const relative = useCallback((value) => formatRelativeDate(t, value), [t])
  // The document the page opens on (D1): the most recently edited one.
  const continueDoc = useMemo(() => pickContinue(allBooks), [allBooks])
  const handleUpgrade = useCallback(
    (feature) => openUpgradeModal(t(feature === 'listen' ? 'upgrade.headlines.tts' : 'upgrade.headlines.generateFromBook')),
    [openUpgradeModal, t]
  )

  const handleViewChange = useCallback((newMode) => {
    setViewMode(newMode)
    localStorage.setItem('book_view_mode', newMode)
  }, [])

  useEffect(() => {
    if (fetchError) {
      setErrorMessage(t('books.errorFetch'))
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
      // OR semantics: a book matches if it carries ANY of the selected tags.
      const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => book.tags?.includes(tag))
      return matchesSearch && matchesTags
    })
  }, [allBooks, searchTerm, selectedTags])

  const toggleTag = useCallback((tag) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }, [])

  /**
   * Both entry points open the same sheet — the header button and the
   * empty-state button. Rewiring one and not the other would ship two different
   * creation behaviours from two controls that look like the same action.
   *
   * Everything this used to do lives in BookCreateSheet now, including the 403
   * plan-limit case, which renders inside the sheet with an upgrade action
   * instead of as a separate ErrorWindow over the library.
   */
  const openCreate = useCallback(() => setShowCreate(true), [])

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
        setErrorMessage(error.response?.data?.detail || t('books.errorImport'))
        setShowError(true)
        setUploading(false)
      }
    },
    [user?.username, t]
  )

  const handleConfirmImport = useCallback(
    async (inputTitle) => {
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

        setSuccessMessage(t('books.lib.importedToast', { count: importedBooks.length }))

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
    },
    [user?.username, pendingFiles, fetchBooks, t]
  )

  const handleCancelPreview = useCallback(() => {
    setShowPreview(false)
    setPreviewData(null)
    setPendingFiles([])
    setCurrentFileIndex(0)
  }, [])

  // The whole page is the dropzone (D12); a click never opens the picker — Import
  // files (Add ▾, the empty object) calls `open` itself.
  const {
    getRootProps,
    getInputProps,
    isDragActive,
    open: openFilePicker
  } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc']
    },
    multiple: true,
    noClick: true,
    noKeyboard: true
  })

  const handleBookClick = useCallback(
    (book) => {
      navigate(`/book/${book._id}`, { state: { book } })
    },
    [navigate]
  )

  const handleDeleteBook = useCallback(async () => {
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
  }, [bookToDelete, fetchBooks, t])

  return (
    <Container maxWidth='xl' {...getRootProps()} sx={{ py: { xs: 2, md: 4 } }}>
      {/* Title row: the page on the left rail, Add ▾ on the right (D3, §15.7) */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Typography level='h2' component='h1'>
          {t('books.title')}
        </Typography>
        <AddMenu onNew={openCreate} onImport={openFilePicker} />
      </Box>

      {/* The summary object (D1, D2, D12): where you were, and what your notes owe the deck */}
      <ContinueObject
        loading={loading}
        book={continueDoc}
        tier={tier}
        isDragActive={isDragActive}
        formatRelativeDate={relative}
        onContinue={() => continueDoc && navigate(resumeHref(continueDoc))}
        onMakeCards={() => continueDoc && navigate(resumeHref(continueDoc, { makeCards: 1 }))}
        onListen={() => continueDoc && navigate(resumeHref(continueDoc, { listen: 1 }))}
        onNew={openCreate}
        onImport={openFilePicker}
        onUpgrade={handleUpgrade}
      />

      {/* Controls & Tactile Carousel */}
      {allBooks.length > 0 && (
        <Stack spacing={3} sx={{ mb: 4 }}>
          <Stack direction='row' justifyContent='space-between' alignItems='center'>
            <Typography level='title-sm' fontWeight='lg' sx={{ color: 'text.secondary' }}>
              <AutoStoriesIcon
                sx={{ fontSize: 16, color: 'text.secondary', opacity: 0.5, mr: 0.5, verticalAlign: 'text-bottom' }}
                aria-hidden='true'
              />
              {allBooks.length} {t('books.totalBooks')}
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
                  {t('books.clearFilters')}
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
                            bgcolor: 'primary.solidBg',
                            color: 'primary.solidColor',
                            border: '1px solid',
                            borderColor: 'primary.solidBg',
                            boxShadow: 'sm',
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
                      bgcolor: book.cover_color || 'primary.solidBg',
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
                      <Box
                        component='img'
                        src={book.cover_image}
                        alt={book.title}
                        loading='lazy'
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                      />
                    )}
                  </Box>

                  {/* Title */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography level='title-sm' sx={{ fontWeight: 600 }}>
                      {book.title}
                    </Typography>
                    <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                      {book.author || t('books.unknownAuthor')}
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
                    {book.page_count ? t('books.pageCount', { count: book.page_count }) : ''}
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
          error_msg={[
            t('books.deleteConfirmMsg'),
            bookToDelete?.cards > 0 ? t('books.deleteKeepsCards', { count: bookToDelete.cards }) : null
          ]
            .filter(Boolean)
            .join(' ')}
        />
      )}

      {/* Import success is a toast (DS-005): the imported document is the new Continue object */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={() => {
          setShowSuccess(false)
          setSuccessMessage('')
          setLastImportedBookId(null)
        }}
        color='neutral'
        variant='soft'
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        endDecorator={
          lastImportedBookId ? (
            <Button
              size='sm'
              variant='soft'
              color='neutral'
              onClick={() => {
                setShowSuccess(false)
                navigate(`/book/${lastImportedBookId}`)
              }}
            >
              {t('books.lib.open')}
            </Button>
          ) : null
        }
      >
        {successMessage}
      </Snackbar>

      {showError && (
        <ErrorWindow
          title={t('common.error')}
          error_msg={errorMessage}
          onClose={() => {
            setShowError(false)
            setErrorMessage('')
          }}
        />
      )}

      {showEditor && bookToEdit && <BookEditSheet book={bookToEdit} onSaved={fetchBooks} onClose={() => setShowEditor(false)} />}

      <BookCreateSheet open={showCreate} onClose={() => setShowCreate(false)} />

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

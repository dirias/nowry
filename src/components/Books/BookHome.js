import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDropzone } from 'react-dropzone'
import { Box, Button, Container, Skeleton, Snackbar, Stack, Typography } from '@mui/joy'

import { booksService } from '../../api/services'
import { Error as ErrorWindow } from '../Messages'
import BookEditSheet from './BookEditSheet'
import BookCreateSheet from './BookCreateSheet'
import ImportPreviewModal from './ImportPreviewModal'
import { useAuth } from '../../context/AuthContext'
import { useSubscription } from '../../hooks/useSubscription'
import { useSubscriptionContext } from '../../context/SubscriptionContext'
import useBooks from '../../hooks/useBooks'
import formatRelativeDate from '../../utils/formatRelativeDate'
import { listRow, readout } from '../Common/Form/formStyles'
import ContinueObject from './ContinueObject'
import AddMenu from './AddMenu'
import DocumentsToolbar from './DocumentsToolbar'
import DocumentRow from './DocumentRow'
import DocumentTile from './DocumentTile'
import DocumentActionsMenu from './DocumentActionsMenu'
import DeleteDocumentDialog from './DeleteDocumentDialog'
import { filterDocuments, kindCounts, pickContinue, resumeHref, sortDocuments, tagCounts } from './libraryQuery'
import { BOOK_LIMITS, NEXT_PLAN, bookLimitFor } from '../../config/planLimits'

const VIEW_KEY = 'book_view_mode'

/**
 * The library (docs/prd-books-library.md): the title row, the Continue object,
 * one toolbar row, and every document as one row or the row stacked. One request
 * on open — the list already carries counts — and no request per row.
 */
export default function BookHome() {
  const { books: allBooks, loading, error: fetchError, reload: fetchBooks } = useBooks()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  const { tier } = useSubscription()
  const { openUpgradeModal } = useSubscriptionContext()

  const [searchTerm, setSearchTerm] = useState('')
  const [kind, setKind] = useState('all')
  const [selectedTags, setSelectedTags] = useState([])
  const [sort, setSort] = useState('edited')
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(VIEW_KEY) || 'grid')

  const [bookToDelete, setBookToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [bookToEdit, setBookToEdit] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [toast, setToast] = useState(null)

  // Import: preview first, then confirm (unchanged flow behind a new surface)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [pendingFiles, setPendingFiles] = useState([])
  const [confirmingImport, setConfirmingImport] = useState(false)

  const relative = useCallback((value) => formatRelativeDate(t, value), [t])
  const username = user?.username || null

  useEffect(() => {
    if (fetchError) setErrorMessage(t('books.lib.loadError'))
  }, [fetchError, t])

  const handleViewChange = useCallback((mode) => {
    setViewMode(mode)
    localStorage.setItem(VIEW_KEY, mode)
  }, [])

  const continueDoc = useMemo(() => pickContinue(allBooks), [allBooks])
  // The plan's book limit shows only when reached (D3): a readout on the title row,
  // never a gate — Add still opens and lands on the create sheet's plan-limit case.
  const limit = bookLimitFor(tier)
  const atLimit = !loading && Number.isFinite(limit) && allBooks.length >= limit
  const nextPlan = NEXT_PLAN[tier]
  const counts = useMemo(() => kindCounts(allBooks), [allBooks])
  const tags = useMemo(() => tagCounts(allBooks), [allBooks])
  const documents = useMemo(
    () => sortDocuments(filterDocuments(allBooks, { kind, search: searchTerm, tags: selectedTags }), sort),
    [allBooks, kind, searchTerm, selectedTags, sort]
  )

  const openCreate = useCallback(() => setShowCreate(true), [])
  const openDocument = useCallback((book, extra) => navigate(resumeHref(book, extra)), [navigate])
  const handleUpgrade = useCallback(
    (feature) =>
      openUpgradeModal(
        t(
          feature === 'listen'
            ? 'upgrade.headlines.tts'
            : feature === 'quiz'
              ? 'upgrade.headlines.generateQuizFromBook'
              : 'upgrade.headlines.generateFromBook'
        )
      ),
    [openUpgradeModal, t]
  )

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (!acceptedFiles.length) return
      try {
        setPendingFiles(acceptedFiles)
        const preview = await booksService.importFile(acceptedFiles[0], username || 'Unknown', true)
        setPreviewData(preview)
        setShowPreview(true)
      } catch (error) {
        setErrorMessage(error.response?.data?.detail || t('books.errorImport'))
      }
    },
    [username, t]
  )

  const handleConfirmImport = useCallback(
    async (inputTitle) => {
      setConfirmingImport(true)
      try {
        const useTitle = pendingFiles.length === 1 && inputTitle ? inputTitle : null
        const imported = []
        for (const file of pendingFiles) {
          imported.push(await booksService.importFile(file, username || 'Unknown', false, useTitle))
        }
        setShowPreview(false)
        setPreviewData(null)
        setPendingFiles([])
        await fetchBooks()
        setToast({
          message: t('books.lib.importedToast', { count: imported.length }),
          bookId: imported.length === 1 ? imported[0]._id : null
        })
      } catch (error) {
        setErrorMessage(error.response?.data?.detail || t('books.errorImport'))
        setShowPreview(false)
      } finally {
        setConfirmingImport(false)
      }
    },
    [username, pendingFiles, fetchBooks, t]
  )

  const handleCancelPreview = useCallback(() => {
    setShowPreview(false)
    setPreviewData(null)
    setPendingFiles([])
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

  const handleDeleteBook = useCallback(async () => {
    if (!bookToDelete) return
    setDeleting(true)
    try {
      await booksService.delete(bookToDelete._id)
      await fetchBooks()
      setBookToDelete(null)
    } catch (error) {
      if (error.response?.status === 404) {
        await fetchBooks()
        setBookToDelete(null)
      } else {
        setErrorMessage(t('books.lib.deleteError'))
      }
    } finally {
      setDeleting(false)
    }
  }, [bookToDelete, fetchBooks, t])

  const actionsFor = (book) => (
    <DocumentActionsMenu
      book={book}
      tier={tier}
      onOpen={() => openDocument(book)}
      onListen={() => openDocument(book, { listen: 1 })}
      onMakeCards={() => openDocument(book, { makeCards: 1 })}
      onMakeQuiz={() => openDocument(book, { quiz: 1 })}
      onEdit={() => setBookToEdit(book)}
      onDelete={() => setBookToDelete(book)}
      onUpgrade={handleUpgrade}
      className={viewMode === 'grid' ? 'document-tile-actions' : undefined}
    />
  )

  return (
    <Container maxWidth='xl' {...getRootProps()} sx={{ py: { xs: 2, md: 4 } }}>
      <input {...getInputProps()} />

      {/* Title row: the page on the left rail, Add ▾ on the right (D3, §15.7) */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Stack direction='row' spacing={1.5} alignItems='baseline' sx={{ minWidth: 0 }}>
          <Typography level='h2' component='h1'>
            {t('books.title')}
          </Typography>
          {atLimit && (
            <Typography level='body-sm' sx={{ ...readout, color: 'text.secondary' }} data-testid='book-limit'>
              {t('books.lib.limitReadout', {
                count: allBooks.length,
                limit,
                plan: t(`plans.${nextPlan}`),
                next: Number.isFinite(BOOK_LIMITS[nextPlan]) ? BOOK_LIMITS[nextPlan] : t('books.lib.unlimited')
              })}
            </Typography>
          )}
        </Stack>
        <AddMenu onNew={openCreate} onImport={openFilePicker} />
      </Box>

      {/* The summary object (D1, D2, D12): where you were, and what your notes owe the deck */}
      <ContinueObject
        loading={loading}
        book={continueDoc}
        tier={tier}
        isDragActive={isDragActive}
        formatRelativeDate={relative}
        onContinue={() => continueDoc && openDocument(continueDoc)}
        onMakeCards={() => continueDoc && openDocument(continueDoc, { makeCards: 1 })}
        onListen={() => continueDoc && openDocument(continueDoc, { listen: 1 })}
        onNew={openCreate}
        onImport={openFilePicker}
        onUpgrade={handleUpgrade}
      />

      {(loading || allBooks.length > 0) && (
        <DocumentsToolbar
          kind={kind}
          onKind={setKind}
          counts={counts}
          search={searchTerm}
          onSearch={setSearchTerm}
          tags={tags}
          selectedTags={selectedTags}
          onTagToggle={(tag) => setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]))}
          onClearTags={() => setSelectedTags([])}
          sort={sort}
          onSort={setSort}
          viewMode={viewMode}
          onViewMode={handleViewChange}
        />
      )}

      {loading && (
        <Stack
          spacing={0}
          divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}
          aria-busy='true'
          data-testid='documents-loading'
        >
          {[0, 1, 2, 3].map((i) => (
            <Box key={i} sx={listRow}>
              <Skeleton variant='rectangular' width={28} height={40} sx={{ borderRadius: 'xs' }} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant='text' level='title-sm' width='40%' />
                <Skeleton variant='text' level='body-xs' width='60%' />
              </Box>
              <Skeleton variant='text' level='body-sm' width={90} />
            </Box>
          ))}
        </Stack>
      )}

      {!loading && allBooks.length > 0 && documents.length === 0 && (
        <Typography level='body-sm' sx={{ color: 'text.tertiary', py: 3 }}>
          {t('books.lib.noMatches')}
        </Typography>
      )}

      {!loading &&
        documents.length > 0 &&
        (viewMode === 'grid' ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(3, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))'
              },
              gap: { xs: 1.5, md: 2 }
            }}
          >
            {documents.map((book) => (
              <DocumentTile
                key={book._id}
                book={book}
                relative={relative}
                username={username}
                onOpen={openDocument}
                actions={actionsFor(book)}
              />
            ))}
          </Box>
        ) : (
          <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
            {documents.map((book) => (
              <DocumentRow
                key={book._id}
                book={book}
                relative={relative}
                username={username}
                onOpen={openDocument}
                actions={actionsFor(book)}
              />
            ))}
          </Box>
        ))}

      <DeleteDocumentDialog
        book={bookToDelete}
        open={!!bookToDelete}
        onClose={() => setBookToDelete(null)}
        onConfirm={handleDeleteBook}
        loading={deleting}
      />

      {/* Import success is a toast (DS-005): the imported document is the new Continue object */}
      <Snackbar
        open={!!toast}
        autoHideDuration={6000}
        onClose={() => setToast(null)}
        color='neutral'
        variant='soft'
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        endDecorator={
          toast?.bookId ? (
            <Button size='sm' variant='soft' color='neutral' onClick={() => navigate(`/book/${toast.bookId}`)}>
              {t('books.lib.open')}
            </Button>
          ) : null
        }
      >
        {toast?.message}
      </Snackbar>

      {errorMessage && <ErrorWindow title={t('common.error')} error_msg={errorMessage} onClose={() => setErrorMessage('')} />}

      {bookToEdit && <BookEditSheet book={bookToEdit} onSaved={fetchBooks} onClose={() => setBookToEdit(null)} />}

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

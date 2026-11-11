import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDropzone } from 'react-dropzone'
import { Box, Button, Container, Skeleton, Snackbar, Stack, Typography } from '@mui/joy'

import { booksService } from '@nowry/core/api/services'
import { Error as ErrorWindow } from '../Messages'
import BookEditSheet from './BookEditSheet'
import BookCreateSheet from './BookCreateSheet'
import ImportPreviewModal from './ImportPreviewModal'
import { useAuth } from '@nowry/core/context/AuthContext'
import { useSubscription } from '@nowry/core/hooks/useSubscription'
import { useSubscriptionContext } from '../../context/SubscriptionContext'
import useLibrary from '@nowry/core/hooks/useLibrary'
import formatRelativeDate from '@nowry/core/utils/formatRelativeDate'
import { listRow, readout } from '../Common/Form/formStyles'
import ContinueObject from './ContinueObject'
import AddMenu from './AddMenu'
import DocumentsToolbar from './DocumentsToolbar'
import DocumentRow from './DocumentRow'
import DocumentTile from './DocumentTile'
import DocumentActionsMenu from './DocumentActionsMenu'
import DeleteDocumentDialog from './DeleteDocumentDialog'
import { resumeHref } from '@nowry/core/domain/books/libraryQuery'
import { BOOK_LIMITS, NEXT_PLAN, bookLimitFor } from '../../config/planLimits'
import { duplicateOf, importRefusal, rejectedFileRefusal } from '@nowry/core/domain/books/importRefusal'
import DuplicateImportsDialog from './DuplicateImportsDialog'

const VIEW_KEY = 'book_view_mode'

/**
 * The library (docs/prd-books-library.md): the title row, the Continue object,
 * one toolbar row, and every document as one row or the row stacked. One request
 * on open — the list already carries counts — and no request per row.
 */
export default function BookHome() {
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
  const [preparingPreview, setPreparingPreview] = useState(false)
  const [duplicateAsk, setDuplicateAsk] = useState([])
  const [importingCopies, setImportingCopies] = useState(false)
  const dropRef = useRef(0)

  const relative = useCallback((value) => formatRelativeDate(t, value), [t])
  const username = user?.username || null

  const handleViewChange = useCallback((mode) => {
    setViewMode(mode)
    localStorage.setItem(VIEW_KEY, mode)
  }, [])

  // The library is asked a question and answers a page of it (ADR-063): the
  // server filters, searches and orders, and the counts, the tags and the
  // document to continue describe the whole library. Nothing here holds the
  // whole list, so a library of any size shows its newest document first.
  const {
    rows: documents,
    total: matching,
    counts,
    tags,
    continueBook: continueDoc,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    error: fetchError,
    reload: fetchBooks
  } = useLibrary({ kind, search: searchTerm, tags: selectedTags, sort })
  const libraryCount = counts.all

  useEffect(() => {
    if (fetchError) setErrorMessage(t('books.lib.loadError'))
  }, [fetchError, t])

  // The plan's book limit shows only when reached (D3): a readout on the title row,
  // never a gate — Add still opens and lands on the create sheet's plan-limit case.
  const limit = bookLimitFor(tier)
  const atLimit = !loading && Number.isFinite(limit) && libraryCount >= limit
  const nextPlan = NEXT_PLAN[tier]

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

  // Why one file was not imported, as a sentence that names it (IMPORT-007).
  // The ceiling's sentence is shared with the editor and names no file, so the
  // name goes in front of it here, where a drop can hold several.
  const refusalSentence = useCallback(
    ({ key, options }) => {
      const sentence = t(key, options)
      return options.name && !sentence.includes(options.name) ? `${options.name}: ${sentence}` : sentence
    },
    [t]
  )

  // A drop is previewed by its first readable file. A file that cannot be
  // previewed is set aside with its reason and the next one is tried: one bad
  // file used to stop the whole drop, or hide the good ones behind an error
  // that named nothing (IMPORT-008).
  const onDrop = useCallback(
    async (acceptedFiles, fileRejections = []) => {
      const failures = fileRejections.map(({ file }) => refusalSentence(rejectedFileRefusal(file.name)))
      const files = [...acceptedFiles]
      // The sheet opens before the file has been read (IMPORT-014): uploading
      // and parsing a long PDF takes seconds, and a page that does nothing for
      // seconds looks broken. `dropRef` lets a sheet the reader closed in the
      // meantime ignore the answer when it arrives.
      const drop = ++dropRef.current
      const stillThisDrop = () => dropRef.current === drop
      if (files.length) {
        setPreviewData(null)
        setPendingFiles(files)
        setPreparingPreview(true)
        setShowPreview(true)
      }
      let preview = null
      while (files.length && !preview && stillThisDrop()) {
        try {
          preview = await booksService.importFile(files[0], username || 'Unknown', true)
        } catch (error) {
          failures.push(refusalSentence(importRefusal(error, files[0].name)))
          files.shift()
          if (stillThisDrop()) setPendingFiles([...files])
        }
      }
      if (failures.length) setErrorMessage(failures)
      if (!stillThisDrop()) return
      setPreparingPreview(false)
      if (!preview) {
        setShowPreview(false)
        setPendingFiles([])
        return
      }
      setPendingFiles(files)
      setPreviewData(preview)
    },
    [username, refusalSentence]
  )

  // Import a list of files, each on its own (IMPORT-008). A file already in the
  // library is not a failure and not a silent copy: with `ask` the server
  // refuses it and names the document it would duplicate, and the reader is
  // asked afterwards (ADR-066).
  const importFiles = useCallback(
    async (files, { title = null, onDuplicate = 'ask' } = {}) => {
      const imported = []
      const failures = []
      const duplicates = []
      for (const file of files) {
        try {
          imported.push(await booksService.importFile(file, username || 'Unknown', false, title, onDuplicate))
        } catch (error) {
          const existing = duplicateOf(error)
          if (existing) duplicates.push({ file, existing })
          else failures.push(refusalSentence(importRefusal(error, file.name)))
        }
      }
      // Read again even when something failed: an earlier file may be in, and so
      // may a file whose answer was lost. Left stale, the library invited a retry
      // that made a duplicate (IMPORT-004).
      await fetchBooks()
      if (imported.length) {
        setToast({
          message: t('books.lib.importedToast', { count: imported.length }),
          bookId: imported.length === 1 ? imported[0]._id : null
        })
      }
      if (failures.length) setErrorMessage(failures)
      return duplicates
    },
    [username, fetchBooks, t, refusalSentence]
  )

  const handleConfirmImport = useCallback(
    async (inputTitle) => {
      setConfirmingImport(true)
      const single = pendingFiles.length === 1
      // One file whose preview already said "this is in your library": pressing
      // the key ("Import a copy") is the reader's answer.
      const answered = single && !!previewData?.duplicate_of
      const duplicates = await importFiles(pendingFiles, {
        title: single && inputTitle ? inputTitle : null,
        onDuplicate: answered ? 'copy' : 'ask'
      })
      setShowPreview(false)
      setPreviewData(null)
      setPendingFiles([])
      setConfirmingImport(false)
      if (duplicates.length) setDuplicateAsk(duplicates)
    },
    [pendingFiles, previewData, importFiles]
  )

  const handleImportCopies = useCallback(async () => {
    setImportingCopies(true)
    await importFiles(
      duplicateAsk.map(({ file }) => file),
      { onDuplicate: 'copy' }
    )
    setImportingCopies(false)
    setDuplicateAsk([])
  }, [duplicateAsk, importFiles])

  const handleCancelPreview = useCallback(() => {
    dropRef.current += 1 // a preview still on its way belongs to a sheet that is gone
    setPreparingPreview(false)
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
    // No `.doc`: the old binary Word format cannot be read, and offering it
    // only to fail was worse than saying so (IMPORT-007). A rejected file
    // reaches `onDrop` as a rejection and is answered there.
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
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
                count: libraryCount,
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

      {(loading || libraryCount > 0) && (
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

      {!loading && libraryCount > 0 && documents.length === 0 && (
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
                isContinue={book._id === continueDoc?._id}
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
                isContinue={book._id === continueDoc?._id}
                relative={relative}
                username={username}
                onOpen={openDocument}
                actions={actionsFor(book)}
              />
            ))}
          </Box>
        ))}

      {/* The rest of the answer, asked for when wanted: the count says how much there is */}
      {!loading && hasMore && (
        <Stack alignItems='center' sx={{ mt: 3 }}>
          <Button variant='soft' color='neutral' loading={loadingMore} onClick={loadMore} data-testid='library-more'>
            {t('books.lib.showMore', { shown: documents.length, total: matching })}
          </Button>
        </Stack>
      )}

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

      {bookToEdit && <BookEditSheet book={bookToEdit} onSaved={fetchBooks} onClose={() => setBookToEdit(null)} />}

      <BookCreateSheet open={showCreate} onClose={() => setShowCreate(false)} />

      <ImportPreviewModal
        open={showPreview}
        onClose={handleCancelPreview}
        previewData={previewData}
        onConfirm={handleConfirmImport}
        loading={confirmingImport}
        preparing={preparingPreview}
        fileNames={pendingFiles.map((file) => file.name)}
        formatWhen={relative}
        onOpenExisting={(existing) => {
          handleCancelPreview()
          navigate(`/book/${existing._id}`)
        }}
      />

      <DuplicateImportsDialog
        duplicates={duplicateAsk}
        loading={importingCopies}
        onSkip={() => setDuplicateAsk([])}
        onImportCopies={handleImportCopies}
      />

      {/* After the preview, so a refusal that arrives with one is in front of it */}
      {errorMessage && (
        <ErrorWindow
          title={t('common.error')}
          error_msg={
            Array.isArray(errorMessage)
              ? errorMessage.map((line) => (
                  <Box component='span' key={line} sx={{ display: 'block', '& + &': { mt: 1 } }}>
                    {line}
                  </Box>
                ))
              : errorMessage
          }
          onClose={() => setErrorMessage('')}
        />
      )}
    </Container>
  )
}

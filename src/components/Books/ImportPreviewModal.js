import React from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Box, Button, IconButton, Sheet, Skeleton, Stack, Typography } from '@mui/joy'
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import DOMPurify from 'dompurify'

import FormSheet from '../Common/Form/FormSheet'
import FormTextField from '../Common/Form/FormTextField'
import { focusRing } from '../Common/Form/formStyles'

/**
 * The look before an import (IMPORT-013, IMPORT-014).
 *
 * It opens the moment a file is dropped, with the file's name and a skeleton
 * where its text will land, because reading a long PDF takes seconds and a
 * page that does nothing for seconds looks broken. Then it says three facts —
 * pages, words, pictures — and shows the first pages as they will be imported.
 *
 * What it no longer says: an "extraction quality" percentage (it was characters
 * divided by 2,000), a "low word count" warning (it fired on every text and
 * Word file) and "2-column layout preserved" (the document keeps reading order,
 * not columns). A scan is the one thing worth a warning: it imports as
 * pictures, and nothing can be read aloud or made into cards from it.
 *
 * With several files the title field is not offered: each is imported under
 * its own file name, and the sheet says how many.
 */

const actionSx = { width: { xs: '100%', sm: 'auto' }, minHeight: 44, ...focusRing }
const tabularNums = { fontVariantNumeric: 'tabular-nums' }

// The imported HTML, drawn with the type scale: the levels cannot be applied
// to markup that arrives as a string, so the selectors carry them.
const previewSx = {
  minHeight: 200,
  maxHeight: 360,
  overflow: 'auto',
  p: { xs: 2, md: 3 },
  borderRadius: 'md',
  bgcolor: 'background.surface',
  color: 'text.primary',
  '& p, & li, & td, & th': { typography: 'body-sm', color: 'text.primary' },
  '& p': { my: 1 },
  '& h1': { typography: 'title-lg', mt: 2, mb: 1 },
  '& h2': { typography: 'title-md', mt: 2, mb: 1 },
  '& h3, & h4, & h5, & h6': { typography: 'title-sm', mt: 1.5, mb: 0.5 },
  '& ul, & ol': { pl: 3, my: 1 },
  '& table': { borderCollapse: 'collapse', my: 1.5 },
  '& td, & th': { border: '1px solid', borderColor: 'divider', px: 1, py: 0.5, textAlign: 'left', verticalAlign: 'top' },
  '& td p, & th p': { m: 0 },
  // A link in the imported text wears the accent, as links do everywhere else, not the browser's blue.
  '& a': { color: 'primary.plainColor', textDecorationColor: 'currentcolor' },
  // Columns are imported in reading order, so the preview reads that way too.
  '& div': { display: 'block' }
}

const formatSize = (bytes) => {
  if (!bytes && bytes !== 0) return null
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

const Dot = () => (
  <Box component='span' aria-hidden='true' sx={{ color: 'text.tertiary' }}>
    ·
  </Box>
)

export default function ImportPreviewModal({
  open,
  onClose,
  previewData,
  onConfirm,
  onOpenExisting,
  formatWhen,
  loading = false,
  preparing = false,
  progress = null,
  fileNames = []
}) {
  const { t } = useTranslation()
  const [editedTitle, setEditedTitle] = React.useState('')
  const [pageIndex, setPageIndex] = React.useState(0)

  React.useEffect(() => {
    setEditedTitle(previewData?.title || '')
    setPageIndex(0)
  }, [previewData])

  const fileCount = Math.max(fileNames.length, 1)
  const isBatch = fileCount > 1
  const pages = previewData?.sample_pages || []
  const page = pages[pageIndex]
  const facts = previewData?.facts
  const totalPages = facts?.pages ?? previewData?.total_pages ?? pages.length
  const fileInfo = previewData?.file_info
  const fileName = fileInfo?.original_filename || fileNames[0] || ''
  // ADR-066: this very file is already in the library. For one file the sheet
  // says so and its key imports a copy; a drop of several asks after the import.
  const duplicate = !isBatch && !preparing ? previewData?.duplicate_of : null

  // While the import runs the sheet stays: closing it never stopped the import,
  // it only hid it, so Close and Cancel wait until the answer is in.
  const handleClose = () => {
    if (!loading) onClose()
  }

  const subtitle = preparing ? (
    t('books.import.reading', { name: fileName })
  ) : (
    <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap component='span'>
      <span>{fileName}</span>
      {fileInfo?.type && (
        <>
          <Dot />
          <span>{fileInfo.type}</span>
        </>
      )}
      {formatSize(fileInfo?.size) && (
        <>
          <Dot />
          <Box component='span' sx={tabularNums}>
            {formatSize(fileInfo.size)}
          </Box>
        </>
      )}
    </Stack>
  )

  return (
    <FormSheet
      open={open}
      onClose={handleClose}
      titleKey='books.import.sheetTitle'
      titleValues={{ count: fileCount }}
      subtitleText={subtitle}
      width='standard'
      footer={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='space-between'>
          <Button variant='plain' color='neutral' onClick={handleClose} disabled={loading} sx={actionSx}>
            {t('common.cancel')}
          </Button>
          <Button variant='solid' loading={loading} disabled={preparing} onClick={() => onConfirm(editedTitle)} sx={actionSx}>
            {duplicate ? t('books.import.actionCopy') : t('books.import.action', { count: fileCount })}
          </Button>
        </Stack>
      }
    >
      <Stack spacing={2.5} aria-busy={preparing ? 'true' : undefined}>
        {isBatch ? (
          <Typography level='body-sm' sx={{ color: 'text.secondary' }} data-testid='import-batch-note'>
            {t('books.import.batchNote', { count: fileCount })}
          </Typography>
        ) : preparing ? (
          <Skeleton variant='rectangular' height={44} sx={{ borderRadius: 'sm' }} />
        ) : (
          <FormTextField
            labelKey='books.titleLabel'
            placeholderKey='books.import.titlePlaceholder'
            value={editedTitle}
            onChange={setEditedTitle}
          />
        )}

        {preparing ? (
          <Skeleton variant='text' level='body-sm' width='45%' />
        ) : (
          facts && (
            <Stack
              direction='row'
              spacing={1}
              alignItems='center'
              flexWrap='wrap'
              useFlexGap
              sx={{ typography: 'body-sm', color: 'text.secondary', ...tabularNums }}
              data-testid='import-facts'
            >
              <span>{t('books.lib.pages', { count: facts.pages })}</span>
              <Dot />
              <span>{t('books.lib.words', { count: facts.words, words: facts.words.toLocaleString() })}</span>
              {facts.pictures > 0 && (
                <>
                  <Dot />
                  <span>{t('books.import.pictures', { count: facts.pictures })}</span>
                </>
              )}
            </Stack>
          )
        )}

        {duplicate && (
          <Alert
            color='neutral'
            variant='soft'
            data-testid='import-duplicate'
            endDecorator={
              <Button size='sm' variant='soft' color='neutral' onClick={() => onOpenExisting?.(duplicate)} sx={focusRing}>
                {t('books.import.duplicateOpen')}
              </Button>
            }
          >
            {t('books.import.duplicateNotice', {
              title: duplicate.title || t('books.untitled'),
              when: formatWhen ? formatWhen(duplicate.created_at) : ''
            })}
          </Alert>
        )}

        {/* While it runs, say how far it is: a drop of ten files, or one file with
            sixty pictures, is a wait of many seconds (IMPORT-028). */}
        {loading && (
          <Typography level='body-sm' sx={{ color: 'text.secondary' }} aria-live='polite' data-testid='import-progress'>
            {progress && progress.total > 1
              ? t('books.import.importingCount', { done: progress.done + 1, total: progress.total, name: progress.name })
              : (facts?.pictures_kept ?? facts?.pictures) > 0
                ? t('books.import.importingPictures', { count: facts.pictures_kept ?? facts.pictures })
                : t('books.import.importing')}
          </Typography>
        )}

        {/* ADR-067: one import keeps a set number of pictures; the text is always whole. */}
        {!preparing && facts && facts.pictures_kept < facts.pictures && (
          <Alert color='neutral' variant='soft' data-testid='import-pictures-trimmed'>
            {t('books.import.picturesTrimmed', { count: facts.pictures, kept: facts.pictures_kept })}
          </Alert>
        )}

        {!preparing && facts?.damaged && (
          <Alert color='warning' variant='soft' data-testid='import-damaged'>
            {t('books.import.damaged')}
          </Alert>
        )}

        {!preparing && facts?.scanned && (
          <Alert color='warning' variant='soft'>
            {t('books.import.scanned')}
          </Alert>
        )}

        <Box>
          <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1 }}>
            <Typography level='title-sm'>{t('books.import.preview')}</Typography>
            {!preparing && pages.length > 0 && (
              <Stack direction='row' spacing={0.5} alignItems='center'>
                <IconButton
                  size='sm'
                  variant='plain'
                  color='neutral'
                  aria-label={t('books.import.previousPage')}
                  disabled={pageIndex === 0}
                  onClick={() => setPageIndex((index) => Math.max(0, index - 1))}
                  sx={focusRing}
                >
                  <ChevronLeftRounded />
                </IconButton>
                <Typography level='body-sm' sx={{ color: 'text.secondary', ...tabularNums }} aria-live='polite'>
                  {t('books.lib.pageOf', { page: pageIndex + 1, total: totalPages })}
                </Typography>
                <IconButton
                  size='sm'
                  variant='plain'
                  color='neutral'
                  aria-label={t('books.import.nextPage')}
                  disabled={pageIndex >= pages.length - 1}
                  onClick={() => setPageIndex((index) => Math.min(pages.length - 1, index + 1))}
                  sx={focusRing}
                >
                  <ChevronRightRounded />
                </IconButton>
              </Stack>
            )}
          </Stack>

          <Sheet variant='outlined' sx={{ borderRadius: 'md' }}>
            {preparing ? (
              <Box sx={{ p: { xs: 2, md: 3 } }} data-testid='import-preparing'>
                <Skeleton variant='text' level='title-md' width='50%' />
                <Skeleton variant='text' level='body-sm' />
                <Skeleton variant='text' level='body-sm' />
                <Skeleton variant='text' level='body-sm' width='80%' />
                <Skeleton variant='text' level='body-sm' />
                <Skeleton variant='text' level='body-sm' width='65%' />
              </Box>
            ) : page?.content_preview?.trim() ? (
              <Box sx={previewSx} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.content_preview) }} />
            ) : (
              <Typography level='body-sm' sx={{ color: 'text.tertiary', p: { xs: 2, md: 3 } }}>
                {t('books.import.pageWithoutText')}
              </Typography>
            )}
          </Sheet>

          {!preparing && pages.length < totalPages && (
            <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 1 }}>
              {t('books.import.previewLimited', { shown: pages.length, total: totalPages })}
            </Typography>
          )}
        </Box>
      </Stack>
    </FormSheet>
  )
}

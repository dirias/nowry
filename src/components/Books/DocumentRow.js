import React from 'react'
import { Box, Button, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { listRow, measureFill, measureTrack, oneLine, readout, tabularNums } from '../Common/Form/formStyles'
import CoverMark from './CoverMark'
import { cardsReadout, measureOf, metaLine } from './documentCopy'

/**
 * One document as one row (ADR-021 §15.11; docs/prd-books-library.md D5–D8):
 * cover mark · title with its meta line · the coverage measure in the cover's
 * colour · the cards readout · Open · the kebab. Click opens where you were.
 */
export default function DocumentRow({ book, relative, username, onOpen, actions }) {
  const { t, i18n } = useTranslation()
  const meta = metaLine(t, book, relative, { username, locale: i18n.language })
  const readoutText = cardsReadout(t, book)
  const pct = measureOf(book)
  const open = () => onOpen?.(book)
  return (
    <Box
      data-testid='document-row'
      role='button'
      tabIndex={0}
      aria-label={t('books.lib.rowAria', { title: book.title })}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          open()
        }
      }}
      sx={{ ...listRow, cursor: 'pointer' }}
    >
      <CoverMark book={book} width={28} />
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        <Typography level='title-sm' sx={oneLine}>
          {book.title || t('books.untitled')}
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.tertiary', ...oneLine }}>
          {meta}
        </Typography>
      </Box>
      {/* The slot keeps its width so titles and keys stay aligned; it draws only when there is something to measure */}
      <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.25, width: 110, flexShrink: 0 }} aria-hidden='true'>
        {pct != null && (
          <>
            <Box sx={measureTrack}>
              <Box sx={measureFill(pct, book.cover_color || 'primary.solidBg')} />
            </Box>
            <Typography level='body-xs' sx={{ ...readout, fontSize: 'xs', width: 34, textAlign: 'right' }}>
              {`${pct}%`}
            </Typography>
          </>
        )}
      </Box>
      <Typography
        level='body-sm'
        sx={{ ...readout, color: 'text.secondary', width: { xs: 'auto', sm: 130 }, textAlign: 'right', flexShrink: 0, ...tabularNums }}
      >
        {readoutText?.strong && (
          <>
            <Typography component='span' level='body-sm' sx={{ color: 'text.primary', fontWeight: 'md' }}>
              {readoutText.strong}
            </Typography>
            <span aria-hidden='true'> · </span>
          </>
        )}
        <span>{readoutText?.rest}</span>
      </Typography>
      <Box sx={{ display: { xs: 'none', sm: 'flex' }, width: 72, justifyContent: 'flex-end', flexShrink: 0 }}>
        <Button
          size='sm'
          variant='soft'
          color='neutral'
          onClick={(event) => {
            event.stopPropagation()
            open()
          }}
          aria-label={t('books.lib.rowAria', { title: book.title })}
        >
          {t('books.lib.open')}
        </Button>
      </Box>
      <Box onClick={(event) => event.stopPropagation()} sx={{ flexShrink: 0 }}>
        {actions}
      </Box>
    </Box>
  )
}

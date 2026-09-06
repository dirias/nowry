import React from 'react'
import { Box, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { focusRing, measureFill, measureTrack, oneLine, readout, tabularNums } from '../Common/Form/formStyles'
import { MOTION } from '../../theme/tokens'
import CoverMark from './CoverMark'
import { cardsReadout, measureOf, metaLine } from './documentCopy'

/**
 * The grid tile: the row stacked (docs/prd-books-library.md D5). A 48×68 mark
 * beside the title and meta, the readout, the measure; no hero, no tilt, no
 * text on the colour. Hover is a level1 ground at quick; the kebab appears with it.
 */
export default function DocumentTile({ book, relative, username, onOpen, actions }) {
  const { t, i18n } = useTranslation()
  const meta = metaLine(t, book, relative, { username, locale: i18n.language })
  const { strong, rest } = cardsReadout(t, book)
  const pct = measureOf(book)
  const open = () => onOpen?.(book)
  return (
    <Box
      role='button'
      tabIndex={0}
      data-testid='document-tile'
      aria-label={t('books.lib.rowAria', { title: book.title })}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          open()
        }
      }}
      sx={{
        borderRadius: 'md',
        bgcolor: 'background.surface',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        cursor: 'pointer',
        transition: `background-color ${MOTION.duration.quick}ms ${MOTION.easing.standard}`,
        '&:hover, &:focus-within': { bgcolor: 'background.level1' },
        '& .document-tile-actions': { opacity: { xs: 1, md: 0 } },
        '&:hover .document-tile-actions, &:focus-within .document-tile-actions': { opacity: 1 },
        ...focusRing
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <CoverMark book={book} width={48} />
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography
            level='title-sm'
            sx={{ ...oneLine, whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
          >
            {book.title || t('books.untitled')}
          </Typography>
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            {meta}
          </Typography>
        </Box>
        <Box
          className='document-tile-actions'
          onClick={(event) => event.stopPropagation()}
          sx={{ mr: -1, mt: -1, transition: `opacity ${MOTION.duration.quick}ms ${MOTION.easing.standard}` }}
        >
          {actions}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Box sx={{ ...measureTrack, width: 'auto', flex: 1 }} aria-hidden='true'>
          <Box sx={measureFill(pct ?? 0, book.cover_color || 'primary.solidBg')} />
        </Box>
        <Typography level='body-sm' sx={{ ...readout, color: 'text.secondary', flexShrink: 0, ...tabularNums }}>
          {strong && (
            <>
              <Typography component='span' level='body-sm' sx={{ color: 'text.primary', fontWeight: 'md' }}>
                {strong}
              </Typography>
              <span aria-hidden='true'> · </span>
            </>
          )}
          <span>{rest}</span>
        </Typography>
      </Box>
    </Box>
  )
}

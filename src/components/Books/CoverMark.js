import React from 'react'
import { Box } from '@mui/joy'

/**
 * A document's identity mark (docs/prd-books-library.md D5, §15.8): the colour
 * the user chose, or their image, on a small rectangle in a book's proportion.
 * Never text on it — the title sits on the surface beside it.
 */
export default function CoverMark({ book, width = 28 }) {
  const height = Math.round(width * 1.42)
  return (
    <Box
      aria-hidden='true'
      sx={{
        width,
        height,
        flexShrink: 0,
        borderRadius: 'xs',
        overflow: 'hidden',
        bgcolor: book?.cover_color || 'primary.solidBg'
      }}
    >
      {book?.cover_image && (
        <Box
          component='img'
          src={book.cover_image}
          alt=''
          loading='lazy'
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}
    </Box>
  )
}

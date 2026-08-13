import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box } from '@mui/joy'

/**
 * The live cover preview, demoted from a column to a header swatch
 * (BOOKS.md §3.4).
 *
 * It used to be a 200px `Book` component inside a `Grid md={5}` that was
 * vertically centred in a column sized by the *form* beside it — dead space by
 * construction — under a "LIVE PREVIEW" heading that labelled something
 * self-evident, beside created and edited dates that are metadata about a
 * record rather than fields being edited.
 *
 * What the preview is actually for is confirming the colour, and 64px shows a
 * colour exactly as well as 200px does. At 375px the two-column layout was
 * already a vertical stack with the preview below the fold, so the desktop
 * column was carrying the design for a layout most users never saw.
 *
 * `coverColor` is content, not chrome — it goes into `bgcolor` raw for the same
 * reason PRESET_COLORS is raw hex.
 */
const BookHeaderPreview = ({ coverColor, coverImage }) => {
  const { t } = useTranslation()

  return (
    <Box
      role='img'
      aria-label={t('books.coverImageAlt')}
      sx={{
        flexShrink: 0,
        // 2:3, the same proportion the book card uses.
        width: { xs: 44, sm: 64 },
        height: { xs: 64, sm: 96 },
        borderRadius: 'sm',
        border: '1px solid',
        borderColor: 'divider',
        // A cover image is optional; the colour always has a value, so a
        // failed or absent image falls back to it rather than to a gap.
        bgcolor: coverColor || 'primary.solidBg',
        backgroundImage: coverImage ? `url(${coverImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    />
  )
}

export default BookHeaderPreview

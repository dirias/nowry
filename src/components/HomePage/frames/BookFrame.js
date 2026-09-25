import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Stack, Typography } from '@mui/joy'
import { frameShell, frameSolidChip } from './frameStyles'

/**
 * A book page, drawn: a section title, a paragraph with one highlight on the
 * accent's soft ground, and the action the highlight offers.
 */
const BookFrame = ({ sx = {} }) => {
  const { t } = useTranslation()

  return (
    <Box aria-hidden sx={{ ...frameShell, bgcolor: 'background.surface', aspectRatio: { xs: 'auto', sm: '4 / 3' }, p: 2, gap: 1, ...sx }}>
      <Typography level='title-sm' sx={{ color: 'text.primary' }}>
        {t('landing.frames.book.section')}
      </Typography>
      <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
        {t('landing.frames.book.before')}
        <Box component='mark' sx={{ bgcolor: 'primary.softBg', color: 'primary.softColor', borderRadius: 'xs', px: 0.25 }}>
          {t('landing.frames.book.highlight')}
        </Box>
        {t('landing.frames.book.after')}
      </Typography>
      <Stack direction='row' alignItems='center' spacing={1} sx={{ mt: 'auto' }}>
        <Typography level='body-xs' sx={frameSolidChip}>
          {t('landing.frames.book.action')}
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t('landing.frames.book.from')}
        </Typography>
      </Stack>
    </Box>
  )
}

export default BookFrame

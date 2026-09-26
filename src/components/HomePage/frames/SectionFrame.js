import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Stack, Typography } from '@mui/joy'
import { frameShell } from './frameStyles'

/**
 * A section of a document, drawn (SITE-014): a heading and the paragraphs
 * under it, which is what the editor calls a section and what cards are made
 * from. There is no highlight-to-card gesture in the product, so none is drawn.
 */
const SectionFrame = ({ sx = {} }) => {
  const { t } = useTranslation()

  return (
    <Box aria-hidden sx={{ ...frameShell, bgcolor: 'background.surface', aspectRatio: { xs: 'auto', sm: '4 / 3' }, p: 2, gap: 1, ...sx }}>
      <Typography level='title-sm' sx={{ color: 'text.primary' }}>
        {t('landing.frames.section.heading')}
      </Typography>
      <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
        {t('landing.frames.section.paragraph1')}
      </Typography>
      <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
        {t('landing.frames.section.paragraph2')}
      </Typography>
      <Stack direction='row' justifyContent='space-between' sx={{ mt: 'auto' }}>
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t('landing.frames.section.position', { n: 3, total: 6 })}
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.tertiary', fontVariantNumeric: 'tabular-nums' }}>
          {t('books.makeCards.words', { count: 1240, words: '1,240' })} · {t('books.makeCards.cards', { count: 8 })}
        </Typography>
      </Stack>
    </Box>
  )
}

export default SectionFrame

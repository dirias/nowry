import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Stack, Typography } from '@mui/joy'
import { frameShell } from './frameStyles'

const COUNTER = { n: 12, total: 30 }
const RATINGS = ['missed', 'hard', 'good', 'easy']

/**
 * A study card, drawn: where it came from, the prompt, the answer, and the four
 * rating keys as secondaries — grounds on `level1`, no hue (§15.5).
 * `answered` shows the answer; the loop's "Make cards" step shows the prompt alone.
 */
const CardFrame = ({ answered = true, sx = {} }) => {
  const { t } = useTranslation()

  return (
    <Box aria-hidden sx={{ ...frameShell, bgcolor: 'background.surface', aspectRatio: { xs: 'auto', sm: '4 / 3' }, p: 2, gap: 1, ...sx }}>
      <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
        {t('landing.frames.card.counter', COUNTER)}
      </Typography>
      <Typography level='title-sm' sx={{ color: 'text.primary' }}>
        {t('landing.frames.card.prompt')}
      </Typography>
      {answered && (
        <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
          {t('landing.frames.card.answer')}
        </Typography>
      )}
      <Stack direction='row' spacing={0.75} sx={{ mt: 'auto' }}>
        {RATINGS.map((rating) => (
          <Typography
            key={rating}
            level='body-xs'
            sx={{
              flex: 1,
              textAlign: 'center',
              py: 0.75,
              borderRadius: 'sm',
              bgcolor: 'background.level1',
              color: 'text.secondary',
              boxShadow: 'inset 0 -2px 0 0 var(--joy-palette-neutral-outlinedBorder)'
            }}
          >
            {t(`landing.frames.card.${rating}`)}
          </Typography>
        ))}
      </Stack>
    </Box>
  )
}

export default CardFrame

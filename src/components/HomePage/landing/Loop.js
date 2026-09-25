import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Stack, Typography } from '@mui/joy'

/** The product's own order: read → make cards → study → plan the year (PRD D3). */
export const LOOP_STEPS = ['read', 'cards', 'study', 'plan']

/**
 * Four steps in one row, each with a drawn fragment of the surface it names
 * above its title. `frames` maps a step key to its frame (SITE-002); a step
 * without one renders its text alone, so the section never waits on a picture.
 */
const Loop = ({ frames = {} }) => {
  const { t } = useTranslation()

  return (
    <Box component='section' aria-labelledby='landing-loop-title' sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={1.5} sx={{ maxWidth: 640, mb: { xs: 4, md: 6 } }}>
        <Typography id='landing-loop-title' level='h2' sx={{ color: 'text.primary' }}>
          {t('landing.loop.title')}
        </Typography>
        <Typography level='body-md' sx={{ color: 'text.secondary' }}>
          {t('landing.loop.lead')}
        </Typography>
      </Stack>

      <Box
        component='ol'
        sx={{
          listStyle: 'none',
          m: 0,
          p: 0,
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
          gap: { xs: 4, md: 4 }
        }}
      >
        {LOOP_STEPS.map((step, index) => (
          <Stack component='li' key={step} spacing={2} sx={{ minWidth: 0 }}>
            {frames[step]}
            <Stack spacing={0.75}>
              <Stack direction='row' spacing={1.25} alignItems='baseline'>
                <Typography level='title-sm' sx={{ color: 'text.tertiary', fontVariantNumeric: 'tabular-nums' }} aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </Typography>
                <Typography level='title-lg' component='h3' sx={{ color: 'text.primary' }}>
                  {t(`landing.loop.${step}.title`)}
                </Typography>
              </Stack>
              <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                {t(`landing.loop.${step}.desc`)}
              </Typography>
            </Stack>
          </Stack>
        ))}
      </Box>
    </Box>
  )
}

export default Loop

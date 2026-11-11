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
    <Box component='section' aria-labelledby='landing-loop-title' sx={{ py: { xs: 4, md: 10 } }}>
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
          // Two rows per step — the frame, then the text — so every frame in
          // a row is the height of the tallest (a locale's copy decides it,
          // nothing is clipped) and the four captions sit on one line.
          gridAutoRows: { md: 'auto auto' },
          columnGap: 4,
          // On a phone a step reads words first, then its picture, close
          // together, with the larger gap between steps — so a title never
          // sits midway between two pictures.
          rowGap: { xs: 2, sm: 4, md: 2 },
          '& > li': { display: 'contents' }
        }}
      >
        {LOOP_STEPS.map((step, index) => (
          <li key={step}>
            <Box
              sx={{ minWidth: 0, order: { xs: index * 2 + 1, sm: 0 }, gridRow: { md: 1 }, gridColumn: { md: index + 1 }, display: 'flex' }}
            >
              {frames[step]}
            </Box>
            <Stack
              spacing={0.75}
              sx={{
                minWidth: 0,
                order: { xs: index * 2, sm: 0 },
                mt: { xs: index === 0 ? 0 : 4, sm: 0 },
                gridRow: { md: 2 },
                gridColumn: { md: index + 1 },
                mb: { xs: 0, md: 2 }
              }}
            >
              {/* The number above the title on a phone, so title and text share the page's edge. */}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={{ xs: 0.25, sm: 1.25 }}
                alignItems={{ xs: 'flex-start', sm: 'baseline' }}
              >
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
          </li>
        ))}
      </Box>
    </Box>
  )
}

export default Loop

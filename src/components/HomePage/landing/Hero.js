import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Button, Stack, Typography } from '@mui/joy'
import { ArrowForwardRounded } from '@mui/icons-material'

/**
 * The landing's first view (PRD public-site D1, D3, D11).
 *
 * One `<h1>` at `display-lg`, one sentence, one solid CTA and the library as
 * the proof link; the product frame sits beside it on desktop and under it on
 * a phone, so the headline is the first thing a visitor reads at any width.
 * `frame` is the drawn Study Center and `phoneFrame` the drawn phone Home
 * (SITE-002): a phone visitor sees the client they would use, a desktop
 * visitor the one they are looking at. The caption under each says so.
 */
const Hero = ({ frame, phoneFrame }) => {
  const { t } = useTranslation()

  return (
    <Box
      component='section'
      aria-labelledby='landing-hero-title'
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 5fr) minmax(0, 7fr)' },
        alignItems: 'center',
        columnGap: { md: 8 },
        rowGap: 5,
        py: { xs: 6, md: 12 }
      }}
    >
      <Stack spacing={3} alignItems='flex-start'>
        <Typography id='landing-hero-title' level='display-lg' component='h1' sx={{ color: 'text.primary', whiteSpace: 'pre-line' }}>
          {t('landing.hero.title')}
        </Typography>
        <Typography level='body-lg' sx={{ color: 'text.secondary', maxWidth: 480 }}>
          {t('landing.hero.lead')}
        </Typography>
        <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap sx={{ pt: 1 }}>
          <Button component={Link} to='/register' size='lg'>
            {t('landing.hero.cta')}
          </Button>
          <Button component={Link} to='/browse' variant='plain' size='lg' endDecorator={<ArrowForwardRounded />}>
            {t('landing.hero.proof')}
          </Button>
        </Stack>
        <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
          {t('landing.hero.fineprint')}
        </Typography>
      </Stack>

      <Stack spacing={1.5} sx={{ minWidth: 0, display: { xs: 'none', md: 'flex' } }}>
        {frame}
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t('landing.hero.frameCaption')}
        </Typography>
      </Stack>
      <Stack spacing={1.5} alignItems='flex-start' sx={{ minWidth: 0, display: { xs: 'flex', md: 'none' } }}>
        {phoneFrame}
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t('landing.hero.phoneCaption')}
        </Typography>
      </Stack>
    </Box>
  )
}

export default Hero

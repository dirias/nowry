import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Button, Chip, Skeleton, Stack, Typography } from '@mui/joy'
import { ArrowForwardRounded } from '@mui/icons-material'
import { useBeta } from '@nowry/core/context/BetaContext'
import WaitlistForm from '../../Public/WaitlistForm'

/**
 * The landing's first view (PRD public-site D1, D3, D11).
 *
 * One `<h1>` at `display-lg`, one sentence, one solid CTA and the library as
 * the proof link; the product frame sits beside it on desktop and under it on
 * a phone, so the headline is the first thing a visitor reads at any width.
 * `frame` is the drawn Study Center and `phoneFrame` the drawn phone Home
 * (SITE-002): a phone visitor sees the client they would use, a desktop
 * visitor the one they are looking at. The caption under each says so.
 *
 * While the server requires an invite (WAIT-003, FR-014) the solid key is the
 * waitlist form, because that is the one thing a visitor without a code can
 * finish; a code holder gets a plain link to Register. With the gate off the
 * solid key is "Create a free account", as before.
 *
 * The hero does not guess (WAIT-011, FR-015). Until the server answers, the
 * action slot is a placeholder; if it never answers, the hero is the gated
 * one. "Create a free account" appears only once the server has said that no
 * invite is required, so no visitor is sent to a code field by a slow call.
 */

/** `pending` until the gate answers, `gated` on a required invite or no answer, else `open`. */
export const heroGate = ({ config, loading, failed }) => {
  if (loading) return 'pending'
  return failed || config?.invite_required ? 'gated' : 'open'
}

// The form's own footprint: stacked on a phone, one row from `sm`.
const pendingSlot = { width: '100%', maxWidth: 440, height: { xs: 176, sm: 116 }, borderRadius: 'sm' }

// Its words on the page's edge, its padding in the gutter and no further.
const plainEdge = { ml: -2, pl: 2 }

/**
 * The hero's actions. One left edge: a plain key's words sit under the solid
 * key's edge, so its padding hangs outside the column. `useFlexGap`, because a
 * Stack that spaces with margins resets every child's margin to 0 and the
 * offset with it.
 */
const HeroActions = ({ gate }) => {
  const { t } = useTranslation()
  return (
    <Stack spacing={1} useFlexGap alignItems='flex-start' aria-busy={gate === 'pending'} sx={{ pt: 1, width: '100%' }}>
      {gate === 'pending' && <Skeleton variant='rectangular' animation='wave' data-testid='hero-gate-pending' sx={pendingSlot} />}
      {gate === 'gated' && (
        <>
          <WaitlistForm source='/' />
          <Button component={Link} to='/register' variant='plain' size='lg' sx={plainEdge}>
            {t('beta.haveCode')}
          </Button>
        </>
      )}
      {gate === 'open' && (
        <Button component={Link} to='/register' size='lg'>
          {t('landing.hero.cta')}
        </Button>
      )}
      <Button component={Link} to='/browse' variant='plain' size='lg' endDecorator={<ArrowForwardRounded />} sx={plainEdge}>
        {t('landing.hero.proof')}
      </Button>
    </Stack>
  )
}
const Hero = ({ frame, phoneFrame }) => {
  const { t } = useTranslation()
  const { config: beta, loading, failed } = useBeta()
  const gate = heroGate({ config: beta, loading, failed })

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
        py: { xs: 4, md: 12 }
      }}
    >
      <Stack spacing={3} alignItems='flex-start'>
        {beta.active && (
          <Chip size='sm' variant='soft' color='primary'>
            {t('beta.mark')}
          </Chip>
        )}
        <Typography id='landing-hero-title' level='display-lg' component='h1' sx={{ color: 'text.primary', whiteSpace: 'pre-line' }}>
          {t('landing.hero.title')}
        </Typography>
        <Typography level='body-lg' sx={{ color: 'text.secondary', maxWidth: 480 }}>
          {t('landing.hero.lead')}
        </Typography>
        <HeroActions gate={gate} />
        {gate === 'open' && (
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            {t('landing.hero.fineprint')}
          </Typography>
        )}
      </Stack>

      <Stack spacing={1.5} sx={{ minWidth: 0, display: { xs: 'none', md: 'flex' } }}>
        {frame}
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t('landing.hero.frameCaption')}
        </Typography>
      </Stack>
      <Stack spacing={1.5} sx={{ minWidth: 0, display: { xs: 'flex', md: 'none' } }}>
        {phoneFrame}
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t('landing.hero.phoneCaption')}
        </Typography>
      </Stack>
    </Box>
  )
}

export default Hero

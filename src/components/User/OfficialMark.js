import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography } from '@mui/joy'
import VerifiedRounded from '@mui/icons-material/VerifiedRounded'

/**
 * OfficialMark — "Nowry reviewed this", said without colour (ONB-011).
 *
 * WHY THIS IS A GLYPH AND A SENTENCE, NOT A TINTED CHIP
 *
 * The obvious Joy idiom for a badge is `variant='soft' color='primary'`, and
 * ONB-007 already measured what that actually delivers: `primary.softBg` sits at
 * 1.00–1.06:1 against `background.surface` across all seven accent presets, and
 * `primary.outlinedBorder` reaches only 1.10–1.94:1. Neither clears the 3:1 that
 * WCAG 2.2 asks of a non-text indicator, and NFR-004 forbids colour carrying
 * meaning on its own regardless. FR-056 asks for a *distinguishable* mark, so
 * the mark is a shield glyph plus localized words, both drawn in `text.primary`
 * — 16.19:1 light, 14.64:1 dark, and legible in greyscale or with no colour
 * perception at all. The hairline and the level-1 fill are containment, not
 * signal; delete them and the mark still says exactly the same thing.
 *
 * WHAT MAY RENDER IT
 *
 * Only `is_official === true` as computed by the server (ADR-004). It is a
 * response projection over five clauses — public, live, owned by the configured
 * Nowry account, curation approved, curation topic matching the public category
 * — and specifically *not* a stored flag a publisher can set. The caller checks
 * the strict boolean; this component never infers officialness from a publisher
 * name, because "published by Nowry" and "reviewed by Nowry" are the exact two
 * things FR-058 keeps apart.
 *
 * The accessible name carries the publisher (architecture, `OfficialMark`), so
 * a screen-reader user hears who vouched for the deck rather than an unattributed
 * "official". The icon and the visible words are `aria-hidden` beneath a single
 * `role='img'`, so the whole mark is announced once as one phrase instead of as
 * an icon, a label and a stray graphic.
 *
 * @param {object} props
 * @param {string} [props.publisher] Display publisher from the browse response.
 * @param {object} [props.sx]        Extra layout for the caller's own rhythm.
 */
const OfficialMark = ({ publisher, sx }) => {
  const { t } = useTranslation()

  // No publisher, no attribution — an invented "Nowry" here would be the client
  // asserting provenance the server did not send (NFR-018).
  const accessibleName = publisher
    ? t('onboarding.firstDeck.official.accessible', { publisher })
    : t('onboarding.firstDeck.official.label')

  return (
    <Box
      role='img'
      aria-label={accessibleName}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        flexShrink: 0,
        px: 1,
        py: 0.25,
        borderRadius: 'xl',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.level1',
        ...sx
      }}
    >
      <VerifiedRounded aria-hidden='true' sx={{ fontSize: 14, color: 'text.primary' }} />
      <Typography aria-hidden='true' level='body-xs' sx={{ color: 'text.primary', fontWeight: 600 }}>
        {t('onboarding.firstDeck.official.label')}
      </Typography>
    </Box>
  )
}

export default OfficialMark

import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Button, Stack, Typography } from '@mui/joy'
import { CheckRounded } from '@mui/icons-material'
import { FEATURED_TIER_ID, PLAN_TIERS } from '@nowry/core/domain/plans'

/**
 * Pricing in public (PRD D4, ADR-035 §5): the three tiers from the one table
 * `/plans` reads, so the numbers cannot drift. The featured tier carries the
 * section's one solid; the others are secondaries. Every CTA goes to
 * `/register`, because a visitor has no account to upgrade yet.
 */
const Pricing = () => {
  const { t } = useTranslation()

  return (
    <Box component='section' id='pricing' aria-labelledby='landing-pricing-title' sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={1.5} sx={{ maxWidth: 640, mb: { xs: 4, md: 6 } }}>
        <Typography id='landing-pricing-title' level='h2' sx={{ color: 'text.primary' }}>
          {t('landing.pricing.title')}
        </Typography>
        <Typography level='body-md' sx={{ color: 'text.secondary' }}>
          {t('landing.pricing.lead')}
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(3, minmax(0, 1fr))' },
          gap: 3
        }}
      >
        {PLAN_TIERS.map((tier) => {
          const featured = tier.id === FEATURED_TIER_ID
          const name = t(tier.nameKey)
          return (
            <Stack
              key={tier.id}
              component='article'
              aria-labelledby={`landing-plan-${tier.id}`}
              spacing={2.5}
              sx={{
                p: 3,
                borderRadius: 'lg',
                border: '1px solid',
                borderColor: featured ? 'primary.outlinedBorder' : 'divider',
                bgcolor: 'background.surface'
              }}
            >
              <Stack spacing={0.75}>
                <Typography id={`landing-plan-${tier.id}`} level='title-lg' component='h3' sx={{ color: 'text.primary' }}>
                  {name}
                </Typography>
                <Stack direction='row' alignItems='baseline' spacing={1}>
                  <Typography level='h2' component='p' sx={{ color: 'text.primary' }}>
                    {tier.price.monthly}
                  </Typography>
                  <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                    {t('landing.pricing.perMonth')}
                  </Typography>
                </Stack>
                {tier.price.annual !== tier.price.monthly && (
                  <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                    {t('landing.pricing.annual', { price: tier.price.annual })}
                  </Typography>
                )}
              </Stack>

              <Stack component='ul' spacing={1.25} sx={{ listStyle: 'none', m: 0, p: 0, flex: 1 }}>
                {tier.features.map(({ label, value }) => (
                  <Stack component='li' key={label} direction='row' spacing={1.25} alignItems='flex-start'>
                    <CheckRounded fontSize='small' sx={{ color: 'primary.plainColor', mt: 0.25, flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography level='body-sm' sx={{ color: 'text.primary' }}>
                        {t(label)}
                      </Typography>
                      <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                        {t(value)}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>

              <Button
                component={Link}
                to='/register'
                variant={featured ? 'solid' : 'soft'}
                color={featured ? 'primary' : 'neutral'}
                fullWidth
              >
                {tier.id === 'free' ? t('landing.hero.cta') : t('landing.pricing.cta', { name })}
              </Button>
            </Stack>
          )
        })}
      </Box>
    </Box>
  )
}

export default Pricing

import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography, Button, Stack, Chip, Divider, Skeleton } from '@mui/joy'
import CheckIcon from '@mui/icons-material/Check'

export default function PlanCard({
  name,
  price,
  period,
  features = [],
  isCurrent = false,
  ctaLabel,
  onUpgrade,
  loading = false,
  showSavings = false
}) {
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 'lg',
        border: '1px solid',
        borderColor: isCurrent ? 'primary.outlinedBorder' : 'divider',
        bgcolor: isCurrent ? 'background.level1' : 'background.surface',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 'md' }
      }}
    >
      {/* Plan name + current/savings badge */}
      <Stack direction='row' justifyContent='space-between' alignItems='center'>
        <Typography level='title-md' sx={{ color: 'text.primary', fontWeight: 700 }}>
          {name}
        </Typography>
        <Stack direction='row' spacing={0.5}>
          {isCurrent && (
            <Chip size='sm' variant='soft' color='primary'>
              {t('plans.currentPlan')}
            </Chip>
          )}
          {showSavings && !isCurrent && (
            <Chip size='sm' variant='soft' color='warning'>
              {t('plans.billingToggle.annual')}
            </Chip>
          )}
        </Stack>
      </Stack>

      {/* Price */}
      <Skeleton loading={loading} variant='rectangular' sx={{ borderRadius: 'sm' }}>
        <Stack direction='row' alignItems='baseline' spacing={0.5}>
          <Typography level='h4' sx={{ color: 'text.primary' }}>
            {price}
          </Typography>
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            / {period}
          </Typography>
        </Stack>
      </Skeleton>

      <Divider />

      {/* Feature list */}
      <Stack spacing={1.5} sx={{ flex: 1 }}>
        {features.map((feature, idx) => (
          <Stack key={idx} direction='row' alignItems='flex-start' spacing={1}>
            <CheckIcon sx={{ fontSize: 16, color: 'primary.solidBg', mt: 0.2, flexShrink: 0 }} />
            <Box>
              <Typography level='body-sm' sx={{ color: 'text.primary' }}>
                {feature.label}
              </Typography>
              {feature.value && (
                <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                  {feature.value}
                </Typography>
              )}
            </Box>
          </Stack>
        ))}
      </Stack>

      {/* CTA */}
      {ctaLabel && (
        <Button
          fullWidth
          variant={isCurrent ? 'outlined' : 'solid'}
          color='primary'
          size='md'
          disabled={isCurrent || loading}
          onClick={onUpgrade}
          aria-label={ctaLabel}
        >
          {ctaLabel}
        </Button>
      )}
    </Box>
  )
}

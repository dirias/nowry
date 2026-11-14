import React from 'react'
import { Box, Skeleton, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { AdminCard } from './OverviewParts'
import { resetTime } from './adminLogText'

/** One meter (board A): its name and "8 of 72" above a thin bar on the level2 ground. */
const Meter = ({ labelKey, meter }) => {
  const { t } = useTranslation()
  const label = t(labelKey)
  const of = t('admin.overview.emails.of', { sent: meter.sent, share: meter.share })
  return (
    <Stack gap={0.75}>
      <Stack direction='row' justifyContent='space-between' gap={1.5}>
        <Typography level='body-sm' sx={{ color: 'text.secondary', minWidth: 0 }}>
          {label}
        </Typography>
        <Typography level='body-sm' sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {of}
        </Typography>
      </Stack>
      <Box
        role='meter'
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.max(meter.share, meter.sent, 1)}
        aria-valuenow={meter.sent}
        aria-valuetext={of}
        sx={{ height: 6, borderRadius: 'xs', bgcolor: 'background.level2', overflow: 'hidden' }}
      >
        <Box sx={{ height: '100%', width: `${meter.percent}%`, bgcolor: 'primary.plainColor', borderRadius: 'xs' }} />
      </Box>
    </Stack>
  )
}

/** "Emails today · resets 00:00 UTC" (board A): invitations and waitlist confirmations against today's shares. */
export default function EmailsCard({ meters, loading }) {
  const { t, i18n } = useTranslation()
  const aside = loading ? null : t('admin.overview.emails.resets', { time: resetTime(meters.resetsAt, i18n?.language) })
  return (
    <AdminCard id='overview-emails' title={t('admin.overview.emails.title')} aside={aside}>
      {loading ? (
        <Stack gap={1.25} aria-busy='true' aria-label={t('admin.overview.loading')} data-testid='overview-emails-loading'>
          {[0, 1].map((key) => (
            <Stack key={key} gap={0.75}>
              <Skeleton variant='text' level='body-sm' sx={{ width: '60%' }} />
              <Skeleton variant='rectangular' sx={{ height: 6, borderRadius: 'xs' }} />
            </Stack>
          ))}
        </Stack>
      ) : (
        <Stack gap={1.25}>
          <Meter labelKey='admin.overview.emails.invitations' meter={meters.invitations} />
          <Meter labelKey='admin.overview.emails.confirmations' meter={meters.confirmations} />
        </Stack>
      )}
    </AdminCard>
  )
}

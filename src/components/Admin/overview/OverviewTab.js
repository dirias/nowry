import React from 'react'
import { Box, Stack } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { useAdminOverview } from '@nowry/core/hooks/useAdminOverview'
import { emailMeters, needsRows } from '@nowry/core/domain/adminLog'
import { LoadError } from '../AdminListParts'
import NeedsCard from './NeedsCard'
import EmailsCard from './EmailsCard'
import RecentCard from './RecentCard'

/**
 * The Overview tab (ADMIN-007c, FR-011 Overview, boards A and L), where
 * `/admin` opens: "Needs you" on the left, each row a door to its tab; today's
 * email meters and what admins did on the right, with the full log behind it.
 * One column at phone width. Loading draws each card's skeleton; an error
 * replaces both columns with Try again.
 */
export default function OverviewTab() {
  const { t } = useTranslation()
  const { overview, loading, error, retry } = useAdminOverview()
  return (
    <Stack component='section' aria-label={t('admin.overview.label')} sx={{ minWidth: 0 }}>
      {error ? (
        <LoadError message={t('admin.overview.error')} onRetry={retry} />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.05fr) minmax(0, 1fr)' },
            gap: 2,
            alignItems: 'start',
            minWidth: 0
          }}
        >
          <NeedsCard rows={needsRows(overview)} loading={loading} />
          <Stack gap={2} sx={{ minWidth: 0 }}>
            <EmailsCard meters={emailMeters(overview)} loading={loading} />
            <RecentCard actions={overview?.recent_actions ?? []} loading={loading} />
          </Stack>
        </Box>
      )}
    </Stack>
  )
}

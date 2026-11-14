import React from 'react'
import { Link } from 'react-router-dom'
import { Box, Button, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { groupRecent } from '@nowry/core/domain/adminLog'
import { apiInstant } from '@nowry/core/domain/apiInstant'
import { EmptyRows, LoadingRows } from '../AdminListParts'
import { ActionText, AdminCard } from './OverviewParts'
import { overviewLine, shortWhenText } from './adminLogText'

/** One line (board A): the short time, then the sentence. */
const RecentLine = ({ entry }) => {
  const { t, i18n } = useTranslation()
  return (
    <Box
      component='li'
      sx={{
        display: 'grid',
        gridTemplateColumns: '64px minmax(0, 1fr)',
        gap: 1.25,
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-of-type': { borderBottom: 0 }
      }}
    >
      <Typography
        component='time'
        dateTime={apiInstant(entry.at)?.toISOString()}
        level='body-sm'
        sx={{ color: 'text.tertiary', fontVariantNumeric: 'tabular-nums' }}
      >
        {shortWhenText(t, entry.at, i18n?.language)}
      </Typography>
      <Typography level='body-sm' sx={{ color: 'text.secondary', minWidth: 0, overflowWrap: 'anywhere' }}>
        <ActionText line={overviewLine(t, entry)} />
      </Typography>
    </Box>
  )
}

/** "What admins did · last 7 days" (board A): the recent actions as sentences, then Full log. */
export default function RecentCard({ actions, loading }) {
  const { t } = useTranslation()
  const entries = groupRecent(actions)
  return (
    <AdminCard id='overview-recent' title={t('admin.overview.recent.title')} aside={t('admin.overview.recent.period')}>
      {loading ? (
        <LoadingRows label={t('admin.overview.loading')} testId='overview-recent-loading' />
      ) : entries.length === 0 ? (
        <EmptyRows title={t('admin.overview.recent.empty')} />
      ) : (
        <Box component='ul' sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {entries.map((entry) => (
            <RecentLine key={entry.id} entry={entry} />
          ))}
        </Box>
      )}
      <Button component={Link} to='/admin/log' variant='plain' size='sm' sx={{ alignSelf: 'flex-start' }}>
        {t('admin.overview.recent.fullLog')}
      </Button>
    </AdminCard>
  )
}

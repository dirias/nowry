import React from 'react'
import { Link } from 'react-router-dom'
import { Box, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined'
import MailOutlineIcon from '@mui/icons-material/MailOutline'
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline'
import { needsCount } from '@nowry/core/domain/adminLog'
import { focusRing, oneLine } from '../../Common/Form/formStyles'
import { LoadingRows } from '../AdminListParts'
import { timeAgo } from '../moderation/moderationText'
import { AdminCard } from './OverviewParts'

const SEP = ' · '

/** Each row's door, icon and words (board A). Invitations open filtered to Open. */
const ROWS = Object.freeze({
  reports: { path: '/admin/moderation', Icon: FlagOutlinedIcon },
  bugs: { path: '/admin/bugs', Icon: BugReportOutlinedIcon },
  invitations: { path: '/admin/invitations?state=open', Icon: MailOutlineIcon },
  waiting: { path: '/admin/waitlist', Icon: PeopleOutlineIcon }
})

const META = {
  reports: (t, row, language) =>
    [
      t('admin.overview.needs.reports.oldest', { when: timeAgo(row.oldestAt, language) }),
      row.reasons.map((r) => t(`admin.mod.reasons.${r}`)).join(', ')
    ]
      .filter(Boolean)
      .join(SEP),
  bugs: (t, row) =>
    row.critical > 0 ? t('admin.overview.needs.bugs.critical', { count: row.critical }) : t('admin.overview.needs.bugs.noCritical'),
  invitations: (t, row) => [t('admin.overview.needs.invitations.unused'), row.cohorts.join(', ')].filter(Boolean).join(SEP),
  waiting: (t, row) =>
    row.sinceLastBatch > 0
      ? t('admin.overview.needs.waiting.since', { count: row.sinceLastBatch })
      : t('admin.overview.needs.waiting.sinceNone')
}

/** One row (board A): the icon tile, title and meta, the count, and on wider screens the door's word. The whole row is the link. */
const NeedsRow = ({ row }) => {
  const { t, i18n } = useTranslation()
  const { path, Icon } = ROWS[row.kind]
  const title = t(`admin.overview.needs.${row.kind}.title`)
  return (
    <Box
      component={Link}
      to={path}
      aria-label={t('admin.overview.needs.rowLabel', { title, number: row.count })}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '28px minmax(0, 1fr) auto', sm: '28px minmax(0, 1fr) auto auto' },
        alignItems: 'center',
        gap: 1.5,
        px: 0.75,
        py: 1.25,
        borderBottom: '1px solid',
        borderColor: 'divider',
        borderRadius: 'sm',
        color: 'inherit',
        textDecoration: 'none',
        '&:last-of-type': { borderBottom: 0 },
        '&:hover': { bgcolor: 'background.level1' },
        ...focusRing,
        '&:focus-visible': { ...focusRing['&:focus-visible'], outlineOffset: '-2px' }
      }}
    >
      <Box
        aria-hidden='true'
        sx={{
          width: 28,
          height: 28,
          borderRadius: 'md',
          bgcolor: 'background.level2',
          color: 'text.secondary',
          display: 'grid',
          placeItems: 'center'
        }}
      >
        <Icon sx={{ fontSize: 'md' }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography level='title-sm' sx={oneLine}>
          {title}
        </Typography>
        <Typography level='body-xs' sx={{ ...oneLine, color: 'text.tertiary' }}>
          {row.count > 0 ? META[row.kind](t, row, i18n?.language) : t('admin.overview.needs.none')}
        </Typography>
      </Box>
      <Typography component='span' level='h4' sx={{ color: row.count > 0 ? 'text.primary' : 'text.tertiary' }}>
        {row.count}
      </Typography>
      <Typography
        component='span'
        level='body-sm'
        sx={{ display: { xs: 'none', sm: 'inline' }, color: 'primary.plainColor', fontWeight: 'lg', whiteSpace: 'nowrap' }}
      >
        {t(`admin.overview.needs.${row.kind}.go`)}
      </Typography>
    </Box>
  )
}

/** "Needs you · n things" (board A): all four rows, a zero count included. */
export default function NeedsCard({ rows, loading }) {
  const { t } = useTranslation()
  return (
    <AdminCard
      id='overview-needs'
      title={t('admin.overview.needs.title')}
      aside={loading ? null : t('admin.overview.needs.things', { count: needsCount(rows) })}
    >
      {loading ? (
        <LoadingRows label={t('admin.overview.loading')} testId='overview-needs-loading' />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {rows.map((row) => (
            <NeedsRow key={row.kind} row={row} />
          ))}
        </Box>
      )}
    </AdminCard>
  )
}

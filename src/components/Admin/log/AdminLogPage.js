import React from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { Box, Button, Link, Sheet, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { useAdminLog } from '@nowry/core/hooks/useAdminOverview'
import { LOG_KINDS, isLogKind } from '@nowry/core/domain/adminLog'
import { focusRing, oneLine } from '../../Common/Form/formStyles'
import { EmptyRows, FilterChip, LoadError, LoadingRows } from '../AdminListParts'
import { ActionText } from '../overview/OverviewParts'
import { actorText, logLine, logWhenText, reasonText } from '../overview/adminLogText'

const SEP = ' · '
/** Board K's columns: When, Who, What, Reason; at phone width What (with who and why under it), then When. */
const COLUMNS = { xs: 'minmax(0, 1fr) auto', sm: '104px 96px minmax(0, 1fr) 120px' }
const wideOnly = { display: { xs: 'none', sm: 'block' } }
const caption = { level: 'body-xs', sx: { color: 'text.tertiary' } }

/** "Overview › Admin log · kept 24 months" (board K). */
const Crumb = () => {
  const { t } = useTranslation()
  return (
    <Typography component='nav' aria-label={t('admin.log.crumbLabel')} level='body-sm' sx={{ color: 'text.tertiary' }}>
      <Link component={RouterLink} to='/admin/overview' level='body-sm' sx={{ color: 'text.tertiary', ...focusRing }}>
        {t('admin.overview.label')}
      </Link>
      {' › '}
      <Typography component='h2' level='title-sm' aria-current='page' sx={{ display: 'inline', color: 'text.primary' }}>
        {t('admin.log.title')}
      </Typography>
      {SEP}
      {t('admin.log.kept')}
    </Typography>
  )
}

const KindFilters = ({ value, onChange }) => {
  const { t } = useTranslation()
  return (
    <Stack direction='row' gap={1} flexWrap='wrap' role='group' aria-label={t('admin.log.filtersLabel')}>
      {[null, ...LOG_KINDS].map((kind) => (
        <FilterChip key={kind ?? 'all'} on={value === kind} label={t(`admin.log.kinds.${kind ?? 'all'}`)} onClick={() => onChange(kind)} />
      ))}
    </Stack>
  )
}

const HeadRow = () => {
  const { t } = useTranslation()
  return (
    <Box
      role='row'
      sx={{
        display: { xs: 'none', sm: 'grid' },
        gridTemplateColumns: COLUMNS.sm,
        gap: 1.5,
        px: 1.75,
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.level1'
      }}
    >
      {['when', 'who', 'what', 'reason'].map((name) => (
        <Typography key={name} role='columnheader' level='body-xs' sx={{ color: 'text.tertiary', fontWeight: 'lg' }}>
          {t(`admin.log.head.${name}`)}
        </Typography>
      ))}
    </Box>
  )
}

/** One action (board K); at phone width Who and Reason move under What. */
const LogRow = ({ row }) => {
  const { t, i18n } = useTranslation()
  const who = actorText(t, row.actor)
  const why = reasonText(t, row)
  return (
    <Box
      role='row'
      sx={{
        display: 'grid',
        gridTemplateColumns: COLUMNS,
        alignItems: 'center',
        gap: { xs: '2px 10px', sm: 1.5 },
        px: 1.75,
        py: 1.25,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-of-type': { borderBottom: 0 }
      }}
    >
      <Typography role='cell' {...caption} sx={{ ...caption.sx, order: { xs: 2, sm: 0 }, fontVariantNumeric: 'tabular-nums' }}>
        {logWhenText(t, row.at, i18n?.language)}
      </Typography>
      <Typography role='cell' {...caption} sx={{ ...caption.sx, ...oneLine, ...wideOnly }}>
        {who}
      </Typography>
      <Box role='cell' sx={{ minWidth: 0, order: { xs: 1, sm: 0 } }}>
        <Typography level='title-sm' sx={{ overflowWrap: 'anywhere' }}>
          <ActionText line={logLine(t, row)} bold={false} />
        </Typography>
        <Typography {...caption} sx={{ ...caption.sx, ...oneLine, display: { xs: 'block', sm: 'none' } }}>
          {[who, why].filter(Boolean).join(SEP)}
        </Typography>
      </Box>
      <Typography role='cell' {...caption} sx={{ ...caption.sx, ...oneLine, ...wideOnly }}>
        {why}
      </Typography>
    </Box>
  )
}

const LogBody = ({ log, filtered }) => {
  const { t } = useTranslation()
  if (log.error) return <LoadError message={t('admin.log.error')} onRetry={log.retry} />
  const frame = { bgcolor: 'background.surface', borderRadius: 'lg', overflow: 'hidden', minWidth: 0 }
  if (log.loading)
    return (
      <Sheet variant='outlined' sx={frame}>
        <LoadingRows label={t('admin.log.loading')} testId='admin-log-loading' />
      </Sheet>
    )
  if (log.actions.length === 0)
    return (
      <Sheet variant='outlined' sx={frame}>
        <EmptyRows title={t(filtered ? 'admin.log.filterEmpty' : 'admin.log.empty')} />
      </Sheet>
    )
  return (
    <Sheet variant='outlined' role='table' aria-label={t('admin.log.title')} sx={frame}>
      <HeadRow />
      {log.actions.map((row) => (
        <LogRow key={row.id} row={row} />
      ))}
    </Sheet>
  )
}

/**
 * The admin log (ADMIN-007c, FR-011, boards K and L), opened from the
 * Overview's "Full log": every admin action, the script's included, newest
 * first and read-only, filtered by kind (kept in the address as `?kind=`).
 * Show older reads the next page.
 */
export default function AdminLogPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const asked = params.get('kind')
  const kind = isLogKind(asked) ? asked : null
  const log = useAdminLog({ kind: kind ?? undefined })
  const choose = (next) => setParams(next ? { kind: next } : {}, { replace: true })
  return (
    <Stack component='section' gap={1.5} sx={{ minWidth: 0 }}>
      <Crumb />
      <KindFilters value={kind} onChange={choose} />
      <LogBody log={log} filtered={kind !== null} />
      {log.hasOlder && !log.error && (
        <Button
          variant='soft'
          color='neutral'
          size='sm'
          loading={log.loadingOlder}
          onClick={() => log.loadOlder()}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('admin.log.older')}
        </Button>
      )}
    </Stack>
  )
}

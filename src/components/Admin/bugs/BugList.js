import React from 'react'
import { Box, Sheet, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { severityTone } from '@nowry/core/domain/bugReports'
import { focusRing, oneLine } from '../../Common/Form/formStyles'
import { EmptyRows, LoadError, LoadingRows } from '../AdminListParts'
import { ageShort, rowDevice, rowMeta } from './bugText'

/** Board C's columns: the report, severity, device, age; at phone width the report and the dot. */
const COLUMNS = { xs: 'minmax(0, 1fr) auto', sm: 'minmax(0, 2fr) 92px 110px 56px' }
const wideOnly = { display: { xs: 'none', sm: 'block' } }
/** Read, not drawn, at phone width: the dot carries the severity there and the word stays for a screen reader. */
const hiddenOnPhone = {
  position: { xs: 'absolute', sm: 'static' },
  width: { xs: 1, sm: 'auto' },
  height: { xs: 1, sm: 'auto' },
  overflow: { xs: 'hidden', sm: 'visible' },
  clip: { xs: 'rect(0 0 0 0)', sm: 'auto' }
}

/** A severity as a coloured dot and its word (critical danger, high warning, the rest neutral); the word hides on a phone. */
export const Severity = ({ severity }) => {
  const { t } = useTranslation()
  const tone = severityTone(severity)
  return (
    <Box component='span' sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
      <Box
        component='span'
        aria-hidden='true'
        data-tone={tone}
        sx={{ width: 8, height: 8, borderRadius: 'full', flex: 'none', bgcolor: tone === 'neutral' ? 'text.tertiary' : `${tone}.solidBg` }}
      />
      <Typography component='span' level='body-sm' sx={{ color: 'text.secondary', whiteSpace: 'nowrap', ...hiddenOnPhone }}>
        {t(`report.severity.${severity}`)}
      </Typography>
    </Box>
  )
}

const HeadRow = () => {
  const { t } = useTranslation()
  return (
    <Box
      aria-hidden='true'
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
      {['report', 'severity', 'device', 'age'].map((name) => (
        <Typography key={name} level='body-xs' sx={{ color: 'text.tertiary', fontWeight: 'lg' }}>
          {t(`admin.bugs.list.head.${name}`)}
        </Typography>
      ))}
    </Box>
  )
}

/** One report's row (board C); the selected row on the accent's soft ground. */
const BugRow = ({ bug, selected, onSelect }) => {
  const { t, i18n } = useTranslation()
  return (
    <Box
      component='button'
      type='button'
      aria-current={selected ? 'true' : undefined}
      onClick={() => onSelect(bug.id)}
      sx={{
        display: 'grid',
        gridTemplateColumns: COLUMNS,
        alignItems: 'center',
        gap: 1.5,
        width: '100%',
        px: 1.75,
        py: 1.25,
        border: 0,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: selected ? 'primary.softBg' : 'transparent',
        color: 'inherit',
        font: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
        position: 'relative',
        '&:last-of-type': { borderBottom: 0 },
        '&:hover': { bgcolor: selected ? 'primary.softBg' : 'background.level1' },
        ...focusRing,
        '&:focus-visible': { ...focusRing['&:focus-visible'], outlineOffset: '-2px' }
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography level='title-sm' sx={oneLine}>
          {bug.title}
        </Typography>
        <Typography level='body-xs' sx={{ ...oneLine, color: 'text.tertiary' }}>
          {rowMeta(t, bug)}
        </Typography>
      </Box>
      <Severity severity={bug.severity} />
      <Typography level='body-xs' sx={{ ...oneLine, ...wideOnly, color: 'text.tertiary' }}>
        {rowDevice(t, bug)}
      </Typography>
      <Typography level='body-xs' sx={{ ...wideOnly, color: 'text.tertiary', fontVariantNumeric: 'tabular-nums' }}>
        {ageShort(bug.created_at, i18n?.language)}
      </Typography>
    </Box>
  )
}

/**
 * The list (boards C, L): a header row on wider screens and one row per
 * report, newest first as the API sends them; skeleton rows while loading;
 * empty and error say so, the error with Try again.
 */
export default function BugList({ list, selectedId, onSelect }) {
  const { t } = useTranslation()
  if (list.error) return <LoadError message={t('admin.bugs.list.error')} onRetry={list.retry} />
  const frame = { bgcolor: 'background.surface', borderRadius: 'lg', overflow: 'hidden', minWidth: 0 }
  if (list.loading)
    return (
      <Sheet variant='outlined' sx={frame}>
        <LoadingRows label={t('admin.bugs.list.loading')} testId='bugs-loading' />
      </Sheet>
    )
  if (list.bugs.length === 0)
    return (
      <Sheet variant='outlined' sx={frame}>
        <EmptyRows title={t('admin.bugs.list.empty')} />
      </Sheet>
    )
  return (
    <Sheet
      variant='outlined'
      role='group'
      aria-label={t('admin.bugs.list.title')}
      sx={{ ...frame, display: 'flex', flexDirection: 'column' }}
    >
      <HeadRow />
      {list.bugs.map((bug) => (
        <BugRow key={bug.id} bug={bug} selected={bug.id === selectedId} onSelect={onSelect} />
      ))}
    </Sheet>
  )
}

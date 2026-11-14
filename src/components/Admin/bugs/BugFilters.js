import React from 'react'
import { Stack } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { BUG_STATUSES } from '@nowry/core/domain/bugReports'
import { FilterChip } from '../AdminListParts'

/** The filters (board C): New · 3, In progress · 1, Fixed · 14, Won't fix · 2. */
export default function BugFilters({ status, counts, onStatus }) {
  const { t } = useTranslation()
  return (
    <Stack direction='row' gap={0.75} flexWrap='wrap' role='group' aria-label={t('admin.bugs.filters')}>
      {BUG_STATUSES.map((value) => (
        <FilterChip
          key={value}
          on={status === value}
          label={`${t(`admin.bugs.states.${value}`)} · ${counts[value] ?? 0}`}
          onClick={() => onStatus(value)}
        />
      ))}
    </Stack>
  )
}

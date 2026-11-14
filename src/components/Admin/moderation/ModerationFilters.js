import React from 'react'
import { Stack } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { MODERATION_STATES } from '@nowry/core/domain/moderation'
import { FilterChip } from '../AdminListParts'

/** The filters (board B): To review, Kept and Removed, each with its count. */
export default function ModerationFilters({ state, totals, onState }) {
  const { t } = useTranslation()
  return (
    <Stack direction='row' gap={0.75} flexWrap='wrap' role='group' aria-label={t('admin.mod.filters')}>
      {MODERATION_STATES.map((value) => (
        <FilterChip
          key={value}
          on={state === value}
          label={`${t(`admin.mod.states.${value}`)} · ${totals[value] ?? 0}`}
          onClick={() => onState(value)}
        />
      ))}
    </Stack>
  )
}

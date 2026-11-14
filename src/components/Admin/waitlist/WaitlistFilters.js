import React from 'react'
import { Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { WAITLIST_STATES, localeCode } from '@nowry/core/domain/waitlist'
import { INVITE_LOCALES } from '@nowry/core/domain/invitations'
import { FilterChip } from '../AdminListParts'

/**
 * The filters (board E): the four states with their totals, then "Language"
 * with All and the five languages as their codes. One row that wraps.
 */
export default function WaitlistFilters({ state, locale, totals, onState, onLocale }) {
  const { t } = useTranslation()
  return (
    <Stack direction='row' gap={1.5} flexWrap='wrap' alignItems='center' sx={{ minWidth: 0 }}>
      <Stack direction='row' gap={0.75} flexWrap='wrap' role='group' aria-label={t('admin.wl.filters.states')}>
        {WAITLIST_STATES.map((value) => (
          <FilterChip
            key={value}
            on={state === value}
            label={`${t(`admin.wl.states.${value}`)} · ${totals[value] ?? 0}`}
            onClick={() => onState(value)}
          />
        ))}
      </Stack>
      <Stack direction='row' gap={0.75} flexWrap='wrap' alignItems='center' role='group' aria-labelledby='waitlist-language-label'>
        <Typography id='waitlist-language-label' level='body-xs' sx={{ color: 'text.tertiary', mr: 0.25 }}>
          {t('admin.wl.filters.language')}
        </Typography>
        <FilterChip on={locale === null} label={t('admin.wl.filters.allLanguages')} onClick={() => onLocale(null)} />
        {INVITE_LOCALES.map((code) => (
          <FilterChip key={code} on={locale === code} ariaLabel={t(`admin.inv.languages.${code}`)} onClick={() => onLocale(code)}>
            {localeCode(code)}
          </FilterChip>
        ))}
      </Stack>
    </Stack>
  )
}

import React from 'react'
import { useTranslation } from 'react-i18next'
import { FormControl, FormHelperText, FormLabel, Input, Radio, RadioGroup, Skeleton, Stack, Typography } from '@mui/joy'

import { focusRing, formLabel, touchTarget } from '../../Common/Form/formStyles'
import { PACE_DEFAULTS } from '../../../hooks/useDeckSettings'

/**
 * Pace, new cards per day, and the review ceiling (DECKS.md §3.5).
 *
 * Per-field skeletons, never a region gate: this is the one in-scope surface
 * that actually fetches on open, and the shipped file got this right. Each
 * control is skeletoned on its own so the labels stay readable while the
 * values arrive.
 *
 * The numeric inputs clamp at the edge rather than validating — S4 barely
 * applies to a surface where nothing blocks and every field already has a
 * value.
 */
const clamp = (raw, min, max) => Math.max(min, Math.min(max, parseInt(raw, 10) || min))

const DeckStudySection = ({ loading, config, onChange }) => {
  const { t } = useTranslation()

  return (
    <Stack gap={3}>
      <FormControl>
        <FormLabel sx={formLabel}>{t('deckSettings.study.paceMode')}</FormLabel>
        {loading ? (
          <Skeleton variant='rectangular' height={32} sx={{ borderRadius: 'sm' }} />
        ) : (
          <>
            <RadioGroup
              orientation='horizontal'
              value={config.pace_mode}
              onChange={(event) => {
                const mode = event.target.value
                onChange({ ...config, pace_mode: mode, ...PACE_DEFAULTS[mode] })
              }}
              sx={{ gap: 2, flexWrap: 'wrap' }}
            >
              {Object.keys(PACE_DEFAULTS).map((mode) => (
                // The `label` prop, not a bare aria-label: Joy wires it to the
                // <input> that carries the role, which a top-level aria-label
                // would not (§14).
                <Radio key={mode} value={mode} label={t(`deckSettings.pace.${mode}`)} size='sm' sx={{ ...touchTarget, ...focusRing }} />
              ))}
            </RadioGroup>
            <FormHelperText>{t(`deckSettings.pace.${config.pace_mode}Hint`)}</FormHelperText>
          </>
        )}
      </FormControl>

      <FormControl>
        <FormLabel sx={formLabel}>{t('deckSettings.study.newPerDay')}</FormLabel>
        {loading ? (
          <Skeleton variant='rectangular' height={32} sx={{ borderRadius: 'sm' }} />
        ) : (
          <Input
            type='number'
            size='sm'
            value={config.new_per_day ?? 20}
            slotProps={{ input: { min: 1, max: 500 } }}
            endDecorator={
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {t('deckSettings.study.cardsPerDay')}
              </Typography>
            }
            onChange={(event) => onChange({ ...config, new_per_day: clamp(event.target.value, 1, 500) })}
            sx={{ ...touchTarget, ...focusRing }}
          />
        )}
      </FormControl>

      <FormControl>
        <FormLabel sx={formLabel}>{t('deckSettings.study.maxReviews')}</FormLabel>
        {loading ? (
          <Skeleton variant='rectangular' height={32} sx={{ borderRadius: 'sm' }} />
        ) : (
          <Input
            type='number'
            size='sm'
            value={config.max_reviews_per_day ?? 100}
            slotProps={{ input: { min: 1, max: 1000 } }}
            endDecorator={
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {t('deckSettings.study.reviewsPerDay')}
              </Typography>
            }
            onChange={(event) => onChange({ ...config, max_reviews_per_day: clamp(event.target.value, 1, 1000) })}
            sx={{ ...touchTarget, ...focusRing }}
          />
        )}
      </FormControl>
    </Stack>
  )
}

export default DeckStudySection

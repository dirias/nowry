import React from 'react'
import { useTranslation } from 'react-i18next'
import { FormControl, FormHelperText, Input, FormLabel } from '@mui/joy'
import { focusRing } from './goalStyles'

const TITLE_ERROR_ID = 'goal-title-error'

/**
 * The one field a goal cannot be saved without.
 *
 * Save is never disabled for validation: a dead primary action that never
 * explains itself is the same silent dead-end as the bare `return` this
 * replaces, just wearing grey. Instead an empty title fails loudly here —
 * `error` on the control, a reason under the input, and aria-invalid plus
 * aria-describedby so the reason is announced rather than only coloured.
 */
const GoalTitleField = ({ value, onChange, error, autoFocus, inputRef }) => {
  const { t } = useTranslation()

  return (
    <FormControl required error={error}>
      <FormLabel sx={{ fontWeight: 600 }}>{t('annualPlanning.goal.title')}</FormLabel>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('annualPlanning.goal.titlePlaceholder')}
        // Mutually exclusive with the milestone row's focus (§5.2).
        autoFocus={autoFocus}
        size='lg'
        slotProps={{
          input: {
            ref: inputRef,
            'aria-invalid': error || undefined,
            'aria-describedby': error ? TITLE_ERROR_ID : undefined
          }
        }}
        sx={focusRing}
      />
      {error && <FormHelperText id={TITLE_ERROR_ID}>{t('annualPlanning.goal.titleRequired')}</FormHelperText>}
    </FormControl>
  )
}

export default GoalTitleField

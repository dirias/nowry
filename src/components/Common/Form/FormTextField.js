import React from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@mui/joy'

import FormFieldFrame from './FormFieldFrame'
import { focusRing } from './formStyles'

/**
 * FormTextField — one required or optional single-line field.
 *
 * Generalized from the shipped GoalTitleField, which already implemented the
 * whole contract. The point worth restating is what it does NOT do: it is never
 * disabled, and neither is the Save button that reads it. A dead primary action
 * that never explains itself is the same silent dead end as an empty `return`,
 * just wearing grey. An invalid field fails loudly instead — `error` on the
 * control, the reason under the input, and `aria-invalid` plus
 * `aria-describedby` so the reason is announced rather than only coloured.
 *
 * `errorKey` is a translation key, not a rendered string: the state core that
 * decides a field is invalid never sees `t()` (§5.3).
 */
const FormTextField = ({
  labelKey,
  placeholderKey = null,
  helperKey = null,
  errorKey = null,
  value,
  onChange,
  onKeyDown = null,
  required = false,
  size = 'lg',
  type = 'text',
  inputRef = null,
  autoFocus = false,
  endDecorator = null
}) => {
  const { t } = useTranslation()

  return (
    <FormFieldFrame labelKey={labelKey} helperKey={helperKey} errorKey={errorKey} required={required}>
      {({ describedBy, invalid }) => (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown || undefined}
          placeholder={placeholderKey ? t(placeholderKey) : undefined}
          type={type}
          size={size}
          autoFocus={autoFocus}
          endDecorator={endDecorator}
          slotProps={{
            input: {
              ref: inputRef,
              'aria-invalid': invalid,
              'aria-describedby': describedBy
            }
          }}
          sx={focusRing}
        />
      )}
    </FormFieldFrame>
  )
}

export default FormTextField

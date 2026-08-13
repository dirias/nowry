import React from 'react'
import { useTranslation } from 'react-i18next'
import { Textarea } from '@mui/joy'

import FormFieldFrame from './FormFieldFrame'
import { focusRing } from './formStyles'

/**
 * FormTextArea — the multi-line counterpart, same contract.
 *
 * Separate from FormTextField rather than a `multiline` flag on it because the
 * two take different sizing props and Joy exposes the underlying element under
 * a different slot name (`textarea`, not `input`) — which is exactly the sort
 * of detail a surface hand-rolling a FormControl gets wrong, leaving the ref
 * and the aria wiring pointing at nothing.
 *
 * `maxRows` is deliberately unset by default: a card's answer field that stops
 * growing at four rows makes the user scroll inside a box inside a scrolling
 * sheet, which at 375px with a keyboard open is two nested scroll regions in
 * about 200px of viewport.
 */
const FormTextArea = ({
  labelKey,
  placeholderKey = null,
  helperKey = null,
  errorKey = null,
  value,
  onChange,
  required = false,
  minRows = 3,
  maxRows = null,
  textareaRef = null,
  autoFocus = false
}) => {
  const { t } = useTranslation()

  return (
    <FormFieldFrame labelKey={labelKey} helperKey={helperKey} errorKey={errorKey} required={required}>
      {({ describedBy, invalid }) => (
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholderKey ? t(placeholderKey) : undefined}
          minRows={minRows}
          maxRows={maxRows || undefined}
          autoFocus={autoFocus}
          slotProps={{
            textarea: {
              ref: textareaRef,
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

export default FormTextArea

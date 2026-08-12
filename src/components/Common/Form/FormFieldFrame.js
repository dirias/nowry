import React, { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { FormControl, FormHelperText, FormLabel } from '@mui/joy'

import { formLabel } from './formStyles'

/**
 * The accessibility scaffold both field wrappers render.
 *
 * It exists because `aria-invalid` plus `aria-describedby` wired to the
 * helper's id is the single most-forgotten detail in the codebase — five of
 * seven surfaces omit it today, so their validation errors are conveyed by
 * colour alone and a screen-reader user is told nothing. Getting it right once
 * is the whole reason the wrappers exist instead of each surface hand-rolling
 * a FormControl.
 *
 * Internal to the form system: surfaces use FormTextField / FormTextArea.
 * `children` is called with the ids to hang on the control.
 */
const FormFieldFrame = ({ labelKey, helperKey = null, errorKey = null, required = false, children }) => {
  const { t } = useTranslation()
  const id = useId()
  const messageId = `form-field-message-${id}`
  const messageKey = errorKey || helperKey

  return (
    <FormControl required={required} error={Boolean(errorKey)}>
      {/* Sentence case, never uppercase — a form label is read, not shouted. */}
      <FormLabel sx={formLabel}>{t(labelKey)}</FormLabel>
      {children({
        describedBy: messageKey ? messageId : undefined,
        invalid: errorKey ? true : undefined
      })}
      {messageKey && <FormHelperText id={messageId}>{t(messageKey)}</FormHelperText>}
    </FormControl>
  )
}

export default FormFieldFrame

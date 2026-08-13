import React, { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, FormControl, FormHelperText, FormLabel, Link, Textarea } from '@mui/joy'

import { focusRing, formLabel } from '../../Common/Form/formStyles'

/**
 * The Mermaid source field.
 *
 * Not `FormTextArea`, for two reasons that are specific to this one field: the
 * text is code and must be monospaced, and the syntax reference belongs in the
 * label row. It replaces "Use Mermaid syntax to create diagrams" — a helper
 * sentence that restated the label it sat under — while keeping the link,
 * which was the only part of it carrying information.
 */
const VisualCodeField = ({ value, onChange, errorKey, textareaRef }) => {
  const { t } = useTranslation()
  const id = useId()
  const messageId = `visual-code-message-${id}`

  return (
    <FormControl required error={Boolean(errorKey)} sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
        <FormLabel sx={formLabel}>{t('cards.visual.codeLabel')}</FormLabel>
        <Link href='https://mermaid.js.org/' target='_blank' rel='noopener noreferrer' level='body-xs' sx={{ flexShrink: 0, ...focusRing }}>
          {t('cards.visual.mermaidLink')}
        </Link>
      </Box>

      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('cards.visual.codePlaceholder')}
        minRows={8}
        maxRows={16}
        slotProps={{
          textarea: {
            ref: textareaRef,
            'aria-invalid': errorKey ? true : undefined,
            'aria-describedby': errorKey ? messageId : undefined
          }
        }}
        sx={{ fontFamily: 'code', fontSize: 'sm', ...focusRing }}
      />

      {errorKey && <FormHelperText id={messageId}>{t(errorKey)}</FormHelperText>}
    </FormControl>
  )
}

export default VisualCodeField

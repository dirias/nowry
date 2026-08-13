import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AspectRatio, Input, Typography } from '@mui/joy'

import FormFieldFrame from './FormFieldFrame'
import { focusRing } from './formStyles'

/**
 * FormImageField — an image URL with a preview above it.
 *
 * The goal form shipped this behaviour in `GoalImageField` and the migration
 * ruling kept it feature-local until a second surface needed it (UX-CONTRACT
 * §7.1). Deck creation and deck settings are that second and third surface, so
 * the behaviour moves here rather than being typed a third time.
 *
 * Two decisions carried over unchanged, because both are right:
 *
 * - **No skeleton over the preview.** An absent image is not a pending one, and
 *   a skeleton would invent a wait for a field that is usually empty.
 * - **A broken URL gets a sentence, not a browser glyph.** `image_url` is
 *   `Optional[str]` server-side, so there is nothing useful to validate before
 *   sending; the only honest signal is whether the image actually loaded.
 *
 * When there is no URL there is no preview element at all — no reserved box,
 * no placeholder frame (§6.2).
 */
const FormImageField = ({ labelKey, placeholderKey, altKey, errorMessageKey, value = '', onChange, inputRef = null }) => {
  const { t } = useTranslation()
  const [broken, setBroken] = useState(false)

  // A new URL deserves a fresh attempt.
  useEffect(() => setBroken(false), [value])

  return (
    <FormFieldFrame labelKey={labelKey}>
      {({ describedBy }) => (
        <>
          {value && !broken && (
            <AspectRatio
              ratio='16/9'
              objectFit='cover'
              sx={{ mb: 1.5, borderRadius: 'md', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}
            >
              <img src={value} alt={t(altKey)} loading='lazy' onError={() => setBroken(true)} />
            </AspectRatio>
          )}

          {value && broken && (
            <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 1 }}>
              {t(errorMessageKey)}
            </Typography>
          )}

          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={t(placeholderKey)}
            slotProps={{ input: { ref: inputRef, 'aria-describedby': describedBy } }}
            sx={focusRing}
          />
        </>
      )}
    </FormFieldFrame>
  )
}

export default FormImageField

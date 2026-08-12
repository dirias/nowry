import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AspectRatio, FormControl, FormLabel, Input, Typography } from '@mui/joy'
import { focusRing } from './goalStyles'

/**
 * The goal form's optional image: preview above the URL input, per §8.6.
 *
 * Goal.image_url is Optional[str], not HttpUrl, so the server accepts anything
 * and there is nothing useful to validate client-side. A URL that does not
 * resolve gets a sentence rather than a browser's broken-image glyph, which is
 * not an error state.
 *
 * No Skeleton over the preview: an absent image is not a pending one.
 */
const GoalImageField = ({ value, onChange, inputRef }) => {
  const { t } = useTranslation()
  const [broken, setBroken] = useState(false)

  // A new URL deserves a fresh attempt.
  useEffect(() => setBroken(false), [value])

  return (
    <FormControl>
      <FormLabel sx={{ fontWeight: 600 }}>{t('annualPlanning.goal.imageUrl')}</FormLabel>
      <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 1 }}>
        {t('annualPlanning.goal.imageHelper')}
      </Typography>

      {value && !broken && (
        <AspectRatio
          ratio='16/9'
          objectFit='cover'
          sx={{ mb: 2, borderRadius: 'md', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}
        >
          <img src={value} alt={t('annualPlanning.goal.imagePreviewAlt')} loading='lazy' onError={() => setBroken(true)} />
        </AspectRatio>
      )}

      {value && broken && (
        <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 1 }}>
          {t('annualPlanning.goal.imagePreviewError')}
        </Typography>
      )}

      <Input
        placeholder={t('annualPlanning.goal.imageUrlPlaceholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        slotProps={{ input: { ref: inputRef } }}
        sx={focusRing}
      />
    </FormControl>
  )
}

export default GoalImageField

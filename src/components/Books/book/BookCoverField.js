import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SketchPicker } from 'react-color'
import { Box, FormLabel, IconButton, RadioGroup, Stack, Tooltip } from '@mui/joy'
import { Palette as PaletteIcon } from '@mui/icons-material'

import FormImageField from '../../Common/Form/FormImageField'
import { focusRing, formLabel } from '../../Common/Form/formStyles'
import useIsMobile from '../../../hooks/useIsMobile'
import BookCoverSwatch from './BookCoverSwatch'

/**
 * The cover group: eight preset colours, an arbitrary-colour picker, and an
 * image URL. One rail chip opens all three, because they are three ways to do
 * one thing and asking which mechanism the user wants before they know what
 * they want is the wrong question (BOOKS.md §3.5).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PRESET_COLORS is raw hex ON PURPOSE, and it is the only hex permitted in the
 * books form files. These are not styling constants: a cover colour is content
 * the user chose. It is stored as a hex string on the book document and
 * rendered straight back by `Book.js`, `SketchPicker` already lets the user
 * store any hex in the spectrum, and the value has no light or dark variant. A
 * semantic token here would be actively wrong — it would repaint the user's
 * book cover when they switched theme.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const PRESET_COLORS = [
  { hex: '#0B6BCB', nameKey: 'books.coverColors.blue' },
  { hex: '#C41C1C', nameKey: 'books.coverColors.red' },
  { hex: '#1F7A1F', nameKey: 'books.coverColors.green' },
  { hex: '#9A5B13', nameKey: 'books.coverColors.orange' },
  { hex: '#6523cf', nameKey: 'books.coverColors.purple' },
  { hex: '#c41c88', nameKey: 'books.coverColors.pink' },
  { hex: '#000000', nameKey: 'books.coverColors.black' },
  { hex: '#555555', nameKey: 'books.coverColors.grey' }
]

const BookCoverField = ({ color, onColorChange, imageUrl, onImageChange, inputRef = null }) => {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [pickerOpen, setPickerOpen] = useState(false)

  const closePicker = useCallback(() => setPickerOpen(false), [])

  // The dismissal overlay this replaced was a fixed full-screen Box with an
  // onClick and no keyboard route out, so a keyboard user who opened the picker
  // was stuck in it.
  useEffect(() => {
    if (!pickerOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closePicker()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [pickerOpen, closePicker])

  const picker = <SketchPicker color={color} onChangeComplete={(picked) => onColorChange(picked.hex)} />

  return (
    <Stack spacing={2}>
      <Box>
        {/* The palette trigger used to live *inside* this label, which made the
            label a mixed text-and-control row. It sits with the swatches now,
            where it acts. */}
        <FormLabel sx={{ ...formLabel, mb: 1 }}>{t('books.coverColorLabel')}</FormLabel>

        <Stack direction='row' spacing={0} flexWrap='wrap' useFlexGap sx={{ gap: 1, alignItems: 'center' }}>
          <RadioGroup
            orientation='horizontal'
            aria-label={t('books.coverColorLabel')}
            value={color}
            onChange={(event) => onColorChange(event.target.value)}
            sx={{ flexWrap: 'wrap', gap: 1, m: 0 }}
          >
            {PRESET_COLORS.map(({ hex, nameKey }) => (
              <BookCoverSwatch key={hex} hex={hex} nameKey={nameKey} selected={color === hex} />
            ))}
          </RadioGroup>

          <Tooltip title={t('books.customColor')}>
            <IconButton
              aria-label={t('books.customColor')}
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen((open) => !open)}
              variant='soft'
              color='neutral'
              sx={{ minWidth: { xs: 44, sm: 36 }, minHeight: { xs: 44, sm: 36 }, ...focusRing }}
            >
              <PaletteIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* At `xs` the picker renders in the flow. Absolutely positioned at
            `left: 0` inside a swatch row, it overflowed a 375px viewport. */}
        {pickerOpen &&
          (isMobile ? (
            <Box sx={{ mt: 1.5 }}>{picker}</Box>
          ) : (
            <Box sx={{ position: 'relative' }}>
              <Box sx={{ position: 'absolute', zIndex: 10, top: 0, left: 0, mt: 1 }}>{picker}</Box>
            </Box>
          ))}
      </Box>

      <FormImageField
        labelKey='books.coverImageLabel'
        placeholderKey='books.coverImagePlaceholder'
        altKey='books.coverImageAlt'
        errorMessageKey='books.coverImageError'
        value={imageUrl}
        onChange={onImageChange}
        inputRef={inputRef}
      />
    </Stack>
  )
}

export default BookCoverField

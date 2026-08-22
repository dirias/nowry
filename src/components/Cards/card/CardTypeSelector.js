import React, { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Radio, RadioGroup, Stack, Typography } from '@mui/joy'

import { focusRing, formLabel, touchTarget } from '../../Common/Form/formStyles'
import { CARD_TYPES, accentColorFor, iconFor, specFor } from './cardTypes'

/**
 * Choosing what kind of card this is, from inside the sheet (CARDS.md §4.4).
 *
 * Today the type is decided before the modal opens and cannot be changed
 * without closing it — the shell was per-type, so it could not outlive the
 * choice. Now that one shell renders all three bodies, the choice is a control
 * rather than a commitment.
 *
 * Add mode only. Changing a card's type after it exists would mean discarding
 * fields with no counterpart — a quiz card's options have no flashcard
 * equivalent — so edit mode shows the type as a static label instead, in the
 * sheet's subtitle.
 *
 * A real `RadioGroup`, not three `<Box onClick>`: the segmented look is styling
 * on top of controls that are already keyboard-operable and already announce
 * as a set. The group's accessible name comes from `aria-labelledby` pointing
 * at the visible caption above it, so there is no separate aria-only string to
 * drift out of sync with what sighted users read.
 *
 * `variant='plain'` `color='neutral'` on every `Radio`: Joy defaults an
 * unadorned `Radio` to `variant='outlined'`, which paints its own border on
 * top of the segmented pill's shared background — three boxes instead of one
 * cohesive control. `plain` removes that border so only the checked segment's
 * `background.surface` + `boxShadow: 'sm'` (via the `action` slot) reads as
 * "on".
 *
 * `[data-checked]` is not a thing in this Joy UI version (5.0.0-beta.52) —
 * checked state is carried by a `Mui-checked` class, not a data attribute.
 * Checked state is instead computed as `value === type` in the map closure
 * and used directly for text color/weight, which also sidesteps depending on
 * an undocumented internal class name.
 *
 * Deliberately NOT `overlay`. Joy's `overlay` drops `position: relative` from
 * the Radio root so the action escapes to the nearest positioned ancestor —
 * the pattern for a radio that covers a Card. Inside FormSheet that ancestor
 * is the ModalDialog, so the checked segment's `background.surface` painted an
 * opaque 700x624 sheet at `z-index: 1` over the whole form: header, fields and
 * footer all still in the DOM and all behind it. Without `overlay` the action
 * is inset against the Radio's own root, which already spans label and all —
 * the same hit area and focus ring, sized to the segment.
 */
const CardTypeSelector = ({ value, onChange }) => {
  const { t } = useTranslation()
  const baseId = useId()
  const captionId = `${baseId}-caption`

  return (
    <Box>
      <Typography id={captionId} level='body-sm' sx={{ ...formLabel, color: 'text.secondary', mb: 1 }}>
        {t('cards.common.typeSelectorAria')}
      </Typography>

      <RadioGroup
        orientation='horizontal'
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-labelledby={captionId}
        sx={{
          display: 'inline-flex',
          width: 'fit-content',
          maxWidth: '100%',
          bgcolor: 'background.level1',
          borderRadius: 'lg',
          p: 0.25,
          gap: 0.25
        }}
      >
        {CARD_TYPES.map((type) => {
          const isChecked = value === type
          const TypeIcon = iconFor(type)

          return (
            <Radio
              key={type}
              value={type}
              variant='plain'
              color='neutral'
              disableIcon
              size='sm'
              label={
                <Stack direction='row' spacing={0.5} alignItems='center'>
                  {/* Icon color is type identity, not a selection signal — it
                      stays on regardless of `isChecked`. */}
                  <TypeIcon sx={{ fontSize: 16, color: accentColorFor(type) }} />
                  <Typography sx={{ fontSize: 'inherit', fontWeight: 'inherit' }}>{t(specFor(type).nameKey)}</Typography>
                </Stack>
              }
              slotProps={{
                action: ({ checked }) => ({
                  sx: {
                    borderRadius: 'md',
                    transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
                    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                    // Hover feedback only makes sense on a segment that isn't
                    // already elevated as the checked one.
                    ...(checked ? { bgcolor: 'background.surface', boxShadow: 'sm' } : { '&:hover': { bgcolor: 'background.level2' } })
                  }
                })
              }}
              sx={{
                justifyContent: 'center',
                alignItems: 'center',
                px: 1.5,
                // `touchTarget`: ≥44px at xs per WCAG 2.5.5 (a segmented control is
                // still a three-target row on a 375px screen), relaxing to a
                // compact 32px once a mouse/trackpad's precision is available —
                // this row should read as a mode-switcher, not a primary decision.
                ...touchTarget,
                fontWeight: isChecked ? 600 : 500,
                color: isChecked ? 'text.primary' : 'text.secondary',
                ...focusRing
              }}
            />
          )
        })}
      </RadioGroup>
    </Box>
  )
}

export default CardTypeSelector

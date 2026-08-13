import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Radio } from '@mui/joy'
import { Check as CheckIcon } from '@mui/icons-material'

import { focusRing } from '../../Common/Form/formStyles'

/**
 * One cover colour, as a real radio.
 *
 * The eight swatches used to be `<Box onClick>` with no role, no tabIndex, no
 * key handling and no accessible name, so a keyboard user could not choose a
 * cover colour at all and a screen-reader user could not perceive that eight
 * choices existed. Nothing here hand-rolls arrow keys: a Joy `Radio` inside a
 * `RadioGroup` is a native same-name radio group, and the browser supplies
 * roving tabIndex and arrow-key movement for those.
 *
 * The colour is not the only signal. A selected swatch carries an outline and a
 * check mark, and its name is announced — which matters most to the users a
 * bare colour tells nothing.
 */
const BookCoverSwatch = ({ hex, nameKey, selected }) => {
  const { t } = useTranslation()

  return (
    <Radio
      value={hex}
      // The circle would sit beside the swatch saying the same thing twice.
      disableIcon
      // `overlay` stretches the action over the whole swatch, so the hit area
      // and the focus ring are the 44px square the user sees rather than the
      // hidden icon's box.
      overlay
      variant='plain'
      slotProps={{
        input: { 'aria-label': t(nameKey) },
        // Joy marks the action, not the input, so the ring hangs off its class
        // rather than off `:focus-visible` on an element that never focuses.
        action: {
          sx: {
            borderRadius: 'sm',
            '&.Joy-focusVisible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
          }
        }
      }}
      label={
        <Box
          sx={{
            // ≥44px at `xs` per WCAG 2.5.5; the swatches were 36px everywhere.
            width: { xs: 44, sm: 36 },
            height: { xs: 44, sm: 36 },
            borderRadius: 'sm',
            // The one hex in this file, and it is content — see BookCoverField.
            bgcolor: hex,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            outline: selected ? '2px solid' : 'none',
            outlineColor: 'primary.outlinedBorder',
            outlineOffset: '2px',
            // Motion is an accessibility setting, not a taste. The hover
            // `scale(1.1)` that used to live here is gone outright: it never
            // fired on touch, and selected state is never conveyed by hover.
            '@media (prefers-reduced-motion: no-preference)': { transition: 'outline-color 0.15s' }
          }}
        >
          {selected && <CheckIcon sx={{ fontSize: 18, color: 'common.white' }} />}
        </Box>
      }
    />
  )
}

export default BookCoverSwatch

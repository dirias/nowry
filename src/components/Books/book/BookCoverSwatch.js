import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Radio } from '@mui/joy'
import { Check as CheckIcon } from '@mui/icons-material'

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
 *
 * Deliberately NOT `overlay`, and the comment that used to justify it here had
 * the mechanism backwards. Joy's `overlay` sets the Radio root to
 * `position: initial`, which does not stretch the action over the swatch — it
 * makes the action, which is `position: absolute` inset to its containing
 * block, resolve that block against the nearest *positioned* ancestor instead.
 * Inside FormSheet that is the sheet itself, so all eight actions became one
 * stacked 1280x900 rectangle over the entire form. They carry no background, so
 * nothing looked wrong; the sheet was simply inert. Measured in Chrome before
 * the fix, `elementFromPoint` at the centre of Close, the title input, every
 * rail chip, Publish, Cancel and Save returned `INPUT.MuiRadio-input`, and
 * clicking Save chose a cover colour.
 *
 * Without `overlay` the root is `position: relative` and the action insets to
 * it. That costs nothing here: the root is `display: inline-flex`, the action
 * is out of flow and `disableIcon` makes the radio slot `display: contents`, so
 * the root's only in-flow child is the label — it is already exactly the
 * 44/36px square below, and the action is now exactly that square too. The
 * focus ring is strictly better placed, not worse: `overlay` had been drawing
 * it around the whole sheet.
 */
const BookCoverSwatch = ({ hex, nameKey, selected }) => {
  const { t } = useTranslation()

  return (
    <Radio
      value={hex}
      // The circle would sit beside the swatch saying the same thing twice.
      disableIcon
      variant='plain'
      slotProps={{
        input: { 'aria-label': t(nameKey) },
        // Joy marks the action, not the input, so the ring hangs off its class
        // rather than off `:focus-visible` on an element that never focuses.
        //
        // The selector is `Mui-focusVisible`. This rule used to say
        // `Joy-focusVisible`, which is not a class Joy emits — so it matched
        // nothing and the house colour never applied; what the user actually
        // saw was Joy's own `theme.focus.selector` default underneath it. The
        // shell test asserted the declaration and passed the whole time,
        // because reading a rule out of Emotion says nothing about whether the
        // rule ever selects an element. The class and the native pseudo-class
        // are both listed, matching Joy's own `theme.focus.selector`, so this
        // holds whichever route marks the slot.
        action: {
          sx: {
            borderRadius: 'sm',
            '&.Mui-focusVisible, &:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.outlinedBorder',
              outlineOffset: '2px'
            }
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

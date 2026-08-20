import React from 'react'
import { useTranslation } from 'react-i18next'
import { Radio, RadioGroup } from '@mui/joy'

import { focusRing, touchTarget } from '../../Common/Form/formStyles'
import { CARD_TYPES, specFor } from './cardTypes'

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
 * as a set. The visible label is the accessible name, so there is no
 * competing aria-label to drift from it.
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

  return (
    <RadioGroup
      orientation='horizontal'
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={t('cards.common.typeSelectorAria')}
      sx={{ bgcolor: 'background.level1', borderRadius: 'lg', p: 0.25, gap: 0.25 }}
    >
      {CARD_TYPES.map((type) => (
        <Radio
          key={type}
          value={type}
          disableIcon
          size='sm'
          label={t(specFor(type).nameKey)}
          slotProps={{
            action: ({ checked }) => ({
              sx: {
                borderRadius: 'md',
                ...(checked ? { bgcolor: 'background.surface', boxShadow: 'sm' } : {})
              }
            })
          }}
          sx={{
            flex: 1,
            justifyContent: 'center',
            // `touchTarget`: ≥44px at xs per WCAG 2.5.5 (a segmented control is
            // still a three-target row on a 375px screen), relaxing to a
            // compact 32px once a mouse/trackpad's precision is available —
            // this row should read as a mode-switcher, not a primary decision.
            ...touchTarget,
            fontWeight: 500,
            ...focusRing
          }}
        />
      ))}
    </RadioGroup>
  )
}

export default CardTypeSelector

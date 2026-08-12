import React from 'react'
import { useTranslation } from 'react-i18next'
import { Radio, RadioGroup } from '@mui/joy'

import { focusRing } from '../../Common/Form/formStyles'
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
 */
const CardTypeSelector = ({ value, onChange }) => {
  const { t } = useTranslation()

  return (
    <RadioGroup
      orientation='horizontal'
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={t('cards.common.typeSelectorAria')}
      sx={{ bgcolor: 'background.level1', borderRadius: 'xl', p: 0.5, gap: 0.5 }}
    >
      {CARD_TYPES.map((type) => (
        <Radio
          key={type}
          value={type}
          disableIcon
          overlay
          label={t(specFor(type).nameKey)}
          slotProps={{
            action: ({ checked }) => ({
              sx: {
                borderRadius: 'lg',
                ...(checked ? { bgcolor: 'background.surface', boxShadow: 'sm' } : {})
              }
            })
          }}
          sx={{
            flex: 1,
            justifyContent: 'center',
            // ≥44px at xs per WCAG 2.5.5; a segmented control is still a
            // three-target row on a 375px screen.
            minHeight: 44,
            fontWeight: 500,
            ...focusRing
          }}
        />
      ))}
    </RadioGroup>
  )
}

export default CardTypeSelector

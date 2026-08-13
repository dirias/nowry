import React from 'react'
import { useTranslation } from 'react-i18next'
import { Option, Select } from '@mui/joy'

import FormFieldFrame from './FormFieldFrame'
import { extractDeckId } from './formUtils'
import { focusRing, touchTarget } from './formStyles'

/**
 * FormDeckSelect — choose the deck a card belongs to.
 *
 * The same Select, the same `decks.map`, and the same `deck._id || deck.id`
 * fallback appear in all three card modals, alongside three copies of a
 * ten-line unwrap for a `deck_id` that arrives populated on some responses and
 * as a bare string on others. Both live in one place now — the unwrap in
 * `extractDeckId`, the control here.
 *
 * Fetches nothing. `decks` is already loaded by the caller, so there is no
 * loading state to invent (§10); an empty list is a real state and says so
 * rather than rendering a control with nothing behind it.
 *
 * Note for a later pass: `components/Cards/SaveToDeck/SaveToDeckStep.js` picks
 * decks too, but it is untracked work in progress with its own create-a-deck
 * flow and a different data source, so it is deliberately not touched here.
 */
const FormDeckSelect = ({
  decks = [],
  value,
  onChange,
  labelKey = 'form.deckLabel',
  placeholderKey = 'form.deckPlaceholder',
  allowNone = true,
  selectRef = null
}) => {
  const { t } = useTranslation()
  const selected = extractDeckId(value)

  return (
    <FormFieldFrame labelKey={labelKey} helperKey={decks.length === 0 ? 'form.deckEmpty' : null}>
      {({ describedBy }) => (
        <Select
          // `null`, not `''`: Joy shows the placeholder only for a null value,
          // and `''` would render as a blank trigger with no prompt at all.
          value={selected || null}
          onChange={(_event, next) => onChange(next || '')}
          placeholder={t(placeholderKey)}
          slotProps={{
            button: { ref: selectRef, 'aria-describedby': describedBy },
            listbox: { sx: { zIndex: 'modal' } }
          }}
          sx={{ ...touchTarget, ...focusRing }}
        >
          {/* Clearing a deck returns the control to its prompt, which is the
              honest rendering of "this card belongs to no deck". The option's
              value is '' rather than null because Joy's Option requires a
              non-null value and warns on one. */}
          {allowNone && (
            <Option value='' sx={touchTarget}>
              {t('form.deckNone')}
            </Option>
          )}
          {decks.map((deck) => (
            <Option key={extractDeckId(deck)} value={extractDeckId(deck)} sx={touchTarget}>
              {deck.name}
            </Option>
          ))}
        </Select>
      )}
    </FormFieldFrame>
  )
}

export default FormDeckSelect

import React from 'react'

import FormDeckSelect from '../../Common/Form/FormDeckSelect'
import FormDisclosureRail from '../../Common/Form/FormDisclosureRail'
import FormTagInput from '../../Common/Form/FormTagInput'
import { RAIL_LABELS } from './cardTypes'

/**
 * The tail every card body ends with: the two optional groups all three
 * variants share, then the chips for whatever is still collapsed.
 *
 * Three modals each hand-rolled a tags input and a deck Select — the same
 * twelve-line block, three times, drifting apart on every fix. Type-specific
 * optional groups (a quiz explanation, a visual description) render *above*
 * this, in the body, so the chip row stays last: a revealed group is content,
 * and content outranks an offer.
 */
const CardDetailRail = ({ values, setField, revealed, availableChips, onReveal, decks, tagInputRef }) => (
  <>
    {revealed.has('tags') && <FormTagInput ref={tagInputRef} value={values.tags} onChange={(tags) => setField('tags', tags)} />}

    {revealed.has('deck') && <FormDeckSelect decks={decks} value={values.deckId} onChange={(deckId) => setField('deckId', deckId)} />}

    <FormDisclosureRail available={availableChips} labels={RAIL_LABELS} onReveal={onReveal} />
  </>
)

export default CardDetailRail

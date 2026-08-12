import React from 'react'
import { Stack } from '@mui/joy'

import FormTextArea from '../../Common/Form/FormTextArea'
import CardDetailRail from './CardDetailRail'

/**
 * Variant B — the paired required fields (UX-CONTRACT §3, CARDS.md §4.1).
 *
 * Five elements at rest: header, front, back, rail, footer. Both halves show
 * because the pair *is* the object — there is no one-field save state to
 * protect, and hiding half of it behind a chip would be pretending otherwise.
 *
 * The two uppercase letter-spaced pseudo-labels this replaces were custom
 * Typography reimplementing FormLabel, and were inconsistent besides: the two
 * required fields got labels and the two optional ones got none.
 */
const FlashcardFields = ({ values, setField, errors, revealed, availableChips, onReveal, decks, refFor, tagInputRef }) => (
  <Stack spacing={2.5}>
    <FormTextArea
      labelKey='cards.flashcard.frontLabel'
      placeholderKey='cards.flashcard.frontPlaceholder'
      value={values.title}
      onChange={(value) => setField('title', value)}
      errorKey={errors.title}
      required
      minRows={2}
      // Declarative, not a post-mount .focus(): Joy's Drawer and Modal run a
      // focus trap on open that re-claims focus from any timeout we schedule,
      // but honour autoFocus on an element already inside the trap.
      autoFocus
      textareaRef={refFor('title')}
    />

    <FormTextArea
      labelKey='cards.flashcard.backLabel'
      placeholderKey='cards.flashcard.backPlaceholder'
      value={values.content}
      onChange={(value) => setField('content', value)}
      errorKey={errors.content}
      required
      minRows={3}
      textareaRef={refFor('content')}
    />

    <CardDetailRail
      values={values}
      setField={setField}
      revealed={revealed}
      availableChips={availableChips}
      onReveal={onReveal}
      decks={decks}
      tagInputRef={tagInputRef}
    />
  </Stack>
)

export default FlashcardFields

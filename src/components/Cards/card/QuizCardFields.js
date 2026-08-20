import React from 'react'
import { Stack } from '@mui/joy'

import FormTextArea from '../../Common/Form/FormTextArea'
import CardDetailRail from './CardDetailRail'
import QuizOptionList from './QuizOptionList'

/**
 * Variant C — a stem, N peers, and exactly one peer designated
 * (UX-CONTRACT §3, CARDS.md §4.2).
 *
 * The peer list is required, so it renders at rest and never joins the rail.
 * Only the explanation is an offer.
 *
 * The group error is addressed by field name rather than by position:
 * `errors.options` is "fewer than two", `errors.correctIndex` is "none
 * designated". Two names means each clears when the user fixes *that* thing,
 * and each has its own focus target (§8.3).
 */
const QuizCardFields = ({ values, setField, errors, revealed, availableChips, onReveal, decks, refFor, tagInputRef, tagSuggestions }) => (
  <Stack spacing={2.5}>
    <FormTextArea
      labelKey='cards.quiz.questionLabel'
      placeholderKey='cards.quiz.questionPlaceholder'
      value={values.title}
      onChange={(value) => setField('title', value)}
      errorKey={errors.title}
      required
      minRows={2}
      autoFocus
      textareaRef={refFor('title')}
    />

    <QuizOptionList
      options={values.options}
      correctIndex={values.correctIndex}
      setOptions={(options) => setField('options', options)}
      setCorrectIndex={(index) => setField('correctIndex', index)}
      errorKey={errors.options || errors.correctIndex}
      groupRef={refFor('correctIndex')}
      optionsRef={refFor('options')}
    />

    {revealed.has('explanation') && (
      <FormTextArea
        labelKey='cards.quiz.explanationLabel'
        placeholderKey='cards.quiz.explanationPlaceholder'
        value={values.explanation}
        onChange={(value) => setField('explanation', value)}
        minRows={2}
        textareaRef={refFor('explanation')}
      />
    )}

    <CardDetailRail
      values={values}
      setField={setField}
      revealed={revealed}
      availableChips={availableChips}
      onReveal={onReveal}
      decks={decks}
      tagInputRef={tagInputRef}
      tagSuggestions={tagSuggestions}
      refFor={refFor}
    />
  </Stack>
)

export default QuizCardFields

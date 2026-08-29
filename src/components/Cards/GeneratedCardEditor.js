import React, { useRef } from 'react'
import { Button, Stack } from '@mui/joy'
import { useTranslation } from 'react-i18next'

import FormTextArea from '../Common/Form/FormTextArea'
import { focusRing } from '../Common/Form/formStyles'

/**
 * The in-place editor for one generated card (CURATE-003).
 *
 * Not a second dialog. `CreateCardModal.js` already records why this codebase
 * does not stack sheets, and a nested modal to fix a typo is heavier than the
 * typo (PRD A2).
 *
 * Edits write through to the curation model on every keystroke instead of being
 * held here and handed back on commit. One source of truth is what lets the
 * edited marking and the incomplete-card check read exactly the text the save
 * path will write. The cost is that "cancel" needs somewhere to put the old
 * text back from — `openedWith` below, captured once when the editor mounts.
 *
 * Nothing here touches the API. Curation is local until the deck step, which
 * remains the only writer (PRD A4).
 */
export default function GeneratedCardEditor({ entry, autoFocusField = 'title', onChangeField, onDone, onDoneNext, onCancel, onDiscard }) {
  const { t } = useTranslation()

  // The text as it stood when the editor opened. A ref, not state: it must not
  // move as the user types, and nothing renders from it.
  const openedWith = useRef({ title: entry.title, content: entry.content })

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      // The dialog above us closes on Escape. Without this, cancelling an edit
      // would throw away the entire batch — every card, not just this one.
      event.stopPropagation()
      onCancel(openedWith.current)
      return
    }
    // Commit and carry straight on to the next card, so working through a batch
    // never needs the pointer (CURATE-005).
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      onDoneNext()
    }
  }

  return (
    <Stack spacing={2} sx={{ p: 2 }} onKeyDown={handleKeyDown}>
      <FormTextArea
        labelKey='cards.flashcard.frontLabel'
        placeholderKey='cards.flashcard.frontPlaceholder'
        value={entry.title}
        onChange={(value) => onChangeField('title', value)}
        errorKey={entry.title.trim() ? null : 'cards.flashcard.frontRequired'}
        minRows={2}
        // Declarative rather than a post-mount .focus(): the dialog runs a focus
        // trap that re-claims focus from anything scheduled on a timeout, but
        // honours autoFocus on an element already inside the trap.
        autoFocus={autoFocusField === 'title'}
      />

      <FormTextArea
        labelKey='cards.flashcard.backLabel'
        placeholderKey='cards.flashcard.backPlaceholder'
        value={entry.content}
        onChange={(value) => onChangeField('content', value)}
        errorKey={entry.content.trim() ? null : 'cards.flashcard.backRequired'}
        minRows={3}
        autoFocus={autoFocusField === 'content'}
      />

      <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
        <Button size='sm' variant='solid' color='primary' onClick={onDone} sx={focusRing}>
          {t('cards.generatedCards.doneEditing')}
        </Button>
        <Button size='sm' variant='plain' color='neutral' onClick={() => onCancel(openedWith.current)} sx={focusRing}>
          {t('common.cancel')}
        </Button>
        <Button
          size='sm'
          variant='plain'
          color='danger'
          onClick={onDiscard}
          aria-label={t('cards.generatedCards.discardCardAria', { title: entry.title })}
          sx={{ ml: 'auto', ...focusRing }}
        >
          {t('cards.generatedCards.discardCard')}
        </Button>
      </Stack>
    </Stack>
  )
}

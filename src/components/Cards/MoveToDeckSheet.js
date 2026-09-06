import React, { useState } from 'react'
import { Button, Stack } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import FormSheet from '../Common/Form/FormSheet'
import FormDeckSelect from '../Common/Form/FormDeckSelect'
import { focusRing } from '../Common/Form/formStyles'

/**
 * Move N cards to a deck (PRD D16, US-009): the shared sheet, the shared deck
 * picker, one solid that says its number. Used by the selection bar and by a
 * row's Move to… alike — the count is the only thing that differs.
 *
 * Nothing is chosen until the user chooses; the key stays disabled until then
 * because "move to no deck" is not a move (BUTTONS.md §4 allows disabling
 * for a genuinely unavailable action).
 */
export default function MoveToDeckSheet({ open, count = 0, decks = [], onClose, onMove, pending = false }) {
  const { t } = useTranslation()
  const [deckId, setDeckId] = useState('')

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      width='simple'
      titleKey='cards.move.title'
      titleValues={{ count }}
      footer={
        <Stack direction='row' spacing={1.5} justifyContent='flex-end'>
          <Button variant='soft' color='neutral' onClick={onClose} disabled={pending} sx={focusRing}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => onMove?.(deckId)} disabled={!deckId} loading={pending} sx={focusRing}>
            {t('cards.move.confirm', { count })}
          </Button>
        </Stack>
      }
    >
      <FormDeckSelect decks={decks} value={deckId} onChange={setDeckId} allowNone={false} />
    </FormSheet>
  )
}

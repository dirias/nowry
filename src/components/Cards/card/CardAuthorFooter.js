import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Stack, Typography } from '@mui/joy'

import { focusRing } from '../../Common/Form/formStyles'

/**
 * The action row of every card sheet (UX-CONTRACT §9.3, CARDS.md §6).
 *
 * Nobody creates one flashcard. Ten in a row is the workflow, so add mode
 * offers two outcomes and each button says which one it is: `Save & next`
 * keeps the sheet open, `Save & close` does not. `FlashcardModal` already
 * behaved this way and never said so — its `Create` button read identically in
 * both modes, so the user could not predict whether the sheet would close.
 *
 * The count replaces the success `Snackbar`, which anchored to the top of the
 * screen (over the header at `xs`) and auto-hid after four seconds while the
 * user was typing the next card. A line in the footer does not overlay
 * anything, does not steal focus, and is still there when they look up.
 *
 * `Save & next` is last in DOM order so the keyboard path ends on the action
 * the loop repeats — and at `xs` that also puts it against the bottom edge, in
 * the thumb zone, with the escape route above it rather than beside it.
 */
const CardAuthorFooter = ({ isEdit, saving, savedCount = 0, onSaveAndNext, onSaveAndClose, onCancel }) => {
  const { t } = useTranslation()

  const secondary = isEdit
    ? { labelKey: 'common.cancel', onClick: onCancel, variant: 'plain' }
    : { labelKey: 'form.saveAndClose', onClick: onSaveAndClose, variant: 'soft' }

  return (
    <Stack spacing={1}>
      {/* Always mounted, empty at zero: a live region added at the moment its
          content appears is a live region screen readers do not announce. */}
      <Typography level='body-xs' aria-live='polite' sx={{ color: 'text.tertiary', minHeight: '1rem' }}>
        {savedCount > 0 ? t('form.addedCount', { count: savedCount }) : ''}
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='flex-end'>
        {/* Never disabled while saving: a request that hangs must stay escapable. */}
        <Button
          variant={secondary.variant}
          color='neutral'
          onClick={secondary.onClick}
          sx={{ width: { xs: '100%', sm: 'auto' }, minHeight: 44, ...focusRing }}
        >
          {t(secondary.labelKey)}
        </Button>

        <Button
          variant='solid'
          loading={saving}
          onClick={isEdit ? onSaveAndClose : onSaveAndNext}
          sx={{ width: { xs: '100%', sm: 'auto' }, minHeight: 44, ...focusRing }}
        >
          {t(isEdit ? 'common.save' : 'form.saveAndNext')}
        </Button>
      </Stack>
    </Stack>
  )
}

export default CardAuthorFooter

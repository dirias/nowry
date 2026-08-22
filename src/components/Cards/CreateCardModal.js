import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Stack, Typography } from '@mui/joy'

import FormErrorBanner from '../Common/Form/FormErrorBanner'
import FormSheet from '../Common/Form/FormSheet'
import { focusRing } from '../Common/Form/formStyles'
import useCardForm from '../../hooks/useCardForm'
import CardAuthorFooter from './card/CardAuthorFooter'
import CardTypeSelector from './card/CardTypeSelector'
import FlashcardFields from './card/FlashcardFields'
import QuizCardFields from './card/QuizCardFields'
import VisualCardFields from './card/VisualCardFields'

/**
 * The one card sheet.
 *
 * The 26-line router survives and gains a job. It was already the only import
 * site, and it correctly kept the caller from knowing about card types —
 * deleting it would have pushed a `card_type` switch into CardHome. What it
 * absorbs is the shell: three modals each rendered their own Modal,
 * ModalDialog, ModalClose, header and type Chip, 48 duplicated lines that
 * drifted into three different widths, two different heights and three
 * different ideas of where the primary action goes.
 *
 * The bodies stay separate, because variants B, C and D are genuinely
 * different shapes and one component branching over three would be a parallel
 * implementation wearing one filename. What is shared is what was always the
 * same: the shell, the loop, the error surface, the footer.
 */
const BODIES = { flashcard: FlashcardFields, quiz: QuizCardFields, visual: VisualCardFields }

export default function CreateCardModal({ open, onClose, onCardSaved, decks = [], card = null }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const form = useCardForm({ open, card, onSaved: onCardSaved, onClose })

  const Body = BODIES[form.cardType] || FlashcardFields
  const titleKey = form.isEdit ? form.spec.editTitleKey : form.spec.createTitleKey

  const banner = form.saveError ? (
    <FormErrorBanner
      // One banner covers all three surfaces. Two of them hand-rolled a 403
      // branch with its own Upgrade button; the third caught the error and
      // only logged it, so a failed visual-card save was completely silent.
      detailText={form.limitReached ? t('subscription.errors.limitReached') : form.saveError}
      action={form.limitReached ? { labelKey: 'subscription.upgrade', onClick: () => navigate('/profile') } : null}
    />
  ) : null

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      titleKey={titleKey}
      // Edit mode states the type rather than offering it: a card's type
      // cannot change once fields exist that the other types have no room for.
      subtitleKey={form.isEdit ? form.spec.nameKey : null}
      width={form.spec.width}
      banner={banner}
      footer={
        <CardAuthorFooter
          isEdit={form.isEdit}
          saving={form.saving}
          savedCount={form.savedCount}
          onSaveAndNext={form.saveAndNext}
          onSaveAndClose={form.saveAndClose}
          onCancel={onClose}
        />
      }
    >
      <Stack spacing={2.5}>
        {!form.isEdit && <CardTypeSelector value={form.cardType} onChange={form.requestType} />}

        {/* Inline rather than a second sheet on top of this one: stacked
            bottom sheets are the pattern NN/g warns against, and the question
            is about the form the user is looking at. */}
        {form.pendingType && (
          <Alert variant='soft' color='warning' role='alertdialog' aria-label={t('cards.common.switchTypeWarning')}>
            <Stack spacing={1} sx={{ minWidth: 0 }}>
              <Typography level='body-sm'>{t('cards.common.switchTypeWarning')}</Typography>
              <Stack direction='row' spacing={1}>
                <Button size='sm' variant='solid' color='warning' onClick={form.confirmTypeChange} sx={{ minHeight: 44, ...focusRing }}>
                  {t('cards.common.switchTypeConfirm')}
                </Button>
                <Button size='sm' variant='plain' color='neutral' onClick={form.cancelTypeChange} sx={{ minHeight: 44, ...focusRing }}>
                  {t('common.cancel')}
                </Button>
              </Stack>
            </Stack>
          </Alert>
        )}

        <Body
          values={form.values}
          setField={form.setField}
          errors={form.errors}
          revealed={form.revealed}
          availableChips={form.availableChips}
          onReveal={form.reveal}
          decks={decks}
          refFor={form.refFor}
          tagInputRef={form.tagInputRef}
          tagSuggestions={form.tagSuggestions}
        />
      </Stack>
    </FormSheet>
  )
}

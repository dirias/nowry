import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Button, Stack, Typography } from '@mui/joy'
import { CheckCircleRounded } from '@mui/icons-material'

import FormDisclosureRail from '../Common/Form/FormDisclosureRail'
import FormErrorBanner from '../Common/Form/FormErrorBanner'
import FormImageField from '../Common/Form/FormImageField'
import FormSheet from '../Common/Form/FormSheet'
import FormTagInput from '../Common/Form/FormTagInput'
import FormTextArea from '../Common/Form/FormTextArea'
import FormTextField from '../Common/Form/FormTextField'
import { focusRing } from '../Common/Form/formStyles'
import useDeckForm from '../../hooks/useDeckForm'

/**
 * Deck creation — four elements at rest (DECKS.md §2.2).
 *
 * A deck's only required field is its name, so that is all the sheet opens
 * with; description, tags and an image are offers on the rail. What it used to
 * open with was eleven elements, including two publish buttons that duplicated
 * deck settings' own implementation, a Divider separating one button from one
 * button, and a hand-rolled toast pinned at `top: 80, right: 20, zIndex: 10000`
 * that landed over the header at 375px.
 *
 * The defect worth naming: a failed save used to be caught and only
 * `console.error`d, so the modal simply stopped loading and the user was never
 * told their deck did not exist. It is a banner now.
 */
const RAIL_LABELS = {
  description: 'cards.create.addDescription',
  tags: 'cards.create.addTags',
  image: 'cards.create.addImage'
}

const actionSx = { width: { xs: '100%', sm: 'auto' }, minHeight: 44, ...focusRing }

export default function DeckCreateSheet({ open, onClose, onSaved, onAddCards }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const form = useDeckForm({ open, onSaved, onClose })
  const created = form.createdDeck

  const banner = form.saveError ? (
    <FormErrorBanner
      detailText={form.limitReached ? t('subscription.errors.limitReached') : form.saveError}
      action={form.limitReached ? { labelKey: 'subscription.upgrade', onClick: () => navigate('/profile') } : null}
    />
  ) : null

  const continueToCards = () => {
    const deck = created
    form.dismiss()
    onAddCards?.(deck)
  }

  return (
    <FormSheet
      open={open}
      onClose={form.dismiss}
      titleKey={created ? 'cards.create.createdTitle' : 'cards.create.newTitle'}
      width='simple'
      banner={banner}
      footer={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='flex-end'>
          {/* A deck's value moment is its first card, so the continuation is
              the primary action and closing to the list is the escape (§2.7). */}
          <Button variant={created ? 'soft' : 'plain'} color='neutral' onClick={form.dismiss} sx={actionSx}>
            {t(created ? 'cards.create.done' : 'common.cancel')}
          </Button>
          <Button variant='solid' loading={form.saving} onClick={created ? continueToCards : form.create} sx={actionSx}>
            {t(created ? 'cards.create.addCards' : 'cards.create.create')}
          </Button>
        </Stack>
      }
    >
      {created ? (
        <Stack spacing={1.5} alignItems='center' sx={{ py: 4, textAlign: 'center' }}>
          <CheckCircleRounded sx={{ fontSize: 40, color: 'success.plainColor' }} />
          <Typography level='title-md'>{created.name}</Typography>
        </Stack>
      ) : (
        <Stack spacing={2.5}>
          <FormTextField
            labelKey='cards.create.fields.name'
            placeholderKey='cards.create.fields.namePlaceholder'
            value={form.values.name}
            onChange={(value) => form.setField('name', value)}
            errorKey={form.errors.name}
            required
            // Declarative, not a post-mount .focus(): Joy's Drawer and Modal run
            // a focus trap on open that re-claims focus from a scheduled call.
            autoFocus
            inputRef={form.refFor('name')}
          />

          {form.revealed.has('description') && (
            <Box ref={form.refFor('description')}>
              <FormTextArea
                labelKey='cards.create.fields.description'
                placeholderKey='cards.create.fields.descriptionPlaceholder'
                value={form.values.description}
                onChange={(value) => form.setField('description', value)}
                minRows={2}
              />
            </Box>
          )}

          {form.revealed.has('tags') && (
            <Box ref={form.refFor('tags')}>
              <FormTagInput ref={form.tagInputRef} value={form.values.tags} onChange={(tags) => form.setField('tags', tags)} />
            </Box>
          )}

          {form.revealed.has('image') && (
            <Box ref={form.refFor('image')}>
              <FormImageField
                labelKey='cards.create.addImage'
                placeholderKey='cards.create.imagePlaceholder'
                altKey='cards.create.imagePreviewAlt'
                errorMessageKey='cards.create.imagePreviewError'
                value={form.values.imageUrl}
                onChange={(value) => form.setField('imageUrl', value)}
              />
            </Box>
          )}

          <FormDisclosureRail available={form.availableChips} labels={RAIL_LABELS} onReveal={form.reveal} />
        </Stack>
      )}
    </FormSheet>
  )
}

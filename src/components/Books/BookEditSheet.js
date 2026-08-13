import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, Stack } from '@mui/joy'
import { Public as PublicIcon, PublicOff as PublicOffIcon } from '@mui/icons-material'

import FormDisclosureRail from '../Common/Form/FormDisclosureRail'
import FormErrorBanner from '../Common/Form/FormErrorBanner'
import FormSheet from '../Common/Form/FormSheet'
import FormTagInput from '../Common/Form/FormTagInput'
import FormTextArea from '../Common/Form/FormTextArea'
import FormTextField from '../Common/Form/FormTextField'
import { focusRing } from '../Common/Form/formStyles'
import { describeApiError } from '../Common/Form/formUtils'
import { publicContentService } from '../../api/services'
import { useThemePreferences } from '../../theme/DynamicThemeProvider'
import useBookForm from '../../hooks/useBookForm'
import PublishModal from '../Public/PublishModal'
import BookCoverField from './book/BookCoverField'
import BookHeaderPreview from './book/BookHeaderPreview'

/**
 * Book editing — four elements at rest, down from fourteen (BOOKS.md §3).
 *
 * What the old editor got right is preserved rather than lost in the migration:
 * it was the only in-scope file with a real full-bleed mobile shell on `100dvh`
 * and a real footer outside the scroll region, and both are now what every
 * surface gets from `FormSheet`.
 *
 * What goes is the 1000px two-column layout. The right-hand column held a
 * "LIVE PREVIEW" heading over a 200px book and a created/edited date block,
 * vertically centred inside a column sized by the form beside it. At 375px that
 * column was already a vertical stack with the preview below the fold, so it
 * was carrying the design for a layout most users never saw. The preview it
 * existed for is a header swatch now (§3.4).
 *
 * Add and Edit are separate components here, unusually for this phase. They
 * share one field, and even that differs — defaulted on create, enforced on
 * edit; create has one rail chip and edit has three; create navigates on
 * success and edit closes. An `isEdit` branch would gate more than it shared.
 */
const RAIL_LABELS = {
  cover: 'books.changeCover',
  tags: 'books.addTags',
  summary: 'books.addSummary'
}

const actionSx = { width: { xs: '100%', sm: 'auto' }, minHeight: 44, ...focusRing }

export default function BookEditSheet({ book, open = true, onSaved, onClose }) {
  const { t } = useTranslation()
  const { themeColor } = useThemePreferences()
  const [published, setPublished] = useState(Boolean(book.is_public))
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishError, setPublishError] = useState(null)

  const form = useBookForm({ open, book, defaultCoverColor: themeColor, onSaved, onClose })

  const runPublish = useCallback(async (action, next) => {
    setPublishError(null)
    try {
      await action()
      setPublished(next)
      setPublishOpen(false)
    } catch (error) {
      // A publish failure used to reach a hand-rolled toast pinned at
      // `top: 80, right: 20, zIndex: 10000`, which landed over the header at
      // 375px. It is the same banner as every other failure now.
      setPublishError({ key: next ? 'books.publishFailed' : 'books.unpublishFailed', detail: describeApiError(error) })
    }
  }, [])

  const failure = publishError || (form.saveError ? { key: 'books.saveFailed', detail: form.saveError } : null)

  return (
    <>
      <PublishModal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        contentType='book'
        onPublish={(metadata) => runPublish(() => publicContentService.publishBook(book._id, metadata), true)}
      />

      <FormSheet
        open={open}
        onClose={onClose}
        titleKey='books.editTitle'
        width='simple'
        headerAccessory={<BookHeaderPreview coverColor={form.values.coverColor} coverImage={form.values.coverImage} />}
        banner={failure ? <FormErrorBanner titleKey={failure.key} detailText={failure.detail} /> : null}
        footer={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='flex-end'>
            {/* Cancel stays enabled while saving, so a stuck request is escapable. */}
            <Button variant='plain' color='neutral' onClick={onClose} sx={actionSx}>
              {t('common.cancel')}
            </Button>
            <Button variant='solid' loading={form.saving} onClick={form.save} sx={actionSx}>
              {t('common.save')}
            </Button>
          </Stack>
        }
      >
        <Stack spacing={2.5}>
          <FormTextField
            labelKey='books.titleLabel'
            placeholderKey='books.editor.titlePlaceholder'
            value={form.values.title}
            onChange={(value) => form.setField('title', value)}
            errorKey={form.errors.title}
            required
            autoFocus
            inputRef={form.refFor('title')}
          />

          {form.revealed.has('cover') && (
            <Box ref={form.refFor('cover')}>
              <BookCoverField
                color={form.values.coverColor}
                onColorChange={(value) => form.setField('coverColor', value)}
                imageUrl={form.values.coverImage}
                onImageChange={(value) => form.setField('coverImage', value)}
              />
            </Box>
          )}

          {form.revealed.has('tags') && (
            <Box ref={form.refFor('tags')}>
              <FormTagInput ref={form.tagInputRef} value={form.values.tags} onChange={(tags) => form.setField('tags', tags)} />
            </Box>
          )}

          {form.revealed.has('summary') && (
            <Box ref={form.refFor('summary')}>
              <FormTextArea
                labelKey='books.summaryLabel'
                placeholderKey='books.editor.summaryPlaceholder'
                value={form.values.summary}
                onChange={(value) => form.setField('summary', value)}
                minRows={3}
              />
            </Box>
          )}

          <FormDisclosureRail available={form.availableChips} labels={RAIL_LABELS} onReveal={form.reveal} />

          {/* Publishing is not a save action, so it is not a peer of Save in
              the footer's action row (§7). Consolidating it with the deck
              publish flows is a separate piece of work. */}
          <Box sx={{ pt: 1 }}>
            <Button
              variant='outlined'
              color='neutral'
              size='sm'
              onClick={() => (published ? runPublish(() => publicContentService.unpublishBook(book._id), false) : setPublishOpen(true))}
              startDecorator={published ? <PublicOffIcon sx={{ fontSize: 16 }} /> : <PublicIcon sx={{ fontSize: 16 }} />}
              sx={{ minHeight: 44, ...focusRing }}
            >
              {t(published ? 'public.unpublish' : 'public.publish')}
            </Button>
          </Box>
        </Stack>
      </FormSheet>
    </>
  )
}

/**
 * A document's details, on a phone (MOB-102).
 *
 * The web's "Edit details" sheet — title, cover colour, tags, summary — and
 * the phone had none of it: the only thing this client ever wrote to a document
 * was where you stopped reading. That was never covered by FR-035, which keeps
 * WRITING off the phone because the body is an editor's state; these are plain
 * fields sent through `booksService.update`, the same call the reading pointer
 * already makes.
 *
 * **The form is the web's own.** `useBookForm` holds the fields, the rules and
 * the save, and its note anticipated this client by name. So the rules cannot
 * drift: an emptied title is REFUSED rather than replaced with "Untitled", a
 * failed save keeps every field, and a group opens only if it already holds
 * something — the colour, which always has a value, lives behind "Change the
 * cover" exactly as it does on the web.
 *
 * **The cover image is an address, as it is on the web** (MOB-103). MOB-102
 * left it out on the belief that it needed an image picker and a rebuilt binary.
 * The web's cover image has always been a URL pasted into a field; so is this.
 * The cover preview above draws it in the document's own shape.
 *
 * **Publishing is a step of this sheet** (MOB-103), as it is a button in the
 * web's. It is not a peer of Save — publishing saves nothing the form holds —
 * so it sits apart from the form's actions, and it swaps the sheet's body
 * rather than opening a sheet over this one (see `PublishListing`). Unpublishing
 * is one press, as on the web.
 */
import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COVER_PRESETS } from '@nowry/core/constants/bookCovers'
import useBookForm from '@nowry/core/hooks/useBookForm'
import { publicContentService } from '@nowry/core/api/services'
import { isPublished } from '@nowry/core/domain/publishListing'
import { describeApiError } from '@nowry/core/utils/formUtils'
import { useTheme } from '../theme'
import {
  BottomSheet,
  Button,
  Chip,
  ColorSwatch,
  CoverMark,
  Divider,
  FormField,
  ImageUrlField,
  Input,
  Stack,
  TagField,
  Typography,
  resolveColor
} from '../ui'
import { PublishListing } from './PublishListing'

/** The web's rail labels, one per group the form can reveal. */
const REVEAL_LABELS = {
  cover: 'books.changeCover',
  tags: 'books.addTags',
  summary: 'books.addSummary'
}

export function BookDetailsSheet({ book, open, onSaved, onPublished, onClose }) {
  const { t } = useTranslation()
  const theme = useTheme()

  // A ref's `.focus()` is this client's half of moving to a field the form
  // refused; the web passes a DOM implementation of the same thing.
  const focusControl = useCallback((node) => node?.focus?.(), [])

  const form = useBookForm({
    open,
    book: book ?? {},
    defaultCoverColor: resolveColor(theme, 'primary.solidBg'),
    onSaved,
    onClose,
    focusControl
  })

  const [step, setStep] = useState('details')
  const [published, setPublished] = useState(isPublished(book))
  const [unpublishing, setUnpublishing] = useState(false)
  const [unpublishError, setUnpublishError] = useState(null)

  // Each opening starts on the fields, with the document's own public state.
  useEffect(() => {
    if (!open) return
    setStep('details')
    setPublished(isPublished(book))
    setUnpublishError(null)
  }, [open, book])

  if (!book) return null

  const id = book._id ?? book.id

  const publish = async (payload) => {
    await publicContentService.publishBook(id, payload)
    setPublished(true)
    setStep('details')
    onPublished?.()
  }

  const unpublish = async () => {
    setUnpublishing(true)
    setUnpublishError(null)
    try {
      await publicContentService.unpublishBook(id)
      setPublished(false)
      onPublished?.()
    } catch (error) {
      const detail = describeApiError(error)
      setUnpublishError(detail ? `${t('books.unpublishFailed')} · ${detail}` : t('books.unpublishFailed'))
    } finally {
      setUnpublishing(false)
    }
  }

  // The preview is the cover this document will wear, drawn by the same
  // component the library draws — so a colour is judged on a page or a book,
  // not on a circle.
  const preview = { ...book, cover_color: form.values.coverColor, cover_image: form.values.coverImage, title: form.values.title }

  return (
    <BottomSheet
      visible={open}
      onClose={form.saving ? () => {} : onClose}
      title={t(step === 'publish' ? 'public.publishModal.title' : 'books.editTitle')}
    >
      {step === 'publish' ? (
        <PublishListing onPublish={publish} onBack={() => setStep('details')} />
      ) : (
        <Stack spacing={2}>
          <View style={{ alignItems: 'flex-start' }}>
            <CoverMark book={preview} width={48} ground='background.surface' />
          </View>

          {form.saveError ? (
            <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
              {form.saveErrorOffline ? t('errors.offline') : form.saveError}
            </Typography>
          ) : null}

          <FormField labelKey='books.titleLabel' errorKey={form.errors.title}>
            <Input
              ref={form.refFor('title')}
              value={form.values.title}
              onChangeText={(value) => form.setField('title', value)}
              accessibilityLabel={t('books.titleLabel')}
              returnKeyType='done'
            />
          </FormField>

          {form.revealed.has('cover') ? (
            <>
              <FormField labelKey='books.coverColorLabel'>
                <View ref={form.refFor('cover')} style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -theme.spacing[0.5] }}>
                  {COVER_PRESETS.map((preset) => (
                    <ColorSwatch
                      key={preset.hex}
                      hex={preset.hex}
                      selected={String(form.values.coverColor).toLowerCase() === preset.hex.toLowerCase()}
                      onPress={() => form.setField('coverColor', preset.hex)}
                      label={t(preset.nameKey)}
                    />
                  ))}
                </View>
              </FormField>

              {/* The web's cover group holds both, in this order: the colour and
                then the image, which covers the colour when it loads. */}
              <ImageUrlField
                labelKey='books.coverImageLabel'
                placeholderKey='books.coverImagePlaceholder'
                altKey='books.coverImageAlt'
                errorMessageKey='books.coverImageError'
                value={form.values.coverImage}
                onChange={(value) => form.setField('coverImage', value)}
                preview={false}
              />
            </>
          ) : null}

          {form.revealed.has('tags') ? (
            <View ref={form.refFor('tags')}>
              <TagField value={form.values.tags} onChange={(tags) => form.setField('tags', tags)} />
            </View>
          ) : null}

          {form.revealed.has('summary') ? (
            <FormField labelKey='books.summaryLabel'>
              <Input
                ref={form.refFor('summary')}
                value={form.values.summary}
                onChangeText={(value) => form.setField('summary', value)}
                placeholder={t('books.editor.summaryPlaceholder')}
                accessibilityLabel={t('books.summaryLabel')}
                multiline
              />
            </FormField>
          ) : null}

          {/* The web's rail: what this document does not have yet, one tap each.
            A chip that has been used is gone, because its field is open. */}
          {form.availableChips?.length ? (
            <Stack direction='row' spacing={1} flexWrap='wrap'>
              {form.availableChips.map((group) => (
                <Chip key={group} onPress={() => form.reveal(group)} startGlyph={<Typography level='body-sm'>＋</Typography>}>
                  {t(REVEAL_LABELS[group])}
                </Chip>
              ))}
            </Stack>
          ) : null}

          <Stack spacing={1}>
            <Button loading={form.saving} onPress={form.save}>
              {t('common.save')}
            </Button>
            <Button variant='tertiary' onPress={onClose} disabled={form.saving}>
              {t('common.cancel')}
            </Button>
          </Stack>

          {/* Apart from Save, under a rule: this acts on the library, not on
            the fields above. */}
          <Divider />
          <Stack spacing={1}>
            {published ? (
              <Typography level='body-xs' color='text.tertiary'>
                {t('books.lib.published')}
              </Typography>
            ) : null}
            {unpublishError ? (
              <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
                {unpublishError}
              </Typography>
            ) : null}
            <Button
              variant='secondary'
              loading={unpublishing}
              disabled={form.saving}
              onPress={published ? unpublish : () => setStep('publish')}
            >
              {t(published ? 'public.unpublish' : 'public.publish')}
            </Button>
          </Stack>
        </Stack>
      )}
    </BottomSheet>
  )
}

export default BookDetailsSheet

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
 * **What is not here.** The cover IMAGE needs an image picker, which is a
 * native module and a rebuilt binary, so it is shown but not changeable — and
 * choosing a colour leaves an existing image in place rather than silently
 * clearing it. Publish drags in the public listing flow and is its own decision.
 */
import { useCallback } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COVER_PRESETS } from '@nowry/core/constants/bookCovers'
import useBookForm from '@nowry/core/hooks/useBookForm'
import { useTheme } from '../theme'
import { BottomSheet, Button, Chip, ColorSwatch, CoverMark, FormField, Input, Stack, TagField, Typography, resolveColor } from '../ui'

/** The web's rail labels, one per group the form can reveal. */
const REVEAL_LABELS = {
  cover: 'books.changeCover',
  tags: 'books.addTags',
  summary: 'books.addSummary'
}

export function BookDetailsSheet({ book, open, onSaved, onClose }) {
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

  if (!book) return null

  // The preview is the cover this document will wear, drawn by the same
  // component the library draws — so a colour is judged on a page or a book,
  // not on a circle.
  const preview = { ...book, cover_color: form.values.coverColor, title: form.values.title }

  return (
    <BottomSheet visible={open} onClose={form.saving ? () => {} : onClose} title={t('books.editTitle')}>
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
      </Stack>
    </BottomSheet>
  )
}

export default BookDetailsSheet

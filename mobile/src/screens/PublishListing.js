/**
 * Publishing a document to the public library, on a phone (MOB-103).
 *
 * The web's `PublishModal`, as a step of the details sheet rather than a sheet
 * of its own. The web opens its modal OVER the edit sheet; a modal opened from
 * a modal does not layer predictably on Android (the reason `Select` expands in
 * place inside a sheet), and a second sheet would close the first one and lose
 * whatever the details form held. So the details sheet swaps its body, and Back
 * returns to the fields exactly as they were left.
 *
 * The options, the two rules and the request body are `@nowry/core`'s
 * `publishListing`, which the web modal reads too.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CONTENT_LANGUAGES,
  DIFFICULTY_LEVELS,
  LICENSES,
  PUBLISH_CATEGORIES,
  emptyListing,
  listingErrors,
  listingPayload
} from '@nowry/core/domain/publishListing'
import { describeApiError, isOfflineError } from '@nowry/core/utils/formUtils'
import { Button, FormField, Select, SettingRow, Stack, Switch, TagField, Typography } from '../ui'

/**
 * Mounted only while the step is showing, so an abandoned listing is not
 * waiting the next time it opens.
 */
export function PublishListing({ onPublish, onBack }) {
  const { t, i18n } = useTranslation()
  const [listing, setListing] = useState(() => emptyListing(i18n.language))
  const [errors, setErrors] = useState({})
  const [sending, setSending] = useState(false)
  const [failure, setFailure] = useState(null)

  const set = (field, value) => {
    setListing((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => ({ ...previous, [field]: null }))
  }

  const submit = async () => {
    const found = listingErrors(listing)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      return
    }
    setSending(true)
    setFailure(null)
    try {
      await onPublish(listingPayload(listing))
    } catch (error) {
      const detail = describeApiError(error)
      setFailure(
        isOfflineError(error) ? t('errors.offline') : detail ? `${t('books.publishFailed')} · ${detail}` : t('books.publishFailed')
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <Stack spacing={2}>
      <Typography level='body-sm' color='text.secondary'>
        {t('public.publishModal.description')}
      </Typography>

      {failure ? (
        <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
          {failure}
        </Typography>
      ) : null}

      <FormField labelKey='public.category' errorKey={errors.category} required>
        <Select
          value={listing.category}
          onChange={(value) => set('category', value)}
          options={PUBLISH_CATEGORIES.map((value) => ({ value, label: t(`public.categories.${value}`) }))}
          placeholderKey='common.select'
          invalid={Boolean(errors.category)}
          accessibilityLabel={t('public.category')}
        />
      </FormField>

      <TagField labelKey='public.tags' required value={listing.tags} onChange={(tags) => set('tags', tags)} errorKey={errors.tags} />

      <FormField labelKey='public.language'>
        <Select
          value={listing.language}
          onChange={(value) => set('language', value)}
          options={CONTENT_LANGUAGES.map(({ code, name }) => ({ value: code, label: name }))}
          accessibilityLabel={t('public.language')}
        />
      </FormField>

      <FormField labelKey='public.difficulty'>
        <Select
          value={listing.difficulty}
          onChange={(value) => set('difficulty', value)}
          options={DIFFICULTY_LEVELS.map((value) => ({ value, label: t(`public.difficultyLevels.${value}`) }))}
          placeholderKey='common.optional'
          accessibilityLabel={t('public.difficulty')}
        />
      </FormField>

      <FormField labelKey='public.license'>
        <Select
          value={listing.license}
          onChange={(value) => set('license', value)}
          options={LICENSES.map((value) => ({ value, label: t(`public.licenses.${value}`) }))}
          accessibilityLabel={t('public.license')}
        />
      </FormField>

      <SettingRow label={t('public.originalContent')} value={listing.original} onPress={() => set('original', !listing.original)}>
        <Switch
          value={listing.original}
          onValueChange={(value) => set('original', value)}
          accessibilityLabel={t('public.originalContent')}
        />
      </SettingRow>

      <Stack spacing={1}>
        <Button loading={sending} onPress={submit}>
          {t('public.publishModal.submit')}
        </Button>
        <Button variant='tertiary' onPress={onBack} disabled={sending}>
          {t('common.back')}
        </Button>
      </Stack>
    </Stack>
  )
}

export default PublishListing

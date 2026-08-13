import React from 'react'
import { Skeleton, Stack } from '@mui/joy'

import FormImageField from '../../Common/Form/FormImageField'
import FormTagInput from '../../Common/Form/FormTagInput'
import FormTextArea from '../../Common/Form/FormTextArea'
import FormTextField from '../../Common/Form/FormTextField'

/**
 * What a deck is called, and what it looks like (DECKS.md §3.3).
 *
 * These four fields used to live in a *different modal* from the pace and voice
 * settings for the same deck — one object, two edit surfaces, no route between
 * them, and publish/unpublish implemented in both. Renaming a deck and changing
 * its study pace were two unrelated journeys. They are two sections now.
 *
 * Autosaved on the same debounce as every other section, but through a
 * different service method, which is why the state core keys its timers by
 * channel: a rename and a pace change made within 600ms of each other must both
 * persist.
 *
 * The skeletons wrap rather than replace, so the labels stay readable while the
 * values arrive and the fields do not jump into place when they do.
 */
const DeckIdentitySection = ({ loading, identity, errorKey, onChange }) => (
  <Stack spacing={2.5}>
    <Skeleton loading={loading} variant='rectangular' sx={{ borderRadius: 'sm' }}>
      <FormTextField
        labelKey='deckSettings.identity.name'
        placeholderKey='cards.create.fields.namePlaceholder'
        value={identity.name}
        onChange={(value) => onChange('name', value)}
        errorKey={errorKey}
        required
        size='md'
      />
    </Skeleton>

    <Skeleton loading={loading} variant='rectangular' sx={{ borderRadius: 'sm' }}>
      <FormTextArea
        labelKey='deckSettings.identity.description'
        placeholderKey='cards.create.fields.descriptionPlaceholder'
        value={identity.description}
        onChange={(value) => onChange('description', value)}
        minRows={2}
      />
    </Skeleton>

    <Skeleton loading={loading} variant='rectangular' sx={{ borderRadius: 'sm' }}>
      <FormTagInput value={identity.tags} onChange={(tags) => onChange('tags', tags)} />
    </Skeleton>

    <Skeleton loading={loading} variant='rectangular' sx={{ borderRadius: 'sm' }}>
      <FormImageField
        labelKey='deckSettings.identity.image'
        placeholderKey='cards.create.imagePlaceholder'
        altKey='cards.create.imagePreviewAlt'
        errorMessageKey='cards.create.imagePreviewError'
        value={identity.imageUrl}
        onChange={(value) => onChange('imageUrl', value)}
      />
    </Skeleton>
  </Stack>
)

export default DeckIdentitySection

import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Chip, Skeleton, Stack, Typography } from '@mui/joy'
import { Public } from '@mui/icons-material'

import { focusRing, touchTarget } from '../../Common/Form/formStyles'

/**
 * Publish status and the one control that changes it (DECKS.md §3.5).
 *
 * Seven elements became four. Two causes, both structural rather than
 * cosmetic:
 *
 * - A `Sheet variant='outlined' p={2}` sat inside a `Box p={3}` inside a
 *   `ModalDialog` — three nested paddings and two container edges around a
 *   single status line.
 * - The status **title** and the status **Chip** rendered the identical `t()`
 *   key twelve lines apart: two signals, one fact, literally the same string.
 *   The Chip stays, because it carries colour *and* text; the line beside it
 *   now carries the publish date, which is the fact nothing else was stating.
 *
 * Publishing has one implementation and this is it — the deck create form used
 * to carry a second, with `category: 'Other'` and `language: 'en'` hardcoded.
 */
const DeckPublishingSection = ({ loading, deck, onManage }) => {
  const { t } = useTranslation()
  const isPublic = Boolean(deck?.is_public)
  const manageKey = isPublic ? 'publish.manageButton' : 'publish.publishButton'

  return (
    <Stack gap={2} alignItems='flex-start'>
      <Stack direction='row' alignItems='center' justifyContent='space-between' gap={2} sx={{ width: '100%' }}>
        <Typography level='body-sm' sx={{ color: 'text.tertiary', minWidth: 0 }}>
          <Skeleton loading={loading} variant='text'>
            {isPublic && deck?.published_at
              ? t('deckSettings.publish.publishedOn', { date: new Date(deck.published_at).toLocaleDateString() })
              : t('publish.notYetPublished')}
          </Skeleton>
        </Typography>

        {!loading && (
          // Colour plus text, never colour alone.
          <Chip size='sm' color={isPublic ? 'success' : 'neutral'} variant='soft' sx={{ flexShrink: 0 }}>
            {t(isPublic ? 'publish.status.public' : 'publish.status.private')}
          </Chip>
        )}
      </Stack>

      <Button
        variant='outlined'
        color='primary'
        size='sm'
        startDecorator={<Public sx={{ fontSize: 16 }} />}
        onClick={onManage}
        sx={{ ...touchTarget, ...focusRing }}
      >
        {t(manageKey)}
      </Button>
    </Stack>
  )
}

export default DeckPublishingSection

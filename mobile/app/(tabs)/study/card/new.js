/**
 * A new card (MOB-023). `?deckId=` preselects the deck it is made in.
 *
 * `?from=<cardId>` opens it as a SPLIT (SR-004): the named card's words as a
 * draft, without its identity, so saving creates a second card beside the
 * first. A route carries an id, not an object, so the card is fetched here.
 *
 * A static segment, so it is matched before `[cardId]` and no card can ever be
 * called "new".
 */
import { useEffect, useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { cardsService } from '@nowry/core/api/services'
import { splitDraft } from '@nowry/core/domain/leech'
import { CardEditor } from '../../../../src/screens/CardEditor'
import { Screen, Skeleton, Stack, Typography } from '../../../../src/ui'

export default function NewCard() {
  const { deckId, from } = useLocalSearchParams()
  const { t } = useTranslation()
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!from) return undefined
    let cancelled = false
    cardsService
      .getById(String(from))
      .then((found) => !cancelled && setDraft(splitDraft(found)))
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [from])

  if (!from) return <CardEditor deckId={deckId ? String(deckId) : null} />

  if (error) {
    return (
      <Screen>
        <Typography level='body-md' color='danger.plainColor' accessibilityLiveRegion='polite'>
          {t('form.loadErrorTitle')}
        </Typography>
      </Screen>
    )
  }

  if (!draft) {
    return (
      <Screen>
        <Stack spacing={2}>
          <Skeleton width='50%' height={28} />
          <Skeleton width='100%' height={88} />
          <Skeleton width='100%' height={88} />
        </Stack>
      </Screen>
    )
  }

  return <CardEditor draft={draft} />
}

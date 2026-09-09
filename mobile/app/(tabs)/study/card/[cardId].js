/**
 * Edit one card (MOB-023).
 *
 * A route is a URL and carries an id, not an object, so the card is fetched
 * here. The web never needed `getById` because it always has the card in hand
 * before it opens an editor; a deep link does not.
 */
import { useEffect, useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { cardsService } from '@nowry/core/api/services'
import { CardEditor } from '../../../../src/screens/CardEditor'
import { Screen, Skeleton, Stack, Typography } from '../../../../src/ui'

export default function EditCard() {
  const { cardId } = useLocalSearchParams()
  const { t } = useTranslation()
  const [card, setCard] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    cardsService
      .getById(String(cardId))
      .then((found) => !cancelled && setCard(found))
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [cardId])

  if (error) {
    return (
      <Screen>
        <Typography level='body-md' color='danger.plainColor' accessibilityLiveRegion='polite'>
          {t('form.loadErrorTitle')}
        </Typography>
      </Screen>
    )
  }

  if (!card) {
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

  return <CardEditor card={card} />
}

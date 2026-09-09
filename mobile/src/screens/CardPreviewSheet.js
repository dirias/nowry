/**
 * Card preview (MOB-021 follow-up).
 *
 * Tapping a card in the library used to push the deck's settings screen — the
 * settings for something the user did not tap. This is what a card row opens
 * instead: the card itself.
 *
 * **A segmented control, not tap-to-flip.** The web flips the card on click and
 * hints "Click to flip". A hidden gesture is a control a screen reader cannot
 * find and a first-time user has to be told about, so the two sides are named
 * and switched by the house segmented control. Nothing is hidden and nothing is
 * hinted.
 *
 * The web's preview also pages through the whole filtered list, renders Mermaid
 * diagrams and speaks the card aloud. None of those come along: there is no
 * diagram renderer and no text-to-speech on the phone yet, and paging is a
 * second thing to get right in a sheet that exists to answer "what is on this
 * card". A visual card says what it is and is read on the web.
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { BottomSheet, Button, Segmented, Stack, Typography } from '../ui'

const SIDES = { front: 'front', back: 'back' }

/** The same field fallbacks the web preview reads, in the same order. */
const textFor = (card, side) => (side === SIDES.front ? card?.question || card?.title || '' : card?.answer || card?.content || '')

export function CardPreviewSheet({ visible, card, onClose }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [side, setSide] = useState(SIDES.front)

  // A new card always opens on its front, whichever side the last one was left on.
  useEffect(() => {
    if (visible) setSide(SIDES.front)
  }, [visible, card])

  const text = textFor(card, side)

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('cards.deck.preview')}>
      <Stack spacing={2}>
        <Segmented
          accessibilityLabel={t('deckSettings.audio.sideAria')}
          value={side}
          onChange={setSide}
          options={[
            { value: SIDES.front, label: t('deckSettings.audio.front') },
            { value: SIDES.back, label: t('deckSettings.audio.back') }
          ]}
        />

        {text ? (
          <Typography level='body-lg'>{text}</Typography>
        ) : (
          /* A diagram card's answer is Mermaid source, not prose. Saying what
             the card is beats rendering its code as text. */
          <Typography level='body-md' color='text.tertiary'>
            {t('cards.session.labels.visual')}
          </Typography>
        )}

        {(card?.tags ?? []).length ? (
          <Typography level='body-sm' color='text.tertiary'>
            {card.tags.join(' · ')}
          </Typography>
        ) : null}

        {/* The sheet answers "what is on this card"; editing it is a screen, so
            the sheet closes rather than stacking one surface over another. */}
        <Button
          variant='secondary'
          onPress={() => {
            const id = card?._id ?? card?.id
            onClose()
            if (id) router.push(`/study/card/${id}`)
          }}
        >
          {t('common.edit')}
        </Button>
      </Stack>
    </BottomSheet>
  )
}

export default CardPreviewSheet

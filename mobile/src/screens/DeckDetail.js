/**
 * A deck, opened (MOB-021, rebuilt by MOB-078).
 *
 * What this screen used to be: the deck's settings form. Tapping a deck in the
 * library landed on a name field, a description, a study pace, two daily
 * limits, an audio block and an Archive button — nine controls and no cards.
 * The deck's own contents were reachable from nowhere in the app.
 *
 * The web does the opposite in both halves: opening a deck opens its cards, and
 * settings are one item in the row's menu. So the screen is the deck now —
 * identity, the two things you do with a deck, and what is in it — and the form
 * is one tap away behind a row that says what it is.
 *
 * **The cards are a list, not a session.** The web's Browse mode is its session
 * component with the scheduler switched off, which is a fine answer on a screen
 * wide enough to show a card and a sidebar and a poor one here. A list is what
 * a phone's reader wants from a folder: what is in it, when each piece is next
 * due, and a way into any one of them.
 *
 * **A card opens the same sheet it opens in the library.** Preview first, then
 * Edit — two screens that open a card two different ways is how a learner
 * learns not to trust either.
 */
import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { deckCounts } from '@nowry/core/domain/deckTypes'
import { daysUntilReview } from '@nowry/core/domain/sessionLog'
import { useDeckCards } from '@nowry/core/hooks/useDeckCards'
import { useDeckData } from '@nowry/core/hooks/useDeckData'
import { CardPreviewSheet } from './CardPreviewSheet'
import { nextReviewLabel } from './GroupDetail'
import { Button, Divider, Icon, IdentityTile, ListRow, Readout, Screen, SectionHeader, Skeleton, Stack, Typography } from '../ui'

/** Soonest first; a card nobody has seen has no date and sorts last. */
const byNextReview = (a, b) => (daysUntilReview(a) ?? Infinity) - (daysUntilReview(b) ?? Infinity)

export function DeckDetail() {
  const { deckId } = useLocalSearchParams()
  const id = String(deckId)
  const { t } = useTranslation()
  const router = useRouter()
  const [previewing, setPreviewing] = useState(null)

  /*
   * The list, not `GET /decks/{id}`. The detail endpoint computes no
   * `due_cards`, `new_cards` or `mastery`, so a screen built on it said "26
   * cards" where the row that opened it said "20 due · 92%" (MOB-065). The
   * list is in the query cache already — this screen is reached from it — and
   * it is what a rename in the settings screen invalidates, so the title here
   * changes when the name does.
   */
  const deckList = useDeckData(null)
  const cards = useDeckCards(id)

  const deck = (deckList.decks ?? []).find((row) => String(row._id ?? row.id) === id) ?? null
  const counts = deckCounts(deck)
  const name = deck?.name || ''

  const ordered = useMemo(() => [...(cards.cards ?? [])].sort(byNextReview), [cards.cards])

  if (deckList.loading && !deck) {
    return (
      <Screen>
        <Stack spacing={2}>
          <Skeleton width='60%' height={28} />
          <Skeleton width='100%' height={44} />
          <Skeleton width='100%' height={44} />
        </Stack>
      </Screen>
    )
  }

  return (
    <Screen>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography level='h4'>{name}</Typography>
          <Stack direction='row' spacing={2} flexWrap='wrap'>
            {/* What KIND of deck, which the web's header states with a chip in
                the type's own accent. */}
            <Readout leading>{t(`study.types.${deck?.deck_type || 'flashcard'}s`)}</Readout>
            <Readout>{t('cards.manage_content.cardCount', { count: counts.total || ordered.length })}</Readout>
            {counts.due > 0 ? <Readout>{t('study.dueCount', { count: counts.due })}</Readout> : null}
            {counts.fresh > 0 ? <Readout>{t('study.deck.newCount', { count: counts.fresh })}</Readout> : null}
          </Stack>
        </Stack>

        {/* The deck's one action, and the only solid button on the screen. */}
        <Stack direction='row' spacing={1}>
          <Button
            size='lg'
            style={{ flex: 1 }}
            onPress={() => router.push(`/study/${id}`)}
            accessibilityLabel={t('study.deckPill.ariaLabel', { name })}
          >
            {t('study.deck.study')}
          </Button>

          {/* Beside it, not stacked under it. Two full-width slabs one above
              the other read as two equally weighted choices; the deck has one
              action and one alternative. */}
          <Button size='lg' variant='secondary' style={{ flex: 1 }} onPress={() => router.push(`/study/card/new?deckId=${id}`)}>
            {t('cards.deck.addCard')}
          </Button>
        </Stack>

        {/*
         * Settings as a row, above the cards rather than under them: it is one
         * object, and burying it below a list of forty cards would be hiding
         * it rather than demoting it. This is the web's menu item, with the
         * web's own words and the web's own accessible name.
         */}
        <View>
          <Divider />
          <ListRow
            tile={<Icon name='Settings' size='sm' color='text.tertiary' />}
            name={t('deckSettings.menuItem')}
            onPress={() => router.push(`/study/deck/${id}/settings`)}
            accessibilityLabel={t('deckSettings.openAria', { name })}
          />
          <Divider />
        </View>

        {/* No count beside the title: the readout line at the top of the
            screen already says how many cards this deck has, and two numbers
            for one fact an inch apart is how they end up disagreeing. */}
        <SectionHeader title={t('groups.cards')} />

        {cards.loading ? (
          <Stack spacing={1}>
            <Skeleton width='100%' height={52} />
            <Skeleton width='100%' height={52} />
          </Stack>
        ) : cards.error ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t('home.loadFailed')}
          </Typography>
        ) : ordered.length === 0 ? (
          /* An empty deck has exactly one thing to do, and the key for it is
             already on this screen — so this says what is true and points at
             it rather than repeating the button. */
          <Typography level='body-sm' color='text.tertiary'>
            {t('cards.manage_content.empty.cards.title')}
          </Typography>
        ) : (
          ordered.map((card) => (
            <View key={card._id ?? card.id}>
              <Divider />
              <ListRow
                tile={<IdentityTile color='primary.solidBg' />}
                name={card.title || card.question || card.front || ''}
                meta={(card.tags ?? []).join(' · ') || null}
                readout={
                  <Typography level='body-xs' color='text.tertiary'>
                    {nextReviewLabel(t, card)}
                  </Typography>
                }
                onPress={() => setPreviewing(card)}
              />
            </View>
          ))
        )}
      </Stack>

      <CardPreviewSheet visible={Boolean(previewing)} card={previewing} onClose={() => setPreviewing(null)} />
    </Screen>
  )
}

export default DeckDetail

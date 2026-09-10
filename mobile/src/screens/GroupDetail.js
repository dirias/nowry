/**
 * One tag, or one system group, opened (MOB-035, PhoneTagDetail artboard).
 *
 * A screen that did not exist: tag rows in the library had an empty press
 * handler, so a learner could see that "verbs" had nine cards due and had no
 * way to reach them.
 *
 * The board's order: a way back, the name with its glyph, one readout line, the
 * actions, the tag's decks, then its cards sorted by next review.
 *
 * **Two keys, and Marked has neither.** Study and Browse both act on the group,
 * so they are one solid and one secondary. Marked offers no Study because a
 * mark may not narrow a study queue (ADR-014) — the same rule the web follows.
 *
 * **The board's mastery measure is deliberately not drawn.** The groups
 * endpoint carries no mastery, and deriving one from the page of cards that
 * happens to be loaded would be a number that changes as you scroll. The web
 * left it out for the same reason and recorded it; this is that decision, not a
 * gap.
 */
import { useMemo } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useCardData } from '@nowry/core/hooks/useCardData'
import { useDeckData } from '@nowry/core/hooks/useDeckData'
import { useGroups } from '@nowry/core/hooks/useGroups'
import { deckCounts, deckType } from '@nowry/core/domain/deckTypes'
import { useTheme } from '../theme'
import { Button, Divider, Icon, IdentityTile, ListRow, Readout, Screen, SectionHeader, Skeleton, Stack, Typography } from '../ui'

const GLYPH = { tag: 'Tag', marked: 'Bookmark', struggling: 'TriangleAlert' }

/** Soonest first; a card with no next review has not been seen and sorts last. */
const byNextReview = (a, b) => {
  const at = a.next_review ? new Date(a.next_review).getTime() : Infinity
  const bt = b.next_review ? new Date(b.next_review).getTime() : Infinity
  return at - bt
}

/** `tag:verbs` → a tag; anything else is one of the two system groups. */
export const parseGroupId = (raw) => {
  const id = String(raw ?? '')
  if (id.startsWith('tag:')) return { kind: 'tag', tag: decodeURIComponent(id.slice(4)) }
  return { kind: id === 'marked' ? 'marked' : 'struggling' }
}

export function GroupDetail({ groupId }) {
  const { t } = useTranslation()
  const router = useRouter()
  const theme = useTheme()

  const group = useMemo(() => parseGroupId(groupId), [groupId])
  const isTag = group.kind === 'tag'

  const groups = useGroups({ enabled: true })
  const allDecks = useDeckData(null)
  const cardQuery = useCardData(isTag ? [group.tag] : [], '', false, isTag ? null : group.kind)

  const summary = useMemo(() => {
    const g = groups.groups ?? {}
    if (isTag) return (g.tags ?? []).find((row) => row.tag === group.tag) ?? {}
    return (g.system ?? []).find((row) => row.key === group.kind) ?? {}
  }, [groups.groups, group, isTag])

  const name = isTag ? group.tag : t(`groups.${group.kind}`)
  const asked = (summary.due || 0) + (summary.new || 0)
  // ADR-014: a mark is a bookmark, not a scheduling signal.
  const canStudy = group.kind !== 'marked' && (summary.cards || 0) > 0

  const decks = useMemo(() => {
    const ids = new Set((summary.deck_ids ?? []).map(String))
    return (allDecks.decks ?? []).filter((deck) => ids.has(String(deck._id ?? deck.id)))
  }, [allDecks.decks, summary.deck_ids])

  const cards = useMemo(() => [...(cardQuery.cards ?? [])].sort(byNextReview), [cardQuery.cards])

  const sessionHref = isTag ? `/study/due?tags=${encodeURIComponent(group.tag)}` : `/study/due?group=${group.kind}`

  return (
    <Screen>
      <Stack spacing={2}>
        {/* The way back is a control, not only a gesture: the gesture is there
            too, but a header a screen reader can reach has to be visible. */}
        <Button size='sm' variant='tertiary' onPress={() => router.back()} accessibilityLabel={t('filters.tags')}>
          {t('filters.tags')}
        </Button>

        <Stack direction='row' spacing={1.5} alignItems='center'>
          <Icon name={GLYPH[group.kind] ?? GLYPH.tag} size='md' color='text.secondary' />
          <Typography level='h4'>{name}</Typography>
        </Stack>

        {groups.loading ? (
          <Skeleton width='70%' height={16} />
        ) : (
          <Stack direction='row' spacing={2} flexWrap='wrap'>
            <Readout>{t('groups.detailReadout', { cards: summary.cards ?? 0, decks: summary.decks ?? 0 })}</Readout>
            {summary.due > 0 ? <Readout leading>{t('study.dueCount', { count: summary.due })}</Readout> : null}
            {summary.new > 0 ? <Readout>{t('study.deck.newCount', { count: summary.new })}</Readout> : null}
            {asked === 0 && (summary.cards || 0) > 0 ? <Readout>{t('groups.upToDate')}</Readout> : null}
          </Stack>
        )}

        {canStudy ? (
          <Stack direction='row' spacing={1}>
            <Button variant='secondary' style={{ flex: 1 }} onPress={() => router.push(sessionHref)}>
              {t('groups.browse')}
            </Button>
            <Button style={{ flex: 2 }} onPress={() => router.push(sessionHref)}>
              {t('groups.study', { count: asked })}
            </Button>
          </Stack>
        ) : null}

        {decks.length > 0 ? (
          <>
            <View style={{ height: theme.spacing[1] }} />
            <SectionHeader title={t('groups.decks')} count={String(decks.length)} />
            {decks.map((deck) => {
              const counts = deckCounts(deck)
              return (
                <View key={deck._id ?? deck.id}>
                  <Divider />
                  <ListRow
                    tile={<IdentityTile color={deckType(deck.deck_type).color} />}
                    name={deck.name}
                    readout={
                      <Typography level='body-sm' color={counts.due > 0 ? 'text.primary' : 'text.tertiary'}>
                        {counts.due > 0
                          ? t('study.dueCount', { count: counts.due })
                          : counts.fresh > 0
                            ? t('study.deck.newCount', { count: counts.fresh })
                            : t('study.deck.upToDate')}
                      </Typography>
                    }
                    onPress={() => router.push(`/study/deck/${deck._id ?? deck.id}`)}
                  />
                </View>
              )
            })}
          </>
        ) : null}

        <View style={{ height: theme.spacing[1] }} />
        <SectionHeader
          title={t('groups.cards')}
          count={cardQuery.loading ? null : t('sessions.ofTotal', { shown: cards.length, total: cardQuery.total ?? cards.length })}
        />
        {cardQuery.loading ? (
          <Stack spacing={1}>
            <Skeleton width='100%' height={52} />
            <Skeleton width='100%' height={52} />
          </Stack>
        ) : cards.length === 0 ? (
          <Typography level='body-sm' color='text.tertiary'>
            {t('groups.emptyGroup')}
          </Typography>
        ) : (
          cards.map((card) => (
            <View key={card._id ?? card.id}>
              <Divider />
              <ListRow
                name={card.title || card.question || ''}
                meta={card.deck_name || null}
                readout={
                  <Typography level='body-xs' color='text.tertiary'>
                    {nextReviewLabel(t, card.next_review)}
                  </Typography>
                }
                onPress={() => router.push(`/study/card/${card._id ?? card.id}`)}
              />
            </View>
          ))
        )}
      </Stack>
    </Screen>
  )
}

/** Due now, tomorrow, then "in N days" — the three the board draws. */
function nextReviewLabel(t, iso) {
  if (!iso) return t('study.deckPill.new')
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  if (days <= 0) return t('groups.dueNow')
  if (days === 1) return t('groups.tomorrow')
  return t('groups.inDays', { count: days })
}

export default GroupDetail

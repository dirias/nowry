/**
 * The Study Center's library: Decks · Cards · Tags (MOB-020, PRD D3, ADR-021).
 *
 * One row grammar for all three views. The eye reads *same shape means same
 * class of thing*, so a deck, a card and a tag group are the same row with
 * different contents — which is the whole point of §15.11 and the reason the web
 * stopped drawing one deck four ways.
 *
 * **Filters are an ActionSheet, not a panel.** A filter panel on a phone pushes
 * the list it filters down the screen, so the thing you are judging moves while
 * you judge it. A sheet covers, then leaves.
 *
 * **Virtualised with `FlatList`, not `FlashList`.** The architecture note names
 * `@shopify/flash-list`, which is a native module and therefore another build.
 * `FlatList` is virtualised, ships with React Native, and needs no rebuild. If
 * the 60fps criterion fails on a mid-range device with 500 cards, FlashList is
 * the upgrade and this comment is the reason it was not taken first.
 */
import { useMemo, useState } from 'react'
import { FlatList, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useCardData } from '@nowry/core/hooks/useCardData'
import { useDeckData } from '@nowry/core/hooks/useDeckData'
import { useGroups } from '@nowry/core/hooks/useGroups'
import { MIN_TOUCH_TARGET } from '../ui/buttonSpec'
import { useTheme } from '../theme'
import { DeckCreateSheet } from './DeckCreateSheet'
import { CardPreviewSheet } from './CardPreviewSheet'
import {
  ActionSheet,
  DeckRow,
  GroupRow,
  Icon,
  IconButton,
  SectionHeader,
  Button,
  Chip,
  Divider,
  IdentityTile,
  Input,
  ListRow,
  Measure,
  Readout,
  Segmented,
  Skeleton,
  Stack,
  Typography
} from '../ui'

const VIEWS = { decks: 'decks', cards: 'cards', tags: 'tags' }

/** The board's "Due first" key. The server's own order, and the other one. */
const ORDERS = { due: 'due', alpha: 'alpha' }

export function StudyLibrary({ header }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()

  const [view, setView] = useState(VIEWS.decks)
  const [search, setSearch] = useState('')
  const [markedOnly, setMarkedOnly] = useState(false)
  const [untagged, setUntagged] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [previewing, setPreviewing] = useState(null)

  const [order, setOrder] = useState(ORDERS.due)

  const decks = useDeckData(null)
  /*
   * `/groups`, not `/tags`. The tags endpoint returns `{tag, count}` and the
   * board's row needs cards, decks, due and new — which is exactly what the
   * groups endpoint was added for (STUDY-001). It also carries the two system
   * groups, so one query answers the whole view.
   */
  const groups = useGroups({ enabled: view === VIEWS.tags })
  // Only the cards view pages, so the other two do not pay for a card query.
  const cards = useCardData([], view === VIEWS.cards ? search : '', markedOnly, null, untagged)

  const active = view === VIEWS.decks ? decks : view === VIEWS.cards ? cards : groups
  const loading = active.loading
  const error = active.error

  /** Decks, cards and tag groups, each reduced to the same five slots. */
  const rows = useMemo(() => {
    if (view === VIEWS.decks) {
      /*
       * A deck is drawn by `DeckRow`, the same component the dashboard uses.
       * This list used to build its own row from `card_count` and `due_count` —
       * names the API does not send — so every deck read "cards · 0" with no
       * due count at all. `deckCounts` is now the one reader of those fields.
       */
      return (decks.decks ?? []).map((deck) => ({
        key: deck._id ?? deck.id,
        deck,
        onPress: () => router.push(`/study/deck/${deck._id ?? deck.id}`)
      }))
    }
    if (view === VIEWS.cards) {
      return (cards.cards ?? []).map((card) => ({
        key: card._id ?? card.id,
        name: card.title || card.front || '',
        meta: (card.tags ?? []).join(' · '),
        progress: null,
        readout: null,
        // A card row opens the card, not its deck's settings.
        onPress: () => setPreviewing(card)
      }))
    }
    /*
     * Tags are not only tags (PRD D3): marked and struggling cards are groups a
     * learner opens the same way, across decks. They lead, because they are the
     * two a learner actually looks for.
     *
     * `system` is a LIST of `{key, ...summary}` rows. This screen used to read
     * `groups.marked` and `groups.struggling` as if it were an object keyed by
     * name, so both always showed zero.
     */
    const g = groups.groups ?? {}
    const byKey = Object.fromEntries((g.system ?? []).map((row) => [row.key, row]))
    const special = ['struggling', 'marked'].map((key) => ({
      key,
      name: t(`groups.${key}`),
      meta: key === 'struggling' ? t('groups.strugglingMeta', { days: byKey[key]?.window_days ?? 14 }) : t('groups.markedMeta'),
      glyph: key === 'marked' ? 'Bookmark' : 'TriangleAlert',
      summary: byKey[key] ?? {},
      onPress: () => router.push(`/study/group/${key}`)
    }))

    const needle = search.trim().toLowerCase()
    const tagRows = (g.tags ?? [])
      .filter((row) => !needle || row.tag.toLowerCase().includes(needle))
      .map((row) => ({
        key: `tag:${row.tag}`,
        name: row.tag,
        summary: row,
        onPress: () => router.push(`/study/group/tag:${encodeURIComponent(row.tag)}`)
      }))

    // The server already returns tags due-first; A–Z is the other way a person
    // looks for one they can name.
    if (order === ORDERS.alpha) tagRows.sort((a, b) => a.name.localeCompare(b.name))

    return [...special, ...tagRows]
  }, [view, decks.decks, cards.cards, groups.groups, order, search, router, t])

  const counts = {
    decks: (decks.decks ?? []).length,
    // The card count is the server's total, not the page that has loaded.
    cards: cards.total ?? (cards.cards ?? []).length,
    tags: (groups.groups?.tags ?? []).length
  }

  const filterCount = (markedOnly ? 1 : 0) + (untagged ? 1 : 0)

  const listHeader = (
    <Stack spacing={2} style={{ paddingBottom: theme.spacing[1] }}>
      {header}

      <Segmented
        accessibilityLabel={t('study.views.library')}
        value={view}
        onChange={setView}
        options={[
          { value: VIEWS.decks, label: t('groups.decks'), count: counts.decks },
          { value: VIEWS.cards, label: t('groups.cards'), count: counts.cards },
          { value: VIEWS.tags, label: t('filters.tags'), count: counts.tags }
        ]}
      />

      {view === VIEWS.decks ? (
        <Button size='sm' variant='secondary' onPress={() => setCreating(true)} accessibilityLabel={t('study.today.createDeck')}>
          {t('study.today.createDeck')}
        </Button>
      ) : null}

      {/* One toolbar row: search and the filter key. Never four rows — the web
          library grew to four before the redesign, which is the fault the
          canvas names. The key is icon-only at 44 square, as the board draws
          it, so the field keeps the width. */}
      {view === VIEWS.cards || view === VIEWS.tags ? (
        <Stack direction='row' spacing={1} alignItems='center'>
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder={t(view === VIEWS.tags ? 'filters.searchTags' : 'common.search')}
            accessibilityLabel={t(view === VIEWS.tags ? 'filters.searchTags' : 'common.search')}
            autoCapitalize='none'
            returnKeyType='search'
            style={{ flex: 1 }}
          />
          {view === VIEWS.cards ? (
            <IconButton
              // md is 40 and lg is 48; the board draws 44, which is the
              // standard's own touch minimum and the height the field beside
              // it already uses. `md` plus that floor is the two agreeing.
              size='md'
              style={{ minWidth: MIN_TOUCH_TARGET }}
              variant='secondary'
              onPress={() => setFiltersOpen(true)}
              accessibilityLabel={filterCount > 0 ? `${t('filters.toggle')} · ${filterCount}` : t('filters.toggle')}
            >
              <Icon name='SlidersHorizontal' size='sm' color={filterCount > 0 ? 'primary.plainColor' : 'text.secondary'} />
            </IconButton>
          ) : null}
        </Stack>
      ) : null}

      {/* The section's own readout, and the order it is in. */}
      {view === VIEWS.tags ? (
        <SectionHeader
          title={t('filters.tags')}
          count={String(counts.tags)}
          action={
            <Button
              size='sm'
              variant='tertiary'
              onPress={() => setOrder((current) => (current === ORDERS.due ? ORDERS.alpha : ORDERS.due))}
            >
              {t(order === ORDERS.due ? 'groups.orderDue' : 'groups.orderAlpha')}
            </Button>
          }
        />
      ) : null}
    </Stack>
  )

  return (
    <>
      <FlatList
        data={loading ? [] : rows}
        keyExtractor={(row) => String(row.key)}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ padding: theme.spacing[3], gap: 0 }}
        keyboardShouldPersistTaps='handled'
        ItemSeparatorComponent={Divider}
        onEndReachedThreshold={0.6}
        onEndReached={view === VIEWS.cards ? cards.fetchMore : undefined}
        renderItem={({ item }) =>
          item.deck ? (
            <DeckRow deck={item.deck} onPress={item.onPress} />
          ) : item.summary ? (
            <GroupRow name={item.name} meta={item.meta} glyph={item.glyph} summary={item.summary} onPress={item.onPress} />
          ) : (
            <ListRow
              tile={<IdentityTile color='primary.solidBg' />}
              name={item.name}
              meta={item.meta}
              readout={item.readout ? <Readout leading>{String(item.readout)}</Readout> : null}
              onPress={item.onPress}
            />
          )
        }
        ListEmptyComponent={
          loading ? (
            <Stack spacing={1}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} width='100%' height={44} />
              ))}
            </Stack>
          ) : error ? (
            <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
              {t('home.loadFailed')}
            </Typography>
          ) : (
            <View style={{ paddingVertical: theme.spacing[3] }}>
              <Typography level='body-md' color='text.tertiary'>
                {t('groups.nothingYet')}
              </Typography>
            </View>
          )
        }
      />

      <ActionSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t('filters.toggle')}
        actions={[
          { id: 'marked', label: t('filters.marked'), onPress: () => setMarkedOnly((v) => !v) },
          // Untagged is a filter, not a pseudo-tag (ADR-023).
          { id: 'untagged', label: t('filters.noTag'), onPress: () => setUntagged((v) => !v) },
          {
            id: 'clear',
            label: t('filters.clearAll'),
            onPress: () => {
              setMarkedOnly(false)
              setUntagged(false)
            }
          }
        ]}
      />

      <CardPreviewSheet visible={Boolean(previewing)} card={previewing} onClose={() => setPreviewing(null)} />

      <DeckCreateSheet
        visible={creating}
        onClose={() => setCreating(false)}
        // Not a close: the sheet stays up to confirm, and dismisses itself.
        onCreated={() => decks.reload?.()}
      />
    </>
  )
}

export default StudyLibrary

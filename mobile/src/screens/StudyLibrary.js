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
import { useTags } from '@nowry/core/hooks/useTags'
import { useTheme } from '../theme'
import { DeckCreateSheet } from './DeckCreateSheet'
import { CardPreviewSheet } from './CardPreviewSheet'
import {
  ActionSheet,
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

  const decks = useDeckData(null)
  const tags = useTags({ enabled: view === VIEWS.tags })
  const groups = useGroups({ enabled: view === VIEWS.tags })
  // Only the cards view pages, so the other two do not pay for a card query.
  const cards = useCardData([], view === VIEWS.cards ? search : '', markedOnly, null, untagged)

  const active = view === VIEWS.decks ? decks : view === VIEWS.cards ? cards : tags
  const loading = active.loading
  const error = active.error

  /** Decks, cards and tag groups, each reduced to the same five slots. */
  const rows = useMemo(() => {
    if (view === VIEWS.decks) {
      return (decks.decks ?? []).map((deck) => ({
        key: deck._id ?? deck.id,
        name: deck.name,
        meta: t('study.stats.cards') + ' · ' + (deck.card_count ?? 0),
        progress: deck.mastery ?? 0,
        readout: deck.due_count ?? 0,
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
     */
    const g = groups.groups ?? {}
    const special = [
      { key: 'marked', name: t('groups.marked'), meta: t('groups.markedMeta'), readout: g.marked ?? 0 },
      { key: 'struggling', name: t('groups.struggling'), meta: t('groups.strugglingMeta'), readout: g.struggling ?? 0 }
    ]
    const tagRows = (tags.tags ?? []).map((tag) => ({
      key: `tag:${tag.tag}`,
      name: tag.tag,
      meta: null,
      readout: tag.count ?? 0
    }))
    return [...special, ...tagRows].map((row) => ({ ...row, progress: null, onPress: () => {} }))
  }, [view, decks.decks, cards.cards, tags.tags, groups.groups, router, t])

  const filterCount = (markedOnly ? 1 : 0) + (untagged ? 1 : 0)

  const listHeader = (
    <Stack spacing={2} style={{ paddingBottom: theme.spacing[1] }}>
      {header}

      <Segmented
        accessibilityLabel={t('study.views.library')}
        value={view}
        onChange={setView}
        options={[
          { value: VIEWS.decks, label: t('groups.decks') },
          { value: VIEWS.cards, label: t('groups.cards') },
          { value: VIEWS.tags, label: t('filters.tags') }
        ]}
      />

      {view === VIEWS.decks ? (
        <Button size='sm' variant='secondary' onPress={() => setCreating(true)} accessibilityLabel={t('study.today.createDeck')}>
          {t('study.today.createDeck')}
        </Button>
      ) : null}

      {/* One toolbar row: search and the filter trigger. Never four rows. */}
      {view === VIEWS.cards ? (
        <Stack direction='row' spacing={1} alignItems='center'>
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder={t('common.search')}
            accessibilityLabel={t('common.search')}
            autoCapitalize='none'
            returnKeyType='search'
            style={{ flex: 1 }}
          />
          <Chip size='md' selected={filterCount > 0} onPress={() => setFiltersOpen(true)} accessibilityLabel={t('filters.toggle')}>
            {filterCount > 0 ? `${t('filters.toggle')} · ${filterCount}` : t('filters.toggle')}
          </Chip>
        </Stack>
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
        renderItem={({ item }) => (
          <ListRow
            tile={<IdentityTile color='primary.solidBg' />}
            name={item.name}
            meta={item.meta}
            measure={
              typeof item.progress === 'number' ? <Measure value={item.progress} accessibilityLabel={String(item.progress)} /> : null
            }
            readout={item.readout ? <Readout leading>{String(item.readout)}</Readout> : null}
            onPress={item.onPress}
          />
        )}
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

/**
 * The Study Center's library: Decks · Cards · Tags (MOB-020, PRD D3, ADR-021).
 *
 * One row grammar for all three views. The eye reads *same shape means same
 * class of thing*, so a deck, a card and a tag group are the same row with
 * different contents — which is the whole point of §15.11 and the reason the web
 * stopped drawing one deck four ways.
 *
 * **Filters are a sheet, not a panel.** A filter panel on a phone pushes the
 * list it filters down the screen, so the thing you are judging moves while you
 * judge it. A sheet covers, then leaves. The web's three — Type, Tags and
 * Marked — are three chips whose labels are their readouts, each opening a
 * `ChoiceSheet`; it was one icon-only key over a list of two toggles, so two of
 * the web's three could not be reached at all (MOB-064).
 *
 * **Virtualised with `FlatList`, not `FlashList`.** The architecture note names
 * `@shopify/flash-list`, which is a native module and therefore another build.
 * `FlatList` is virtualised, ships with React Native, and needs no rebuild. If
 * the 60fps criterion fails on a mid-range device with 500 cards, FlashList is
 * the upgrade and this comment is the reason it was not taken first.
 */
import { useEffect, useMemo, useState } from 'react'
import { FlatList, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useCardData } from '@nowry/core/hooks/useCardData'
import { useDeckData } from '@nowry/core/hooks/useDeckData'
import { useGroups } from '@nowry/core/hooks/useGroups'
import { useTags } from '@nowry/core/hooks/useTags'
import { useBulkCardActions } from '@nowry/core/hooks/useBulkCardActions'
import { useCardSelection } from '@nowry/core/hooks/useCardSelection'
import { systemGroup, tagGroups } from '@nowry/core/domain/sessionLog'
import { filterDecks } from '@nowry/core/domain/deckQuery'
import { CARD_TYPES, filterCardsByType } from '@nowry/core/domain/cardTypes'
import { MIN_TOUCH_TARGET } from '../ui/buttonSpec'
import { useTheme } from '../theme'
import { DeckCreateSheet } from './DeckCreateSheet'
import { CardPreviewSheet } from './CardPreviewSheet'
import { BulkOverlays } from './BulkOverlays'
import {
  ActionSheet,
  ChoiceRow,
  ChoiceSheet,
  Checkbox,
  DeckRow,
  GroupRow,
  Icon,
  IconButton,
  SectionHeader,
  SelectionBar,
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
  resolveColor,
  Stack,
  Typography
} from '../ui'

const VIEWS = { decks: 'decks', cards: 'cards', tags: 'tags' }

/** The board's "Due first" key. The server's own order, and the other one. */
const ORDERS = { due: 'due', alpha: 'alpha' }

/** The web's own label keys, which are not the type names. */
const TYPE_LABELS = { flashcard: 'flashcards', quiz: 'quizzes', visual: 'visual' }

export function StudyLibrary({ header }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()

  const [view, setView] = useState(VIEWS.decks)
  const [search, setSearch] = useState('')
  const [markedOnly, setMarkedOnly] = useState(false)
  const [untagged, setUntagged] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [selectedTags, setSelectedTags] = useState([])
  const [filtersOpen, setFiltersOpen] = useState(null)
  const [creating, setCreating] = useState(false)
  const [adding, setAdding] = useState(false)
  const [previewing, setPreviewing] = useState(null)

  const selection = useCardSelection()
  const bulk = useBulkCardActions({
    onDone: (action) => {
      // Tag and untag keep the selection, because the next pick is usually
      // another tag for the same cards. Every other verb is finished with them.
      if (action !== 'tag' && action !== 'untag') selection.clear()
    }
  })
  /*
   * The tags, for the Tags filter and for the move and tag sheets. It used to
   * load only while a selection existed, because the list had no tag filter
   * to offer — the web's toolbar has had one all along (MOB-064).
   */
  const allTags = useTags()

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
  const cards = useCardData(selectedTags, view === VIEWS.cards ? search : '', markedOnly, null, untagged)

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
      /*
       * Filtered by the web's own predicate, from the shared package. This
       * view had no search field and no filtering at all: with four decks that
       * is invisible and with forty it is the screen's whole job (MOB-062).
       */
      return filterDecks(decks.decks, { search, type: filterType, tags: selectedTags }).map((deck) => ({
        key: deck._id ?? deck.id,
        deck,
        onPress: () => router.push(`/study/deck/${deck._id ?? deck.id}`)
      }))
    }
    if (view === VIEWS.cards) {
      // Type is the one axis the list endpoint does not take, so it narrows
      // the loaded page — which is what the web does with the same predicate.
      return filterCardsByType(cards.cards, filterType).map((card) => ({
        key: card._id ?? card.id,
        name: card.title || card.front || '',
        meta: (card.tags ?? []).join(' · '),
        card,
        progress: null,
        readout: null
      }))
    }
    /*
     * Tags are not only tags (PRD D3): marked and struggling cards are groups a
     * learner opens the same way, across decks. They lead, because they are the
     * two a learner actually looks for.
     *
     * `system` arrives as a LIST of rows. This screen read it as an object
     * keyed by name, so both always showed zero; `systemGroup` is that lookup,
     * written once in the shared package.
     */
    const special = ['struggling', 'marked'].map((key) => {
      const summary = systemGroup(groups.groups, key)
      return {
        key,
        name: t(`groups.${key}`),
        meta: key === 'struggling' ? t('groups.strugglingMeta', { days: summary.windowDays }) : t('groups.markedMeta'),
        glyph: key === 'marked' ? 'Bookmark' : 'TriangleAlert',
        summary,
        onPress: () => router.push(`/study/group/${key}`)
      }
    })

    const needle = search.trim().toLowerCase()
    const tagRows = tagGroups(groups.groups)
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
  }, [view, decks.decks, cards.cards, groups.groups, order, search, filterType, selectedTags, router, t])

  const cardIds = useMemo(() => (cards.cards ?? []).map((card) => card._id ?? card.id), [cards.cards])
  const { retain } = selection
  useEffect(() => {
    retain(cardIds)
  }, [cardIds, retain])

  const selectedIds = useMemo(() => cardIds.filter((cardId) => selection.isSelected(cardId)), [cardIds, selection])

  const counts = {
    decks: (decks.decks ?? []).length,
    // The card count is the server's total, not the page that has loaded.
    cards: cards.total ?? (cards.cards ?? []).length,
    tags: (groups.groups?.tags ?? []).length
  }

  const typeNarrowed = filterType !== 'all'
  const tagsNarrowed = selectedTags.length > 0 || untagged
  const tagsCount = selectedTags.length + (untagged ? 1 : 0)
  /** Whether the list is showing less than everything, for the empty state. */
  const filtering = typeNarrowed || tagsNarrowed || markedOnly || Boolean(search)

  const clearFilters = () => {
    setFilterType('all')
    setSelectedTags([])
    setUntagged(false)
    setMarkedOnly(false)
    setSearch('')
  }

  /* The board replaces the whole toolbar while a selection exists, so the list
     never moves under the user's thumb when one starts. */
  const selectionHeader = (
    <Stack direction='row' spacing={1.5} alignItems='center' style={{ minHeight: MIN_TOUCH_TARGET }}>
      <IconButton
        size='md'
        variant='secondary'
        style={{ minWidth: MIN_TOUCH_TARGET }}
        onPress={selection.clear}
        accessibilityLabel={t('cards.select.clear')}
      >
        <Icon name='X' size='sm' color='text.secondary' />
      </IconButton>
      <Typography level='title-lg' style={{ flex: 1 }}>
        {t('cards.select.count', { count: selectedIds.length })}
      </Typography>
      <Button size='sm' variant='tertiary' onPress={() => selection.selectAll(cardIds)}>
        {t('cards.select.all', { count: counts.cards })}
      </Button>
    </Stack>
  )

  const listHeader = selection.selecting ? (
    selectionHeader
  ) : (
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

      {/* One toolbar row: search, the filter key and the one that adds. Never
          four rows — the web library grew to four before the redesign, which is
          the fault the canvas names. The keys are icon-only at 44 square, as
          the board draws them, so the field keeps the width.

          Search is on EVERY view, as the web's toolbar has it. It was on cards
          and tags only, so a deck could be found by scrolling and by nothing
          else (MOB-062). */}
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

        {/*
         * The web's `Add ▾`, which is one key opening a short list — not a
         * full-width slab that says only "Create deck". That slab was the
         * whole of what this screen offered: a new CARD could not be made from
         * the library at all, on a client that has the editor for one.
         * Importing is the one item that stays absent: it needs a file picker,
         * which is a native module and another build (as in Books).
         */}
        <IconButton
          size='md'
          style={{ minWidth: MIN_TOUCH_TARGET }}
          variant='secondary'
          onPress={() => setAdding(true)}
          accessibilityLabel={t('cards.add')}
        >
          <Icon name='Plus' size='sm' color='text.secondary' />
        </IconButton>
      </Stack>

      {/*
       * The web's filter object: `[Type ▾ · Tags ▾ · Marked]`, where each
       * label IS its readout — "Tags" means no filter, "Tags · 2" means two
       * chosen, and a count never becomes a hue (§15.5). A phone has nothing
       * to anchor a menu to, so each opens a sheet, which is the translation
       * the calendar, Browse and the book library all already make.
       *
       * This was one icon-only key opening a list of two toggles, so Type and
       * Tags — two of the web's three — could not be reached at all (MOB-064).
       * Marked is a card idea and stays on the cards view; the other two narrow
       * decks as well, which is what the web's own deck predicate does.
       */}
      {view === VIEWS.tags ? null : (
        <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
          <Chip selected={typeNarrowed} onPress={() => setFiltersOpen('type')}>
            {typeNarrowed ? t('filters.typeReadout', { count: 1 }) : t('filters.type')}
          </Chip>
          <Chip selected={tagsNarrowed} onPress={() => setFiltersOpen('tags')}>
            {tagsNarrowed ? t('filters.tagsReadout', { count: tagsCount }) : t('filters.tags')}
          </Chip>
          {view === VIEWS.cards ? (
            <Chip selected={markedOnly} onPress={() => setMarkedOnly((on) => !on)}>
              {t('filters.marked')}
            </Chip>
          ) : null}
          {/* No clear-all chip, deliberately, and no active-filter strip: the
              web's own rule is that clearing lives inside each menu, so
              engaging a filter never moves the list. A chip that appears when
              a filter is on moves the row under the thumb that just set it.
              "Clear all" belongs to the empty state, where it is the way out. */}
        </Stack>
      )}

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
          ) : item.card ? (
            <ListRow
              // While a selection exists, a tap is a pick — opening a card
              // under the user's thumb mid-selection is how a bulk delete hits
              // the wrong cards.
              tile={
                selection.selecting ? (
                  <Checkbox
                    checked={selection.isSelected(item.key)}
                    onPress={() => selection.toggle(item.key)}
                    accessibilityLabel={t('cards.select.rowAria', { title: item.name })}
                  />
                ) : (
                  <IdentityTile color='primary.solidBg' />
                )
              }
              name={item.name}
              meta={item.meta}
              onPress={selection.selecting ? () => selection.toggle(item.key) : () => setPreviewing(item.card)}
              onLongPress={() => selection.toggle(item.key)}
              style={selection.isSelected(item.key) ? { backgroundColor: resolveColor(theme, 'background.level1') } : undefined}
            />
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
            /*
             * Two different emptinesses, as the web draws them: a list that has
             * nothing in it, and a list whose filters are hiding everything. It
             * said the never-had-any sentence in both cases, so a filter that
             * matched nothing looked like an empty account — and the way back
             * out of it was not on screen (MOB-064).
             */
            <Stack spacing={1} style={{ paddingVertical: theme.spacing[3] }}>
              <Typography level='title-md' color='text.secondary'>
                {view === VIEWS.tags ? t('groups.nothingYet') : t(`cards.manage_content.empty.${view}.title`)}
              </Typography>
              {view === VIEWS.tags ? null : (
                <Typography level='body-sm' color='text.tertiary'>
                  {t(`cards.manage_content.empty.${view}.${filtering ? 'filter' : 'start'}`)}
                </Typography>
              )}
              {filtering ? (
                <View style={{ alignItems: 'flex-start', paddingTop: theme.spacing[1] }}>
                  <Button size='sm' variant='secondary' onPress={clearFilters}>
                    {t('filters.clearAll')}
                  </Button>
                </View>
              ) : null}
            </Stack>
          )
        }
      />

      {/* One of three types, and the sheet closes on the pick. */}
      <ChoiceSheet
        visible={filtersOpen === 'type'}
        onClose={() => setFiltersOpen(null)}
        title={t('filters.type')}
        value={filterType}
        onChange={setFilterType}
        options={CARD_TYPES.map((type) => ({ value: type, label: t(`cards.manage_content.filters.${TYPE_LABELS[type]}`) }))}
      >
        {/* "All" is the absence of a type filter, not a fourth type. */}
        <ChoiceRow
          label={t('public.all')}
          chosen={filterType === 'all'}
          role='radio'
          onPress={() => {
            setFilterType('all')
            setFiltersOpen(null)
          }}
        />
        <Divider />
      </ChoiceSheet>

      {/* Any number of tags, so the sheet stays open while they are ticked. */}
      <ChoiceSheet
        visible={filtersOpen === 'tags'}
        multiple
        onClose={() => setFiltersOpen(null)}
        title={t('filters.tags')}
        value={selectedTags}
        onChange={setSelectedTags}
        options={(allTags.tags ?? []).map((row) => ({ value: row.tag, label: row.tag, count: row.count }))}
        extra={
          <>
            <Divider />
            {/* "No tag" is a FILTER like any tag and clears with the rest — it
                is never a group (PRD D15, ADR-023). */}
            <ChoiceRow label={t('filters.noTag')} chosen={untagged} onPress={() => setUntagged((on) => !on)} />
            {tagsNarrowed ? (
              <ChoiceRow
                label={t('filters.clear')}
                role='button'
                onPress={() => {
                  setSelectedTags([])
                  setUntagged(false)
                }}
              />
            ) : null}
          </>
        }
      />

      <ActionSheet
        visible={adding}
        onClose={() => setAdding(false)}
        title={t('cards.add')}
        actions={[
          { id: 'deck', label: t('cards.newDeck'), onPress: () => setCreating(true) },
          { id: 'card', label: t('cards.newCard'), onPress: () => router.push('/study/card/new') }
        ]}
      />

      {selection.selecting ? (
        <SelectionBar
          disabled={bulk.pending}
          onAction={(action) => {
            if (action === 'move') return bulk.requestMove(selectedIds)
            if (action === 'tag') return bulk.requestTag(selectedIds)
            if (action === 'delete') return bulk.requestDelete(selectedIds)
            return bulk.run('mark', selectedIds)
          }}
        />
      ) : null}

      <BulkOverlays bulk={bulk} decks={decks.decks ?? []} tags={(allTags.tags ?? []).map((row) => row.tag)} />

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

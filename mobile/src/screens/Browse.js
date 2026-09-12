/**
 * Browse — the public catalogue, on the phone (MOB-049, MOB-066).
 *
 * **Books and decks, on one segment, as the web has them.** This screen shipped
 * with decks only, and said so: the phone had no reader, and a shelf of books
 * that cannot be opened is a list of links to nothing. V3 built the reader
 * (MOB-056) and the restriction outlived the reason — the phone browsed half a
 * catalogue while calling itself the catalogue.
 *
 * **A book is opened, a deck is taken.** Both rows offer the same Add key, and
 * a book's title also opens it: `GET /public/books/{id}` returns the whole
 * document, so the reader this client already has can read one without a copy
 * being made first. That is what a catalogue is for. Everything past reading —
 * making cards from it, keeping a position in it — needs the copy, and the row
 * says so by offering it.
 *
 * **A metric renders only above zero** (ADR-012, `evidenceFor`). A zero is not
 * a small number, it is the absence of evidence, and a young catalogue whose
 * every row leads with "0 likes, 0 forks" argues against the thing it is
 * selling. An item with no reactions that is also recent says "New" instead,
 * which is a reason to look rather than a verdict. The rule is the web's own,
 * shared, so the two clients cannot disagree about what a young deck may claim.
 *
 * **Adding is one key and it is idempotent.** The endpoint answers a second
 * request with the copy the first one made, so a double tap costs nothing and
 * the row can say "Added" either way. What it must not do is leave the new deck
 * out of the library, so the library's queries are invalidated on success.
 */
import { useState } from 'react'
import { FlatList, Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { CATALOGUE_KINDS, usePublicCatalogue } from '@nowry/core/hooks/usePublicCatalogue'
import { evidenceFor, publicAuthor, publicCardCount } from '@nowry/core/domain/publicEvidence'
import { useTheme } from '../theme'
import { BrowseFilterSheet, SORTS, SORT_LABELS } from './BrowseFilters'
import { Button, Chip, Divider, Icon, Input, Readout, Segmented, Skeleton, Stack, Typography } from '../ui'

export function Browse({ header = null }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()

  const [kind, setKind] = useState(CATALOGUE_KINDS[0])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState(SORTS[0])
  const [sheet, setSheet] = useState(null)

  const { items, total, loading, error, loadingMore, canLoadMore, loadMore, reload, forking, fork } = usePublicCatalogue({
    kind,
    search,
    category,
    sort
  })

  const controls = (
    <Stack spacing={2}>
      {header}

      {/*
       * The web's own two tabs, with the count on the ACTIVE one. Only that
       * one can carry a count honestly: the browse endpoints return a total
       * for the set they were asked about, and fetching the other half's would
       * be a request for a number nobody has asked to see.
       */}
      <Segmented
        accessibilityLabel={t('public.library')}
        value={kind}
        onChange={setKind}
        options={CATALOGUE_KINDS.map((value) => ({
          value,
          label: t(`public.${value}`),
          count: value === kind && !loading ? total : undefined
        }))}
      />

      <Input
        value={search}
        onChangeText={setSearch}
        placeholder={t('public.searchPlaceholder')}
        accessibilityLabel={t('public.searchPlaceholder')}
      />
      <Stack direction='row' spacing={1}>
        <Chip selected={Boolean(category)} onPress={() => setSheet('category')}>
          {category ? t(`public.categories.${category}`) : t('public.category')}
        </Chip>
        <Chip selected={sort !== SORTS[0]} onPress={() => setSheet('sort')}>
          {t(SORT_LABELS[sort])}
        </Chip>
        {category || sort !== SORTS[0] ? (
          <Chip
            onPress={() => {
              setCategory('')
              setSort(SORTS[0])
            }}
          >
            {t('public.clearFilters')}
          </Chip>
        ) : null}
      </Stack>
      {total > 0 ? <Readout>{t('public.showingOf', { count: items.length, total })}</Readout> : null}
    </Stack>
  )

  if (error) {
    return (
      <Stack spacing={2}>
        {controls}
        <Typography level='body-md' color='danger.plainColor' accessibilityLiveRegion='polite'>
          {t('public.noResults')}
        </Typography>
        <Button variant='secondary' onPress={reload}>
          {t('common.retry')}
        </Button>
      </Stack>
    )
  }

  return (
    <>
      <FlatList
        data={items}
        keyExtractor={(deck) => String(deck._id ?? deck.id)}
        contentContainerStyle={{ padding: theme.spacing[3] }}
        ListHeaderComponent={<View style={{ paddingBottom: theme.spacing[2] }}>{controls}</View>}
        renderItem={({ item }) => (
          <CatalogueRow
            item={item}
            kind={kind}
            state={forking[item._id ?? item.id]}
            onAdd={() => fork(item._id ?? item.id).catch(() => {})}
            /* Decks have no reader here; a deck's row is its Add key alone. */
            onOpen={kind === 'books' ? () => router.push(`/book/${item._id ?? item.id}?public=1`) : undefined}
            t={t}
          />
        )}
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={
          loading ? (
            <Stack spacing={2}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} width='100%' height={64} />
              ))}
            </Stack>
          ) : (
            <Stack spacing={1} style={{ paddingVertical: theme.spacing[4] }}>
              <Typography level='title-md' color='text.secondary'>
                {t('public.noResults')}
              </Typography>
              <Typography level='body-sm' color='text.secondary'>
                {t('public.tryFilters')}
              </Typography>
            </Stack>
          )
        }
        ListFooterComponent={
          canLoadMore ? (
            <View style={{ paddingVertical: theme.spacing[2] }}>
              <Button variant='secondary' loading={loadingMore} onPress={() => loadMore()}>
                {t('public.loadMore')}
              </Button>
            </View>
          ) : null
        }
      />

      <BrowseFilterSheet
        open={sheet}
        onClose={() => setSheet(null)}
        category={category}
        onCategory={setCategory}
        sort={sort}
        onSort={setSort}
      />
    </>
  )
}

/**
 * One public item: what it is, who made it, and what it has to show for itself.
 *
 * The Add key is secondary rather than solid: a list of twenty rows with twenty
 * solid keys is a list with no hierarchy at all. Once an item is taken the key
 * becomes a statement rather than an offer.
 *
 * A book's title opens it; a deck's does not, because this client reads
 * documents and studies decks, and a deck is studied from the library it has
 * been added to.
 */
function CatalogueRow({ item: deck, kind, state, onAdd, onOpen, t }) {
  const evidence = evidenceFor(deck)
  // Both fields are read through the shared package, which is what lets the
  // API-field guard see them: this row's first build invented
  // `deck.author?.username`, and an invented camelCase path fails silently
  // forever (MOB-050).
  const author = publicAuthor(deck)
  const added = state === 'added'

  // Each metric is a number and its noun, and only when the number is above
  // zero. The nouns are the web's own keys.
  const metrics = [
    evidence.showViews ? `${evidence.views} ${t('public.views')}` : null,
    evidence.showLikes ? `${evidence.likes} ${t('public.likes')}` : null,
    evidence.showForks ? `${evidence.forks} ${t('public.forks')}` : null
  ].filter(Boolean)

  return (
    <Stack direction='row' spacing={2} style={{ alignItems: 'center', paddingVertical: 8 }}>
      <Pressable
        onPress={onOpen}
        disabled={!onOpen}
        accessibilityRole={onOpen ? 'button' : undefined}
        accessibilityLabel={onOpen ? t('books.lib.rowAria', { title: deck.title || deck.name }) : undefined}
        style={({ pressed }) => ({ flex: 1, minWidth: 0, opacity: pressed && onOpen ? 0.7 : 1 })}
      >
        <Stack direction='row' spacing={1} style={{ alignItems: 'center' }}>
          <Typography level='body-md' numberOfLines={1} style={{ flexShrink: 1 }}>
            {deck.name || deck.title}
          </Typography>
          {/* Only ever on an item with nothing else to say for itself. */}
          {evidence.isNew ? <Chip size='sm'>{t('public.newBadge')}</Chip> : null}
        </Stack>
        <Typography level='body-xs' color='text.tertiary' numberOfLines={1}>
          {[
            author ? t('public.byAuthor', { name: author }) : null,
            evidence.showCategory ? t(`public.categories.${evidence.category}`, evidence.category) : null,
            kind === 'decks' && publicCardCount(deck) ? `${publicCardCount(deck)} ${t('public.cards')}` : null,
            ...metrics
          ]
            .filter(Boolean)
            .join(' · ')}
        </Typography>
      </Pressable>

      <Button
        size='sm'
        variant='secondary'
        disabled={added}
        loading={state === 'working'}
        startGlyph={added ? <Icon name='Check' size='sm' color='success.plainColor' /> : null}
        onPress={onAdd}
      >
        {added ? t('public.added') : t('public.add')}
      </Button>
    </Stack>
  )
}

export default Browse

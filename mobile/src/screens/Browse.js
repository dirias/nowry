/**
 * Browse — the public deck catalogue, on the phone (MOB-049).
 *
 * **Decks, not books.** The same endpoints serve both and the web browses both,
 * but this client has no reader: a shelf of books that cannot be opened is a
 * list of links to nothing, which is the fault I had just fixed in Home's
 * next-steps row. Books arrive here when Books arrives.
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
import { FlatList, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { usePublicDecks } from '@nowry/core/hooks/usePublicDecks'
import { evidenceFor, publicAuthor, publicCardCount } from '@nowry/core/domain/publicEvidence'
import { useTheme } from '../theme'
import { BrowseFilterSheet, SORTS, SORT_LABELS } from './BrowseFilters'
import { Button, Chip, Divider, Icon, Input, Readout, Skeleton, Stack, Typography } from '../ui'

export function Browse({ header = null }) {
  const { t } = useTranslation()
  const theme = useTheme()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState(SORTS[0])
  const [sheet, setSheet] = useState(null)

  const { decks, total, loading, error, loadingMore, canLoadMore, loadMore, reload, forking, fork } = usePublicDecks({
    search,
    category,
    sort
  })

  const controls = (
    <Stack spacing={2}>
      {header}
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
      {total > 0 ? <Readout>{t('public.showingOf', { count: decks.length, total })}</Readout> : null}
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
        data={decks}
        keyExtractor={(deck) => String(deck._id ?? deck.id)}
        contentContainerStyle={{ padding: theme.spacing[3] }}
        ListHeaderComponent={<View style={{ paddingBottom: theme.spacing[2] }}>{controls}</View>}
        renderItem={({ item }) => (
          <DeckRow deck={item} state={forking[item._id ?? item.id]} onAdd={() => fork(item._id ?? item.id).catch(() => {})} t={t} />
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
 * One public deck: what it is, who made it, and what it has to show for itself.
 *
 * The Add key is the row's only control, and it is secondary rather than solid:
 * a list of twenty rows with twenty solid keys is a list with no hierarchy at
 * all. Once a deck is taken the key becomes a statement rather than an offer.
 */
function DeckRow({ deck, state, onAdd, t }) {
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
      <View style={{ flex: 1, minWidth: 0 }}>
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
            publicCardCount(deck) ? `${publicCardCount(deck)} ${t('public.cards')}` : null,
            ...metrics
          ]
            .filter(Boolean)
            .join(' · ')}
        </Typography>
      </View>

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

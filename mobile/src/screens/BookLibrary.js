/**
 * The library at `/books` (MOB-055).
 *
 * A Nowry book is a DOCUMENT — something written in the editor — and some are
 * files imported to read. `docs/prd-books-library.md` records the correction
 * that established that, and the page it describes answers two questions: where
 * you were, and what your notes have produced for study. This is that page on a
 * phone, on the same rules: the continue object, the written/imported segment,
 * and one row anatomy for every document.
 *
 * **Nothing about a document is decided here.** Which one is "continue",
 * section coverage, the reading page, the counts, the filter and the sort are
 * `libraryQuery` in the shared package — where they were moved from a web
 * component folder for this, because two copies would be two libraries.
 *
 * **No editing, and no importing.** V3 reads a document and makes cards from it
 * (PRD FR-031…FR-034). Importing a PDF needs a file picker, which is a native
 * module and a new build; writing needs Lexical, which has no React Native
 * build at all. Both are named decisions rather than gaps — which is also why
 * the web's "Add" key in the title row is absent here and not a drift.
 *
 * **The grid is back** (MOB-097). MOB-082 recorded its absence as a decision to
 * settle rather than a fault, on the reasoning that a row at 390pt carries more
 * than a tile does. The web defaults to a two-up grid on a phone and offers
 * both, and offering both is the answer: the row is for reading the library and
 * the tile is for recognising a cover, and which one you want depends on what
 * you came for.
 */
import { useMemo, useState } from 'react'
import { FlatList, Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useBooks } from '@nowry/core/hooks/useBooks'
import { cardsReadout, metaLine } from '@nowry/core/domain/books/documentCopy'
import {
  KINDS,
  SORTS,
  cardsFrom,
  coverage,
  filterDocuments,
  kindCounts,
  kindOf,
  pickContinue,
  readingPage,
  resumeHref,
  sectionsWithoutCards,
  sortDocuments,
  tagCounts
} from '@nowry/core/domain/books/libraryQuery'
import { useTheme } from '../theme'
import { LibraryFilterSheet } from './BookLibraryFilters'
import { MakeCardsSheet } from './MakeCards'
import {
  Button,
  Card,
  Chip,
  CoverMark,
  Divider,
  Icon,
  IconButton,
  Input,
  ListRow,
  Readout,
  Screen,
  Segmented,
  Skeleton,
  Stack,
  SummaryObject,
  Typography,
  resolveColor
} from '../ui'

export function BookLibrary() {
  const { t, i18n } = useTranslation()
  const language = i18n?.language ?? 'en'
  const theme = useTheme()
  const router = useRouter()

  const [kind, setKind] = useState(KINDS[0])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState(SORTS[0])
  const [tags, setTags] = useState([])
  const [sheet, setSheet] = useState(null)
  /*
   * Grid by default, as the web's library is. Not persisted: the web keeps it
   * in `localStorage`, and a preference that lives on one device is a setting
   * this client would have to invent a home for — worth doing when it is asked
   * for, not while restoring the view itself.
   */
  const [grid, setGrid] = useState(true)
  /** The document whose sections are being turned into cards, if any. */
  const [making, setMaking] = useState(null)

  const { books, loading, error, reload } = useBooks()

  const counts = useMemo(() => kindCounts(books), [books])
  const allTags = useMemo(() => tagCounts(books), [books])
  const rows = useMemo(() => sortDocuments(filterDocuments(books, { kind, search, tags }), sort), [books, kind, search, tags, sort])
  const continues = useMemo(() => pickContinue(books), [books])

  const when = (value) => (value ? new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' }).format(new Date(value)) : '')

  /*
   * Where you were, not the top. `resumeHref` is the shared answer — the
   * section for a written document, the page for an import — and the phone
   * pushed a bare `/book/<id>`, so a reader who stopped halfway started again
   * at the beginning even though the pointer was saved (MOB-067).
   */
  const open = (book) => router.push(resumeHref(book))

  if (error) {
    return (
      <Screen>
        <Stack spacing={2}>
          <Typography level='body-md' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t('books.lib.loadError')}
          </Typography>
          <Button variant='secondary' onPress={reload}>
            {t('books.lib.retry')}
          </Button>
        </Stack>
      </Screen>
    )
  }

  const header = (
    <Stack spacing={2} style={{ paddingBottom: theme.spacing[2] }}>
      <Typography level='h4' accessibilityRole='header'>
        {t('books.title')}
      </Typography>

      {loading && books.length === 0 ? (
        <Skeleton width='100%' height={96} />
      ) : (
        <ContinueCard book={continues} onOpen={open} onMakeCards={() => setMaking(continues)} when={when} t={t} />
      )}

      {/*
       * The web's own toolbar, in its own order: the kind segment with counts,
       * then search, then Tags and Sort as menus whose labels are their
       * readouts. It was three plain keys and a search box before — the same
       * information in a different shape, which is the kind of drift that makes
       * two clients cost twice as much to keep in step.
       */}
      <Segmented
        accessibilityLabel={t('books.lib.kindAria')}
        value={kind}
        onChange={setKind}
        options={KINDS.map((value) => ({ value, label: `${t(`books.lib.kind.${value}`)} · ${counts[value]}` }))}
      />

      <Input value={search} onChangeText={setSearch} placeholder={t('books.lib.search')} accessibilityLabel={t('books.lib.search')} />

      <Stack direction='row' spacing={1}>
        {allTags.length > 0 ? (
          <Chip selected={tags.length > 0} onPress={() => setSheet('tags')}>
            {tags.length > 0 ? t('books.lib.tagsReadout', { count: tags.length }) : t('books.lib.tags')}
          </Chip>
        ) : null}
        <Chip selected={sort !== SORTS[0]} onPress={() => setSheet('sort')}>
          {t('books.lib.sort', { by: t(`books.lib.sortBy.${sort}`) })}
        </Chip>

        <View style={{ flex: 1 }} />

        {/* Grid or list, as the web's own toggle — at the far end of the
            toolbar row, because it governs the shape of what is below rather
            than which documents are in it. */}
        <IconButton
          variant={grid ? 'secondary' : 'tertiary'}
          onPress={() => setGrid(true)}
          accessibilityLabel={t('books.lib.viewGrid')}
          accessibilityState={{ selected: grid }}
        >
          <Icon name='LayoutGrid' size='sm' color={grid ? 'text.primary' : 'text.tertiary'} />
        </IconButton>
        <IconButton
          variant={grid ? 'tertiary' : 'secondary'}
          onPress={() => setGrid(false)}
          accessibilityLabel={t('books.lib.viewList')}
          accessibilityState={{ selected: !grid }}
        >
          <Icon name='List' size='sm' color={grid ? 'text.tertiary' : 'text.primary'} />
        </IconButton>
      </Stack>
    </Stack>
  )

  /*
   * One cell per column, so an odd last row keeps its empty half. Computed
   * rather than memoised: there is an early return above this, and a hook after
   * one is a hook that does not always run.
   */
  const cells = grid && rows.length % 2 === 1 ? [...rows, { _id: '__filler__', filler: true }] : rows

  return (
    <Screen scroll={false} padding={0}>
      <FlatList
        data={cells}
        // Two up in the grid, which is the web's own `xs` column count.
        key={grid ? 'grid' : 'list'}
        numColumns={grid ? 2 : 1}
        columnWrapperStyle={grid ? { gap: theme.spacing[1.5] } : undefined}
        keyExtractor={(book) => String(book._id)}
        contentContainerStyle={{ padding: theme.spacing[3], gap: grid ? theme.spacing[1.5] : 0 }}
        ListHeaderComponent={header}
        ItemSeparatorComponent={grid ? null : Divider}
        renderItem={({ item }) =>
          /* The filler for an odd last row. Without it `flex: 1` makes a lone
             tile fill the width and the grid stops being a grid on its last
             line — the web's `repeat(2, 1fr)` keeps the column either way. */
          item.filler ? (
            <View style={{ flex: 1 }} />
          ) : grid ? (
            <DocumentTile book={item} isContinue={item._id === continues?._id} onOpen={() => open(item)} when={when} theme={theme} t={t} />
          ) : (
            <DocumentRow book={item} isContinue={item._id === continues?._id} onOpen={() => open(item)} when={when} t={t} />
          )
        }
        ListEmptyComponent={
          loading ? (
            <Stack spacing={2}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} width='100%' height={56} />
              ))}
            </Stack>
          ) : (
            <Typography level='body-md' color='text.secondary'>
              {search || kind !== 'all' ? t('books.lib.noMatches') : t('books.lib.emptySentence')}
            </Typography>
          )
        }
      />

      {/* The same sheet the reader opens, so a document makes cards the one
          way whichever screen asked for them. */}
      <MakeCardsSheet open={Boolean(making)} book={making} onClose={() => setMaking(null)} />

      <LibraryFilterSheet
        open={sheet}
        onClose={() => setSheet(null)}
        sort={sort}
        onSort={setSort}
        tags={tags}
        onTags={setTags}
        available={allTags}
      />
    </Screen>
  )
}

/**
 * Where you were: the most recently edited document, named by what you were
 * doing to it. An empty library says so in the same object rather than on a
 * different screen (ADR-021 §1) — and it says it without offering to import or
 * to write, because this client can do neither.
 */
function ContinueCard({ book, onOpen, onMakeCards, when, t }) {
  if (!book) {
    return <SummaryObject title={t('books.title')} empty={t('books.lib.emptySentence')} />
  }

  const imported = kindOf(book) === 'imported'
  const position = readingPage(book)
  const covered = coverage(book)
  // Only a written document has sections waiting for cards; an import has pages.
  const gap = imported ? 0 : sectionsWithoutCards(book)

  return (
    <SummaryObject
      title={imported ? t('books.lib.continueReading') : t('books.lib.continueWriting')}
      context={book.title || t('books.untitled')}
      progress={imported ? position?.pct : covered?.pct}
      readouts={
        <>
          <Readout leading>
            {imported ? t('books.lib.openedAt', { when: when(book.updated_at) }) : t('books.lib.editedAt', { when: when(book.updated_at) })}
          </Readout>
          {imported && position ? <Readout>{t('books.lib.pagesRead', { page: position.page, total: position.total })}</Readout> : null}
          {cardsFrom(book) ? <Readout>{t('books.lib.cardsFromDocument', { count: cardsFrom(book) })}</Readout> : null}
          {/*
           * What the document owes you TODAY, which this object dropped. Every
           * other readout here is a fact about the document; this is the only
           * one that asks for something, and the web draws it in `text.primary`
           * for exactly that reason. Above zero only (ADR-012) — a summary that
           * reports having nothing due is reporting an absence.
           */}
          {book.due > 0 ? <Readout leading>{t('books.lib.dueToday', { count: book.due })}</Readout> : null}
        </>
      }
      action={
        <Button size='sm' onPress={() => onOpen(book)}>
          {t('books.lib.continue')}
        </Button>
      }
      /*
       * The web's second key, which this object never had (MOB-082 recorded it,
       * MOB-097 builds it). "Make cards · N sections" is the whole point of
       * having written the document, and on the phone the only way to it was to
       * open the reader and find it in there — so the object that says what the
       * document owes you could not act on it.
       *
       * Above zero only, as the web is: a document whose every section already
       * has cards is not offered a key that would make none.
       *
       * The web's OTHER second key is Listen, for an imported document. Speech
       * exists on this client since MOB-077 but is wired to cards alone, and
       * reading a document aloud is a feature rather than a wiring — left named
       * rather than half-built.
       */
      secondary={
        gap > 0 ? (
          <Button size='sm' variant='secondary' onPress={onMakeCards}>
            {t('books.lib.makeCardsSections', { count: gap })}
          </Button>
        ) : null
      }
    />
  )
}

/**
 * One document, as a tile (MOB-097).
 *
 * The web's own anatomy: a coloured cover mark, the title over two lines, and
 * the same meta line the row carries — which is the point of having both views
 * rather than two different documents. Nothing here is a second reading of a
 * book; `metaLine` and `cardsReadout` are the row's readers.
 *
 * The cover is the document's own colour, which is the one thing a tile has
 * that a row does not: at two up you recognise a book by its cover before you
 * have read its name.
 */
function DocumentTile({ book, isContinue = false, onOpen, when, theme, t }) {
  const readout = cardsReadout(t, book)

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole='button'
      accessibilityLabel={book.title || t('books.untitled')}
      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
    >
      <Card padding={1.5} radius='md'>
        <Stack spacing={1}>
          {/*
           * The cover, above the title and in a book's own proportion
           * (BOOK-010). This was a 64-point landscape SLAB across the tile's
           * full width — a book is taller than wide and that was the opposite,
           * and it broke D5's "no hero", which the web's tile obeys. It is the
           * reason the grid read as "just square boxes".
           */}
          <CoverMark book={book} width={62} ribbon={isContinue} ground='background.level1' />

          <Typography level='title-sm' numberOfLines={2}>
            {book.title || t('books.untitled')}
          </Typography>
          <Typography level='body-xs' color='text.tertiary' numberOfLines={2}>
            {metaLine(t, book, when)}
          </Typography>
          {readout ? (
            <Readout leading={Boolean(readout.strong)}>{[readout.strong, readout.rest].filter(Boolean).join(' · ')}</Readout>
          ) : null}
        </Stack>
      </Card>
    </Pressable>
  )
}

/**
 * One document. The title, then what it is made of, then what it has produced:
 * an import counts pages, a written document counts words and sections, and
 * both count the cards that came out of them.
 */
function DocumentRow({ book, isContinue = false, onOpen, when, t }) {
  /*
   * The web's own composition, from the web's own module. The first build wrote
   * its own and got three things wrong that only an emulator showed: it ran
   * words and sections into one phrase, it printed "no cards yet" where the web
   * is deliberately silent — absence is the default and the gap is named once,
   * on the summary object (D8) — and it drew a measure the web hides below
   * `sm`, because a row on 390pt has no width to spare for a bar.
   */
  const meta = metaLine(t, book, when)
  const readout = cardsReadout(t, book)

  return (
    <ListRow
      /* The cover, where a generic book glyph was: page or book by kind (BOOK-010). */
      tile={<CoverMark book={book} width={28} ribbon={isContinue} />}
      name={book.title || t('books.untitled')}
      meta={meta}
      readout={
        readout ? (
          <Readout leading={Boolean(readout.strong)}>{[readout.strong, readout.rest].filter(Boolean).join(' · ')}</Readout>
        ) : undefined
      }
      onPress={onOpen}
      accessibilityLabel={t('books.lib.rowAria', { title: book.title || t('books.untitled') })}
    />
  )
}

export default BookLibrary

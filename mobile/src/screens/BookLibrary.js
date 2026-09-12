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
 * build at all. Both are named decisions rather than gaps.
 */
import { useMemo, useState } from 'react'
import { FlatList, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useBooks } from '@nowry/core/hooks/useBooks'
import {
  KINDS,
  SORTS,
  cardsFrom,
  composition,
  coverage,
  filterDocuments,
  kindCounts,
  kindOf,
  pickContinue,
  readingPage,
  sortDocuments,
  tagCounts
} from '@nowry/core/domain/books/libraryQuery'
import { useTheme } from '../theme'
import { LibraryFilterSheet } from './BookLibraryFilters'
import {
  Button,
  Chip,
  Divider,
  Icon,
  Input,
  ListRow,
  Measure,
  Readout,
  Screen,
  Segmented,
  Skeleton,
  Stack,
  SummaryObject,
  Typography
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

  const { books, loading, error, reload } = useBooks()

  const counts = useMemo(() => kindCounts(books), [books])
  const allTags = useMemo(() => tagCounts(books), [books])
  const rows = useMemo(() => sortDocuments(filterDocuments(books, { kind, search, tags }), sort), [books, kind, search, tags, sort])
  const continues = useMemo(() => pickContinue(books), [books])

  const when = (value) => (value ? new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' }).format(new Date(value)) : '')

  const open = (book) => router.push(`/book/${book._id}`)

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
        <ContinueCard book={continues} onOpen={open} when={when} t={t} />
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
      </Stack>
    </Stack>
  )

  return (
    <Screen scroll={false} padding={0}>
      <FlatList
        data={rows}
        keyExtractor={(book) => String(book._id)}
        contentContainerStyle={{ padding: theme.spacing[3] }}
        ListHeaderComponent={header}
        ItemSeparatorComponent={Divider}
        renderItem={({ item }) => <DocumentRow book={item} onOpen={() => open(item)} when={when} t={t} />}
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
function ContinueCard({ book, onOpen, when, t }) {
  if (!book) {
    return <SummaryObject title={t('books.title')} empty={t('books.lib.emptySentence')} />
  }

  const imported = kindOf(book) === 'imported'
  const position = readingPage(book)
  const covered = coverage(book)

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
        </>
      }
      action={
        <Button size='sm' onPress={() => onOpen(book)}>
          {t('books.lib.continue')}
        </Button>
      }
    />
  )
}

/**
 * One document. The title, then what it is made of, then what it has produced:
 * an import counts pages, a written document counts words and sections, and
 * both count the cards that came out of them.
 */
function DocumentRow({ book, onOpen, when, t }) {
  const imported = kindOf(book) === 'imported'
  const covered = coverage(book)
  const position = readingPage(book)
  const made = composition(book)
  const cards = cardsFrom(book)

  const meta = [
    imported
      ? position
        ? t('books.lib.pages', { count: position.total })
        : null
      : made.sections
        ? t('books.lib.wordsInSections', { words: made.words, count: made.sections })
        : null,
    cards ? t('books.lib.cards', { count: cards }) : t('books.lib.noCardsYet'),
    imported ? t('books.lib.openedAt', { when: when(book.updated_at) }) : t('books.lib.editedAt', { when: when(book.updated_at) })
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <ListRow
      tile={<Icon name={imported ? 'BookOpen' : 'Book'} size='md' color='text.tertiary' />}
      name={book.title || t('books.untitled')}
      meta={meta}
      measure={covered ? <Measure value={covered.pct} accessibilityLabel={t('books.lib.sectionsCovered', covered)} /> : undefined}
      readout={covered ? <Readout>{`${covered.covered}/${covered.total}`}</Readout> : undefined}
      onPress={onOpen}
      accessibilityLabel={t('books.lib.rowAria', { title: book.title || t('books.untitled') })}
    />
  )
}

export default BookLibrary

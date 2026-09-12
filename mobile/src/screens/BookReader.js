/**
 * Reading a document at `/book/<id>` (MOB-056).
 *
 * The body is a Lexical editor state and Lexical has no React Native build, so
 * there is no editor to mount. There does not need to be: `readDocument` in the
 * shared package walks the stored tree once and hands back flat blocks, and
 * this draws them. Neither side owns the format, and the walk is tested without
 * a device.
 *
 * **A document written before the Content-First change holds HTML**, and a
 * phone has no DOM to parse it with. It says so, plainly, rather than showing
 * an empty page for a document with words in it.
 *
 * **Reading is the whole of it.** No editing in V3 (PRD FR-032): Lexical is the
 * editor, and a WebView or a rewrite is a decision rather than a port. What the
 * phone does instead is the thing a phone is good for — read it, and turn it
 * into cards.
 *
 * **It also reads a document that is not yours.** `?public=1` loads it through
 * `GET /public/books/{id}`, which returns the whole document, so the catalogue
 * can be read rather than only acquired (MOB-066). What it cannot do is
 * everything past reading: making cards writes into your library from a
 * document the server expects you to own, so a public read offers the copy
 * instead — take it, and it is yours to work with.
 */
import { useMemo, useState } from 'react'
import { Linking, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@nowry/core/api/queryClient'
import { booksService, publicContentService } from '@nowry/core/api/services'
import { useAuth } from '@nowry/core/context/AuthContext'
import { documentWordCount, readDocument } from '@nowry/core/domain/books/lexicalDocument'
import { useSubscription } from '@nowry/core/hooks/useSubscription'
import { useTheme } from '../theme'
import { resolveColor } from '../ui/Typography'
import { MakeCardsSheet } from './MakeCards'
import { Button, Divider, Icon, Readout, Screen, Skeleton, Stack, Typography } from '../ui'

/** The tiers whose accounts can generate; `free` cannot, and is not told so. */
const CAN_GENERATE = ['plus', 'pro']

export function BookReader() {
  const { bookId, public: asPublic } = useLocalSearchParams()
  const { t, i18n } = useTranslation()
  const language = i18n?.language ?? 'en'
  const theme = useTheme()
  const router = useRouter()
  const { user } = useAuth()
  const { tier } = useSubscription()
  const [makingCards, setMakingCards] = useState(false)

  const id = String(bookId)
  /*
   * A public document is somebody else's, so it is a different resource and a
   * different cache entry — keying both as `['book', user, id]` would serve a
   * catalogue read from the owner's copy and the other way round.
   */
  const isPublic = asPublic === '1'
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: isPublic ? ['publicBook', id] : ['book', user?.id ?? null, id],
    queryFn: () => (isPublic ? publicContentService.getPublicBook(id) : booksService.getById(id)),
    enabled: Boolean(user?.id && id),
    // A document changes when its author changes it, which is not while they
    // are reading it on another device.
    staleTime: 5 * 60 * 1000
  })

  const document = useMemo(() => readDocument(data?.full_content), [data])
  const words = useMemo(() => documentWordCount(document.blocks), [document])

  if (isLoading && !data) {
    return (
      <Screen>
        <Stack spacing={2}>
          <Skeleton width='70%' height={28} />
          <Skeleton width='100%' height={16} />
          <Skeleton width='100%' height={16} />
          <Skeleton width='90%' height={16} />
        </Stack>
      </Screen>
    )
  }

  if (error && !data) {
    return (
      <Screen>
        <Stack spacing={2}>
          <Typography level='body-md' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t('books.lib.loadError')}
          </Typography>
          <Button variant='secondary' onPress={() => router.back()}>
            {t('common.goBack')}
          </Button>
        </Stack>
      </Screen>
    )
  }

  return (
    <Screen>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography level='h4' accessibilityRole='header'>
            {data?.title || t('books.untitled')}
          </Typography>
          {/* Grouped, as the library's row writes the same number: 1,517 there
              and 1517 here is one app disagreeing with itself about a count. */}
          {words > 0 ? <Readout>{t('books.lib.words', { words: words.toLocaleString(language), count: words })}</Readout> : null}
        </Stack>

        {/*
         * Only where the account can already use it. The web badges this key
         * and opens its upgrade sheet; no mobile screen may advertise a paid
         * tier at all (ADR-030), so here it is simply absent rather than shown
         * locked. Reading the document is free either way.
         */}
        {isPublic ? (
          /*
           * Somebody else's document: the one thing to offer is the copy. The
           * endpoint is idempotent on (book, user), so a second tap replays the
           * copy that exists rather than making another.
           */
          <Button
            variant='secondary'
            disabled={added}
            loading={adding}
            startGlyph={added ? <Icon name='Check' size='sm' color='success.plainColor' /> : null}
            onPress={async () => {
              setAdding(true)
              try {
                await publicContentService.forkBook(id)
                queryClient.invalidateQueries({ queryKey: ['books'] })
                setAdded(true)
              } catch {
                // The client's interceptor already reports the failure; the key
                // simply stays an offer.
              } finally {
                setAdding(false)
              }
            }}
          >
            {added ? t('public.added') : t('public.add')}
          </Button>
        ) : CAN_GENERATE.includes(tier) ? (
          <Button variant='secondary' onPress={() => setMakingCards(true)}>
            {t('books.makeCards.title')}
          </Button>
        ) : null}

        {document.format === 'legacy-html' ? (
          <Typography level='body-md' color='text.secondary'>
            {t('books.reader.legacyOnly')}
          </Typography>
        ) : document.blocks.length === 0 ? (
          <Typography level='body-md' color='text.secondary'>
            {t('books.reader.empty')}
          </Typography>
        ) : (
          <Stack spacing={2}>
            {document.blocks.map((block, index) => (
              <Block key={index} block={block} theme={theme} t={t} />
            ))}
          </Stack>
        )}
      </Stack>

      <MakeCardsSheet open={makingCards && !isPublic} book={data} onClose={() => setMakingCards(false)} />
    </Screen>
  )
}

/** The heading levels this reader draws, capped at the type scale's own top. */
const HEADING_LEVELS = { 1: 'h3', 2: 'h4', 3: 'title-lg', 4: 'title-md', 5: 'title-sm', 6: 'title-sm' }

function Block({ block, theme, t }) {
  switch (block.type) {
    case 'heading':
      return (
        <Typography level={HEADING_LEVELS[block.level] ?? 'title-md'} accessibilityRole='header'>
          <Spans spans={block.spans} level={HEADING_LEVELS[block.level] ?? 'title-md'} />
        </Typography>
      )

    case 'paragraph':
      return (
        <Typography level='body-md'>
          <Spans spans={block.spans} level='body-md' />
        </Typography>
      )

    case 'quote':
      return (
        <View style={{ paddingLeft: theme.spacing[2], borderLeftWidth: 2, borderLeftColor: resolveColor(theme, 'primary.plainColor') }}>
          <Typography level='body-md' color='text.secondary'>
            <Spans spans={block.spans} level='body-md' />
          </Typography>
        </View>
      )

    case 'list':
      return (
        <Stack spacing={1}>
          {block.items.map((item, index) => (
            <Stack key={index} direction='row' spacing={2}>
              {/* The marker is text, so it wraps and scales with the line it
                  belongs to rather than being a drawn dot that does not. */}
              <Typography level='body-md' color='text.tertiary'>
                {block.ordered ? `${index + 1}.` : '•'}
              </Typography>
              <Typography level='body-md' style={{ flex: 1 }}>
                <Spans spans={item} level='body-md' />
              </Typography>
            </Stack>
          ))}
        </Stack>
      )

    case 'code':
      return (
        <View
          style={{ padding: theme.spacing[2], borderRadius: theme.radius.md, backgroundColor: resolveColor(theme, 'background.level1') }}
        >
          <Typography level='body-sm' style={{ fontVariant: ['tabular-nums'] }}>
            {block.text}
          </Typography>
        </View>
      )

    case 'rule':
      return <Divider />

    case 'table':
      /*
       * A table is rows of plain text on a phone, not a grid: a page-width
       * table on 390pt either scrolls sideways under the reader's thumb or
       * squeezes every column into two characters. Rows keep the reading order,
       * which is what the words were for.
       */
      return (
        <Stack spacing={1}>
          {block.rows.map((row, index) => (
            <Typography key={index} level='body-sm' color={index === 0 ? 'text.primary' : 'text.secondary'}>
              {row.filter(Boolean).join(' · ')}
            </Typography>
          ))}
        </Stack>
      )

    case 'image':
      // Named rather than drawn: an image in a document is served from the
      // account's own storage, and reaching it needs the auth this client
      // sends on API calls and not on an <Image> source (PRD FR-034).
      return (
        <Typography level='body-sm' color='text.tertiary'>
          {block.alt ? t('books.reader.imageWithAlt', { alt: block.alt }) : t('books.reader.image')}
        </Typography>
      )

    default:
      return (
        <Typography level='body-sm' color='text.tertiary'>
          {t('books.reader.unsupported', { name: block.name ?? '' })}
        </Typography>
      )
  }
}

/**
 * One run of text, carrying whatever the writer put on it.
 *
 * The level is the BLOCK's, passed in rather than assumed: a nested `Text`
 * carries its own font size in React Native, so spans that defaulted to body
 * size rendered every heading at body size while the heading's own style sat
 * unused on the parent.
 */
function Spans({ spans, level }) {
  return spans.map((span, index) => (
    <Typography
      key={index}
      level={level}
      color={span.link ? 'primary.plainColor' : 'text.primary'}
      onPress={span.link ? () => Linking.openURL(span.link) : undefined}
      // `weight`, not a raw `fontWeight`: emphasis inside a level is named in
      // the type system now, because a bold run in a paragraph is not a
      // different level and there was nothing else to call it.
      weight={span.bold ? 'xl' : undefined}
      style={{
        fontStyle: span.italic ? 'italic' : undefined,
        textDecorationLine: span.underline ? 'underline' : span.strikethrough ? 'line-through' : undefined
      }}
    >
      {span.text}
    </Typography>
  ))
}

export default BookReader

import React from 'react'
import { Box, Button, Chip, Skeleton, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import LockRounded from '@mui/icons-material/LockRounded'
import { readout, tabularNums } from '../Common/Form/formStyles'
import { coverage, kindOf, readingPage, sectionsWithoutCards } from './libraryQuery'

/**
 * The library's summary object (ADR-021 §15.10; docs/prd-books-library.md D1, D2,
 * D10, D12).
 *
 *   written   →  "Continue writing" · section · edited · words in sections ·
 *                cards · due today; "Make cards · N sections" · Continue;
 *                edge = sections with cards
 *   imported  →  "Continue reading" · page N of M · opened · cards from it;
 *                Listen · Continue; edge = page over pages
 *   empty     →  one sentence, Import files · New document; no edge
 *   dragging  →  "Drop to import", on any of the above
 *
 * Reads are free; Make cards and Listen are what the plan buys, so on a free
 * account they keep their readout and carry the plan on a locked key (§10).
 */
const Dot = () => (
  <Typography component='span' sx={{ color: 'text.tertiary' }} aria-hidden='true'>
    ·
  </Typography>
)

export default function ContinueObject({
  loading = false,
  book = null,
  tier = 'free',
  isDragActive = false,
  formatRelativeDate,
  onContinue,
  onMakeCards,
  onListen,
  onNew,
  onImport,
  onUpgrade
}) {
  const { t, i18n } = useTranslation()
  const locked = tier === 'free'
  const isEmpty = !loading && !book
  const kind = kindOf(book)
  const number = (n) => (n ?? 0).toLocaleString(i18n.language)

  const lockedKey = (label, onPress, aria, feature) => (
    <Button
      variant='soft'
      color='neutral'
      startDecorator={<LockRounded sx={{ fontSize: 'md' }} />}
      endDecorator={
        <Chip size='sm' color='warning' variant='soft'>
          {t('plans.plus')}
        </Chip>
      }
      onClick={() => (onUpgrade ? onUpgrade(feature) : onPress?.())}
      aria-label={aria}
    >
      {label}
    </Button>
  )

  let title
  let line
  let actions = null
  let edge = null

  if (isDragActive) {
    title = t('books.lib.dropTitle')
    line = (
      <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
        {t('books.lib.dropSubtitle')}
      </Typography>
    )
  } else if (!book) {
    // Loading draws the skeleton in the same slots; empty is the same object with one sentence.
    title = loading ? '' : t('books.title')
    line = loading ? null : (
      <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
        {t('books.lib.emptySentence')}
      </Typography>
    )
    actions = loading ? null : (
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
        <Button variant='soft' color='neutral' onClick={onImport}>
          {t('books.lib.importFiles')}
        </Button>
        <Button onClick={onNew}>{t('books.lib.newDocument')}</Button>
      </Stack>
    )
  } else if (kind === 'imported') {
    const position = readingPage(book)
    title = t('books.lib.continueReading')
    line = (
      <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap sx={{ ...readout, color: 'text.secondary' }}>
        {position && (
          <>
            <Typography level='body-sm' sx={{ color: 'text.primary', fontWeight: 'md', ...tabularNums }}>
              {t('books.lib.pageOf', { page: position.page, total: position.total })}
            </Typography>
            <Dot />
          </>
        )}
        <span>{t('books.lib.openedAt', { when: formatRelativeDate?.(book.updated_at) })}</span>
        <Dot />
        <span>{book.cards > 0 ? t('books.lib.cardsFromDocument', { count: book.cards }) : t('books.lib.noCardsYet')}</span>
      </Stack>
    )
    actions = (
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
        {locked ? (
          lockedKey(t('books.lib.listen'), onListen, t('books.lib.listenLockedAria'), 'listen')
        ) : (
          <Button variant='soft' color='neutral' onClick={onListen}>
            {t('books.lib.listen')}
          </Button>
        )}
        <Button onClick={onContinue}>{t('books.lib.continue')}</Button>
      </Stack>
    )
    if (position) edge = { pct: position.pct, label: t('books.lib.pagesRead', { page: position.page, total: position.total }) }
  } else {
    const cover = coverage(book)
    const gap = sectionsWithoutCards(book)
    title = t('books.lib.continueWriting')
    line = (
      <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap sx={{ ...readout, color: 'text.secondary' }}>
        {book.last_section && (
          <>
            <Typography level='body-sm' sx={{ color: 'text.primary', fontWeight: 'md' }}>
              {book.last_section}
            </Typography>
            <Dot />
          </>
        )}
        <span>{t('books.lib.editedAt', { when: formatRelativeDate?.(book.updated_at) })}</span>
        {book.word_count != null && book.section_count != null && (
          <Box component='span' sx={{ display: { xs: 'none', sm: 'contents' } }}>
            <Dot />
            <span>{t('books.lib.wordsInSections', { words: number(book.word_count), count: book.section_count })}</span>
          </Box>
        )}
        <Dot />
        <span>{book.cards > 0 ? t('books.lib.cards', { count: book.cards }) : t('books.lib.noCardsYet')}</span>
        {book.due > 0 && (
          <>
            <Dot />
            <Typography level='body-sm' sx={{ color: 'text.primary', fontWeight: 'md', ...tabularNums }}>
              {t('books.lib.dueToday', { count: book.due })}
            </Typography>
          </>
        )}
      </Stack>
    )
    const makeLabel = t('books.lib.makeCardsSections', { count: gap })
    actions = (
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
        {gap > 0 &&
          (locked ? (
            lockedKey(makeLabel, onMakeCards, t('books.lib.makeCardsLockedAria'), 'makeCards')
          ) : (
            <Button variant='soft' color='neutral' onClick={onMakeCards} sx={tabularNums}>
              {makeLabel}
            </Button>
          ))}
        <Button onClick={onContinue}>{t('books.lib.continue')}</Button>
      </Stack>
    )
    if (cover) edge = { pct: cover.pct, label: t('books.lib.sectionsCovered', { covered: cover.covered, total: cover.total }) }
  }

  return (
    <Box
      component='section'
      aria-labelledby='books-continue-title'
      data-testid='continue-object'
      data-drop={isDragActive ? 'active' : undefined}
      sx={{
        borderRadius: 'lg',
        bgcolor: 'background.surface',
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 2.5 },
        mb: 4,
        outline: isDragActive ? '2px dashed' : 'none',
        outlineColor: 'primary.outlinedBorder',
        outlineOffset: -2
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'flex-start' }, gap: { xs: 2, md: 3 } }}>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Skeleton loading={loading} variant='text' level='title-lg' width={loading ? 160 : undefined}>
            <Stack direction='row' spacing={1.25} alignItems='baseline' sx={{ minWidth: 0 }}>
              <Typography id='books-continue-title' level='title-lg' sx={{ flexShrink: 0 }}>
                {title}
              </Typography>
              {!isEmpty && !isDragActive && book && (
                <Typography level='title-lg' noWrap sx={{ color: 'text.secondary', fontWeight: 'md', minWidth: 0 }}>
                  {book.title}
                </Typography>
              )}
            </Stack>
          </Skeleton>
          <Skeleton loading={loading} variant='text' level='body-sm' width={loading ? 320 : undefined}>
            {line}
          </Skeleton>
        </Box>
        {!isDragActive && !isEmpty && !loading && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
      </Box>
      {isEmpty && !isDragActive && <Box sx={{ mt: 2 }}>{actions}</Box>}
      {edge && !isDragActive && (
        <>
          <Box
            role='progressbar'
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={edge.pct}
            aria-label={edge.label}
            sx={{ mt: 2, height: 3, borderRadius: 'full', bgcolor: 'background.level2', overflow: 'hidden' }}
          >
            <Box sx={{ width: `${edge.pct}%`, height: '100%', borderRadius: 'full', bgcolor: book?.cover_color || 'primary.solidBg' }} />
          </Box>
          <Typography level='body-xs' sx={{ ...readout, fontSize: 'xs', mt: 1 }}>
            {edge.label}
          </Typography>
        </>
      )}
    </Box>
  )
}

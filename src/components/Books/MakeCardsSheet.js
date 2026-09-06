import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, Checkbox, Chip, Skeleton, Stack, Typography } from '@mui/joy'
import LockIcon from '@mui/icons-material/Lock'

import { booksService } from '../../api/services'
import FormSheet from '../Common/Form/FormSheet'
import FormErrorBanner from '../Common/Form/FormErrorBanner'
import { focusRing, listRow, readout } from '../Common/Form/formStyles'

/**
 * Make cards by section (docs/prd-book-cards.md D4, D5, D10; BOOK-003).
 *
 * The document's sections as a checklist: words, cards so far, "changed since
 * its cards". Pre-ticked are the sections that need cards — none yet, or text
 * changed after they were made — so the default press covers the gap and
 * regenerates nothing the learner did not ask for (D5).
 *
 * Reads are free (D10): every tier sees its sections and counts. Generation is
 * what the plan buys, so on a free account the key keeps its readout and carries
 * the plan, and the press opens the upgrade sheet (§10: badge, never hide). On
 * Plus the budget line says what the run costs before it is confirmed: cards
 * come from the server's own estimate, and one run is one generation.
 */

/** Plus's monthly allowance (plans.features.aiUsagePlus); Pro is unlimited. */
export const PLUS_MONTHLY_GENERATIONS = 100

/** D5 — a section needs cards when it has none, or its text changed after they were made. */
export const needsCards = (section) => section.cards === 0 || Boolean(section.changed)

export const preTicked = (sections) => sections.filter(needsCards).map((section) => section.index)

const SectionRow = ({ section, checked, onToggle }) => {
  const { t, i18n } = useTranslation()
  // Absence is said once, by the tick: a section without cards reports its words and nothing else.
  const parts = [
    t('books.makeCards.words', { count: section.words, words: section.words.toLocaleString(i18n.language) }),
    section.cards > 0 ? t('books.makeCards.cards', { count: section.cards }) : null,
    section.changed ? t('books.makeCards.changed') : null
  ].filter(Boolean)
  return (
    <Checkbox
      size='md'
      checked={checked}
      onChange={onToggle}
      slotProps={{
        root: { sx: { ...listRow, py: 1, alignItems: 'flex-start' } },
        input: {
          'aria-label': t('books.makeCards.rowAria', { heading: section.heading, words: section.words, cards: section.cards })
        }
      }}
      label={
        <Box sx={{ minWidth: 0, pl: section.level === 'h2' ? 2 : 0 }}>
          <Typography level='title-sm' noWrap>
            {section.heading}
          </Typography>
          <Typography level='body-sm' sx={{ ...readout, display: 'block' }}>
            {parts.join(' · ')}
          </Typography>
        </Box>
      }
      sx={focusRing}
    />
  )
}

const MakeCardsSheet = ({ open, onClose, book, tier = 'free', aiUsageCount = 0, generating = false, onGenerate, onUpgrade }) => {
  const { t } = useTranslation()
  const bookId = book?._id || book?.id
  const [status, setStatus] = useState('loading')
  const [sections, setSections] = useState([])
  const [ticked, setTicked] = useState([])

  const load = useCallback(async () => {
    if (!bookId) return
    setStatus('loading')
    try {
      const data = await booksService.getSections(bookId)
      const rows = data?.sections ?? []
      setSections(rows)
      setTicked(preTicked(rows))
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [bookId])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const toggle = (index) => setTicked((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
  const allTicked = sections.length > 0 && ticked.length === sections.length
  const toggleAll = () => setTicked(allTicked ? [] : sections.map((section) => section.index))

  const estimate = useMemo(
    () => sections.filter((section) => ticked.includes(section.index)).reduce((sum, section) => sum + (section.estimate ?? 0), 0),
    [sections, ticked]
  )
  const left = Math.max(0, PLUS_MONTHLY_GENERATIONS - aiUsageCount)
  const locked = tier === 'free'
  const spent = tier === 'plus' && left === 0
  const count = ticked.length

  const budgetLine = () => {
    if (status !== 'ready' || sections.length === 0) return null
    if (count === 0) return t('books.makeCards.pick')
    if (locked) return t('books.makeCards.budgetPro', { cards: estimate, sections: count })
    if (spent) return t('books.makeCards.budgetSpent', { limit: PLUS_MONTHLY_GENERATIONS })
    if (tier === 'plus') return t('books.makeCards.budget', { cards: estimate, sections: count, left, limit: PLUS_MONTHLY_GENERATIONS })
    return t('books.makeCards.budgetPro', { cards: estimate, sections: count })
  }

  const actionSx = { minHeight: { xs: 44, sm: 36 }, ...focusRing }
  const footer = (
    <Stack spacing={1.5}>
      <Typography sx={{ ...readout, minHeight: '1.5em' }} aria-live='polite'>
        {budgetLine()}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='flex-end'>
        <Button variant='plain' color='neutral' onClick={onClose} sx={actionSx}>
          {t('common.cancel')}
        </Button>
        {locked ? (
          <Button
            variant='soft'
            color='neutral'
            startDecorator={<LockIcon sx={{ fontSize: 'md' }} />}
            endDecorator={
              <Chip size='sm' color='warning' variant='soft'>
                {t('plans.plus')}
              </Chip>
            }
            onClick={onUpgrade}
            disabled={status !== 'ready' || sections.length === 0}
            aria-label={t('books.makeCards.actionLockedAria')}
            sx={actionSx}
          >
            {t('books.makeCards.action', { count: Math.max(count, sections.length ? 1 : 0) })}
          </Button>
        ) : (
          <Button
            variant='solid'
            loading={generating}
            loadingPosition='start'
            disabled={status !== 'ready' || count === 0 || spent}
            onClick={() => onGenerate?.(ticked)}
            sx={actionSx}
          >
            {generating ? t('books.makeCards.generating') : t('books.makeCards.action', { count })}
          </Button>
        )}
      </Stack>
    </Stack>
  )

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      titleKey='books.makeCards.title'
      subtitleText={
        status === 'ready' ? (
          <Typography sx={readout}>{t('books.makeCards.subtitle', { title: book?.title ?? '', count: sections.length })}</Typography>
        ) : (
          <Skeleton variant='text' level='body-sm' width={180} />
        )
      }
      width='simple'
      headerAccessory={
        status === 'ready' && sections.length > 0 ? (
          <Button size='sm' variant='plain' color='neutral' onClick={toggleAll} sx={focusRing}>
            {t(allTicked ? 'books.makeCards.selectNone' : 'books.makeCards.selectAll')}
          </Button>
        ) : null
      }
      footer={footer}
    >
      {status === 'error' && (
        <FormErrorBanner
          titleKey='form.loadErrorTitle'
          detailText={t('books.makeCards.loadError')}
          action={{ labelKey: 'books.makeCards.retry', onClick: load }}
        />
      )}

      {status === 'loading' && (
        <Stack spacing={0} divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />} aria-busy='true'>
          {[0, 1, 2].map((i) => (
            <Box key={i} sx={{ ...listRow, py: 1 }}>
              <Skeleton variant='rectangular' width={20} height={20} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant='text' level='title-sm' width='50%' />
                <Skeleton variant='text' level='body-sm' width='30%' />
              </Box>
            </Box>
          ))}
        </Stack>
      )}

      {status === 'ready' && sections.length === 0 && (
        <Typography level='body-sm' sx={{ color: 'text.tertiary', py: 2 }}>
          {t('books.makeCards.empty')}
        </Typography>
      )}

      {status === 'ready' && sections.length > 0 && (
        <Stack
          role='group'
          aria-label={t('books.makeCards.title')}
          spacing={0}
          divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}
        >
          {sections.map((section) => (
            <SectionRow
              key={section.index}
              section={section}
              checked={ticked.includes(section.index)}
              onToggle={() => toggle(section.index)}
            />
          ))}
        </Stack>
      )}
    </FormSheet>
  )
}

export default MakeCardsSheet

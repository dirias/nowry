/**
 * Cards from a document, on the phone (MOB-057, `docs/prd-book-cards.md`).
 *
 * The document's sections as a checklist, then what the run produced, then a
 * deck to put it in. Three steps in one sheet, because they are one decision
 * with two confirmations rather than three screens.
 *
 * **Ticked by default are the sections that need cards** — none yet, or text
 * changed since theirs were made. The rule is `needsCards` in the shared
 * package, so the sheet opens the same way on both clients and a default press
 * covers the gap without regenerating anything the learner did not ask for.
 *
 * **Every saved card carries where it came from.** That link is the entire
 * point of the book→cards PRD: a card that keeps failing can take the learner
 * back to the paragraph that would fix it. The stamp is shared too, because a
 * phone that wrote it differently would break the one connection between the
 * two halves of this product.
 *
 * **No upgrade path, and no lock either.** Generation is what a plan buys, and
 * the web badges the key and opens its upgrade sheet. ADR-030 forbids a mobile
 * screen from advertising a paid tier at all, so on an account that cannot
 * generate, this action does not appear. Reading the sections is free on every
 * tier and stays available.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { booksService, cardsService } from '@nowry/core/api/services'
import { estimateFor, preTicked, sourceFieldsFor } from '@nowry/core/domain/books/sectionCards'
import { useDeckData } from '@nowry/core/hooks/useDeckData'
import { queryClient } from '@nowry/core/api/queryClient'
import { useTheme } from '../theme'
import { BottomSheet, Button, Checkbox, Divider, Select, Skeleton, Stack, Typography } from '../ui'

export function MakeCardsSheet({ open, book, onClose, onSaved }) {
  const { t } = useTranslation()
  const theme = useTheme()

  const bookId = book?._id ?? book?.id ?? null
  const [step, setStep] = useState('sections')
  const [sections, setSections] = useState(null)
  const [ticked, setTicked] = useState([])
  const [generated, setGenerated] = useState([])
  const [kept, setKept] = useState({})
  const [deckId, setDeckId] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(null)

  const decks = useDeckData('flashcard')

  useEffect(() => {
    if (!open || !bookId) return
    setStep('sections')
    setSections(null)
    setGenerated([])
    setKept({})
    setFailed(null)
    booksService
      .getSections(bookId)
      .then((data) => {
        const rows = data?.sections ?? []
        setSections(rows)
        setTicked(preTicked(rows))
      })
      .catch(() => setSections([]))
  }, [open, bookId])

  useEffect(() => {
    const first = (decks.decks ?? [])[0]
    if (first) setDeckId((current) => current || first._id)
  }, [decks.decks])

  const estimate = useMemo(() => estimateFor(sections ?? [], ticked), [sections, ticked])

  const generate = useCallback(async () => {
    if (busy || ticked.length === 0) return
    setBusy(true)
    setFailed(null)
    try {
      const { cards } = await cardsService.generateFromBook(bookId, ticked)
      const rows = cards ?? []
      setGenerated(rows)
      // Everything is kept until the learner says otherwise: a list that starts
      // empty asks them to do the work twice.
      setKept(Object.fromEntries(rows.map((_, index) => [index, true])))
      setStep('review')
    } catch {
      setFailed(t('books.makeCards.loadError'))
    } finally {
      setBusy(false)
    }
  }, [busy, ticked, bookId, t])

  const save = useCallback(async () => {
    if (busy || !deckId) return
    setBusy(true)
    setFailed(null)
    const source = {
      source_book_id: bookId,
      source_book_title: book?.title ?? null,
      source_section: null
    }
    const rows = generated.filter((_, index) => kept[index])
    let saved = 0
    try {
      /*
       * One at a time, as the web does, so a plan limit mid-run stops with an
       * accurate count rather than an all-or-nothing lie about what reached
       * the library.
       */
      for (const card of rows) {
        await cardsService.create({
          title: card.title,
          content: card.content,
          deck_id: deckId,
          ...sourceFieldsFor(card, source)
        })
        saved += 1
      }
      queryClient.invalidateQueries({ queryKey: ['decks'] })
      queryClient.invalidateQueries({ queryKey: ['cards'] })
      onSaved?.(saved)
      onClose?.()
    } catch {
      setFailed(saved > 0 ? t('cards.generatedCards.partialSave', { saved, total: rows.length }) : t('cards.generatedCards.saveError'))
    } finally {
      setBusy(false)
    }
  }, [busy, deckId, generated, kept, bookId, book, onSaved, onClose, t])

  const keptCount = Object.values(kept).filter(Boolean).length

  return (
    <BottomSheet
      visible={open}
      onClose={busy ? () => {} : onClose}
      title={step === 'sections' ? t('books.makeCards.title') : t('cards.generatedCards.titleSelectCards')}
    >
      <Stack spacing={2}>
        {failed ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {failed}
          </Typography>
        ) : null}

        {step === 'sections' ? (
          <>
            {sections === null ? (
              <Stack spacing={1}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} width='100%' height={44} />
                ))}
              </Stack>
            ) : sections.length === 0 ? (
              <Typography level='body-md' color='text.secondary'>
                {t('books.makeCards.empty')}
              </Typography>
            ) : (
              <View>
                {sections.map((section) => (
                  <SectionRow
                    key={section.index}
                    section={section}
                    checked={ticked.includes(section.index)}
                    onToggle={() =>
                      setTicked((current) =>
                        current.includes(section.index) ? current.filter((index) => index !== section.index) : [...current, section.index]
                      )
                    }
                    theme={theme}
                    t={t}
                  />
                ))}
              </View>
            )}

            <Stack direction='row' spacing={1}>
              <Button variant='tertiary' style={{ flex: 1 }} onPress={onClose}>
                {t('common.cancel')}
              </Button>
              <Button style={{ flex: 1 }} loading={busy} disabled={ticked.length === 0} onPress={generate}>
                {t('books.makeCards.action', { count: ticked.length })}
              </Button>
            </Stack>

            {estimate > 0 ? (
              <Typography level='body-xs' color='text.tertiary'>
                {t('books.makeCards.budgetPro', { cards: estimate, sections: ticked.length })}
              </Typography>
            ) : null}
          </>
        ) : (
          <>
            <Typography level='body-sm' color='text.secondary'>
              {t('cards.generatedCards.keptCount', { count: keptCount })}
            </Typography>

            <View>
              {generated.map((card, index) => (
                <View key={index}>
                  <Checkbox
                    checked={Boolean(kept[index])}
                    onPress={() => setKept((current) => ({ ...current, [index]: !current[index] }))}
                    label={
                      <View style={{ flex: 1, minWidth: 0, paddingVertical: theme.spacing[1] }}>
                        <Typography level='body-md' numberOfLines={2}>
                          {card.title}
                        </Typography>
                        <Typography level='body-sm' color='text.tertiary' numberOfLines={2}>
                          {card.content}
                        </Typography>
                      </View>
                    }
                  />
                  <Divider />
                </View>
              ))}
            </View>

            <Select
              value={deckId}
              options={(decks.decks ?? []).map((deck) => ({ value: deck._id, label: deck.name }))}
              onChange={setDeckId}
              placeholderKey='cards.generatedCards.subtitleAddToDeck'
              accessibilityLabel={t('cards.generatedCards.titleAddToDeck')}
            />

            <Stack direction='row' spacing={1}>
              <Button variant='tertiary' style={{ flex: 1 }} onPress={() => setStep('sections')}>
                {t('common.goBack')}
              </Button>
              <Button style={{ flex: 1 }} loading={busy} disabled={keptCount === 0 || !deckId} onPress={save}>
                {t('cards.generatedCards.confirmSave')}
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </BottomSheet>
  )
}

/** One section: its heading, and what it is made of. Absence is said by the tick. */
function SectionRow({ section, checked, onToggle, theme, t }) {
  const parts = [
    t('books.makeCards.words', { count: section.words, words: section.words }),
    section.cards > 0 ? t('books.makeCards.cards', { count: section.cards }) : null,
    section.changed ? t('books.makeCards.changed') : null
  ].filter(Boolean)

  return (
    <Checkbox
      checked={checked}
      onPress={onToggle}
      label={
        <View
          style={{ flex: 1, minWidth: 0, paddingVertical: theme.spacing[1], paddingLeft: section.level === 'h2' ? theme.spacing[2] : 0 }}
        >
          <Typography level='title-sm' numberOfLines={1}>
            {section.heading}
          </Typography>
          <Typography level='body-sm' color='text.tertiary' numberOfLines={1}>
            {parts.join(' · ')}
          </Typography>
        </View>
      }
    />
  )
}

export default MakeCardsSheet

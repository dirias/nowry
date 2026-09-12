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
import { CARD_TITLE_MAX, titleTooLong } from '@nowry/core/domain/cardTypes'
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
      /*
       * Everything is kept until the learner says otherwise — a list that
       * starts empty asks them to do the work twice — EXCEPT a card whose
       * front is longer than the API will accept. That one cannot be saved as
       * it stands, so it arrives unticked and says why.
       */
      setKept(Object.fromEntries(rows.map((card, index) => [index, !titleTooLong(card)])))
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
    let reason = null

    /*
     * One at a time, as the web does, and NOT stopping at the first refusal.
     * The first build threw on one card and reported nothing, so a run where a
     * single generated question ran past the API's 100-character title cap
     * looked like a save that did nothing at all — a spinner, then the same
     * screen. What reached the library is now counted, and the server's own
     * message is what the user is told.
     */
    for (const card of rows) {
      try {
        await cardsService.create({
          title: card.title,
          content: card.content,
          deck_id: deckId,
          ...sourceFieldsFor(card, source)
        })
        saved += 1
      } catch (error) {
        reason = reason ?? error?.response?.data?.detail ?? error?.message ?? null
      }
    }

    queryClient.invalidateQueries({ queryKey: ['decks'] })
    queryClient.invalidateQueries({ queryKey: ['cards'] })
    setBusy(false)

    if (saved === rows.length) {
      onSaved?.(saved)
      onClose?.()
      return
    }

    // The sheet stays open with the list intact, so what did not save is still
    // in front of the person who has to decide what to do about it.
    setFailed(
      saved > 0
        ? `${t('cards.generatedCards.partialSave', { saved, total: rows.length })}${reason ? ` — ${reason}` : ''}`
        : `${t('cards.generatedCards.saveError')}${reason ? ` — ${reason}` : ''}`
    )
  }, [busy, deckId, generated, kept, bookId, book, onSaved, onClose, t])

  const keptCount = Object.values(kept).filter(Boolean).length

  return (
    <BottomSheet
      visible={open}
      onClose={busy ? () => {} : onClose}
      title={step === 'sections' ? t('books.makeCards.title') : t('cards.generatedCards.titleSelectCards')}
    >
      <Stack spacing={2}>
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

            {failed ? (
              <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
                {failed}
              </Typography>
            ) : null}

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
                        {titleTooLong(card) ? (
                          <Typography level='body-xs' color='danger.plainColor'>
                            {t('cards.generatedCards.frontTooLong', { max: CARD_TITLE_MAX })}
                          </Typography>
                        ) : null}
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

            {/* Beside the key that caused it: at the top of a sheet this long,
                a failure is above the fold and reads as nothing happening. */}
            {failed ? (
              <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
                {failed}
              </Typography>
            ) : null}

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

/**
 * The study session (MOB-022).
 *
 * The web's session is 1945 lines because it carries a pet, XP, Mermaid,
 * text-to-speech, fullscreen, swipe hints and a tag filter bar. None of that is
 * the session. What the session is: show a card, reveal its answer, take a
 * grade, move on, and log what happened.
 *
 * **Scheduling is not reimplemented, and cannot be.** SM-2 runs on the server;
 * `cardsService.review(id, grade, mode)` is the whole of it. The phone sends the
 * same three arguments the web sends, so the same grades produce the same next
 * review dates by construction rather than by agreement.
 *
 * **Reveal is a button, and also a tap.** The web flips on click and hints
 * "Click to flip". A gesture that is the only way to proceed is a control a
 * screen reader cannot find, so the primary action is a real button and the tap
 * is the shortcut for people who already know. Before the reveal there is one
 * solid button, which is what the surface is for; after it there are four
 * neutral choices and no solid at all, because making one grade the accented
 * one would bias the self-assessment the whole method rests on.
 *
 * **A grade survives the app dying.** Progress is written to storage after every
 * grade, so a session interrupted by a phone call resumes on the card it was on
 * rather than starting over. The key is cleared on completion.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { cardsService, studySessionsService } from '@nowry/core/api/services'
import { storage } from '@nowry/core'
import { Button, Card, Screen, Skeleton, Stack, Typography } from '../ui'

const GRADES = ['again', 'hard', 'good', 'easy']

/** The web's mapping, copied because the server reads `evaluation`, not `grade`. */
const GRADE_TO_EVAL = { again: 'incorrect', hard: 'partial', good: 'correct', easy: 'correct' }

const resumeKey = (deckId) => `nowry.session.${deckId}`

const frontOf = (card) => card?.question || card?.title || card?.front || ''
const backOf = (card) => card?.answer || card?.content || card?.back || ''

export function StudySession() {
  const { deckId } = useLocalSearchParams()
  const id = String(deckId)
  const { t } = useTranslation()
  const router = useRouter()

  const [cards, setCards] = useState(null)
  const [error, setError] = useState(false)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const deckName = useRef(null)
  const graded = useRef([])
  const failed = useRef([])
  const startedAt = useRef(new Date())
  const logged = useRef(false)

  useEffect(() => {
    let cancelled = false
    setCards(null)
    setError(false)

    cardsService
      .getDueCards(id)
      .then((due) => {
        if (cancelled) return
        setCards(due)
        // Read while a card is in hand: the summary logs after the last one is
        // gone, and the deck's name is only ever carried by a card.
        deckName.current = due[0]?.deck_id?.name ?? due[0]?.deck_id?.title ?? null

        /*
         * Resume before the first card is shown, not after: restoring an index
         * a frame later would flash card one and then jump, which reads as a
         * bug even when it lands in the right place.
         */
        const saved = readResume(id, due.length)
        if (saved) {
          setIndex(saved.index)
          graded.current = saved.graded
          startedAt.current = new Date(saved.startedAt)
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    return () => {
      cancelled = true
    }
  }, [id, attempt])

  const total = cards?.length ?? 0
  const current = cards?.[index] ?? null
  const complete = cards !== null && index >= total

  /** Fire-and-forget, once, when the last card has been graded. */
  useEffect(() => {
    if (!complete || logged.current) return
    logged.current = true
    storage.remove(resumeKey(id))

    // An all-caught-up deck lands here too, with nothing to log.
    if (graded.current.length === 0) return
    studySessionsService
      .log({
        deckId: id,
        deckName: deckName.current,
        startedAt: startedAt.current,
        cards: graded.current
      })
      .catch(() => {
        // History is a record, not the session. Losing it never interrupts.
      })
  }, [complete, id])

  const grade = useCallback(
    (value) => {
      const card = cards[index]
      const cardId = card._id ?? card.id

      graded.current = [...graded.current, { cardId, cardTitle: frontOf(card) || null, grade: value, evaluation: GRADE_TO_EVAL[value] }]

      // The next card comes up now. A grade that waits on the network is a
      // grade the user watches, and recall practice does not survive a spinner.
      const next = index + 1
      setIndex(next)
      setRevealed(false)
      writeResume(id, { index: next, graded: graded.current, startedAt: startedAt.current })

      cardsService.review(cardId, value, 'study').catch(() =>
        // One retry, then it is recorded and reported on the summary. A grade
        // that vanishes silently is worse than one the user is told about.
        cardsService.review(cardId, value, 'study').catch(() => {
          failed.current = [...failed.current, cardId]
        })
      )
    },
    [cards, index, id]
  )

  const counter = useMemo(() => t('cards.session.card', { current: index + 1, total }), [t, index, total])

  if (error) {
    return (
      <Screen>
        <Stack spacing={2}>
          <Typography level='body-md' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t('cards.session.error')}
          </Typography>
          <Button onPress={() => setAttempt((n) => n + 1)}>{t('common.retry')}</Button>
        </Stack>
      </Screen>
    )
  }

  if (cards === null) {
    return (
      <Screen>
        <Stack spacing={2}>
          <Skeleton width='40%' height={20} />
          <Skeleton width='100%' height={220} />
          <Skeleton width='100%' height={48} />
        </Stack>
      </Screen>
    )
  }

  if (total === 0) {
    return (
      <Screen>
        <Stack spacing={2}>
          <Typography level='h4'>{t('cards.session.allCaughtUp')}</Typography>
          <Typography level='body-md' color='text.secondary'>
            {t('cards.session.noDue')}
          </Typography>
          {/* Back to the Study tab root, never to a cards route. */}
          <Button variant='secondary' onPress={() => router.replace('/study')}>
            {t('cards.session.goBack')}
          </Button>
        </Stack>
      </Screen>
    )
  }

  if (complete) {
    return (
      <Screen>
        <Stack spacing={2}>
          <Typography level='h4'>{t('cards.session.complete.title')}</Typography>
          <Typography level='body-md' color='text.secondary'>
            {t('cards.session.complete.body', { count: graded.current.length })}
          </Typography>
          {failed.current.length ? (
            <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
              {t('cards.session.error')}
            </Typography>
          ) : null}
          <Button onPress={() => router.replace('/study')}>{t('cards.session.complete.backToLibrary')}</Button>
        </Stack>
      </Screen>
    )
  }

  return (
    <Screen scroll={false}>
      <Stack spacing={2} style={{ flex: 1 }}>
        <Typography level='body-sm' color='text.tertiary'>
          {counter}
        </Typography>

        {/* The card fills what is left, so the grades sit in the bottom third
            of any screen height rather than at a measured offset. */}
        <View style={{ flex: 1 }}>
          <Card
            padding={3}
            elevation='sm'
            style={{ flex: 1, justifyContent: 'center' }}
            /* A touch handler, deliberately not a Pressable. The reveal
               already has a real button below; making the card a second
               control would announce the same action twice to a screen
               reader, and making it the ONLY control would announce it to
               nobody. This is the shortcut for a thumb, invisible to the
               accessibility tree, which is exactly what a shortcut is. */
            onTouchEnd={revealed ? undefined : () => setRevealed(true)}
          >
            <Stack spacing={2}>
              <Typography level='body-xs' color='text.tertiary'>
                {t('cards.session.labels.question')}
              </Typography>
              <Typography level='h4'>{frontOf(current)}</Typography>

              {revealed ? (
                <>
                  <Typography level='body-xs' color='text.tertiary'>
                    {t('cards.session.labels.answer')}
                  </Typography>
                  <Typography level='body-lg'>{backOf(current)}</Typography>
                </>
              ) : null}
            </Stack>
          </Card>
        </View>

        {revealed ? (
          /*
           * No solid among the four. The house rule is one solid per surface,
           * and here the right number is zero: an accented "Good" is a nudge
           * toward the answer that flatters the learner.
           */
          <Stack direction='row' spacing={1}>
            {GRADES.map((value) => (
              <Button
                key={value}
                variant='secondary'
                size='md'
                style={{ flex: 1 }}
                onPress={() => grade(value)}
                accessibilityLabel={t(`cards.session.grading.${value}`)}
              >
                {t(`cards.session.grading.${value}`)}
              </Button>
            ))}
          </Stack>
        ) : (
          <Button size='lg' onPress={() => setRevealed(true)}>
            {t('cards.session.showAnswer')}
          </Button>
        )}
      </Stack>
    </Screen>
  )
}

/** Storage holds strings, and a half-written or stale record must not resume. */
function readResume(deckId, total) {
  try {
    const raw = storage.get(resumeKey(deckId))
    if (!raw) return null
    const saved = JSON.parse(raw)
    if (!Number.isInteger(saved.index) || saved.index <= 0 || saved.index >= total) return null
    if (!Array.isArray(saved.graded)) return null
    return saved
  } catch {
    return null
  }
}

function writeResume(deckId, state) {
  try {
    storage.set(resumeKey(deckId), JSON.stringify({ ...state, startedAt: state.startedAt.toISOString() }))
  } catch {
    // Resuming is a convenience; failing to record it never stops a session.
  }
}

export default StudySession

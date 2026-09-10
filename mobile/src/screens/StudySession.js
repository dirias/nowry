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
import { useSessionCards } from '@nowry/core/hooks/useSessionCards'
import { storage } from '@nowry/core'
import { flushOutbox, queueReview, queueSession } from '../platform/outbox'
import { GRADE_VARIANTS } from '../ui/buttonSpec'
import { Button, Card, Icon, Screen, Skeleton, Stack, SwipeArea, Typography } from '../ui'

const GRADES = ['again', 'hard', 'good', 'easy']

/** The web's mapping, copied because the server reads `evaluation`, not `grade`. */
const GRADE_TO_EVAL = { again: 'incorrect', hard: 'partial', good: 'correct', easy: 'correct' }

const resumeKey = (deckId) => `nowry.session.${deckId}`

/**
 * The web's sentinel for "today across every deck" — `/study/daily-review`,
 * where the deck id slot carries the word rather than an id. Mobile mirrors the
 * web's route names so one link opens the same thing on both (architecture
 * addendum), which means it mirrors this too.
 *
 * The dashboard's solid key and Home's used to point at `/study/due`, which is
 * no route at all: `[deckId]` matched it and the session asked the server for a
 * deck called "due". The app's single most important button opened an error.
 */
export const DAILY_REVIEW = 'daily-review'

const frontOf = (card) => card?.question || card?.title || card?.front || ''
const backOf = (card) => card?.answer || card?.content || card?.back || ''

export function StudySession() {
  const { deckId, tags, group, limit } = useLocalSearchParams()
  const id = String(deckId)
  const { t } = useTranslation()
  const router = useRouter()

  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  // The web shows its swipe affordance on the first card only, and drops it
  // the moment any gesture is used. A hint that stays is an instruction.
  const [hinted, setHinted] = useState(false)

  const deckName = useRef(null)
  /*
   * Keyed by card id, and state rather than a ref: stepping back has to SHOW
   * that a card was already answered, which means the screen has to re-render
   * when one is. A re-grade replaces rather than appends, so a card the user
   * went back to cannot be counted or sent twice. The log wants a list, and
   * `Object.values` keeps insertion order — the order they were given.
   */
  const [graded, setGraded] = useState({})
  // How many grades are waiting on a signal. Shown on the summary, because a
  // session that has not reached the server yet is a fact the user should have.
  const [queued, setQueued] = useState(0)
  const startedAt = useRef(new Date())
  const logged = useRef(false)

  /*
   * Through the query cache, not a bare fetch. The cache is persisted to disk,
   * so a queue loaded with signal opens without one — and this screen is the
   * one that most needs that. Fetching directly put the session outside the
   * only mechanism that makes offline study possible, and airplane mode said
   * "Couldn't load cards" over a queue already on the device.
   */
  const queue = useSessionCards({
    deckId: id,
    tags: tags ? [].concat(tags) : [],
    group: group ? String(group) : undefined,
    limit: limit ? Number(limit) : undefined,
    attempt
  })
  const cards = queue.cards
  const error = Boolean(queue.error)

  useEffect(() => {
    if (!cards) return
    // Read while a card is in hand: the summary logs after the last one is
    // gone, and the deck's name is only ever carried by a card.
    deckName.current = cards[0]?.deck_id?.name ?? cards[0]?.deck_id?.title ?? null

    /*
     * Resume before the first card is shown, not after: restoring an index a
     * frame later would flash card one and then jump, which reads as a bug even
     * when it lands in the right place.
     */
    const saved = readResume(id, cards.length)
    if (!saved) return
    setIndex(saved.index)
    setGraded(saved.graded)
    startedAt.current = new Date(saved.startedAt)
  }, [cards, id])

  const total = cards?.length ?? 0
  const current = cards?.[index] ?? null
  const complete = cards !== null && index >= total

  /** Fire-and-forget, once, when the last card has been graded. */
  useEffect(() => {
    if (!complete || logged.current) return
    logged.current = true
    storage.remove(resumeKey(id))

    // An all-caught-up deck lands here too, with nothing to log.
    const answers = Object.values(graded)
    if (answers.length === 0) return
    const payload = {
      deckId: id,
      deckName: deckName.current,
      startedAt: startedAt.current,
      cards: answers
    }
    studySessionsService.log(payload).catch(() => {
      // History is a record, not the session — it never interrupts. But it is
      // queued rather than dropped, so a session studied offline still appears.
      queueSession(payload)
    })
  }, [complete, id, graded])

  const grade = useCallback(
    (value) => {
      const card = cards[index]
      const cardId = card._id ?? card.id

      // Re-grading a card the user stepped back to replaces the answer rather
      // than recording two, which would double-count the session and send two
      // reviews for one card.
      const answers = {
        ...graded,
        [cardId]: { cardId, cardTitle: frontOf(card) || null, grade: value, evaluation: GRADE_TO_EVAL[value] }
      }
      setGraded(answers)

      // The next card comes up now. A grade that waits on the network is a
      // grade the user watches, and recall practice does not survive a spinner.
      const next = index + 1
      setIndex(next)
      setRevealed(false)
      setHinted(true)
      writeResume(id, { index: next, graded: answers, startedAt: startedAt.current })

      /*
       * A grade that cannot be sent is not lost and is not retried in a loop
       * here: it goes to the outbox, which is on disk and survives the app
       * being killed, and is sent in order when sending starts working (MOB-026).
       * A successful send is also the moment to try anything already waiting.
       */
      cardsService
        .review(cardId, value, 'study')
        .then(() => {
          flushOutbox().then(({ sent, remaining }) => {
            if (sent > 0) setQueued(remaining)
          })
        })
        .catch(() => {
          queueReview(cardId, value)
          setQueued((n) => n + 1)
        })
    },
    [cards, index, id, graded]
  )

  /**
   * Forward without answering. Skipping is not a grade, so nothing is recorded
   * and nothing is sent — the card comes round again next session.
   */
  const skip = useCallback(() => {
    setIndex((n) => Math.min(total, n + 1))
    setRevealed(false)
    setHinted(true)
  }, [total])

  const back = useCallback(() => {
    setIndex((n) => Math.max(0, n - 1))
    setRevealed(false)
    setHinted(true)
  }, [])

  const answered = Boolean(current && graded[current._id ?? current.id])

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
            {t('cards.session.complete.body', { count: Object.keys(graded).length })}
          </Typography>
          {queued > 0 ? (
            <Typography level='body-sm' color='text.tertiary' accessibilityLiveRegion='polite'>
              {t('cards.session.syncing', { count: queued })}
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
        <SwipeArea
          style={{ flex: 1 }}
          onLeft={skip}
          onRight={index > 0 ? back : undefined}
          onUp={revealed ? undefined : () => setRevealed(true)}
        >
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
        </SwipeArea>

        {/* The gestures, said once, on the first card only. Every one of them
            has a button that does the same thing, so this is an offer rather
            than an instruction — and it is decorative, because a screen reader
            already has the buttons. */}
        {hinted ? null : (
          <Stack direction='row' spacing={2} style={{ justifyContent: 'center' }} importantForAccessibility='no'>
            <Icon name='ArrowLeft' size='sm' color='text.tertiary' />
            <Icon name='ArrowUp' size='sm' color='text.tertiary' />
            <Icon name='ArrowRight' size='sm' color='text.tertiary' />
          </Stack>
        )}

        {/* A card reached by going back was already answered. The web says so
            rather than letting an identical-looking row silently re-fire. */}
        {answered ? (
          <Typography level='body-xs' color='text.tertiary' accessibilityLiveRegion='polite'>
            {t('cards.session.grading.alreadyAnswered')}
          </Typography>
        ) : null}

        {revealed ? (
          /*
           * Four tones, not four neutral keys, and they are the web's own:
           * outlined danger, soft warning, soft success, solid primary. An
           * earlier version made all four secondary on the reasoning that an
           * accented key biases self-assessment. That reasoning lost to a
           * design that has shipped for a year and to the fact that these four
           * ARE the surface — the exception is recorded in `buttonSpec.js`.
           */
          <Stack direction='row' spacing={1}>
            {GRADES.map((value) => (
              <Button
                key={value}
                variant={GRADE_VARIANTS[value]}
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
    if (!saved.graded || typeof saved.graded !== 'object') return null
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

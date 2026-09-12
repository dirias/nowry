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
 * solid key, which is what the surface is for; after it the web's own four —
 * Again outlined in danger, Hard and Good soft, Easy solid in the accent
 * (`GRADE_VARIANTS`). An earlier version of this note claimed four neutral
 * choices and no solid; the code never did that and the web never has.
 *
 * **A grade survives the app dying.** Progress is written to storage after every
 * grade, so a session interrupted by a phone call resumes on the card it was on
 * rather than starting over. The key is cleared on completion.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, View, useWindowDimensions } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { agentService, cardsService, studySessionsService } from '@nowry/core/api/services'
import { queryClient } from '@nowry/core/api/queryClient'
import { useSessionCards } from '@nowry/core/hooks/useSessionCards'
import { bestLevelUp } from '@nowry/core/domain/petLevelUp'
import { sessionSummaryEvent, wrongAnswerEvent } from '@nowry/core/domain/interventionPolicy'
import { studyCardContext } from '@nowry/core/domain/screenContext'
import { usePetState } from '@nowry/core/hooks/usePetState'
import { useVoiceSettings } from '@nowry/core/hooks/useVoiceSettings'
import { storage } from '@nowry/core'
import { useAppearance } from '../theme'
import { setAskContext } from './askContext'
import { useCardSpeech, useSpeech } from '../hooks/useCardSpeech'
import { useInterventions } from '../hooks/useInterventions'
import { flushOutbox, queueReview, queueSession } from '../platform/outbox'
import { BUTTON_SIZES, EDGE, GRADE_VARIANTS } from '../ui/buttonSpec'
import {
  AskToggle,
  Button,
  Card,
  CompanionNote,
  FlipCard,
  Icon,
  MarkToggle,
  PetLevelUp,
  Progress,
  Screen,
  Skeleton,
  SpeakToggle,
  Stack,
  SwipeArea,
  Typography
} from '../ui'

/**
 * The action band is one constant height whichever face is up.
 *
 * Before the reveal it holds one `lg` key; after it, four `md` ones. Letting
 * the band size itself made the card — which takes the space the band does not
 * — a different height on each face, so turning a card visibly resized it. A
 * flashcard is one object; it does not change shape when you turn it over.
 */
const ACTION_BAND = BUTTON_SIZES.lg.height + EDGE

/**
 * How long after a missed card the companion waits before saying anything.
 *
 * The web's window, and its reasoning is sound: a line that appears the instant
 * a grade is pressed reads as a reaction to the button rather than to the card,
 * and lands while the learner is still looking at where the button was. The
 * jitter is so that two missed cards in a row do not produce two lines in
 * lockstep.
 */
const NUDGE_DELAY = 3000
const NUDGE_JITTER = 5000

/**
 * Above this OS text size the four grades stop sharing one row.
 *
 * At 200% each of four keys on a 358pt row gets 85pt and "Difícil" needs a
 * hundred, so two of the four read "Difí" and "Fáci" — clipped without even an
 * ellipsis to say so, on the app's core interaction (MOB-083). Two rows of two
 * is the only arrangement that keeps all four legible, and it costs the band
 * its constant height, which is the smaller of the two losses.
 */
const GRADES_WRAP_ABOVE = 1.3

/**
 * And so is the line above it, which is empty on most cards, carries the
 * gesture hint on the first, and says "already answered" on one reached by
 * going back. Three different heights on the same screen, for the same reason.
 */
const NOTICE_BAND = 20

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

/** The web's threshold for "this answer is prose, not a term". */
const LONG_ANSWER = 100

/**
 * One face of the card: a coloured label, and the one thing this side says.
 *
 * Centred, which the previous build was not. Top alignment was right while the
 * face held a question AND an answer stacked under it — the reader needed a
 * fixed place to look. A face that holds one thing has no such problem, and a
 * lone question pinned to the top of a tall card leaves the wall of empty
 * surface the design canvas already diagnosed on the web.
 *
 * The label colours are the web's: the question's is the accent, the answer's
 * is success. They are the only cue that reaches a reader mid-turn, and under
 * reduced motion — where nothing rotates — they are the whole of it.
 */
function CardFace({ label, labelColor, level, text }) {
  return (
    <Card padding={3} elevation='sm' style={{ flex: 1, justifyContent: 'center' }}>
      <Stack spacing={2} style={{ alignItems: 'center' }}>
        <Typography level='body-xs' color={labelColor}>
          {label}
        </Typography>
        <Typography level={level} style={{ textAlign: 'center' }}>
          {text}
        </Typography>
      </Stack>
    </Card>
  )
}

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
  // What the two XP grants at the end of the session reached, if anything.
  const [levelUp, setLevelUp] = useState(null)
  // The account's colour, already resolved for the whole app — the companion
  // is the colour of the app it lives in (MOB-050).
  const { accent } = useAppearance()
  /*
   * The OS text size decides whether four grades fit on one row. Read from
   * `useWindowDimensions`, not `PixelRatio.getFontScale()`: the latter reports
   * the metrics captured when the process started, and this app declares
   * `fontScale` in its `configChanges`, so the activity is never recreated when
   * the setting changes — the static read stayed at 1.0 for the whole session
   * and the wrap never fired. This one updates.
   */
  const { fontScale } = useWindowDimensions()
  const wrapGrades = fontScale > GRADES_WRAP_ABOVE

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

  /*
   * Audio (MOB-077). The deck's own voice settings, the same ones the deck
   * screen writes and the web reads — and in a daily review, the settings of
   * whichever deck the card in hand belongs to, because a mixed queue speaks
   * Japanese on one card and German on the next.
   *
   * The side follows the face: reading the answer aloud while the question is
   * showing would hand the learner the thing they are recalling.
   */
  const { voiceSettings, getSettingsForDeck } = useVoiceSettings(id)
  const deckVoices = id === DAILY_REVIEW ? getSettingsForDeck(current?.deck_id?._id ?? current?.deck_id) : voiceSettings
  const speech = useCardSpeech({ card: current, flipped: revealed, settings: revealed ? deckVoices?.back : deckVoices?.front })

  /*
   * The companion, speaking unasked (MOB-088).
   *
   * Its four settings ride on the companion state Home already caches, so a
   * session knows whether it may be interrupted without a request of its own
   * (NFR-001) — and honours a switch the learner turned off on the web, which
   * is the whole reason the gates are shared rather than written here.
   *
   * `inSession` is what focus mode is asked about, and a finished session is
   * not one: the summary after the last card interrupts nothing.
   */
  const pet = usePetState()
  const buddy = useInterventions({ settings: pet.interventions, inSession: !complete })

  /*
   * And read aloud, with the same voice machinery the card uses (FR-011). The
   * deck's settings carry the rate and the pitch; the LANGUAGE is detected from
   * the text, because a reply about a Japanese card is written in the reader's
   * language and reading it with the card's voice would be the wrong one.
   */
  const buddySpeech = useSpeech({ text: buddy.message?.message ?? '', settings: deckVoices?.back })

  /*
   * Named so the two callers can depend on it without depending on the whole
   * hook — `queue` is stable, and the completion effect fires exactly once.
   */
  const askCompanion = buddy.queue

  /** Cards already nudged about, so one card cannot produce two lines. */
  const nudged = useRef(new Set())
  const nudgeTimer = useRef(null)
  useEffect(() => () => clearTimeout(nudgeTimer.current), [])

  /** Open the companion with the card in hand as what it is being asked about. */
  const openChat = useCallback(() => {
    setAskContext(studyCardContext(current, { deckId: id, index, total, flipped: revealed, mode: 'study' }), `/study/${id}`)
    router.push('/agent')
  }, [current, id, index, total, revealed, router])

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

    /*
     * The companion is fed by studying, and until now it was fed only by
     * studying on the web (MOB-050). A pet that does not move after twenty
     * cards on a phone is not a quiet pet, it is a broken one.
     *
     * The web's own two calls, with its own cap: session XP is capped at 500
     * cards so one enormous session cannot outrun the curve, and the streak is
     * awarded separately because it is about days rather than cards. Both are
     * settled rather than awaited — XP is a reward, and a reward that can
     * block the summary screen is a punishment.
     */
    Promise.allSettled([
      agentService.awardSessionXp(Math.min(500, answers.length), id === DAILY_REVIEW ? null : id),
      agentService.awardStreakXp()
    ]).then((results) => {
      // The panel on Home reads a cached level; a level earned here is a level
      // it is now wrong about.
      queryClient.invalidateQueries({ queryKey: ['pet'] })

      /*
       * The reply is the only place a level-up is ever announced — the server
       * does not push, and the pet's state endpoint says where you are, never
       * that you just arrived. This threw it away, so a level earned on the
       * phone was silent (PEND-001). Either grant can cross the line and only
       * the furthest one is shown: two celebrations for one session is a bug.
       */
      setLevelUp(bestLevelUp(results.map((result) => (result.status === 'fulfilled' ? result.value : null))))
    })

    /*
     * And the companion's word on the session (MOB-088). Guarded on cards
     * actually graded for the reason the web records: an all-caught-up deck
     * lands here with nothing studied, and the summary it produced said
     * "1 cards".
     *
     * A card is counted as missed if it ENDED on Again or Hard. The web counts
     * every wrong pass, because it can see a card more than once; this screen
     * replaces a re-grade rather than appending one, so a card has exactly one
     * answer and the most-missed card is the first one Again was pressed on.
     */
    const missed = answers.filter((answer) => answer.grade === 'again' || answer.grade === 'hard')
    const worst = missed.find((answer) => answer.grade === 'again') ?? missed[0] ?? null
    askCompanion(
      sessionSummaryEvent({
        total: answers.length,
        wrong: missed.length,
        cardId: worst?.cardId ?? null,
        front: worst?.cardTitle ?? null
      })
    )
  }, [complete, id, graded, askCompanion])

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

      /*
       * A card the learner could not recall is the one moment the companion
       * has something useful to say unasked (MOB-088). Once per card, after a
       * pause, and only if the settings allow it — `queue` is the thing that
       * asks, so nothing here decides.
       */
      if (value !== 'again' || nudged.current.has(cardId)) return
      nudged.current.add(cardId)
      clearTimeout(nudgeTimer.current)
      nudgeTimer.current = setTimeout(
        () => askCompanion(wrongAnswerEvent(card, { index, total: cards.length })),
        NUDGE_DELAY + Math.random() * NUDGE_JITTER
      )
    },
    [cards, index, id, graded, askCompanion]
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

  const cardId = current?._id ?? current?.id ?? null
  const answered = Boolean(cardId && graded[cardId])

  /*
   * Two forms of one fact. The header is ONE row (ADR-011) and it now holds
   * three labelled controls beside this — Listen, Mark and Ask — so the full
   * sentence wrapped it onto a second line. The digits are what a sighted
   * reader is actually scanning for; the sentence is what a screen reader needs,
   * and it stays as this line's accessible name (MOB-086).
   */
  const counter = useMemo(() => t('cards.session.cardShort', { current: index + 1, total }), [t, index, total])
  const counterSaid = useMemo(() => t('cards.session.card', { current: index + 1, total }), [t, index, total])

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

          {/* The companion, at the stage this session reached. It arrives a
              moment after the summary does, because the grants are settled
              rather than awaited — XP is a reward, and a reward that can hold
              up the summary is a punishment. */}
          {levelUp ? <PetLevelUp level={levelUp.level} stage={levelUp.stage} accent={accent} /> : null}

          {/* The companion's word on the session, inside the summary rather
              than over it (ADR-022). It arrives a few seconds after the screen
              does, which is why it is placed below what the screen already
              said rather than above it. */}
          <CompanionNote stage={pet.stage} text={buddy.message?.message} speech={buddySpeech} onDismiss={buddy.dismiss} />

          <Button onPress={() => router.replace('/study')}>{t('cards.session.complete.backToLibrary')}</Button>
        </Stack>
      </Screen>
    )
  }

  return (
    <Screen scroll={false}>
      <Stack spacing={2} style={{ flex: 1 }}>
        {/*
         * The web's session header, on one row closed by a progress seam
         * (ADR-011). The back control is in the app bar above, so this row is
         * the count and the mark.
         *
         * Both were missing pieces rather than adaptations: the session had no
         * progress indicator of any kind — twenty-four cards and a number —
         * and no way to mark a card at all, which is the one thing SM-2 cannot
         * infer and the moment the learner actually knows it (MOB-062).
         */}
        <Stack spacing={1}>
          <Stack direction='row' spacing={1} alignItems='center'>
            <Typography
              level='title-sm'
              color='text.primary'
              accessibilityLabel={counterSaid}
              style={{ flex: 1, fontVariant: ['tabular-nums'] }}
            >
              {counter}
            </Typography>
            {/*
             * Listen (MOB-077). In the session's one header row beside the
             * mark, not floating over the card as it does on the web: the card
             * here IS the flip target, and a button sitting on top of a tap
             * surface that does something else is a trap.
             *
             * Only when there is something to say — a card whose face is empty
             * would otherwise offer a control that does nothing.
             */}
            {speech.canSpeak ? <SpeakToggle speaking={speech.speaking} onPress={speech.toggle} /> : null}
            <MarkToggle card={current} />
            {/*
             * Ask about THIS card (MOB-086). The context is handed over rather
             * than put in the route: it carries the card's answer, and a
             * learner's card text does not belong in a URL.
             *
             * The chat is pushed, so this session stays mounted behind it —
             * back returns to the same card, the same face and the same queue,
             * which is the whole reason the control is here rather than on Home.
             */}
            <AskToggle onPress={() => openChat()} />
          </Stack>

          {/*
           * Progress as an EDGE, not an object (§15.4).
           *
           * Labelled with what it IS, not with what the line above it already
           * says: the bar carried the counter as its name, so a screen reader
           * read "Card 2 of 23" twice in a row (MOB-042). The number is the
           * bar's VALUE, which `Progress` already announces.
           */}
          <Progress value={total > 0 ? ((index + 1) / total) * 100 : 0} accessibilityLabel={t('annualPlanning.goal.progress')} />
        </Stack>

        {/* The card fills what is left, so the grades sit in the bottom third
            of any screen height rather than at a measured offset. */}
        <SwipeArea
          style={{ flex: 1 }}
          // What the card is, so the swipe knows when the content behind it
          // has actually changed.
          resetKey={cardId ?? index}
          onLeft={skip}
          onRight={index > 0 ? back : undefined}
          onUp={revealed ? undefined : () => setRevealed(true)}
        >
          {/*
           * A `Pressable`, not a raw touch handler. `onTouchEnd` fires at the
           * end of ANY touch, including the end of a swipe — so navigating
           * revealed the answer on the way past, which is the opposite of
           * recall practice. `onPress` does not fire once the finger has
           * travelled, which is exactly the distinction needed.
           *
           * It TOGGLES. Reveal-only left no way back to the question: a card
           * turned over by accident stayed over, and the screen read as stuck.
           *
           * Its CONTENT stays readable — a screen reader has to be able to
           * read the question — and the accessibility dump confirms it is: the
           * card reads as "Question, イギリス". What it must not become is a
           * second labelled control competing with the reveal button below, so
           * it carries no name of its own and the text underneath supplies one
           * (MOB-042).
           */}
          <Pressable style={{ flex: 1 }} onPress={() => setRevealed((shown) => !shown)} importantForAccessibility='no' accessible={false}>
            {/*
             * Two faces that turn, as on the web — not a question with an
             * answer appended under it. The back face carries the answer and
             * only the answer: showing the question on both faces makes the
             * turn meaningless and hands the reader the prompt they are
             * supposed to be recalling from.
             */}
            {/*
             * Keyed by the card, as the web's flip container is. A new card is
             * always face up, and remounting is what makes that instant: a
             * card graded while its answer was showing would otherwise spin
             * back to its question over 240ms — with the NEXT card's question
             * already on the face doing the spinning.
             */}
            <FlipCard
              key={cardId ?? index}
              style={{ flex: 1 }}
              flipped={revealed}
              front={
                <CardFace label={t('cards.session.labels.question')} labelColor='primary.plainColor' level='h4' text={frontOf(current)} />
              }
              back={
                <CardFace
                  label={t('cards.session.labels.answer')}
                  labelColor='success.plainColor'
                  // The web's own switch: a long answer is prose and reads at
                  // body size; a short one is a term and holds the card.
                  level={backOf(current).length > LONG_ANSWER ? 'body-lg' : 'h4'}
                  text={backOf(current)}
                />
              }
            />
          </Pressable>
        </SwipeArea>

        {/* One line, one height, three possible contents: the gestures said
            once on the first card, the note that this card already has a
            grade, or nothing at all. */}
        <View style={{ minHeight: NOTICE_BAND, justifyContent: 'center' }}>
          {buddy.message ? (
            /*
             * A fourth possible content, and it takes the band because it is
             * the only one of the four the learner did not already know. The
             * hint and the already-graded note are both reminders; this is new
             * information, and it goes HERE rather than over the card because a
             * message about a card that covers that card is ADR-022's whole
             * subject.
             */
            <CompanionNote stage={pet.stage} text={buddy.message.message} speech={buddySpeech} onDismiss={buddy.dismiss} />
          ) : answered ? (
            <Typography level='body-xs' color='text.tertiary' accessibilityLiveRegion='polite' style={{ textAlign: 'center' }}>
              {t('cards.session.grading.alreadyAnswered')}
            </Typography>
          ) : hinted ? null : (
            /* Every gesture has a button that does the same thing, so this is
               an offer rather than an instruction — and it is decorative,
               because a screen reader already has the buttons. */
            <Stack direction='row' spacing={2} style={{ justifyContent: 'center' }} importantForAccessibility='no'>
              <Icon name='ArrowLeft' size='sm' color='text.tertiary' />
              <Icon name='ArrowUp' size='sm' color='text.tertiary' />
              <Icon name='ArrowRight' size='sm' color='text.tertiary' />
            </Stack>
          )}
        </View>

        {/* A MINIMUM height, not a height: the labels inside grow with the OS
            text size and a fixed band clips them. */}
        <View style={{ minHeight: ACTION_BAND, justifyContent: 'center' }}>
          {revealed ? (
            /*
             * Four tones, not four neutral keys, and they are the web's own:
             * outlined danger, soft warning, soft success, solid primary. An
             * earlier version made all four secondary on the reasoning that an
             * accented key biases self-assessment. That reasoning lost to a
             * design that has shipped for a year and to the fact that these four
             * ARE the surface — the exception is recorded in `buttonSpec.js`.
             */
            <Stack direction='row' spacing={1} flexWrap={wrapGrades ? 'wrap' : 'nowrap'}>
              {GRADES.map((value) => (
                <Button
                  key={value}
                  variant={GRADE_VARIANTS[value]}
                  size='md'
                  /* Two rows of two once the labels no longer fit in one. */
                  style={wrapGrades ? { flexBasis: '47%', flexGrow: 1 } : { flex: 1 }}
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
        </View>
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

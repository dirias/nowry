import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePet } from '../../context/AgentContext'
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Box,
  LinearProgress,
  IconButton,
  Radio,
  RadioGroup,
  Skeleton,
  Chip
} from '@mui/joy'
import { ArrowBack, ArrowForward, CheckCircle, Fullscreen, FullscreenExit, SwipeLeft, SwipeRight, SwipeVertical } from '@mui/icons-material'
import { cardsService, decksService } from '../../api/services'
import { studySessionsService } from '../../api/services/studySessions.service'
import { useCardData } from '../../hooks/useCardData'
import { useVoiceSettings } from '../../hooks/useVoiceSettings'
import { apiCache } from '../../api/utils/cache'
import TTSControls from '../TTS/TTSControls'
import mermaid from 'mermaid'
import DOMPurify from 'dompurify'
import { Z_FULLSCREEN } from '../../constants/zIndex'

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose'
})

// PERF-01 (D-05/D-06, RESEARCH.md Pattern 1 / Pitfall 2): these three were
// previously `const X = () => (...)` defined INSIDE StudySession()'s render
// body — a fresh function reference every render, which React treats as a
// new component TYPE each time, tearing down and remounting the entire
// subtree rather than merely re-rendering it. Hoisted to module scope and
// wrapped in React.memo so React can skip reconciling them when their props
// are unchanged. All values they previously closed over are now explicit
// props — critical per D-06/D-07: `onGrade` (StudySession's memoized
// `handleGrade`) must keep changing identity whenever `cards`/`currentIndex`
// change, or this memoized child would hold a stale grading closure (locked
// by the "rapid grading race guard" test in StudySession.test.js).
const GradingButtons = React.memo(function GradingButtons({ onGrade, pendingSyncCount, t }) {
  return (
    <Box
      sx={{ width: '100%', position: 'relative', zIndex: 20 }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Show pending sync indicator */}
      {pendingSyncCount > 0 && (
        <Box sx={{ mb: 1.5, textAlign: 'center' }}>
          <Typography level='body-xs' sx={{ color: 'warning.plainColor', opacity: 0.7 }}>
            {t('cards.session.syncing', { count: pendingSyncCount })}
          </Typography>
        </Box>
      )}

      <Stack direction='row' spacing={{ xs: 0.75, md: 1.5 }} sx={{ mt: { xs: 2, md: 3 }, width: '100%' }} justifyContent='center'>
        <Button
          variant='outlined'
          color='danger'
          onClick={() => onGrade('again')}
          sx={{
            flex: 1,
            py: { xs: 1, md: 1.5 },
            minHeight: { xs: 44, md: 36 },
            fontSize: { xs: 'xs', md: 'sm' },
            fontWeight: 600,
            '&:hover': { bgcolor: 'danger.softBg' }
          }}
        >
          {t('cards.session.grading.again')}
        </Button>
        <Button
          variant='soft'
          color='warning'
          onClick={() => onGrade('hard')}
          sx={{
            flex: 1,
            py: { xs: 1, md: 1.5 },
            minHeight: { xs: 44, md: 36 },
            fontSize: { xs: 'xs', md: 'sm' },
            fontWeight: 600
          }}
        >
          {t('cards.session.grading.hard')}
        </Button>
        <Button
          variant='soft'
          color='success'
          onClick={() => onGrade('good')}
          sx={{
            flex: 1,
            py: { xs: 1, md: 1.5 },
            minHeight: { xs: 44, md: 36 },
            fontSize: { xs: 'xs', md: 'sm' },
            fontWeight: 600
          }}
        >
          {t('cards.session.grading.good')}
        </Button>
        <Button
          variant='solid'
          color='primary'
          onClick={() => onGrade('easy')}
          sx={{
            flex: 1,
            py: { xs: 1, md: 1.5 },
            minHeight: { xs: 44, md: 36 },
            fontSize: { xs: 'xs', md: 'sm' },
            fontWeight: 600
          }}
        >
          {t('cards.session.grading.easy')}
        </Button>
      </Stack>
    </Box>
  )
})

// Pinned footer sibling (progress counter + GradingButtons), rendered universally in
// both fullscreen and non-fullscreen modes (RESEARCH.md Open Question 1 / Assumption A2).
const SessionFooter = React.memo(function SessionFooter({
  showGrading = true,
  mode,
  modeChipColor,
  currentIndex,
  cardsLength,
  onGrade,
  pendingSyncCount,
  t
}) {
  return (
    <Box data-testid='session-footer' sx={{ width: '100%' }}>
      <Stack direction='row' spacing={1} alignItems='center' justifyContent='center' sx={{ mb: 1 }}>
        <Chip size='sm' variant='soft' color={modeChipColor}>
          {t(`cards.session.mode.${mode}`)}
        </Chip>
        <Typography level='body-xs' sx={{ textAlign: 'center', color: 'text.tertiary' }}>
          {t('cards.session.card', { current: currentIndex + 1, total: cardsLength })}
        </Typography>
      </Stack>
      {showGrading && <GradingButtons onGrade={onGrade} pendingSyncCount={pendingSyncCount} t={t} />}
    </Box>
  )
})

// Icon-only, first-card-only swipe-gesture affordance (D-08/D-09). Purely
// decorative — aria-hidden + pointerEvents:'none' guarantee it can never
// intercept touch/tap input; no text, no t() calls, no new i18n keys. No
// props needed — fully static/decorative.
const SwipeHint = React.memo(function SwipeHint() {
  return (
    <Box
      data-testid='swipe-hint'
      aria-hidden='true'
      sx={{
        display: { xs: 'flex', md: 'none' },
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        left: 0,
        right: 0,
        justifyContent: 'space-between',
        px: 2,
        pointerEvents: 'none',
        zIndex: 15,
        opacity: 0.5
      }}
    >
      <SwipeLeft sx={{ color: 'text.tertiary' }} />
      <SwipeVertical sx={{ color: 'text.tertiary' }} />
      <SwipeRight sx={{ color: 'text.tertiary' }} />
    </Box>
  )
})

export default function StudySession() {
  const { deckId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const mermaidRef = useRef(null)
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode') || 'study'
  const isReadOnlyMode = mode === 'browse' || mode === 'cram'
  const modeChipColor = { study: 'neutral', browse: 'primary', cram: 'warning' }[mode]

  const [cards, setCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [mermaidSvg, setMermaidSvg] = useState('')
  const [showVoiceSettings, setShowVoiceSettings] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [reviewQueue, setReviewQueue] = useState([])
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 })
  const [isPressing, setIsPressing] = useState(false)
  // Mobile-only, first-card-only swipe-gesture affordance (D-08/D-09).
  const [showSwipeHint, setShowSwipeHint] = useState(true)
  const [loadError, setLoadError] = useState(false)
  // MODE-06/D-06: computed once (in the sessionComplete effect below) and
  // shared by BOTH the on-screen summary stat and the session_summary
  // intervention payload — no second sort lives in the render.
  const [needsAttentionCount, setNeedsAttentionCount] = useState(0)
  const [mostAttentionCardFront, setMostAttentionCardFront] = useState(null)

  const handleCardMouseMove = React.useCallback((e) => {
    if (!e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setGlare((prev) => ({ x: (x / rect.width) * 100, y: (y / rect.height) * 100, opacity: 1 }))
  }, [])

  const handleCardMouseLeave = React.useCallback(() => {
    setGlare((prev) => ({ ...prev, opacity: 0 }))
  }, [])

  // Centralized voice settings — reads & writes through the shared hook
  const { voiceSettings, getSettingsForDeck, handleVoiceSettingsChange: _handleVoiceSettingsChange } = useVoiceSettings(deckId)

  // In daily-review mode, voice settings come from the per-card deck lookup
  const currentCardDeckId = cards[currentIndex]?.deck_id?._id || cards[currentIndex]?.deck_id
  const activeVoiceSettings = deckId === 'daily-review' && currentCardDeckId ? getSettingsForDeck(currentCardDeckId) : voiceSettings

  const handleVoiceSettingsChange = React.useCallback(
    (newSettings) =>
      _handleVoiceSettingsChange(newSettings, {
        isFlipped,
        currentDeckId: deckId === 'daily-review' ? currentCardDeckId : deckId
      }),
    [_handleVoiceSettingsChange, isFlipped, deckId, currentCardDeckId]
  )

  const { setViewContext, queueIntervention, resetCompanionSession, setStudySession, setStudySessionFullscreen } = usePet()

  const buildStudyContext = React.useCallback(
    (cardIdx, flipped) => {
      const card = cards[cardIdx]
      if (!card) return null
      return {
        page: 'study_session',
        deckId: deckId === 'daily-review' ? card.deck_id?._id || card.deck_id || null : deckId,
        deckName: card.deck_id?.name || card.deck_id?.title || null,
        cardIndex: cardIdx + 1,
        totalCards: cards.length,
        cardType: card.card_type || 'basic',
        isFlipped: flipped,
        front: card.title || '',
        back: flipped ? card.content || '' : null,
        isDailyReview: deckId === 'daily-review',
        mode
      }
    },
    [cards, deckId, mode]
  )

  // Signal to AgentContext that a study session is active
  useEffect(() => {
    setStudySession(true)
    return () => {
      setStudySession(false)
      setStudySessionFullscreen(false)
    }
  }, [setStudySession, setStudySessionFullscreen])

  // Mirror isFullscreen to context so the globally-mounted Pet can bump its z-index
  useEffect(() => {
    setStudySessionFullscreen(isFullscreen)
  }, [isFullscreen, setStudySessionFullscreen])

  // Companion intervention tracking
  const interventionFiredCardIds = useRef(new Set())
  const wrongCountPerCardId = useRef({})
  // Tie-break support for the "most attention needed" callout: tracks how many
  // of each card's needs-attention grades were specifically 'again' (a full
  // miss) rather than 'hard' (recalled with difficulty). Only used to break
  // ties in wrongCountPerCardId — never changes the total count itself (D-05).
  const againCountPerCardId = useRef({})
  const interventionTimerRef = useRef(null)

  // Session history tracking
  const sessionStartTime = useRef(new Date())
  const gradedCards = useRef([]) // accumulates { cardId, cardTitle, grade, evaluation } per card

  // Swipe state
  const touchStart = useRef(null)
  const touchEnd = useRef(null)
  const touchStartY = useRef(null)
  const touchEndY = useRef(null)
  const minSwipeDistance = 50

  const { cards: cardsData, loading: cardsLoading, reload: reloadCards } = useCardData()

  const fetchDeckCards = React.useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(false)
      let reviewCards = []

      if (deckId === 'daily-review') {
        reviewCards = await cardsService.getDailyReviewCards()
      } else if (isReadOnlyMode) {
        reviewCards = await cardsService.getAllCards(deckId)
      } else {
        reviewCards = await cardsService.getDueCards(deckId)
      }

      if (reviewCards && (reviewCards.length > 0 || reviewCards.items?.length > 0)) {
        const processed = (reviewCards.items || reviewCards).map((card) => ({
          ...card,
          id: card._id || card.id
        }))
        setCards(processed)
      } else {
        setCards([])
        if (mode === 'study') {
          setSessionComplete(true)
        }
      }
    } catch (error) {
      console.error('Error fetching cards:', error)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [deckId, isReadOnlyMode, mode])

  useEffect(() => {
    if (cardsLoading) return
    fetchDeckCards()
  }, [cardsLoading, fetchDeckCards])

  // Invalidate cache when leaving study session; reset companion state
  useEffect(() => {
    return () => {
      apiCache.invalidate('cards:statistics')
      apiCache.invalidate('cards:all')
      apiCache.invalidate('decks:all')
      setViewContext(null)
      resetCompanionSession()
      if (interventionTimerRef.current) clearTimeout(interventionTimerRef.current)
    }
  }, [setViewContext, resetCompanionSession])

  // Retry failed reviews in background
  useEffect(() => {
    if (reviewQueue.length === 0) return

    const retryFailedReviews = async () => {
      const pendingReviews = [...reviewQueue]

      for (const review of pendingReviews) {
        if (review.retryCount >= 3) {
          // Max retries reached, remove from queue
          console.error('Max retries reached for review:', review.cardId)
          setReviewQueue((prev) => prev.filter((r) => r !== review))
          continue
        }

        try {
          await cardsService.review(review.cardId, review.grade, review.mode)
          // Success! Remove from queue
          setReviewQueue((prev) => prev.filter((r) => r !== review))
          console.log('Successfully synced queued review:', review.cardId)
        } catch (error) {
          // Failed again, increment retry count
          setReviewQueue((prev) => prev.map((r) => (r === review ? { ...r, retryCount: r.retryCount + 1 } : r)))
          console.warn('Retry failed, will try again:', review.cardId)
        }
      }
    }

    // Retry after 5 seconds
    const retryTimer = setTimeout(retryFailedReviews, 5000)
    return () => clearTimeout(retryTimer)
  }, [reviewQueue])

  useEffect(() => {
    // Render Mermaid diagram for visual cards
    const currentCard = cards[currentIndex]
    if (currentCard?.card_type === 'visual' && currentCard.diagram_code && mermaidRef.current) {
      const id = `mermaid-${Date.now()}`
      mermaid
        .render(id, currentCard.diagram_code)
        .then((result) => setMermaidSvg(result.svg))
        .catch((err) => console.error('Mermaid render error:', err))
    }
  }, [currentIndex, cards])

  // Inject structured screen context into the Study Pet on card change and flip
  useEffect(() => {
    if (!cards || cards.length === 0) return
    const ctx = buildStudyContext(currentIndex, isFlipped)
    setViewContext(ctx)
  }, [currentIndex, isFlipped, cards, buildStudyContext, setViewContext])

  // Clear pet context when session is complete + fire session_summary intervention
  useEffect(() => {
    if (!sessionComplete) return
    setViewContext(null)

    const wrongCounts = wrongCountPerCardId.current
    const againCounts = againCountPerCardId.current
    // Primary: highest needs-attention count wins. Tie-break: prefer whichever
    // tied card has more 'again' grades (a full miss is more concerning than
    // 'hard', which is recalled-with-difficulty) — not just first-encountered.
    // Any remaining tie (equal count AND equal again-count) falls through to
    // Array.sort's stable-sort guarantee, i.e. first-encountered wins, same as
    // before. Single computed source, so the Pet's session_summary payload
    // (D-06) automatically inherits the same tie-break — no divergent sort.
    const mostMissedEntry = Object.entries(wrongCounts).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return (againCounts[b[0]] || 0) - (againCounts[a[0]] || 0)
    })[0]
    const mostMissedCardId = mostMissedEntry?.[0] ?? null
    const totalWrong = Object.values(wrongCounts).reduce((acc, n) => acc + n, 0)
    const mostMissedCardFront = mostMissedCardId ? (cards.find((c) => (c._id || c.id) === mostMissedCardId)?.title ?? null) : null

    // Single computed source for both the on-screen stat (render below) and
    // the session_summary payload (D-06) — no divergent second sort.
    setNeedsAttentionCount(totalWrong)
    setMostAttentionCardFront(mostMissedCardFront)

    // Guard on cards.length > 0 — an empty/all-caught-up deck lands here with
    // sessionComplete=true but no actual session occurred, so no session_summary
    // should fire (review finding WR-01: previously reached the Pet with
    // session_total_cards: 0, misreported as "1 cards" by the backend's now-fixed
    // falsy-zero fallback).
    if (mode === 'study' && cards.length > 0) {
      queueIntervention({
        type: 'session_summary',
        session_total_cards: cards.length,
        session_wrong_count: totalWrong,
        most_missed_card_id: mostMissedCardId,
        most_missed_card_front: mostMissedCardFront
      })
    }

    // LOG SESSION HISTORY — fire-and-forget, never blocks the UI
    if (gradedCards.current.length > 0) {
      const firstCard = cards[0]
      const deckIdValue = deckId === 'daily-review' ? null : deckId
      const deckNameValue = deckId === 'daily-review' ? 'Daily Review' : firstCard?.deck_id?.name || firstCard?.deck_id?.title || null

      studySessionsService
        .log({
          deckId: deckIdValue,
          deckName: deckNameValue,
          startedAt: sessionStartTime.current,
          cards: gradedCards.current
        })
        .catch(() => {
          // Non-fatal — history logging never interrupts the study experience
        })
    }
  }, [sessionComplete, setViewContext, queueIntervention, cards, deckId, mode])

  const handleFlip = React.useCallback(() => {
    setIsFlipped((prev) => !prev)
  }, [])

  const handleQuizAnswer = React.useCallback((option) => {
    setSelectedAnswer(option)
    setShowExplanation(true)
  }, [])

  // PERF-02 (D-07) rapid-grading race guard: a synchronous mirror of
  // cards/currentIndex, refreshed every render (line below) AND mutated
  // directly — synchronously — by handleNext/handleGrade themselves. React
  // state updates (setCards/setCurrentIndex) only become visible to a new
  // closure once React actually commits and re-renders; two clicks
  // dispatched within the SAME synchronous batch (e.g. a genuine rapid
  // double-click, or the StudySession.test.js "rapid grading race guard"
  // test's single act() block) never see a commit in between, so reading
  // `cards`/`currentIndex` directly would let the second click re-grade the
  // SAME stale card (or, combined with handleNext's own stale read, advance
  // currentIndex twice and crash with an out-of-bounds cards[currentIndex]
  // read). Reading/advancing through this ref instead closes that window.
  const latestStateRef = useRef({ cards, currentIndex })
  latestStateRef.current = { cards, currentIndex }

  const handleNext = React.useCallback(() => {
    const { currentIndex: latestIndex } = latestStateRef.current
    if (latestIndex < cards.length - 1) {
      const nextIndex = latestIndex + 1
      latestStateRef.current = { ...latestStateRef.current, currentIndex: nextIndex }
      setCurrentIndex(nextIndex)
      setIsFlipped(false)
      setSelectedAnswer(null)
      setShowExplanation(false)
      setMermaidSvg('')
    } else {
      setSessionComplete(true)
    }
  }, [currentIndex, cards.length])

  const handleGrade = React.useCallback(
    async (grade) => {
      const { cards: latestCards, currentIndex: latestIndex } = latestStateRef.current
      const currentCard = latestCards[latestIndex]
      // Defensive guard: a same-tick extra click after the session has
      // already advanced past the last card (e.g. a third rapid click) has
      // nothing left to grade — no-op rather than crash.
      if (!currentCard) return
      const cardId = currentCard._id || currentCard.id

      // OPTIMISTIC UPDATE: Calculate SM-2 locally for instant feedback
      const currentEaseFactor = currentCard.ease_factor || 2.5
      const currentInterval = currentCard.interval || 1
      const currentRepetitions = currentCard.repetitions || 0

      // Simple SM-2 calculation (client-side estimation)
      const gradeMap = { again: 0, hard: 3, good: 4, easy: 5 }
      const quality = gradeMap[grade]

      let newEaseFactor = currentEaseFactor
      let newInterval = currentInterval
      let newRepetitions = currentRepetitions

      if (quality < 3) {
        newRepetitions = 0
        newInterval = 1
      } else {
        newEaseFactor = Math.max(1.3, Math.min(2.5, currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))))

        if (currentRepetitions === 0) {
          newInterval = 1
        } else if (currentRepetitions === 1) {
          newInterval = 6
        } else {
          newInterval = Math.round(currentInterval * newEaseFactor)
        }

        newRepetitions = currentRepetitions + 1
      }

      const newNextReview = new Date()
      newNextReview.setDate(newNextReview.getDate() + newInterval)

      // INSTANT UI UPDATE (Optimistic)
      const optimisticUpdate = {
        ...currentCard,
        last_reviewed: new Date().toISOString(),
        next_review: newNextReview.toISOString(),
        ease_factor: parseFloat(newEaseFactor.toFixed(2)),
        interval: newInterval,
        repetitions: newRepetitions
      }

      const updatedCards = [...latestCards]
      updatedCards[latestIndex] = optimisticUpdate
      // Advance the synchronous source of truth immediately (currentIndex
      // is intentionally left for handleNext to advance below, mirroring
      // its existing branching logic) — see latestStateRef comment above.
      latestStateRef.current = { cards: updatedCards, currentIndex: latestIndex }
      setCards(updatedCards)

      // Move to next card IMMEDIATELY
      handleNext()

      // HISTORY: accumulate this grade for session-level logging on completion
      const gradeToEval = { again: 'incorrect', hard: 'partial', good: 'correct', easy: 'correct' }
      gradedCards.current.push({
        cardId: cardId,
        cardTitle: currentCard.title || currentCard.front || null,
        grade,
        evaluation: gradeToEval[grade] ?? 'incorrect'
      })

      // NEEDS-ATTENTION TRACKING: Again and Hard both count toward the
      // broadened needs-attention total shown on the summary screen (D-05).
      // This conditional is intentionally SEPARATE from the Again-only
      // real-time nudge below (Pitfall 1) — Hard must never schedule a
      // wrong_answer intervention.
      if (grade === 'again' || grade === 'hard') {
        const attentionCardId = currentCard._id || currentCard.id
        wrongCountPerCardId.current[attentionCardId] = (wrongCountPerCardId.current[attentionCardId] || 0) + 1
        if (grade === 'again') {
          againCountPerCardId.current[attentionCardId] = (againCountPerCardId.current[attentionCardId] || 0) + 1
        }
      }

      // COMPANION INTERVENTION: trigger a delayed nudge for 'again' grade
      if (grade === 'again') {
        const wrongCardId = currentCard._id || currentCard.id

        if (!interventionFiredCardIds.current.has(wrongCardId)) {
          interventionFiredCardIds.current.add(wrongCardId)
          if (interventionTimerRef.current) clearTimeout(interventionTimerRef.current)

          const delay = 3000 + Math.random() * 5000
          interventionTimerRef.current = setTimeout(() => {
            queueIntervention({
              type: 'wrong_answer',
              card_id: wrongCardId,
              card_front: currentCard.title || currentCard.front || '',
              card_back: currentCard.content || currentCard.back || '',
              card_notes: currentCard.notes || null,
              card_type: currentCard.card_type || 'basic',
              session_card_index: latestIndex + 1,
              session_total_cards: cards.length
            })
          }, delay)
        }
      }

      // BACKGROUND SYNC: Send to backend (fire-and-forget)
      try {
        const response = await cardsService.review(cardId, grade, mode)

        // If backend returns different values, update silently.
        // Re-read cards from latestStateRef (not the `cards` closure captured
        // when this handleGrade call started) — by the time this await
        // resolves, further rapid grades may have already advanced
        // latestStateRef.current.cards, and spreading the stale `cards`
        // closure here would silently revert those newer optimistic updates.
        if (response && response.sm2_data) {
          const syncedCards = [...latestStateRef.current.cards]
          const cardIndex = syncedCards.findIndex((c) => (c._id || c.id) === cardId)

          if (cardIndex !== -1) {
            syncedCards[cardIndex] = {
              ...syncedCards[cardIndex],
              last_reviewed: response.sm2_data.last_reviewed,
              next_review: response.sm2_data.next_review,
              ease_factor: response.sm2_data.ease_factor,
              interval: response.sm2_data.interval,
              repetitions: response.sm2_data.repetitions
            }
            latestStateRef.current = { ...latestStateRef.current, cards: syncedCards }
            setCards(syncedCards)
          }
        }
      } catch (error) {
        console.error('Error syncing review to backend:', error)

        // QUEUE FAILED REQUEST for retry
        setReviewQueue((prev) => [
          ...prev,
          {
            cardId,
            grade,
            mode,
            timestamp: Date.now(),
            retryCount: 0
          }
        ])

        // Note: Keep optimistic update in UI, will retry in background
        console.warn('Review queued for retry:', cardId, grade)
      }
    },
    [cards, currentIndex, handleNext, mode]
  )

  const handlePrev = React.useCallback(() => {
    // Mirrors handleNext's latestStateRef guard (PERF-02 D-07): reading the
    // `currentIndex` closure directly would let two rapid clicks dispatched
    // in the same synchronous batch both pass the `> 0` guard against the
    // same stale value, then both apply a functional setCurrentIndex
    // decrement — driving currentIndex to -1 and crashing on the next
    // cards[currentIndex] read. Guarding and advancing through the ref
    // instead closes that window.
    const { currentIndex: latestIndex } = latestStateRef.current
    if (latestIndex > 0) {
      const prevIndex = latestIndex - 1
      latestStateRef.current = { ...latestStateRef.current, currentIndex: prevIndex }
      setCurrentIndex(prevIndex)
      setIsFlipped(false)
      setSelectedAnswer(null)
      setShowExplanation(false)
      setMermaidSvg('')
    }
  }, [currentIndex])

  const handleFullscreenToggle = React.useCallback(() => {
    setIsFullscreen((prev) => !prev)
  }, [])

  const onTouchStart = React.useCallback((e) => {
    touchEnd.current = null
    touchEndY.current = null
    touchStart.current = e.targetTouches[0].clientX
    touchStartY.current = e.targetTouches[0].clientY
  }, [])

  const onTouchMove = React.useCallback((e) => {
    touchEnd.current = e.targetTouches[0].clientX
    touchEndY.current = e.targetTouches[0].clientY
  }, [])

  const onTouchEnd = React.useCallback(() => {
    if (!touchStart.current || !touchEnd.current || !touchStartY.current || !touchEndY.current) return

    const distanceX = touchStart.current - touchEnd.current
    const distanceY = touchStartY.current - touchEndY.current

    const isHorizontal = Math.abs(distanceX) > Math.abs(distanceY)

    if (isHorizontal) {
      const isLeftSwipe = distanceX > minSwipeDistance
      const isRightSwipe = distanceX < -minSwipeDistance

      if (isLeftSwipe) {
        setShowSwipeHint(false)
        handleNext()
      }
      if (isRightSwipe) {
        setShowSwipeHint(false)
        handlePrev()
      }
    } else {
      const isUpSwipe = distanceY > minSwipeDistance
      const isDownSwipe = distanceY < -minSwipeDistance

      if (isUpSwipe) {
        setShowSwipeHint(false)
        handleFlip()
      }
      if (isDownSwipe) {
        setShowSwipeHint(false)
        setShowVoiceSettings(true)
      }
    }
  }, [handleNext, handlePrev, handleFlip])

  // §7: Use Skeleton placeholders, not a full-page loading gate
  if (loading) {
    return (
      <Container maxWidth='xl' sx={{ py: 4, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Stack direction='row' alignItems='center' spacing={2} sx={{ mb: 2 }}>
          <Skeleton variant='circular' width={36} height={36} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant='text' width='8ch' sx={{ mb: 0.5 }} />
            <Skeleton variant='rectangular' height={4} sx={{ borderRadius: 'sm' }} />
          </Box>
        </Stack>
        <Skeleton variant='rectangular' sx={{ flex: 1, borderRadius: 'xl', minHeight: 500 }} />
      </Container>
    )
  }

  if (loadError || cards.length === 0) {
    const emptyTitleKey = loadError
      ? 'cards.session.error'
      : mode === 'study'
        ? 'cards.session.allCaughtUp'
        : 'cards.session.emptyDeck.title'
    const emptyBodyKey = mode === 'study' ? 'cards.session.noDue' : 'cards.session.emptyDeck.body'
    return (
      <Container maxWidth='md' sx={{ py: 4 }}>
        <Card sx={{ textAlign: 'center', py: 6, borderRadius: 'xl', boxShadow: 'sm' }}>
          <CardContent>
            <Typography level='h4' sx={{ mb: 2 }}>
              {t(emptyTitleKey)}
            </Typography>
            {!loadError && (
              <Typography level='body-md' sx={{ mb: 3, color: 'text.secondary' }}>
                {t(emptyBodyKey)}
              </Typography>
            )}
            <Button onClick={() => navigate('/study')}>{t('cards.session.goBack')}</Button>
          </CardContent>
        </Card>
      </Container>
    )
  }

  if (sessionComplete) {
    return (
      <Container maxWidth='sm' sx={{ py: 4 }}>
        <Card variant='outlined' sx={{ borderRadius: 'xl', boxShadow: 'md', overflow: 'hidden' }}>
          {/* Icon zone */}
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 5, pb: 3 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'success.softBg',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CheckCircle sx={{ fontSize: 44, color: 'success.plainColor' }} />
            </Box>
          </Box>

          {/* Stat block */}
          <Box sx={{ bgcolor: 'background.level1', mx: 3, borderRadius: 'lg', py: 2.5, px: 3, mb: 3 }}>
            <Stack direction='row' justifyContent='center' spacing={4}>
              <Stack alignItems='center'>
                <Typography level='h2' fontWeight={700}>
                  {cards.length}
                </Typography>
                <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                  {t('cards.session.complete.cardsReviewed')}
                </Typography>
              </Stack>
              {needsAttentionCount > 0 && (
                <Stack alignItems='center'>
                  <Typography level='h2' fontWeight={700} sx={{ color: 'warning.plainColor' }}>
                    {needsAttentionCount}
                  </Typography>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                    {t('cards.session.complete.needsAttentionLabel')}
                  </Typography>
                </Stack>
              )}
            </Stack>
            {needsAttentionCount > 0 && (
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                <Typography
                  level='body-sm'
                  sx={{
                    color: 'text.secondary',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 2,
                    overflow: 'hidden'
                  }}
                >
                  {t('cards.session.complete.topCardCallout', { card: mostAttentionCardFront })}
                </Typography>
              </Box>
            )}
            {needsAttentionCount === 0 && (
              <Typography level='body-sm' fontWeight={600} sx={{ color: 'success.plainColor', textAlign: 'center', mt: 2 }}>
                {t('cards.session.complete.perfectSession')}
              </Typography>
            )}
          </Box>

          {/* Text + CTA */}
          <Box sx={{ textAlign: 'center', px: 3, pb: 5 }}>
            <Typography level='h3' fontWeight={700} sx={{ mb: 1 }}>
              {t('cards.session.complete.title')}
            </Typography>
            <Typography level='body-md' sx={{ mb: 4, color: 'text.secondary' }}>
              {t('cards.session.complete.body', { count: cards.length })}
            </Typography>
            <Button size='lg' variant='solid' color='primary' onClick={() => navigate('/study')}>
              {t('cards.session.complete.backToLibrary')}
            </Button>
          </Box>
        </Card>
      </Container>
    )
  }

  const currentCard = cards[currentIndex]
  const progress = ((currentIndex + 1) / cards.length) * 100
  const isQuiz = currentCard.card_type === 'quiz'
  const isVisual = currentCard.card_type === 'visual'

  return (
    <Container
      maxWidth={isFullscreen ? false : 'xl'}
      sx={{
        py: isFullscreen ? 0 : 4,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        px: isFullscreen ? 0 : 2
      }}
    >
      {/* Header - Hide in Fullscreen */}
      {!isFullscreen && (
        <Stack direction='row' alignItems='center' spacing={2} sx={{ mb: 2 }}>
          <IconButton
            onClick={() => navigate('/study')}
            variant='plain'
            color='neutral'
            aria-label={t('cards.session.goBack')}
            sx={{ minHeight: { xs: 44, md: 36 }, minWidth: { xs: 44, md: 36 } }}
          >
            <ArrowBack />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography level='body-sm' sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
              {t('cards.session.card', { current: currentIndex + 1, total: cards.length })}
            </Typography>
            <LinearProgress
              determinate
              value={progress}
              color='primary'
              sx={{
                borderRadius: 'full',
                bgcolor: 'background.level2',
                height: 6,
                boxShadow: 'none'
              }}
            />
          </Box>
        </Stack>
      )}

      {/* Main Study Area */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={isFullscreen ? 0 : 4}
        alignItems={isFullscreen ? 'center' : 'flex-start'}
        justifyContent='center'
        sx={{ flex: 1 }}
      >
        {/* Previous Button (Desktop) - Hide in Fullscreen/Mobile usually */}
        {!isFullscreen && (
          <IconButton
            variant='plain'
            color='neutral'
            onClick={handlePrev}
            disabled={currentIndex === 0}
            sx={{ display: { xs: 'none', md: 'flex' }, mt: 20 }}
          >
            <ArrowBack fontSize='large' />
          </IconButton>
        )}

        {/* Card Container */}
        <Box
          data-testid='session-card'
          sx={{
            flex: 1,
            width: '100%',
            maxWidth: isFullscreen ? '100%' : 800,
            position: isFullscreen ? 'fixed' : 'relative',
            top: isFullscreen ? 0 : 'auto',
            left: isFullscreen ? 0 : 'auto',
            right: isFullscreen ? 0 : 'auto',
            bottom: isFullscreen ? 0 : 'auto',
            height: isFullscreen ? '100dvh' : 'auto',
            overflow: isFullscreen ? 'hidden' : 'visible',
            zIndex: isFullscreen ? Z_FULLSCREEN : 1,
            bgcolor: 'background.body', // Ensure background prevents see-through
            display: isFullscreen ? 'flex' : 'block',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Fullscreen Toggle (Top-Left) */}
          <IconButton
            variant='plain'
            color='neutral'
            onClick={handleFullscreenToggle}
            aria-label={isFullscreen ? t('cards.session.exitFullscreen') : t('cards.session.enterFullscreen')}
            sx={{
              display: { xs: 'inline-flex', md: 'none' },
              position: 'absolute',
              top: 16,
              left: 16,
              zIndex: 20,
              minHeight: { xs: 44, md: 36 },
              minWidth: { xs: 44, md: 36 },
              bgcolor: isFullscreen ? 'background.level2' : 'transparent',
              '&:hover': { bgcolor: isFullscreen ? 'background.level3' : 'background.level1' }
            }}
          >
            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>

          {/* Mobile-only swipe-gesture hint, first card only */}
          {currentIndex === 0 && showSwipeHint && <SwipeHint />}

          {/* Embedded TTS Controls */}
          <TTSControls
            compact
            settingsOpen={showVoiceSettings}
            onSettingsChange={setShowVoiceSettings}
            voiceSettings={isFlipped ? activeVoiceSettings.back : activeVoiceSettings.front}
            onVoiceSettingsChange={handleVoiceSettingsChange}
            text={isQuiz ? `${currentCard.title}. ${currentCard.options?.join(', ')}` : isFlipped ? currentCard.content : currentCard.title}
          />
          {isQuiz ? (
            // Quiz Card
            <Card
              variant={isFullscreen ? 'plain' : 'outlined'}
              sx={{
                height: isFullscreen ? '100dvh' : { xs: 'min(560px, calc(100dvh - 96px))', md: 500 },
                borderRadius: isFullscreen ? 0 : 'xl',
                boxShadow: isFullscreen ? 'none' : 'sm',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.27)',
                transform: isPressing && !isFullscreen ? 'scale3d(0.98, 0.98, 0.98)' : 'scale3d(1, 1, 1)'
              }}
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              onMouseDown={() => setIsPressing(true)}
              onMouseUp={() => setIsPressing(false)}
              onTouchStart={() => setIsPressing(true)}
              onTouchEnd={() => setIsPressing(false)}
              onTouchCancel={() => setIsPressing(false)}
            >
              {!isFullscreen && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    pointerEvents: 'none',
                    zIndex: 10,
                    opacity: glare.opacity,
                    transition: 'opacity 0.3s ease',
                    background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, var(--joy-palette-neutral-softBg) 0%, transparent 60%)`,
                    mixBlendMode: 'overlay',
                    display: { xs: 'none', md: 'block' } // Glare is mouse-only
                  }}
                />
              )}
              <Box
                data-testid='session-scroll'
                sx={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', p: { xs: 3, md: 4 }, pt: { xs: 6, md: 8 } }}
              >
                <Typography level='body-xs' sx={{ mb: 2, color: 'warning.plainColor', fontWeight: 700, letterSpacing: '0.5px' }}>
                  {t('cards.session.labels.quiz')}
                </Typography>
                <Typography level='h3' sx={{ mb: 4, fontWeight: 600 }}>
                  {currentCard.title}
                </Typography>

                <RadioGroup value={selectedAnswer} onChange={(e) => handleQuizAnswer(e.target.value)}>
                  <Stack spacing={2}>
                    {currentCard.options?.map((option, idx) => (
                      <Card
                        key={idx}
                        variant={selectedAnswer === option ? 'solid' : 'outlined'}
                        color={
                          showExplanation
                            ? option === currentCard.correct_answer
                              ? 'success'
                              : option === selectedAnswer
                                ? 'danger'
                                : 'neutral'
                            : selectedAnswer === option
                              ? 'primary'
                              : 'neutral'
                        }
                        sx={{
                          cursor: showExplanation ? 'default' : 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': !showExplanation
                            ? { transform: 'translateY(-2px)', boxShadow: 'md', borderColor: 'primary.outlinedBorder' }
                            : {}
                        }}
                        onClick={() => !showExplanation && handleQuizAnswer(option)}
                      >
                        <CardContent sx={{ p: 1.5 }}>
                          <Typography level='body-md' fontWeight={selectedAnswer === option ? 600 : 400}>
                            {option}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </RadioGroup>

                {showExplanation && currentCard.explanation && (
                  <Box
                    sx={{
                      mt: 3,
                      p: 2,
                      bgcolor: 'primary.softBg',
                      borderRadius: 'md',
                      borderLeft: '4px solid',
                      borderColor: 'primary.outlinedBorder'
                    }}
                  >
                    <Typography level='title-sm' color='primary' sx={{ mb: 1 }}>
                      {t('cards.session.labels.explanation')}
                    </Typography>
                    <Typography level='body-sm'>{currentCard.explanation}</Typography>
                  </Box>
                )}
              </Box>
              <Box sx={{ flex: '0 0 auto', px: { xs: 3, md: 4 }, pb: { xs: 3, md: 4 } }}>
                <SessionFooter
                  showGrading={!isReadOnlyMode && showExplanation}
                  mode={mode}
                  modeChipColor={modeChipColor}
                  currentIndex={currentIndex}
                  cardsLength={cards.length}
                  onGrade={handleGrade}
                  pendingSyncCount={reviewQueue.length}
                  t={t}
                />
              </Box>
            </Card>
          ) : isVisual ? (
            // Visual Card
            <Card
              variant={isFullscreen ? 'plain' : 'outlined'}
              sx={{
                height: isFullscreen ? '100dvh' : { xs: 'min(560px, calc(100dvh - 96px))', md: 500 },
                borderRadius: isFullscreen ? 0 : 'xl',
                boxShadow: isFullscreen ? 'none' : 'sm',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.27)',
                transform: isPressing && !isFullscreen ? 'scale3d(0.98, 0.98, 0.98)' : 'scale3d(1, 1, 1)'
              }}
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              onMouseDown={() => setIsPressing(true)}
              onMouseUp={() => setIsPressing(false)}
              onTouchStart={() => setIsPressing(true)}
              onTouchEnd={() => setIsPressing(false)}
              onTouchCancel={() => setIsPressing(false)}
            >
              {!isFullscreen && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    pointerEvents: 'none',
                    zIndex: 10,
                    opacity: glare.opacity,
                    transition: 'opacity 0.3s ease',
                    background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, var(--joy-palette-neutral-softBg) 0%, transparent 60%)`,
                    mixBlendMode: 'overlay',
                    display: { xs: 'none', md: 'block' }
                  }}
                />
              )}
              <Box
                data-testid='session-scroll'
                sx={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', p: { xs: 3, md: 4 }, pt: { xs: 6, md: 8 } }}
              >
                <Typography level='body-xs' sx={{ mb: 2, color: 'success.plainColor', fontWeight: 700, letterSpacing: '0.5px' }}>
                  {t('cards.session.labels.visual')}
                </Typography>
                <Typography level='h3' sx={{ mb: 3, fontWeight: 600 }}>
                  {currentCard.title}
                </Typography>

                <Box
                  ref={mermaidRef}
                  sx={{
                    p: 4,
                    border: '1px dashed',
                    borderColor: 'neutral.outlinedBorder',
                    borderRadius: 'lg',
                    bgcolor: 'background.body',
                    minHeight: 300,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'auto'
                  }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(mermaidSvg) }}
                />

                {currentCard.content && (
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'background.level1', borderRadius: 'md' }}>
                    <Typography level='body-sm' textColor='text.secondary'>
                      {currentCard.content}
                    </Typography>
                  </Box>
                )}
              </Box>
              <Box sx={{ flex: '0 0 auto', px: { xs: 3, md: 4 }, pb: { xs: 3, md: 4 } }}>
                <SessionFooter
                  showGrading={!isReadOnlyMode}
                  mode={mode}
                  modeChipColor={modeChipColor}
                  currentIndex={currentIndex}
                  cardsLength={cards.length}
                  onGrade={handleGrade}
                  pendingSyncCount={reviewQueue.length}
                  t={t}
                />
              </Box>
            </Card>
          ) : (
            // Flashcard — true 3D flip
            <Box
              sx={{
                perspective: '1200px',
                width: '100%',
                height: isFullscreen ? '100dvh' : { xs: 'min(560px, calc(100dvh - 96px))', md: 500 },
                position: 'relative'
              }}
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
            >
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: isFullscreen ? '100dvh' : { xs: 'min(560px, calc(100dvh - 96px))', md: 500 },
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1)',
                  transform: `rotateY(${isFlipped ? 180 : 0}deg) scale3d(${isPressing && !isFullscreen ? 0.98 : 1}, ${isPressing && !isFullscreen ? 0.98 : 1}, 1)`,
                  cursor: 'pointer'
                }}
                onMouseDown={() => setIsPressing(true)}
                onMouseUp={() => setIsPressing(false)}
                onTouchStart={() => setIsPressing(true)}
                onTouchEnd={() => setIsPressing(false)}
                onTouchCancel={() => setIsPressing(false)}
              >
                {/* Front face */}
                <Card
                  variant={isFullscreen ? 'plain' : 'outlined'}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: isFullscreen ? '100dvh' : { xs: 'min(560px, calc(100dvh - 96px))', md: 500 },
                    borderRadius: isFullscreen ? 0 : 'xl',
                    boxShadow: isFullscreen ? 'none' : 'sm',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    // Critical: prevent hidden front face from blocking grade buttons
                    pointerEvents: isFlipped ? 'none' : 'auto',
                    overflow: 'hidden',
                    '&:hover': { boxShadow: isFullscreen ? 'none' : 'md', borderColor: 'primary.outlinedBorder' }
                  }}
                >
                  {!isFullscreen && (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        zIndex: 10,
                        borderRadius: 'inherit',
                        opacity: glare.opacity,
                        transition: 'opacity 0.3s ease',
                        background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, var(--joy-palette-neutral-softBg) 0%, transparent 60%)`,
                        mixBlendMode: 'overlay',
                        display: { xs: 'none', md: 'block' }
                      }}
                    />
                  )}
                  <CardContent
                    onClick={handleFlip}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      textAlign: 'center',
                      height: '100%',
                      cursor: 'pointer',
                      p: { xs: 3, md: 4 }
                    }}
                  >
                    <Typography level='body-xs' sx={{ mb: 3, color: 'primary.plainColor', fontWeight: 700, letterSpacing: '0.5px' }}>
                      {t('cards.session.labels.question')}
                    </Typography>
                    <Typography level='h2' sx={{ wordBreak: 'break-word', fontWeight: 600, whiteSpace: 'pre-wrap' }}>
                      {currentCard.title}
                    </Typography>
                    <Typography level='body-sm' sx={{ mt: 'auto', pt: 4, color: 'text.tertiary' }}>
                      <Box component='span' sx={{ display: { xs: 'inline', md: 'none' } }}>
                        {t('cards.session.hints.tapFlip')}
                      </Box>
                      <Box component='span' sx={{ display: { xs: 'none', md: 'inline' } }}>
                        {t('cards.session.hints.clickFlip')}
                      </Box>
                    </Typography>
                  </CardContent>
                </Card>

                {/* Back face */}
                <Card
                  variant={isFullscreen ? 'plain' : 'outlined'}
                  onClick={handleFlip}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: isFullscreen ? '100dvh' : { xs: 'min(560px, calc(100dvh - 96px))', md: 500 },
                    borderRadius: isFullscreen ? 0 : 'xl',
                    boxShadow: isFullscreen ? 'none' : 'sm',
                    transform: 'rotateY(180deg)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    // Critical: only receive pointer events when this face is visible
                    pointerEvents: isFlipped ? 'auto' : 'none',
                    borderColor: 'primary.outlinedBorder',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer'
                  }}
                >
                  {!isFullscreen && (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        zIndex: 10,
                        borderRadius: 'inherit',
                        opacity: glare.opacity,
                        transition: 'opacity 0.3s ease',
                        background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, var(--joy-palette-neutral-softBg) 0%, transparent 60%)`,
                        mixBlendMode: 'overlay',
                        display: { xs: 'none', md: 'block' }
                      }}
                    />
                  )}
                  {/* Explicit overflowY:auto + minHeight:0 — this face previously had NO overflow
                      handling at all on its CardContent (RESEARCH.md Pitfall B) */}
                  <Box
                    data-testid='session-scroll'
                    sx={{
                      flex: '1 1 auto',
                      minHeight: 0,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      textAlign: 'center',
                      p: { xs: 3, md: 4 }
                    }}
                  >
                    <Typography
                      level='body-xs'
                      sx={{
                        mb: { xs: 1.5, md: 2 },
                        color: 'success.plainColor',
                        fontWeight: 600,
                        letterSpacing: '0.5px'
                      }}
                    >
                      {t('cards.session.labels.answer')}
                    </Typography>
                    <Typography
                      level={currentCard.content?.length > 100 ? 'body-lg' : 'h3'}
                      sx={{
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        fontWeight: currentCard.content?.length > 100 ? 400 : 500,
                        fontSize: currentCard.content?.length > 100 ? { xs: '1rem', md: '1.125rem' } : { xs: '1.5rem', md: '2rem' },
                        lineHeight: currentCard.content?.length > 100 ? 1.6 : 1.3,
                        textAlign: 'center',
                        width: '100%',
                        maxWidth: { xs: '100%', md: 600 },
                        color: 'text.primary'
                      }}
                    >
                      {currentCard.content}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: '0 0 auto', px: { xs: 3, md: 4 }, pb: { xs: 3, md: 4 } }}>
                    <SessionFooter
                      showGrading={!isReadOnlyMode}
                      mode={mode}
                      modeChipColor={modeChipColor}
                      currentIndex={currentIndex}
                      cardsLength={cards.length}
                      onGrade={handleGrade}
                      pendingSyncCount={reviewQueue.length}
                      t={t}
                    />
                  </Box>
                </Card>
              </Box>
            </Box>
          )}
        </Box>

        {/* Next Button (Desktop) - Hide in Fullscreen */}
        {!isFullscreen && (
          <IconButton
            variant='plain'
            color='neutral'
            onClick={handleNext}
            disabled={currentIndex === cards.length - 1}
            sx={{ display: { xs: 'none', md: 'flex' }, mt: 20 }}
          >
            <ArrowForward fontSize='large' />
          </IconButton>
        )}
      </Stack>
    </Container>
  )
}

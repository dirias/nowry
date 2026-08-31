// Literata — the reading serif, loaded lazily and NOT on the critical path.
//
// Importing it here rather than globally means the ~90% of sessions that never
// open a reading surface never pay for it. The @font-face declarations carry
// unicode-range subsets, so the browser fetches a .woff2 only once a glyph is
// actually rendered in the face — which happens exactly when a surface opts in
// through the `readingSurface` fragment (Common/Form/formStyles.js).
//
// Scope is hard: long-form prose only, never below 1rem, and never UI chrome.
// A serif at 14px on a low-DPI Android reads worse than Inter, and that is the
// specific way this choice fails.
import '@fontsource-variable/literata'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
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
  Sheet,
  Chip
} from '@mui/joy'
import { ArrowBack, ArrowForward, CheckCircle, Fullscreen, FullscreenExit, SwipeLeft, SwipeRight, SwipeVertical } from '@mui/icons-material'
import { cardsService, decksService } from '../../api/services'
import { studySessionsService } from '../../api/services/studySessions.service'
import { useCardData } from '../../hooks/useCardData'
import { useBrowseFilters } from '../../hooks/useBrowseFilters'
import { useVoiceSettings } from '../../hooks/useVoiceSettings'
import BrowseFilterBar from './BrowseFilterBar'
import { tabularNums } from '../Common/Form/formStyles'
import MarkToggle from './MarkToggle'
import { queryClient } from '../../api/queryClient'
import { useAuth } from '../../context/AuthContext'
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
// Shared "this is the previously-given grade" affordance — an outlined ring
// plus a small check icon, applied on top of each button's own variant/color
// so re-grading stays a plain, unlocked click (D-0 UI-only fix: no logic
// change, purely visual).
const selectedGradeSx = {
  outline: '2px solid',
  outlineColor: 'primary.outlinedBorder',
  outlineOffset: '2px'
}

const GradingButtons = React.memo(function GradingButtons({ onGrade, pendingSyncCount, previousGrade, t }) {
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

      {/* Re-grade affordance: this card already has a grade this session
          (via back-nav) — say so, rather than letting the identical-looking
          grading row silently re-fire. */}
      {previousGrade && (
        <Stack direction='row' spacing={0.5} alignItems='center' justifyContent='center' sx={{ mb: 1 }}>
          <CheckCircle sx={{ fontSize: 'sm', color: 'text.tertiary' }} />
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            {t('cards.session.grading.alreadyAnswered')}
          </Typography>
        </Stack>
      )}

      <Stack direction='row' spacing={{ xs: 0.75, md: 1.5 }} sx={{ mt: { xs: 2, md: 3 }, width: '100%' }} justifyContent='center'>
        <Button
          variant='outlined'
          color='danger'
          onClick={() => onGrade('again')}
          aria-pressed={previousGrade === 'again'}
          startDecorator={previousGrade === 'again' ? <CheckCircle sx={{ fontSize: 'sm' }} /> : undefined}
          sx={{
            flex: 1,
            py: { xs: 1, md: 1.5 },
            minHeight: { xs: 44, md: 36 },
            // Static sm (14), not the xs mobile-first default: these four are the
            // session's primary CTAs (again/hard/good/easy), not secondary or
            // metadata text, so legibility on the main action row won out.
            fontSize: 'sm',
            fontWeight: 'lg',
            '&:hover': { bgcolor: 'danger.softBg' },
            ...(previousGrade === 'again' ? selectedGradeSx : {})
          }}
        >
          {t('cards.session.grading.again')}
        </Button>
        <Button
          variant='soft'
          color='warning'
          onClick={() => onGrade('hard')}
          aria-pressed={previousGrade === 'hard'}
          startDecorator={previousGrade === 'hard' ? <CheckCircle sx={{ fontSize: 'sm' }} /> : undefined}
          sx={{
            flex: 1,
            py: { xs: 1, md: 1.5 },
            minHeight: { xs: 44, md: 36 },
            fontSize: 'sm',
            fontWeight: 'lg',
            ...(previousGrade === 'hard' ? selectedGradeSx : {})
          }}
        >
          {t('cards.session.grading.hard')}
        </Button>
        <Button
          variant='soft'
          color='success'
          onClick={() => onGrade('good')}
          aria-pressed={previousGrade === 'good'}
          startDecorator={previousGrade === 'good' ? <CheckCircle sx={{ fontSize: 'sm' }} /> : undefined}
          sx={{
            flex: 1,
            py: { xs: 1, md: 1.5 },
            minHeight: { xs: 44, md: 36 },
            fontSize: 'sm',
            fontWeight: 'lg',
            ...(previousGrade === 'good' ? selectedGradeSx : {})
          }}
        >
          {t('cards.session.grading.good')}
        </Button>
        <Button
          variant='solid'
          color='primary'
          onClick={() => onGrade('easy')}
          aria-pressed={previousGrade === 'easy'}
          startDecorator={previousGrade === 'easy' ? <CheckCircle sx={{ fontSize: 'sm' }} /> : undefined}
          sx={{
            flex: 1,
            py: { xs: 1, md: 1.5 },
            minHeight: { xs: 44, md: 36 },
            fontSize: 'sm',
            fontWeight: 'lg',
            ...(previousGrade === 'easy' ? selectedGradeSx : {})
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
/**
 * A brief "+N XP" that rises and fades after a graded card.
 *
 * Deliberately small, fast and non-blocking: it acknowledges the reward at the
 * moment it is earned without taking a turn in the interaction. Grading XP was
 * previously granted server-side and never surfaced anywhere, so the most
 * common way to earn was also the only way you were never told about.
 *
 * `pointerEvents: none` guarantees it can never intercept a grading tap.
 */
const XpFloater = React.memo(function XpFloater({ floater, t }) {
  return (
    <AnimatePresence>
      {floater && (
        <motion.div
          key={floater.id}
          initial={{ opacity: 0, y: 6, scale: 0.9 }}
          animate={{ opacity: [0, 1, 1, 0], y: -18, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, times: [0, 0.15, 0.6, 1], ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: -14,
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 2
          }}
        >
          <Typography level='body-xs' fontWeight='lg' sx={{ color: 'success.plainColor', whiteSpace: 'nowrap' }}>
            {t('cards.session.xpGained', { count: floater.amount })}
          </Typography>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

const SessionFooter = React.memo(function SessionFooter({
  showGrading = true,
  mode,
  modeChipColor,
  currentIndex,
  cardsLength,
  onGrade,
  pendingSyncCount,
  previousGrade,
  xpFloater,
  t
}) {
  return (
    <Box data-testid='session-footer' sx={{ width: '100%', position: 'relative' }}>
      <XpFloater floater={xpFloater} t={t} />
      <Stack direction='row' spacing={1} alignItems='center' justifyContent='center' sx={{ mb: 1 }}>
        <Chip size='sm' variant='soft' color={modeChipColor}>
          {t(`cards.session.mode.${mode}`)}
        </Chip>
        <Typography level='body-xs' sx={{ textAlign: 'center', color: 'text.tertiary' }}>
          {t('cards.session.card', { current: currentIndex + 1, total: cardsLength })}
        </Typography>
      </Stack>
      {showGrading && <GradingButtons onGrade={onGrade} pendingSyncCount={pendingSyncCount} previousGrade={previousGrade} t={t} />}
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
  const { user } = useAuth()
  const userId = user?.id ?? null
  const mermaidRef = useRef(null)
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode') || 'study'
  const isReadOnlyMode = mode === 'browse'
  const modeChipColor = { study: 'neutral', browse: 'primary' }[mode]

  const [cards, setCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [mermaidSvg, setMermaidSvg] = useState('')
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
  // Transient "+N XP" acknowledgement after a graded card. Keyed by timestamp
  // so consecutive grades restart the animation instead of merging into one.
  const [xpFloater, setXpFloater] = useState(null)
  const [mostAttentionCardFront, setMostAttentionCardFront] = useState(null)

  // Browse-only inline tag filter. `enabled: isReadOnlyMode` is the whole
  // safety story: in study mode the hook returns no tags, no selection, and
  // `visibleCards === cards` BY REFERENCE, so the SM-2 queue is structurally
  // unfilterable — a crafted `?mode=study&tags=x` URL changes nothing.
  //
  // Everything below reads `visibleCards` instead of `cards`, with two
  // deliberate exceptions, both marked at their site: the deck-empty gate and
  // handleGrade's setCards mutation source, which must stay the FULL array.
  const { availableTags, selectedTags, markedOnly, markedCount, visibleCards, setTags, clearFilters, toggleMarkedOnly, isFiltering } =
    useBrowseFilters({
      cards,
      enabled: isReadOnlyMode
    })

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
  const currentCardDeckId = visibleCards[currentIndex]?.deck_id?._id || visibleCards[currentIndex]?.deck_id
  const activeVoiceSettings = deckId === 'daily-review' && currentCardDeckId ? getSettingsForDeck(currentCardDeckId) : voiceSettings

  const handleVoiceSettingsChange = React.useCallback(
    (newSettings) =>
      _handleVoiceSettingsChange(newSettings, {
        isFlipped,
        currentDeckId: deckId === 'daily-review' ? currentCardDeckId : deckId
      }),
    [_handleVoiceSettingsChange, isFlipped, deckId, currentCardDeckId]
  )

  const {
    setViewContext,
    queueIntervention,
    resetCompanionSession,
    setStudySession,
    setStudySessionFullscreen,
    revealPet,
    hasBeenRevealed,
    awardSessionXp,
    applyReviewXp,
    flushPendingLevelUp,
    cheer
  } = usePet()

  const buildStudyContext = React.useCallback(
    (cardIdx, flipped) => {
      const card = visibleCards[cardIdx]
      if (!card) return null
      return {
        page: 'study_session',
        deckId: deckId === 'daily-review' ? card.deck_id?._id || card.deck_id || null : deckId,
        deckName: card.deck_id?.name || card.deck_id?.title || null,
        cardIndex: cardIdx + 1,
        // Must be the FILTERED total: this feeds the AI companion's context,
        // and a mismatch makes the pet announce "card 3 of 20" while the
        // screen reads "3 of 7".
        totalCards: visibleCards.length,
        cardType: card.card_type || 'basic',
        isFlipped: flipped,
        front: card.title || '',
        back: flipped ? card.content || '' : null,
        isDailyReview: deckId === 'daily-review',
        mode
      }
    },
    [visibleCards, deckId, mode]
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
  // Re-grade affordance: last grade given to each card THIS session, keyed by
  // card id. Back-nav (handlePrev) deliberately re-lands the user on a graded
  // card with the same clickable GradingButtons — re-grading is intentional
  // (it's what feeds MODE-06's needs-attention stat), but with no visual
  // difference it reads as a bug. This ref lets the render below highlight
  // the previously-picked button so re-grading is an obvious, deliberate
  // action instead of a silent trap. Overwritten (not appended) on every
  // grade, so it always reflects the LAST grade for that card, matching the
  // same "last write wins" semantics wrongCountPerCardId's per-card counters
  // use. A ref, not state — read at render time the same way latestStateRef
  // is (see PERF-02/D-07 note above): it only changes inside handleGrade,
  // which is always followed by a state update (handleNext's setCurrentIndex
  // or setSessionComplete) that triggers the re-render this value needs to be
  // visible in.
  const gradesByCardId = useRef({})
  // Tie-break support for the "most attention needed" callout: tracks how many
  // of each card's needs-attention grades were specifically 'again' (a full
  // miss) rather than 'hard' (recalled with difficulty). Only used to break
  // ties in wrongCountPerCardId — never changes the total count itself (D-05).
  const againCountPerCardId = useRef({})
  const interventionTimerRef = useRef(null)

  // Session history tracking
  const sessionStartTime = useRef(new Date())
  const gradedCards = useRef([]) // accumulates { cardId, cardTitle, grade, evaluation } per card
  // Guards the session-complete block against re-running when visibleCards'
  // identity changes after completion. See that effect for the full reasoning.
  const sessionCompleteHandledRef = useRef(false)

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
      // useStatistics (CACHE-005) no longer reads 'cards:statistics' from
      // apiCache — invalidate its React Query cache entry instead so
      // WeeklyProgress and StudyCalendar pick up this session's updated
      // stats immediately.
      if (userId) queryClient.invalidateQueries({ queryKey: ['statistics', userId] })
      // useCardData (CACHE-004) no longer reads 'cards:all' from apiCache —
      // invalidate its React Query cache entry instead so DailyFocus,
      // WeeklyStatsCard, and CardHome's Content Library pick up this
      // session's review results (next_review, etc.) immediately.
      if (userId) queryClient.invalidateQueries({ queryKey: ['cards', userId] })
      setViewContext(null)
      resetCompanionSession()
      if (interventionTimerRef.current) clearTimeout(interventionTimerRef.current)
    }
  }, [userId, setViewContext, resetCompanionSession])

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
    const currentCard = visibleCards[currentIndex]
    if (currentCard?.card_type === 'visual' && currentCard.diagram_code && mermaidRef.current) {
      const id = `mermaid-${Date.now()}`
      mermaid
        .render(id, currentCard.diagram_code)
        .then((result) => setMermaidSvg(result.svg))
        .catch((err) => console.error('Mermaid render error:', err))
    }
  }, [currentIndex, visibleCards])

  // Inject structured screen context into the Study Pet on card change and flip
  useEffect(() => {
    if (!visibleCards || visibleCards.length === 0) return
    const ctx = buildStudyContext(currentIndex, isFlipped)
    // Null only during the single frame where a filter change has shrunk
    // visibleCards but the re-anchor effect below has not corrected
    // currentIndex yet — publishing that as "no context" would blank the pet
    // mid-session. It re-publishes on the corrected index one render later.
    if (ctx) setViewContext(ctx)
  }, [currentIndex, isFlipped, visibleCards, buildStudyContext, setViewContext])

  // Clear pet context when session is complete + fire session_summary intervention
  useEffect(() => {
    if (!sessionComplete) {
      sessionCompleteHandledRef.current = false
      return
    }
    setViewContext(null)

    // Everything below is a one-shot side effect: XP award, the session_summary
    // nudge, the first-reveal, history logging. The `!sessionComplete` guard
    // alone does not make them one-shot — `visibleCards` is in this effect's
    // dependency list, so any change to that array's identity AFTER completion
    // re-runs the whole block. That was already double-firing the summary nudge
    // and reveal; once PET-003 added the XP grant it started handing out a
    // second session bonus too (observed live: one 29-card session credited
    // +15 twice). The ref makes the block fire exactly once per session and
    // resets when a new one begins.
    if (sessionCompleteHandledRef.current) return
    sessionCompleteHandledRef.current = true

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
    const mostMissedCardFront = mostMissedCardId ? (visibleCards.find((c) => (c._id || c.id) === mostMissedCardId)?.title ?? null) : null

    // Single computed source for both the on-screen stat (render below) and
    // the session_summary payload (D-06) — no divergent second sort.
    setNeedsAttentionCount(totalWrong)
    setMostAttentionCardFront(mostMissedCardFront)

    // Guard on cards.length > 0 — an empty/all-caught-up deck lands here with
    // sessionComplete=true but no actual session occurred, so no session_summary
    // should fire (review finding WR-01: previously reached the Pet with
    // session_total_cards: 0, misreported as "1 cards" by the backend's now-fixed
    // falsy-zero fallback).
    if (mode === 'study' && visibleCards.length > 0) {
      queueIntervention({
        type: 'session_summary',
        session_total_cards: visibleCards.length,
        session_wrong_count: totalWrong,
        most_missed_card_id: mostMissedCardId,
        most_missed_card_front: mostMissedCardFront
      })

      // Contextual first-reveal — fires once, the first time a new account
      // completes a real study session with graded cards. Non-fatal on
      // failure (see revealPet in AgentContext), so no guard needed here.
      if (!hasBeenRevealed) {
        revealPet(gradedCards.current.length)
      }

      // Session-completion XP + the once-per-day streak bonus. Guarded on
      // actually-graded cards so an all-caught-up deck (which still lands here
      // with sessionComplete=true) cannot farm the bonus by opening and
      // closing. Fire-and-forget inside AgentContext — XP never gates the UI.
      if (gradedCards.current.length > 0) {
        awardSessionXp(gradedCards.current.length, deckId)
      }

      // Release any level-up banked mid-session. The user has stopped
      // recalling and is looking at their summary — this is the moment the
      // celebration is a reward rather than an interruption.
      flushPendingLevelUp()
    }

    // LOG SESSION HISTORY — fire-and-forget, never blocks the UI
    if (gradedCards.current.length > 0) {
      const firstCard = visibleCards[0]
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
  }, [
    sessionComplete,
    setViewContext,
    queueIntervention,
    visibleCards,
    deckId,
    mode,
    revealPet,
    hasBeenRevealed,
    awardSessionXp,
    flushPendingLevelUp
  ])

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
  //
  // Mirrors `visibleCards` (NOT `cards`) because every index in this component
  // — including the one handleGrade reads — addresses the visible list. In
  // study mode the two are the same reference, so handleGrade's `setCards`
  // mutation source is unchanged; grading is unreachable in browse mode (no
  // GradingButtons are mounted), so a filtered array can never be written back
  // over the full deck.
  const latestStateRef = useRef({ cards: visibleCards, currentIndex })
  latestStateRef.current = { cards: visibleCards, currentIndex }

  // The card the user is actually looking at, tracked by id so a filter change
  // can put them back on it rather than dumping them at the top of a reshuffled
  // list. Updated below by the same effect that consumes it.
  const anchorCardIdRef = useRef(null)
  const filterSignatureRef = useRef(selectedTags.join(','))

  useEffect(() => {
    const signature = `${selectedTags.join(',')}|${markedOnly ? 'marked' : ''}`

    if (signature === filterSignatureRef.current) {
      /*
       * The list can now shrink with the filter UNCHANGED: unmarking the card
       * on screen while the mark filter is active removes it from
       * `visibleCards`. Landing past the end would fall through to `safeIndex`,
       * which clamps to 0 and dumps the user at the top of the deck — the one
       * thing MARK-004 must not do. Hold them at the new last card instead.
       */
      if (visibleCards.length > 0 && currentIndex >= visibleCards.length) {
        const lastIndex = visibleCards.length - 1
        setCurrentIndex(lastIndex)
        setIsFlipped(false)
        setSelectedAnswer(null)
        setShowExplanation(false)
        setMermaidSvg('')
        latestStateRef.current = { cards: visibleCards, currentIndex: lastIndex }
        const tail = visibleCards[lastIndex]
        anchorCardIdRef.current = tail ? tail._id || tail.id : null
        return
      }

      // Ordinary navigation — just keep the anchor pointed at what is on screen.
      const card = visibleCards[currentIndex]
      if (card) anchorCardIdRef.current = card._id || card.id
      return
    }

    filterSignatureRef.current = signature
    const next = visibleCards.findIndex((c) => (c._id || c.id) === anchorCardIdRef.current)

    if (next >= 0) {
      // The anchored card survived the filter change. Deliberately DO NOT touch
      // isFlipped: the card on screen did not change, so re-hiding an answer
      // the user is mid-read on would punish them for touching the filter.
      setCurrentIndex(next)
      latestStateRef.current = { cards: visibleCards, currentIndex: next }
    } else {
      // The anchored card was filtered out — this IS a card change, so the
      // per-card view state resets with it.
      setCurrentIndex(0)
      setIsFlipped(false)
      setSelectedAnswer(null)
      setShowExplanation(false)
      setMermaidSvg('')
      latestStateRef.current = { cards: visibleCards, currentIndex: 0 }
      const anchor = visibleCards[0]
      anchorCardIdRef.current = anchor ? anchor._id || anchor.id : null
    }
    // Both branches write latestStateRef synchronously so the PERF-02/D-07
    // double-click race guard can never serve the pre-filter index.
    //
    // Note what is NOT here: setSessionComplete. A filter narrowing to zero
    // cards is an empty RESULT, never a finished session.
  }, [selectedTags, markedOnly, visibleCards, currentIndex])

  const handleNext = React.useCallback(() => {
    const { currentIndex: latestIndex } = latestStateRef.current
    if (latestIndex < visibleCards.length - 1) {
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
  }, [visibleCards.length])

  const handleGrade = React.useCallback(
    async (grade) => {
      const { cards: latestCards, currentIndex: latestIndex } = latestStateRef.current
      const currentCard = latestCards[latestIndex]
      // Defensive guard: a same-tick extra click after the session has
      // already advanced past the last card (e.g. a third rapid click) has
      // nothing left to grade — no-op rather than crash.
      if (!currentCard) return
      const cardId = currentCard._id || currentCard.id

      // Record/overwrite this card's last grade for this session — powers the
      // "already graded" affordance rendered below (see gradesByCardId above).
      gradesByCardId.current[cardId] = grade

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

      // The pet perks up for a moment on a card the user actually recalled.
      // Fired here rather than after the review request so the reaction is
      // instant — it is a response to the person, not to the server.
      if (grade === 'good' || grade === 'easy') cheer()

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

        // Fold this card's XP into the pet: advances the orb's progress ring
        // as the user studies. Any level-up crossed here is banked by
        // AgentContext and released at the session summary, so the
        // celebration never interrupts a card the user is mid-way through.
        if (response && response.xp) {
          applyReviewXp(response.xp)
          setXpFloater({ id: Date.now(), amount: response.xp.xp_awarded })
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
    // `cards` stays in this dep list on purpose — it is the setCards mutation
    // SOURCE, not a read source (every read goes through latestStateRef above),
    // and it must remain the full deck.
    [cards, handleNext, mode, queueIntervention, applyReviewXp, cheer]
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
  }, [])

  /*
   * Keep the session's copy of the card in step with the mark.
   *
   * Without this the mark would look like it fell off: MarkToggle re-reads the
   * card whenever the identity changes, so stepping away from card 3 and back
   * would show a stale, unmarked card.
   *
   * Patches the full `cards` state, never `latestStateRef`. That ref mirrors
   * `visibleCards`, which in Browse mode is a *filtered subset* — writing it
   * back would drop every card the tag filter is hiding, which is the exact
   * invariant the comment at the ref's declaration protects. Grading gets away
   * with assigning from the ref only because grading is unreachable in Browse;
   * marking is reachable in both modes. The ref re-derives from `cards` on the
   * next render, so it self-corrects.
   *
   * Nothing about SM-2 is touched. This is a display-state patch of one field
   * the scheduler never reads (ADR-010).
   */
  const handleMarkChange = React.useCallback((cardId, markedAt) => {
    setCards((prev) => {
      const index = prev.findIndex((c) => (c._id || c.id) === cardId)
      if (index === -1) return prev

      const next = [...prev]
      next[index] = { ...next[index], marked_at: markedAt }
      return next
    })
  }, [])

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
      // Only an upward swipe is a gesture here. A downward swipe used to open
      // the voice-settings panel, but on mobile it was indistinguishable from
      // an ordinary scroll (and from pull-to-refresh), so it fired by accident.
      // The panel keeps its own gear button in TTSControls' compact toolbar.
      const isUpSwipe = distanceY > minSwipeDistance

      if (isUpSwipe) {
        setShowSwipeHint(false)
        handleFlip()
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
        {/* Reserve the filter row's height so it does not shove the card down
            the moment tags resolve. The control itself cannot render yet —
            the tags are literally unknown until the deck arrives. */}
        {isReadOnlyMode && <Skeleton variant='rectangular' height={36} sx={{ borderRadius: 'sm', mb: 2 }} />}
        <Skeleton variant='rectangular' sx={{ flex: 1, borderRadius: 'xl', minHeight: 500 }} />
      </Container>
    )
  }

  // Deck-empty / load-error gate reads the FULL deck on purpose: "this deck has
  // no cards" and "your filter matched nothing" are different problems with
  // different exits, and the second is handled inside the session layout below.
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
                borderRadius: 'full',
                bgcolor: 'success.softBg',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CheckCircle sx={{ fontSize: 'xl5', color: 'success.plainColor' }} />
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

  // An active filter that matches nothing renders INSIDE the session layout —
  // never as a full-page replacement. Unmounting the header and the combobox
  // would strand the user with no way to undo the filter that emptied the
  // screen: a hard dead end.
  const isFilteredEmpty = isFiltering && visibleCards.length === 0
  /*
   * Which filter to explain when nothing matched. The mark takes precedence
   * because its empty state has something to teach ("mark a card and it will be
   * here") where the tag one only suggests removing a tag. Clearing is
   * all-or-nothing either way — `clearFilters` drops both, which is the only
   * behaviour that reliably gets the user out.
   */
  const emptyFilterPrefix = markedOnly ? 'cards.session.markFilter' : 'cards.session.tagFilter'
  // Narrowing the filter shrinks `visibleCards` one render BEFORE the
  // re-anchor effect can correct `currentIndex`, so the committed index can
  // briefly point past the end of the new list. Clamping here is what keeps
  // that single frame from reading `undefined.title` and crashing the session.
  // Falls back to 0 — the same landing spot the effect uses when the anchored
  // card is gone — so the transient frame never contradicts where we end up.
  const safeIndex = currentIndex < visibleCards.length ? currentIndex : 0
  const currentCard = visibleCards[safeIndex]
  // Null unless this exact card was already graded this session (via
  // handleGrade above) — drives the re-grade affordance in SessionFooter.
  const currentCardId = currentCard?._id || currentCard?.id
  const previousGrade = currentCardId ? (gradesByCardId.current[currentCardId] ?? null) : null
  const progress = visibleCards.length > 0 ? ((safeIndex + 1) / visibleCards.length) * 100 : 0
  const isQuiz = currentCard?.card_type === 'quiz'
  const isVisual = currentCard?.card_type === 'visual'

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
      {/* The session header: ONE control row, closed by a progress seam.
          ADR-011 — it was three rows of three different control languages, and
          the mark was an unnamed glyph at the far end of the widest of them.

          The grid is what puts every outer edge on the card's two vertical
          rules (§15.4). At `xs` the filters drop to their own row and stretch
          between those rules, so nothing is left floating mid-row; from `sm`
          they sit inline, pushed right by the 1fr column that separates them
          from the count. ONE `BrowseFilterBar` either way — rendering a second
          copy for the other breakpoint would duplicate its search state and
          its test id. */}
      {!isFullscreen && (
        <Box sx={{ mb: 3 }}>
          <Box
            data-testid='session-header-row'
            sx={{
              display: 'grid',
              alignItems: 'center',
              columnGap: { xs: 1, sm: 1.5 },
              rowGap: 1.5,
              // Study mode has no filters, so it must not reserve their row —
              // an empty grid row still spends the rowGap above it.
              gridTemplateColumns: isReadOnlyMode ? { xs: 'auto 1fr auto', sm: 'auto auto 1fr auto' } : 'auto 1fr auto',
              gridTemplateAreas: isReadOnlyMode
                ? {
                    xs: '"back count mark" "filters filters filters"',
                    sm: '"back count filters mark"'
                  }
                : '"back count mark"'
            }}
          >
            <IconButton
              onClick={() => navigate('/study')}
              variant='plain'
              color='neutral'
              aria-label={t('cards.session.goBack')}
              sx={{ gridArea: 'back', minHeight: { xs: 44, md: 36 }, minWidth: { xs: 44, md: 36 }, ml: { xs: -1, sm: 0 } }}
            >
              <ArrowBack />
            </IconButton>

            {/* The row's title, not a caption on a hairline: the count reads as
                the header now that the bar underneath is an edge. */}
            <Typography level='title-sm' sx={{ gridArea: 'count', color: 'text.primary', whiteSpace: 'nowrap', ...tabularNums }}>
              {!isFilteredEmpty && t('cards.session.card', { current: safeIndex + 1, total: visibleCards.length })}
            </Typography>

            {/* Browse-only view filters (HDR-002). The bar decides for itself
                which segments have anything to control (§11), so the only gate
                here is the one that matters — Browse, and not fullscreen, which
                is a distraction-free reading surface. Stays mounted through the
                filtered-empty state below, which is the user's only way back
                out of it. */}
            {isReadOnlyMode && (
              <Box sx={{ gridArea: 'filters', justifySelf: { xs: 'stretch', sm: 'end' }, minWidth: 0 }}>
                <BrowseFilterBar
                  availableTags={availableTags}
                  selectedTags={selectedTags}
                  onTagsChange={setTags}
                  markedOnly={markedOnly}
                  markedCount={markedCount}
                  onToggleMarked={toggleMarkedOnly}
                  shown={visibleCards.length}
                  total={cards.length}
                  t={t}
                />
              </Box>
            )}

            {/* The mark lives here rather than in the grading row: that row is
                the session's four primary CTAs, and a fifth control in it both
                dilutes them and implies the mark is a grade. Labelled, because
                an unnamed glyph is how it went undiscovered — and its right
                edge lands on the same rule as the card's own controls. */}
            {currentCard && (
              <MarkToggle
                card={currentCard}
                onMarkChange={handleMarkChange}
                appearance='labelled'
                sx={{ gridArea: 'mark', justifySelf: 'end' }}
              />
            )}
          </Box>

          {/* Progress as an EDGE, not an object (§15.4). Stretched across the
              container as a 6px bar it was texture; at 3px directly under the
              row it reads as progress and does the job of the divider that
              used to sit there. */}
          {!isFilteredEmpty && (
            <LinearProgress
              determinate
              value={progress}
              color='primary'
              data-testid='session-progress'
              sx={{
                mt: 2,
                borderRadius: 'xs',
                bgcolor: 'background.level2',
                boxShadow: 'none',
                '--LinearProgress-thickness': '3px'
              }}
            />
          )}
        </Box>
      )}

      {isFilteredEmpty ? (
        <Sheet data-testid='tag-filter-empty' variant='soft' color='neutral' sx={{ borderRadius: 'xl', p: 4, textAlign: 'center' }}>
          <Typography level='title-md' sx={{ mb: 0.5 }}>
            {t(`${emptyFilterPrefix}.empty.title`)}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t(`${emptyFilterPrefix}.empty.body`)}
          </Typography>
          <Button
            variant='plain'
            size='sm'
            onClick={clearFilters}
            aria-label={t(`${emptyFilterPrefix}.clear`)}
            sx={{
              mt: 2,
              '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.solidBg', outlineOffset: '2px' }
            }}
          >
            {t(`${emptyFilterPrefix}.clear`)}
          </Button>
        </Sheet>
      ) : (
        /* Main Study Area */
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
              disabled={safeIndex === 0}
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
            {safeIndex === 0 && showSwipeHint && <SwipeHint />}

            {/* Embedded TTS Controls */}
            <TTSControls
              compact
              voiceSettings={isFlipped ? activeVoiceSettings.back : activeVoiceSettings.front}
              onVoiceSettingsChange={handleVoiceSettingsChange}
              text={
                isQuiz ? `${currentCard.title}. ${currentCard.options?.join(', ')}` : isFlipped ? currentCard.content : currentCard.title
              }
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
                  <Typography level='body-xs' sx={{ mb: 2, color: 'warning.plainColor', fontWeight: 'xl', letterSpacing: '0.5px' }}>
                    {t('cards.session.labels.quiz')}
                  </Typography>
                  <Typography level='h3' sx={{ mb: 4, fontWeight: 'lg' }}>
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
                    currentIndex={safeIndex}
                    cardsLength={visibleCards.length}
                    onGrade={handleGrade}
                    pendingSyncCount={reviewQueue.length}
                    previousGrade={previousGrade}
                    xpFloater={xpFloater}
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
                  <Typography level='body-xs' sx={{ mb: 2, color: 'success.plainColor', fontWeight: 'xl', letterSpacing: '0.5px' }}>
                    {t('cards.session.labels.visual')}
                  </Typography>
                  <Typography level='h3' sx={{ mb: 3, fontWeight: 'lg' }}>
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
                    currentIndex={safeIndex}
                    cardsLength={visibleCards.length}
                    onGrade={handleGrade}
                    pendingSyncCount={reviewQueue.length}
                    previousGrade={previousGrade}
                    xpFloater={xpFloater}
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
                {/* SPOILER GUARD: keyed by card id, so advancing to a new card REMOUNTS
                  this container instead of transitioning it. Without the key, grading a
                  flipped card batches setCurrentIndex + setIsFlipped(false) into one
                  commit: the back face re-renders with the NEXT card's answer instantly,
                  while `transform` needs 0.55s to rotate away from it — leaving the next
                  answer legible for ~250ms before its question appears. A freshly mounted
                  node starts at rotateY(0) and CSS transitions never fire on first paint,
                  so the new card simply appears face-up. Keying by id, NOT by index, is
                  deliberate: the filter re-anchor effect above moves currentIndex while
                  keeping the SAME card flipped on screen, and an index key would remount
                  it and yank the answer the user is mid-read on. Manual click-to-flip is
                  untouched — the key is stable within a card, so it still animates. */}
                <Box
                  key={currentCardId ?? safeIndex}
                  data-testid='flip-container'
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
                      <Typography level='body-xs' sx={{ mb: 3, color: 'primary.plainColor', fontWeight: 'xl', letterSpacing: '0.5px' }}>
                        {t('cards.session.labels.question')}
                      </Typography>
                      <Typography level='h2' sx={{ wordBreak: 'break-word', fontWeight: 'lg', whiteSpace: 'pre-wrap' }}>
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
                          fontWeight: 'lg',
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
                        currentIndex={safeIndex}
                        cardsLength={visibleCards.length}
                        onGrade={handleGrade}
                        pendingSyncCount={reviewQueue.length}
                        previousGrade={previousGrade}
                        xpFloater={xpFloater}
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
              disabled={safeIndex === visibleCards.length - 1}
              sx={{ display: { xs: 'none', md: 'flex' }, mt: 20 }}
            >
              <ArrowForward fontSize='large' />
            </IconButton>
          )}
        </Stack>
      )}
    </Container>
  )
}

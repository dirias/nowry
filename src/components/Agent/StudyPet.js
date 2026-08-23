/**
 * StudyPet — The Nowry AI Companion
 *
 * Renders via React Portal at document.body so it floats above ALL content,
 * independent of any parent's overflow or z-index context.
 *
 * Interaction modes:
 *  - Collapsed: A small floating orb in the bottom-right corner.
 *    Click it to open the chat panel.
 *  - Expanded: A premium slide-up chat panel with history and input.
 *  - Summon Button: A persistent "Call Buddy" FAB visible when pet is not in sight.
 *  - Quiz Mode: An active study session where the AI quizzes the user using flashcard data.
 *
 * Animation: Framer Motion for smooth drag, peek/float, and panel transitions.
 * No external animation library required yet — Rive can replace the orb in V2.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useAnimation, useDragControls } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { usePet } from '../../context/AgentContext'
import { useAuth } from '../../context/AuthContext'
import { useSubscriptionContext } from '../../context/SubscriptionContext'
import { resolveColor } from '../../utils/petColor'
import { useThemePreferences } from '../../theme/DynamicThemeProvider'
import { Z_PET_RESTING, Z_PET_FULLSCREEN } from '../../constants/zIndex'
import LevelUpCelebration from './LevelUpCelebration'
import PetRevealCelebration from './PetRevealCelebration'
import CompanionMessage from './CompanionMessage'
import QuizModeHeader from './QuizModeHeader'
import QuizQuestionBubble from './QuizQuestionBubble'
import QuizFeedbackBubble from './QuizFeedbackBubble'
import DeckSelector from './DeckSelector'
import QuizSummaryCard from './QuizSummaryCard'
import PetMarkdown from './PetMarkdown'
import { quizService } from '../../api/services/quizService'

// ---------------------------------------------------------------------------
// Stage configuration — drives orb size, color, aura rings, and animation speed
// ---------------------------------------------------------------------------
const STAGE_CONFIG = {
  1: { sizePx: 56, dominantColor: 'rgba(100, 180, 255, 0.85)', emoji: '✨', ringCount: 0, pulseDuration: 2.8 },
  2: { sizePx: 60, dominantColor: 'rgba(120, 220, 170, 0.88)', emoji: '🌟', ringCount: 0, pulseDuration: 2.2 },
  3: { sizePx: 64, dominantColor: 'rgba(164, 69, 255, 0.90)', emoji: '🔮', ringCount: 1, pulseDuration: 2.2 },
  4: { sizePx: 68, dominantColor: 'rgba(255, 190, 60, 0.90)', emoji: '🌙', ringCount: 2, pulseDuration: 2.0 },
  5: { sizePx: 72, dominantColor: 'rgba(220, 100, 255, 0.95)', emoji: '🌌', ringCount: 3, pulseDuration: 1.8 },
  6: { sizePx: 80, dominantColor: 'rgba(255, 230, 80, 1.00)', emoji: '☀️', ringCount: 3, pulseDuration: 1.6 }
}

// ---------------------------------------------------------------------------
// Species configuration — emoji set per species × mood
// ---------------------------------------------------------------------------
const SPECIES_CONFIG = {
  owl: { idle: '🦉', happy: '🦉', thinking: '🤔', tired: '😴', speaking: '🗣️' },
  fox: { idle: '🦊', happy: '😄', thinking: '🧠', tired: '😪', speaking: '💬' },
  cat: { idle: '🐱', happy: '😸', thinking: '😼', tired: '😿', speaking: '🐱' },
  dragon: { idle: '🐉', happy: '🔥', thinking: '💭', tired: '😮‍💨', speaking: '🐲' },
  robot: { idle: '🤖', happy: '⚡', thinking: '🔢', tired: '🔋', speaking: '📡' },
  star: { idle: '⭐', happy: '🌟', thinking: '💫', tired: '🌙', speaking: '✨' },
  phoenix: { idle: '🔥', happy: '🌈', thinking: '💡', tired: '🌫️', speaking: '🗯️' },
  crystal: { idle: '💎', happy: '💠', thinking: '🔮', tired: '🌫️', speaking: '💬' },
  leaf: { idle: '🌿', happy: '🌸', thinking: '🍃', tired: '🍂', speaking: '🌱' },
  music: { idle: '🎵', happy: '🎶', thinking: '🎼', tired: '🎸', speaking: '🎤' }
}

// ---------------------------------------------------------------------------
// Species locomotion — 2D Framer Motion keyframe presets per species
// Animates the portrait directly in the orb. Each preset targets a different
// visual metaphor: wing-spread pulse for fliers, gait-bounce for walkers, etc.
// ---------------------------------------------------------------------------
const SPECIES_MOTION = {
  // ── Winged fliers: scaleX pulse = wing spread/contract ──────────────────
  owl: {
    animate: { scaleX: [1, 1.12, 1], scaleY: [1, 0.94, 1] },
    transition: { repeat: Infinity, duration: 0.85, ease: 'easeInOut' }
  },
  dragon: {
    animate: { scaleX: [1, 1.16, 1], scaleY: [1, 0.92, 1] },
    transition: { repeat: Infinity, duration: 1.3, ease: 'easeInOut' }
  },
  phoenix: {
    animate: { scaleX: [1, 1.13, 1], scaleY: [1, 0.94, 1] },
    transition: { repeat: Infinity, duration: 1.0, ease: 'easeInOut' }
  },
  // ── Walkers: y-bounce + rotate rock = walking gait ──────────────────────
  cat: {
    animate: { y: [0, -3, 0], rotate: [0, 2, 0, -2, 0] },
    transition: { repeat: Infinity, duration: 0.7, ease: 'easeInOut' }
  },
  fox: {
    animate: { y: [0, -3, 0], rotate: [0, 2.5, 0, -2.5, 0] },
    transition: { repeat: Infinity, duration: 0.65, ease: 'easeInOut' }
  },
  robot: {
    animate: { y: [0, -2, 0], rotate: [0, 1, 0, -1, 0] },
    transition: { repeat: Infinity, duration: 0.5, ease: 'linear' }
  },
  // ── Spinners ─────────────────────────────────────────────────────────────
  crystal: {
    animate: { rotate: [0, 360] },
    transition: { repeat: Infinity, duration: 5, ease: 'linear' }
  },
  star: {
    animate: { rotate: [0, 360], scale: [1, 1.07, 1] },
    transition: { repeat: Infinity, duration: 3.5, ease: 'linear' }
  },
  // ── Swayers ──────────────────────────────────────────────────────────────
  leaf: {
    animate: { rotate: [-7, 7, -7] },
    transition: { repeat: Infinity, duration: 2.8, ease: 'easeInOut' }
  },
  music: {
    animate: { y: [0, -5, 0], rotate: [-3, 3, -3] },
    transition: { repeat: Infinity, duration: 0.6, ease: 'easeInOut' }
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** The animated orb that represents the pet in collapsed state */
export const PetOrb = ({
  mood,
  level,
  stage,
  isCelebrating,
  onClick,
  species,
  dominantColor: dominantColorOverride,
  preview,
  avatarUrl,
  onAvatarError,
  isGenerating
}) => {
  const { t } = useTranslation()
  const moodEmoji = {
    idle: '🔮',
    happy: '✨',
    thinking: '💭',
    tired: '😴',
    speaking: '💬'
  }

  const config = STAGE_CONFIG[stage] ?? STAGE_CONFIG[1]

  const displayEmoji =
    species && SPECIES_CONFIG[species] ? (SPECIES_CONFIG[species][mood] ?? SPECIES_CONFIG[species].idle) : (moodEmoji[mood] ?? config.emoji)

  const activeColor = dominantColorOverride ?? config.dominantColor

  const speciesMotion = SPECIES_MOTION[species] ?? null

  const floatAnimation = isCelebrating
    ? {
        y: 0,
        boxShadow: [`0 8px 32px ${activeColor}55`, `0 16px 48px ${activeColor}88`, `0 8px 32px ${activeColor}55`]
      }
    : {
        y: [0, -6, 0],
        boxShadow: [`0 8px 32px ${activeColor}55`, `0 16px 48px ${activeColor}88`, `0 8px 32px ${activeColor}55`]
      }

  const orbStyle = {
    width: config.sizePx,
    height: config.sizePx,
    borderRadius: '50%',
    border: 'none',
    cursor: preview ? 'default' : 'pointer',
    background: `radial-gradient(circle at 35% 35%, ${activeColor}, var(--joy-palette-background-body, #0c0818))`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: Math.round(config.sizePx * 0.43),
    position: 'relative',
    overflow: 'hidden',
    outline: 'none'
  }

  const auraRings =
    config.ringCount > 0
      ? Array.from({ length: config.ringCount }).map((_, i) => (
          <motion.span
            key={i}
            animate={{ opacity: [0.15, 0.45, 0.15], scale: [0.97, 1.03, 0.97] }}
            transition={{ repeat: Infinity, duration: config.pulseDuration, delay: i * (config.pulseDuration / config.ringCount) }}
            style={{
              position: 'absolute',
              width: config.sizePx + 12 + i * 10,
              height: config.sizePx + 12 + i * 10,
              borderRadius: '50%',
              border: `1px solid ${activeColor}`,
              top: -(6 + i * 5),
              left: -(6 + i * 5),
              pointerEvents: 'none',
              zIndex: -1
            }}
          />
        ))
      : null

  /** Inner content: portrait image (with species locomotion), shimmer, or emoji fallback */
  const innerContent = (
    <>
      {/* Shimmer while generating */}
      {isGenerating && !avatarUrl && (
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%, ${activeColor}, var(--joy-palette-background-body, #0c0818))`,
            zIndex: 2
          }}
        />
      )}

      <AnimatePresence mode='wait'>
        {avatarUrl ? (
          // Outer div: fade-in/scale on mount, fade-out on exit
          <motion.div
            key='portrait'
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'absolute', inset: 0 }}
          >
            {/* Inner div: species locomotion — loops forever, independent of mount transition */}
            <motion.div animate={speciesMotion?.animate} transition={speciesMotion?.transition} style={{ width: '100%', height: '100%' }}>
              <img
                src={avatarUrl}
                alt=''
                aria-hidden='true'
                onError={() => {
                  if (typeof onAvatarError === 'function') onAvatarError()
                }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </motion.div>
          </motion.div>
        ) : (
          // Emoji fallback — also gets species motion
          <motion.div key='emoji' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <motion.span
              animate={speciesMotion?.animate}
              transition={speciesMotion?.transition}
              style={{
                fontSize: Math.round(config.sizePx * 0.43),
                lineHeight: 1,
                position: 'relative',
                zIndex: 1,
                display: 'inline-block'
              }}
            >
              {displayEmoji}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )

  if (preview) {
    return (
      <motion.div
        animate={floatAnimation}
        transition={{
          y: { repeat: Infinity, duration: config.pulseDuration, ease: 'easeInOut' },
          boxShadow: { repeat: Infinity, duration: config.pulseDuration, ease: 'easeInOut' }
        }}
        style={orbStyle}
      >
        {auraRings}
        {innerContent}
      </motion.div>
    )
  }

  return (
    <motion.button
      id='study-pet-orb'
      aria-label={t('agent.aria.openBuddy')}
      onClick={onClick}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.95 }}
      animate={floatAnimation}
      transition={{
        y: { repeat: Infinity, duration: config.pulseDuration, ease: 'easeInOut' },
        boxShadow: { repeat: Infinity, duration: config.pulseDuration, ease: 'easeInOut' }
      }}
      style={orbStyle}
    >
      {auraRings}

      {innerContent}

      {/* Level badge */}
      <span
        style={{
          position: 'absolute',
          top: -4,
          right: -4,
          background: activeColor,
          color: 'var(--joy-palette-common-white)',
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1,
          padding: '2px 5px',
          borderRadius: 8,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.03em',
          zIndex: 3
        }}
      >
        Lv{level}
      </span>
    </motion.button>
  )
}

/** A single message bubble in the chat history */
const MessageBubble = ({ role, content, speciesColor }) => {
  const isUser = role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 8
      }}
    >
      <div
        style={{
          maxWidth: '82%',
          padding: '8px 12px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isUser ? speciesColor : 'var(--joy-palette-background-level2)',
          border: isUser ? 'none' : '1px solid var(--joy-palette-divider)',
          color: 'var(--joy-palette-text-primary)',
          fontSize: 14,
          lineHeight: 1.55,
          fontFamily: 'Inter, sans-serif',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
      >
        {isUser ? content : <PetMarkdown content={content} />}
      </div>
    </motion.div>
  )
}

/** Typing indicator — three pulsing dots */
const TypingIndicator = ({ speciesColor }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: 5, padding: '6px 4px', marginBottom: 8 }}>
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: speciesColor,
          opacity: 0.8,
          display: 'block'
        }}
      />
    ))}
  </motion.div>
)

// ---------------------------------------------------------------------------
// Main StudyPet component
// ---------------------------------------------------------------------------
const StudyPet = () => {
  const {
    isOpen,
    mood,
    level,
    stage,
    justLeveledUp,
    levelUpData,
    levelUpClear,
    justRevealed,
    revealData,
    petRevealClear,
    preferredName,
    tier,
    history,
    isTyping,
    error,
    messagesUsed,
    messagesLimit,
    open,
    close,
    sendMessage,
    clearError,
    petName,
    petSpecies,
    petColor,
    avatarUrl,
    avatarGenerating,
    avatarRegenPending,
    generateAvatar,
    clearAvatarUrl,
    isRoamingEnabled,
    companionMessage,
    companionIsLoading,
    dismissCompanion,
    openChatFromCompanion,
    pendingQuizConfig,
    showDeckSelector,
    clearQuizConfig,
    showDeckSelectorAction,
    hideDeckSelectorAction,
    isInStudySession,
    isStudySessionFullscreen
  } = usePet()

  const { t, i18n } = useTranslation()
  const { isAuthenticated } = useAuth()
  const { openUpgradeModal } = useSubscriptionContext()
  const { themeColor } = useThemePreferences()
  const navigate = useNavigate()
  const resolvedColor = themeColor
  const [input, setInput] = useState('')
  // Tier enforcement state
  const messagesUsedThisMonth = messagesUsed
  const [messageLimitReached, setMessageLimitReached] = useState(false)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)
  const summaryTimerRef = useRef(null)
  const dragControls = useDragControls()
  const [petPosition, setPetPosition] = useState({ x: 0, y: 0 })

  // ---------------------------------------------------------------------------
  // Quiz state machine
  // States: 'chat' | 'quiz-setup' | 'quiz-active' | 'quiz-summary'
  // ---------------------------------------------------------------------------
  const [quizState, setQuizState] = useState('chat')
  const [quizSession, setQuizSession] = useState(null)
  // { sessionId, totalCards, currentIndex, currentQuestion, score, deckName, attemptNumber }
  const [availableDecks, setAvailableDecks] = useState([])
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizError, setQuizError] = useState(null)
  // Messages injected into the chat list for quiz bubbles
  const [quizMessages, setQuizMessages] = useState([])
  // Track pending answer submission
  const [answerPending, setAnswerPending] = useState(false)
  // Conversation history for the current card (role/content pairs passed to backend)
  const [cardConversation, setCardConversation] = useState([])

  // Push a quiz-specific message into the chat display list
  const pushQuizMessage = useCallback((msg) => {
    setQuizMessages((prev) => [...prev, msg])
  }, [])

  // Fetch decks when entering quiz-setup
  const enterQuizSetup = useCallback(async () => {
    setQuizState('quiz-setup')
    setQuizLoading(true)
    setQuizError(null)
    setQuizMessages([])
    try {
      const { data } = await quizService.getQuizDecks()
      setAvailableDecks(Array.isArray(data) ? data : (data?.decks ?? []))
    } catch {
      setQuizError(t('quiz.error_loading_decks'))
      setAvailableDecks([])
    } finally {
      setQuizLoading(false)
    }
  }, [t])

  // Start a quiz session for a chosen deck
  const handleSelectDeck = useCallback(
    async (deck) => {
      setQuizLoading(true)
      setQuizError(null)
      try {
        const { data } = await quizService.startQuizSession({
          deck_id: deck.deck_id,
          card_count: 10,
          prioritize_due: true
        })
        const firstQuestion = data?.first_question ?? null
        setCardConversation([])
        setQuizSession({
          sessionId: data.session_id,
          totalCards: data.total_cards,
          currentIndex: 1,
          currentQuestion: firstQuestion,
          score: { correct: 0, partial: 0, incorrect: 0 },
          deckName: deck.name,
          attemptNumber: 1
        })
        setQuizState('quiz-active')
        if (firstQuestion) {
          pushQuizMessage({
            type: 'quiz-question',
            id: Date.now(),
            questionType: firstQuestion.question_type,
            questionText: firstQuestion.question_text,
            cardId: firstQuestion.card_id
          })
        }
      } catch {
        setQuizError(t('quiz.error_starting'))
      } finally {
        setQuizLoading(false)
      }
    },
    [t, pushQuizMessage]
  )

  // Submit the user's typed answer
  const handleQuizAnswer = useCallback(
    async (answerText) => {
      if (!quizSession || answerPending) return
      const { sessionId, currentQuestion, currentIndex, totalCards, attemptNumber } = quizSession
      if (!currentQuestion) return

      // Skip — bypass LLM on the backend (skip: true), mark incorrect, reveal answer, advance.
      if (answerText === '__skip__') {
        setAnswerPending(true)
        try {
          const { data } = await quizService.submitQuizAnswer({
            session_id: sessionId,
            card_id: currentQuestion.card_id,
            question_type: currentQuestion.question_type,
            question_text: currentQuestion.question_text,
            user_answer: '',
            attempt_number: 1,
            conversation_history: [],
            skip: true
          })
          const isLastCard = data.session_complete ?? currentIndex >= totalCards
          setCardConversation([])
          setQuizSession((prev) => ({
            ...prev,
            score: { ...prev.score, incorrect: (prev.score.incorrect ?? 0) + 1 },
            attemptNumber: 1
          }))
          pushQuizMessage({
            type: 'quiz-feedback',
            id: Date.now(),
            evaluation: 'incorrect',
            feedbackMessage: data.revealed_answer ? '' : (data.feedback_message ?? ''),
            revealedAnswer: data.revealed_answer ?? currentQuestion.correct_answer ?? null,
            hint: null,
            isLastCard,
            nextQuestion: data.next_question ?? null,
            summary: data.summary ?? null
          })
          if (isLastCard && data.summary) {
            setQuizSession((prev) => ({ ...prev, summaryData: data.summary }))
            summaryTimerRef.current = setTimeout(() => setQuizState('quiz-summary'), 1500)
          }
        } catch {
          pushQuizMessage({ type: 'quiz-error', id: Date.now(), text: t('quiz.error_submitting') })
        } finally {
          setAnswerPending(false)
        }
        return
      }

      setAnswerPending(true)
      pushQuizMessage({ type: 'quiz-answer-pending', id: Date.now(), text: answerText })

      // Append user message to per-card conversation history
      const updatedHistory = [...cardConversation, { role: 'user', content: answerText }]

      try {
        const { data } = await quizService.submitQuizAnswer({
          session_id: sessionId,
          card_id: currentQuestion.card_id,
          question_type: currentQuestion.question_type,
          question_text: currentQuestion.question_text,
          user_answer: answerText,
          attempt_number: attemptNumber,
          conversation_history: cardConversation
        })

        const responseType = data.response_type ?? 'evaluation'

        if (responseType === 'followup') {
          // Conversational response — no scoring, no card advance, stay on same card
          const assistantReply = data.feedback_message ?? ''
          setCardConversation([...updatedHistory, { role: 'assistant', content: assistantReply }])
          pushQuizMessage({
            type: 'quiz-followup',
            id: Date.now() + 1,
            text: assistantReply
          })
          return
        }

        // It's an evaluation — update history, increment attempt counter
        const evaluation = data.evaluation ?? 'incorrect'
        const isLastCard = data.session_complete ?? currentIndex >= totalCards

        setCardConversation([...updatedHistory, { role: 'assistant', content: data.feedback_message ?? '' }])

        // Only increment attempt if not correct (so correct answers move on cleanly)
        setQuizSession((prev) => ({
          ...prev,
          score: { ...prev.score, [evaluation]: (prev.score[evaluation] ?? 0) + 1 },
          attemptNumber: evaluation === 'correct' ? 1 : (prev.attemptNumber ?? 1) + 1
        }))

        pushQuizMessage({
          type: 'quiz-feedback',
          id: Date.now() + 1,
          evaluation,
          feedbackMessage: data.feedback_message ?? '',
          revealedAnswer: data.revealed_answer ?? null,
          hint: data.hint ?? null,
          isLastCard,
          nextQuestion: data.next_question ?? null,
          summary: data.summary ?? null
        })

        if (isLastCard && data.summary) {
          setQuizSession((prev) => ({ ...prev, summaryData: data.summary }))
          // Auto-transition to summary — brief delay lets user read final feedback
          summaryTimerRef.current = setTimeout(() => setQuizState('quiz-summary'), 1500)
        }
      } catch {
        pushQuizMessage({
          type: 'quiz-error',
          id: Date.now() + 1,
          text: t('quiz.error_submitting')
        })
        setTimeout(() => {
          pushQuizMessage({
            type: 'quiz-error',
            id: Date.now() + 2,
            text: t('agent.errors.quizAnswerFailed')
          })
          setQuizState('chat')
        }, 1500)
      } finally {
        setAnswerPending(false)
      }
    },
    [quizSession, answerPending, cardConversation, pushQuizMessage, t]
  )

  // Called from QuizFeedbackBubble "Next →" button
  const handleNextCard = useCallback(
    async (nextQuestion, isLastCard, summary) => {
      if (isLastCard) {
        setQuizState('quiz-summary')
        return
      }
      if (nextQuestion) {
        // Backend already advanced — just update UI state
        setCardConversation([])
        setQuizSession((prev) => ({
          ...prev,
          currentIndex: prev.currentIndex + 1,
          currentQuestion: nextQuestion,
          attemptNumber: 1
        }))
        pushQuizMessage({
          type: 'quiz-question',
          id: Date.now(),
          questionType: nextQuestion.question_type,
          questionText: nextQuestion.question_text,
          cardId: nextQuestion.card_id
        })
      } else {
        // nextQuestion is null → backend held on this card (attempt 1 incorrect).
        // Re-submit with attempt_number=2 to force advancement to next question.
        const { currentQuestion, sessionId, attemptNumber } = quizSession
        if (!currentQuestion) return
        const lastUserMsg = [...cardConversation].reverse().find((m) => m.role === 'user')
        const forceAnswer = lastUserMsg?.content ?? ''
        setAnswerPending(true)
        try {
          const { data } = await quizService.submitQuizAnswer({
            session_id: sessionId,
            card_id: currentQuestion.card_id,
            question_type: currentQuestion.question_type,
            question_text: currentQuestion.question_text,
            user_answer: forceAnswer,
            attempt_number: attemptNumber, // already incremented to 2 after first incorrect
            conversation_history: cardConversation
          })
          const isNextLast = data.session_complete ?? false
          if (isNextLast && data.summary) {
            setQuizSession((prev) => ({ ...prev, summaryData: data.summary }))
            setQuizState('quiz-summary')
          } else if (data.next_question) {
            setCardConversation([])
            setQuizSession((prev) => ({
              ...prev,
              currentIndex: prev.currentIndex + 1,
              currentQuestion: data.next_question,
              attemptNumber: 1
            }))
            pushQuizMessage({
              type: 'quiz-question',
              id: Date.now(),
              questionType: data.next_question.question_type,
              questionText: data.next_question.question_text,
              cardId: data.next_question.card_id
            })
          }
        } catch {
          pushQuizMessage({ type: 'quiz-error', id: Date.now(), text: t('quiz.error_submitting') })
        } finally {
          setAnswerPending(false)
        }
      }
    },
    [pushQuizMessage, quizSession, cardConversation, setAnswerPending, t]
  )

  // Exit quiz — show inline confirmation in the quiz message list
  const handleExitRequest = useCallback(() => {
    pushQuizMessage({ type: 'quiz-exit-confirm', id: Date.now() })
  }, [pushQuizMessage])

  const confirmExitQuiz = useCallback(() => {
    setQuizState('chat')
    setQuizSession(null)
    setQuizMessages([])
    setAvailableDecks([])
    setQuizError(null)
  }, [])

  const handleSend = () => {
    if (!input.trim() || isTyping) return
    const text = input.trim()
    setInput('')
    // Reset textarea height back to single row after send
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }

    if (quizState === 'quiz-active' && quizSession) {
      // Route to quiz answer submission
      handleQuizAnswer(text)
      return
    }

    // All other messages go to the backend — quiz intent is detected there via quiz_config
    sendMessage(text)
  }

  // ---------------------------------------------------------------------------
  // Backend-driven quiz intent — watch pendingQuizConfig set by AGENT_REPLY
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!pendingQuizConfig) return

    // Consume immediately so a re-render doesn't re-trigger
    clearQuizConfig()

    if (pendingQuizConfig.mode === 'ai') {
      setQuizLoading(true)
      setQuizState('quiz-active')
      quizService
        .startAIQuiz({
          topic: pendingQuizConfig.topic,
          question_count: pendingQuizConfig.question_count ?? 10,
          language: i18n.language
        })
        .then(({ data }) => {
          const firstQuestion = data?.first_question ?? null
          setCardConversation([])
          setQuizSession({
            sessionId: data.session_id,
            // AI quiz response uses total_questions; deck quiz uses total_cards
            totalCards: data.total_questions ?? data.total_cards,
            currentIndex: 1,
            currentQuestion: firstQuestion,
            score: { correct: 0, partial: 0, incorrect: 0 },
            deckName: pendingQuizConfig.topic ?? t('quiz.mode.ai'),
            attemptNumber: 1,
            isAiQuiz: true
          })
          if (firstQuestion) {
            setQuizMessages([
              {
                type: 'quiz-question',
                id: Date.now(),
                questionType: firstQuestion.question_type,
                questionText: firstQuestion.question_text,
                cardId: firstQuestion.card_id
              }
            ])
          }
        })
        .catch(() => {
          setQuizMessages([
            {
              type: 'quiz-error',
              id: Date.now(),
              text: t('agent.errors.quizStartFailed')
            }
          ])
          setQuizState('chat')
        })
        .finally(() => {
          setQuizLoading(false)
        })
    } else if (pendingQuizConfig.mode === 'deck') {
      if (pendingQuizConfig.deck_id) {
        // Named deck — go straight to deck quiz, skip DeckSelector
        setQuizLoading(true)
        quizService
          .startQuizSession({
            deck_id: pendingQuizConfig.deck_id,
            card_count: pendingQuizConfig.question_count ?? 10,
            prioritize_due: true
          })
          .then(({ data }) => {
            const firstQuestion = data?.first_question ?? null
            setCardConversation([])
            setQuizSession({
              sessionId: data.session_id,
              totalCards: data.total_cards,
              currentIndex: 1,
              currentQuestion: firstQuestion,
              score: { correct: 0, partial: 0, incorrect: 0 },
              deckName: data.deck_name ?? t('quiz.mode_label'),
              attemptNumber: 1
            })
            setQuizState('quiz-active')
            if (firstQuestion) {
              setQuizMessages([
                {
                  type: 'quiz-question',
                  id: Date.now(),
                  questionType: firstQuestion.question_type,
                  questionText: firstQuestion.question_text,
                  cardId: firstQuestion.card_id
                }
              ])
            }
          })
          .catch(() => {
            setQuizError(t('quiz.error_starting'))
          })
          .finally(() => {
            setQuizLoading(false)
          })
      } else {
        // No specific deck named — show DeckSelector as fallback
        enterQuizSetup()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuizConfig])

  // Keep showDeckSelector context flag in sync with local quizState
  useEffect(() => {
    if (quizState === 'quiz-setup') {
      showDeckSelectorAction()
    } else {
      hideDeckSelectorAction()
    }
  }, [quizState, showDeckSelectorAction, hideDeckSelectorAction])

  // Roaming animation controls — drives autonomous movement independently of drag
  const roamControls = useAnimation()
  const roamActiveRef = useRef(false)
  // Track current roam position so we can clamp new targets relative to drag base
  const roamPosRef = useRef({ x: 0, y: 0 })
  // Track drag base so roaming stays within visible viewport
  const dragBaseRef = useRef({ x: 0, y: 0 })
  // Centralized z-index (PET-02, D-13) — derived each render, no local state.
  // Bumps above the fullscreen study overlay only while docked AND that session
  // is in fullscreen mode (D-07); rests at Z_PET_RESTING everywhere else.
  const isFullscreenBump = isInStudySession && isStudySessionFullscreen
  const computedZIndex = isFullscreenBump ? Z_PET_FULLSCREEN : Z_PET_RESTING
  const location = useLocation()
  const isOnboardingRoute = location.pathname === '/register' || location.pathname.startsWith('/onboarding')

  /** Pick a random roam target that keeps the pet inside the viewport. */
  const getRandomRoamTarget = () => {
    const isMobile = window.innerWidth < 600
    // The pet anchor is fixed bottom-right. Negative x moves left, negative y moves up.
    // dragBase accounts for any manual repositioning by the user.
    const baseX = dragBaseRef.current.x
    const baseY = dragBaseRef.current.y

    if (isMobile) {
      // Small radius on mobile — stay near current position
      const radius = 100
      return {
        x: baseX + (Math.random() * radius * 2 - radius),
        y: baseY + (Math.random() * radius * 2 - radius)
      }
    }

    // Desktop: roam freely across ~60% of the viewport
    // From the fixed bottom-right anchor, moving left/up is negative x/y
    const maxLeft = Math.min(window.innerWidth * 0.65, 600)
    const maxUp = Math.min(window.innerHeight * 0.7, 520)

    // Occasionally (20% of the time) do an "edge peek" — go near a screen edge
    const doPeek = Math.random() < 0.2
    if (doPeek) {
      const edge = Math.floor(Math.random() * 3) // 0=left, 1=top, 2=top-left
      if (edge === 0) return { x: -(window.innerWidth - 80), y: baseY }
      if (edge === 1) return { x: baseX, y: -(window.innerHeight - 80) }
      return { x: -(window.innerWidth - 80), y: -(window.innerHeight - 80) }
    }

    return {
      x: -(Math.random() * maxLeft),
      y: -(Math.random() * maxUp)
    }
  }

  useEffect(() => {
    if (!isRoamingEnabled || isOpen || isInStudySession || isOnboardingRoute) {
      roamActiveRef.current = false
      roamControls.stop()
      // Smoothly return to resting position
      roamControls.start({
        x: 0,
        y: 0,
        transition: { type: 'spring', stiffness: 80, damping: 18 }
      })
      roamPosRef.current = { x: 0, y: 0 }
      return
    }

    roamActiveRef.current = true

    const roam = async () => {
      while (roamActiveRef.current) {
        const prev = roamPosRef.current
        const target = getRandomRoamTarget()
        roamPosRef.current = target

        // Random movement speed — slower for longer distances
        const dx = Math.abs(target.x - prev.x)
        const dy = Math.abs(target.y - prev.y)
        const distance = Math.sqrt(dx * dx + dy * dy)
        const duration = Math.max(1.5, Math.min(5, distance / 120))

        await roamControls.start({
          x: target.x,
          y: target.y,
          transition: {
            duration,
            ease: [0.25, 0.46, 0.45, 0.94]
          }
        })

        if (!roamActiveRef.current) break

        // Pause at destination — wait between 2 and 6 seconds
        const pause = 2000 + Math.random() * 4000
        await new Promise((r) => {
          const t = setTimeout(r, pause)
          // Allow early exit if roaming is disabled while waiting
          const check = setInterval(() => {
            if (!roamActiveRef.current) {
              clearTimeout(t)
              clearInterval(check)
              r()
            }
          }, 200)
          setTimeout(() => clearInterval(check), pause + 100)
        })
      }
    }

    roam()

    return () => {
      roamActiveRef.current = false
      roamControls.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRoamingEnabled, isOpen, isInStudySession, isOnboardingRoute])

  // Auto-scroll chat to bottom on new messages or quiz messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, isTyping, quizMessages])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  // Cleanup summary timer on unmount to prevent state updates on an unmounted component
  useEffect(() => {
    return () => {
      if (summaryTimerRef.current) clearTimeout(summaryTimerRef.current)
    }
  }, [])

  const handleKeyDown = (e) => {
    // Enter = newline (default textarea behaviour — send is button-only)
    // Shift+Enter also works naturally as a second newline
  }

  // Track message limit reached state: triggered by 429 (context error) or usage reaching limit
  useEffect(() => {
    if (messagesLimit !== -1 && messagesUsedThisMonth >= messagesLimit) {
      setMessageLimitReached(true)
    }
  }, [messagesUsedThisMonth, messagesLimit])

  // Don't render for unauthenticated users
  if (!isAuthenticated) return null

  const messagesRemaining = messagesLimit === -1 ? '∞' : Math.max(0, messagesLimit - messagesUsed)

  return (
    <>
      {/* Transparent full-screen backdrop — click outside panel to close */}
      {isOpen &&
        ReactDOM.createPortal(
          <div
            onClick={close}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: computedZIndex - 1,
              background: 'transparent'
            }}
          />,
          document.body
        )}

      {ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            ...(isInStudySession ? { left: 24 } : { right: 24 }),
            zIndex: computedZIndex,
            display: 'flex',
            flexDirection: 'column',
            alignItems: isInStudySession ? 'flex-start' : 'flex-end',
            gap: 12,
            fontFamily: 'Inter, sans-serif'
          }}
        >
          {/* Level-up celebration overlay */}
          <AnimatePresence>
            {justLeveledUp && levelUpData && (
              <LevelUpCelebration key='level-up' levelUpData={levelUpData} stage={stage} onDismiss={levelUpClear} />
            )}
          </AnimatePresence>

          {/* Pet contextual first-reveal celebration */}
          <AnimatePresence>
            {justRevealed && (
              <PetRevealCelebration
                key='pet-reveal'
                species={petSpecies}
                cardsReviewed={revealData?.cardsReviewed}
                onDismiss={petRevealClear}
              />
            )}
          </AnimatePresence>

          {/* Chat Panel */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                id='study-pet-panel'
                key='pet-panel'
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                style={{
                  // Viewport-relative clamp — prevents the panel itself from overflowing
                  // narrow viewports (<428px) while preserving the 380x580 default on
                  // larger screens. Keeps the existing 24px edge margins (48px total).
                  width: 'min(380px, calc(100vw - 48px))',
                  height: 'min(580px, calc(100vh - 48px))',
                  borderRadius: 20,
                  background: 'var(--joy-palette-background-surface)',
                  border: '1px solid var(--joy-palette-divider)',
                  backdropFilter: 'blur(24px)',
                  boxShadow: `0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px ${resolvedColor}26`,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                {/* Panel Header — quiz mode replaces normal header */}
                {quizState === 'quiz-active' && quizSession ? (
                  <QuizModeHeader
                    deckName={quizSession.deckName}
                    currentIndex={quizSession.currentIndex}
                    totalCards={quizSession.totalCards}
                    onExit={handleExitRequest}
                  />
                ) : (
                  <div
                    style={{
                      padding: '14px 16px',
                      background: 'var(--joy-palette-background-level1)',
                      borderBottom: '1px solid var(--joy-palette-divider)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>
                        {petSpecies && SPECIES_CONFIG[petSpecies]
                          ? (SPECIES_CONFIG[petSpecies][mood] ?? SPECIES_CONFIG[petSpecies].idle)
                          : mood === 'tired'
                            ? '😴'
                            : mood === 'happy'
                              ? '✨'
                              : '🔮'}
                      </span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: 'var(--joy-palette-text-primary)', fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>
                            {petName || t('agent.defaultName')}
                          </span>
                          {/* Persistent memory chip — Plus/Pro only */}
                          {tier !== 'free' && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '1px 6px',
                                borderRadius: 10,
                                fontSize: 12,
                                fontWeight: 600,
                                background: 'var(--joy-palette-success-softBg)',
                                color: 'var(--joy-palette-success-plainColor)',
                                lineHeight: 1.6
                              }}
                              aria-live='polite'
                            >
                              {t('agent.persistentMemory')}
                            </span>
                          )}
                        </div>
                        <div style={{ color: resolvedColor, fontSize: 12, fontWeight: 500, opacity: 0.9 }}>
                          {messagesLimit === -1
                            ? t('agent.headerStatusUnlimited', {
                                level,
                                tier: tier.charAt(0).toUpperCase() + tier.slice(1)
                              })
                            : t('agent.headerStatus', {
                                level,
                                tier: tier.charAt(0).toUpperCase() + tier.slice(1),
                                remaining: messagesRemaining
                              })}
                        </div>
                      </div>
                    </div>
                    <button
                      aria-label={t('agent.aria.closeBuddy')}
                      onClick={close}
                      style={{
                        background: 'var(--joy-palette-background-level1)',
                        border: '1px solid var(--joy-palette-divider)',
                        borderRadius: 8,
                        color: 'var(--joy-palette-text-secondary)',
                        cursor: 'pointer',
                        fontSize: 16,
                        width: 28,
                        height: 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                        transition: 'all 0.15s'
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Chat History */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px 16px 6px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: `${resolvedColor}4d transparent`
                  }}
                >
                  {/* Welcome message if no history */}
                  {history.length === 0 && !isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ textAlign: 'center', padding: '24px 12px 12px' }}
                    >
                      {/* Avatar: portrait image if available, species emoji fallback, then stage emoji */}
                      {avatarUrl ? (
                        <div
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            overflow: 'hidden',
                            margin: '0 auto 12px',
                            boxShadow: `0 0 0 4px ${resolvedColor}55, 0 6px 28px ${resolvedColor}44`
                          }}
                        >
                          <img
                            src={avatarUrl}
                            alt=''
                            aria-hidden='true'
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: 40,
                            marginBottom: 12,
                            textShadow: `0 0 16px ${resolvedColor}66`
                          }}
                        >
                          {petSpecies && SPECIES_CONFIG[petSpecies]
                            ? SPECIES_CONFIG[petSpecies].idle
                            : (STAGE_CONFIG[stage] ?? STAGE_CONFIG[1]).emoji}
                        </div>
                      )}
                      <div
                        style={{
                          color: resolvedColor,
                          fontSize: 16,
                          fontWeight: 600,
                          lineHeight: 1.6
                        }}
                      >
                        {t('agent.welcomeMessage', { petName: petName || t('agent.defaultName') })}
                      </div>
                      <div
                        style={{ color: 'var(--joy-palette-text-secondary)', fontSize: 14, fontWeight: 400, marginTop: 4, lineHeight: 1.6 }}
                      >
                        {preferredName ? t('agent.welcomePrompt', { name: preferredName.split(' ')[0] }) : t('agent.welcomePromptNoName')}
                      </div>
                    </motion.div>
                  )}

                  {history.map((msg, i) => {
                    // When quiz-setup panel is active, suppress the last assistant
                    // message — the DeckSelector panel IS the visual response.
                    const isLastMsg = i === history.length - 1
                    if (isLastMsg && msg.role === 'assistant' && quizState === 'quiz-setup') {
                      return null
                    }
                    return <MessageBubble key={i} role={msg.role} content={msg.content} speciesColor={resolvedColor} />
                  })}

                  {(isTyping || (quizLoading && quizState === 'quiz-active' && !quizSession)) && (
                    <TypingIndicator speciesColor={resolvedColor} />
                  )}

                  {error && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{
                        background: 'var(--joy-palette-danger-softBg)',
                        border: '1px solid var(--joy-palette-danger-outlinedBorder)',
                        borderRadius: 10,
                        padding: '8px 12px',
                        marginBottom: 8,
                        color: 'var(--joy-palette-danger-plainColor)',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8
                      }}
                    >
                      <span>{error}</span>
                      <button
                        onClick={clearError}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--joy-palette-danger-plainColor)',
                          cursor: 'pointer',
                          fontSize: 14,
                          padding: 0
                        }}
                      >
                        ×
                      </button>
                    </motion.div>
                  )}

                  {/* Quiz setup — deck selector */}
                  {quizState === 'quiz-setup' && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 10 }}>
                      <DeckSelector
                        decks={availableDecks}
                        onSelect={handleSelectDeck}
                        loading={quizLoading}
                        error={quizError}
                        onRetry={enterQuizSetup}
                      />
                    </motion.div>
                  )}

                  {/* Quiz active — injected quiz bubbles */}
                  {(quizState === 'quiz-active' || quizState === 'quiz-summary') &&
                    quizMessages.map((qMsg) => (
                      <motion.div
                        key={qMsg.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22 }}
                        style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                      >
                        {qMsg.type === 'quiz-question' && (
                          <QuizQuestionBubble questionType={qMsg.questionType} questionText={qMsg.questionText} loading={false} />
                        )}
                        {qMsg.type === 'quiz-answer-pending' && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                            <div
                              style={{
                                maxWidth: '82%',
                                padding: '8px 12px',
                                borderRadius: '16px 16px 4px 16px',
                                background: resolvedColor,
                                color: 'var(--joy-palette-text-primary)',
                                fontSize: 14,
                                lineHeight: 1.55,
                                fontFamily: 'Inter, sans-serif',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                              }}
                            >
                              {qMsg.text}
                            </div>
                          </div>
                        )}
                        {qMsg.type === 'quiz-feedback' && (
                          <QuizFeedbackBubble
                            evaluation={qMsg.evaluation}
                            feedbackMessage={qMsg.feedbackMessage}
                            revealedAnswer={qMsg.revealedAnswer}
                            hint={qMsg.hint}
                            isLastCard={qMsg.isLastCard}
                            onNext={() => handleNextCard(qMsg.nextQuestion, qMsg.isLastCard, qMsg.summary)}
                          />
                        )}
                        {qMsg.type === 'quiz-followup' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '85%' }}>
                            <div
                              style={{
                                padding: '10px 14px',
                                borderRadius: '4px 16px 16px 16px',
                                background: 'var(--joy-palette-background-level2)',
                                color: 'var(--joy-palette-text-primary)',
                                fontSize: 14,
                                lineHeight: 1.65,
                                fontFamily: 'Inter, sans-serif',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                              }}
                            >
                              {qMsg.text}
                            </div>
                            {/* Skip chip — lets user move on without answering */}
                            <button
                              onClick={() => handleQuizAnswer('__skip__')}
                              style={{
                                alignSelf: 'flex-start',
                                background: 'var(--joy-palette-background-level1)',
                                border: '1px solid var(--joy-palette-divider)',
                                borderRadius: 20,
                                color: 'var(--joy-palette-text-secondary)',
                                cursor: 'pointer',
                                fontSize: 12,
                                padding: '4px 12px',
                                fontFamily: 'Inter, sans-serif'
                              }}
                            >
                              {t('quiz.skip_card')}
                            </button>
                          </div>
                        )}
                        {qMsg.type === 'quiz-exit-confirm' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
                            <div style={{ color: 'var(--joy-palette-text-secondary)', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
                              {t('quiz.confirm_exit_prompt')}
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={confirmExitQuiz}
                                style={{
                                  background: 'var(--joy-palette-danger-softBg)',
                                  border: '1px solid var(--joy-palette-danger-outlinedBorder)',
                                  borderRadius: 20,
                                  color: 'var(--joy-palette-danger-plainColor)',
                                  cursor: 'pointer',
                                  fontSize: 12,
                                  padding: '5px 12px',
                                  fontFamily: 'Inter, sans-serif'
                                }}
                              >
                                {t('quiz.confirm_exit_yes')}
                              </button>
                              <button
                                onClick={() => setQuizMessages((prev) => prev.filter((m) => m.type !== 'quiz-exit-confirm'))}
                                style={{
                                  background: 'var(--joy-palette-background-level1)',
                                  border: '1px solid var(--joy-palette-divider)',
                                  borderRadius: 20,
                                  color: 'var(--joy-palette-text-secondary)',
                                  cursor: 'pointer',
                                  fontSize: 12,
                                  padding: '5px 12px',
                                  fontFamily: 'Inter, sans-serif'
                                }}
                              >
                                {t('quiz.confirm_exit_no')}
                              </button>
                            </div>
                          </div>
                        )}
                        {qMsg.type === 'quiz-error' && (
                          <div style={{ color: 'var(--joy-palette-danger-plainColor)', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
                            {qMsg.text}
                          </div>
                        )}
                      </motion.div>
                    ))}

                  {/* Quiz summary card — shown as last item when session completes */}
                  {quizState === 'quiz-summary' && quizSession?.summaryData && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 10 }}>
                      <QuizSummaryCard
                        summary={quizSession.summaryData}
                        onReviewWeak={() => {
                          confirmExitQuiz()
                          navigate('/study/history')
                        }}
                        onClose={confirmExitQuiz}
                      />
                    </motion.div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div
                  style={{
                    borderTop: '1px solid var(--joy-palette-divider)',
                    flexShrink: 0
                  }}
                >
                  {/* Message counter — Free tier only */}
                  {tier === 'free' && (
                    <div
                      style={{
                        px: 2,
                        paddingLeft: 12,
                        paddingRight: 12,
                        paddingTop: 6,
                        paddingBottom: 2,
                        color:
                          messagesUsedThisMonth >= 45
                            ? 'var(--joy-palette-warning-plainColor)'
                            : messageLimitReached
                              ? 'var(--joy-palette-danger-plainColor)'
                              : 'var(--joy-palette-text-tertiary)',
                        fontSize: 12,
                        fontFamily: 'Inter, sans-serif'
                      }}
                      aria-live='polite'
                    >
                      {messagesUsedThisMonth} / 50 {t('agent.messagesRemaining')}
                    </div>
                  )}
                  {/* Limit reached alert — Free tier only */}
                  {messageLimitReached && tier === 'free' && (
                    <div style={{ padding: '6px 12px 4px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          background: 'var(--joy-palette-danger-softBg)',
                          border: '1px solid var(--joy-palette-danger-outlinedBorder)',
                          borderRadius: 10,
                          padding: '8px 12px',
                          fontSize: 12,
                          color: 'var(--joy-palette-danger-plainColor)',
                          fontFamily: 'Inter, sans-serif'
                        }}
                      >
                        <span>{t('agent.chat.error.limitReached')}</span>
                        <button
                          onClick={() => openUpgradeModal(t('agent.upgrade.unlimitedMessages'))}
                          style={{
                            background: 'var(--joy-palette-danger-solidBg)',
                            border: 'none',
                            borderRadius: 6,
                            color: 'var(--joy-palette-danger-solidColor)',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '4px 10px',
                            fontFamily: 'Inter, sans-serif',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {t('agent.chat.upgradePlan')}
                        </button>
                      </div>
                    </div>
                  )}
                  <div
                    style={{
                      padding: '10px 12px 16px',
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center'
                    }}
                  >
                    <textarea
                      ref={inputRef}
                      id='study-pet-input'
                      aria-label={t('agent.inputAriaLabel')}
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value)
                        // Auto-resize: shrink to auto first, then grow to scrollHeight (max 5 lines ~120px)
                        e.target.style.height = 'auto'
                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        quizState === 'quiz-active'
                          ? t('quiz.input_placeholder')
                          : messagesLimit !== -1 && messagesUsed >= messagesLimit
                            ? t('agent.limitReachedPlaceholder')
                            : t('agent.inputPlaceholder')
                      }
                      disabled={
                        isTyping || answerPending || (messagesLimit !== -1 && messagesUsed >= messagesLimit && quizState === 'chat')
                      }
                      rows={1}
                      style={{
                        flex: 1,
                        background: 'var(--joy-palette-background-level1)',
                        border: '1px solid var(--joy-palette-neutral-outlinedBorder)',
                        borderRadius: 12,
                        color: 'var(--joy-palette-text-primary)',
                        fontSize: 14,
                        padding: '9px 12px',
                        resize: 'none',
                        outline: 'none',
                        fontFamily: 'Inter, sans-serif',
                        lineHeight: 1.55,
                        overflowY: 'auto',
                        transition: 'border-color 0.15s, height 0.1s ease'
                      }}
                    />
                    <motion.button
                      id='study-pet-send'
                      aria-label={t('agent.aria.sendMessage')}
                      onClick={handleSend}
                      disabled={!input.trim() || isTyping || answerPending}
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.94 }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        border: 'none',
                        background: input.trim() && !isTyping && !answerPending ? resolvedColor : 'var(--joy-palette-background-level2)',
                        color:
                          input.trim() && !isTyping && !answerPending
                            ? 'var(--joy-palette-common-white)'
                            : 'var(--joy-palette-text-tertiary)',
                        cursor: input.trim() && !isTyping && !answerPending ? 'pointer' : 'not-allowed',
                        fontSize: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'background 0.2s, color 0.2s'
                      }}
                    >
                      ↑
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating companion message — above orb.
              Anchors to the same edge the pet is docked to (left during an active
              study session, right otherwise) so it never renders off the opposite
              edge, plus a viewport-relative maxWidth as a collision safety net. */}
          {(companionMessage || companionIsLoading) && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                ...(isInStudySession ? { left: 0, right: 'auto' } : { right: 0, left: 'auto' }),
                marginBottom: 12,
                maxWidth: 'calc(100vw - 48px)',
                zIndex: 1
              }}
            >
              <CompanionMessage
                message={companionMessage?.message ?? ''}
                isLoading={companionIsLoading}
                onDismiss={dismissCompanion}
                onTellMeMore={openChatFromCompanion}
              />
            </div>
          )}

          {/* Roaming wrapper — drives autonomous movement across the screen */}
          <motion.div animate={roamControls} style={{ display: 'inline-flex' }}>
            {/* Draggable Pet Orb */}
            <motion.div
              drag
              dragControls={dragControls}
              dragMomentum={false}
              dragElastic={0.1}
              onDragEnd={(_, info) => {
                const next = {
                  x: petPosition.x + info.offset.x,
                  y: petPosition.y + info.offset.y
                }
                setPetPosition(next)
                dragBaseRef.current = next
              }}
              style={{ x: petPosition.x, y: petPosition.y, touchAction: 'none' }}
            >
              {!isOpen && (
                <PetOrb
                  mood={mood}
                  level={level}
                  stage={stage}
                  isCelebrating={justLeveledUp}
                  onClick={open}
                  species={petSpecies}
                  dominantColor={themeColor}
                  avatarUrl={avatarUrl}
                  onAvatarError={clearAvatarUrl}
                  isGenerating={avatarGenerating}
                />
              )}
            </motion.div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  )
}

export default StudyPet

/**
 * AgentContext
 *
 * Provides global pet state (mood, level, open/closed, chat history)
 * to any component in the tree without prop-drilling.
 *
 * Architecture: Single source of truth for all Study Buddy state.
 * The floating <StudyPet> component reads from this context.
 * Any page can call usePet() to inject context or open the pet.
 *
 * RAG Integration:
 *   - setViewContext(Object|null): Components call this to tell the pet what
 *     the user is currently looking at. Accepts a structured context object
 *     (e.g. StudyCardContext, BookPageContext) serialized to JSON on every chat message.
 *   - On dashboard mount, we call GET /agent/nudge once if the user has
 *     proactive nudging enabled. The result is shown as a speech bubble.
 */
import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from './AuthContext'
import { agentService } from '../api/services/agent.service'
import petService from '../api/services/petService'

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------
const initialState = {
  /** Whether the pet is mounted/visible at all — default-off for new accounts until reveal */
  isActive: false,
  /** Whether the contextual first-reveal has already happened for this account */
  hasBeenRevealed: false,
  /** True immediately after the first-reveal fires, triggers the celebration overlay */
  justRevealed: false,
  /** { pet_active, pet_revealed, already_revealed, cardsReviewed } while celebrating, null otherwise */
  revealData: null,
  /** Whether the chat panel is open */
  isOpen: false,
  /** Current animation/emotion state of the pet avatar */
  mood: 'idle', // 'idle' | 'happy' | 'thinking' | 'tired' | 'speaking'
  /** Gamification level derived from card study stats */
  level: 1,
  /** Current XP points */
  xp: 0,
  /** Visual evolution stage (1–6) */
  stage: 1,
  /** True immediately after a level-up, triggers the celebration overlay */
  justLeveledUp: false,
  /** { newLevel: N, newStage: N } while celebrating, null otherwise */
  levelUpData: null,
  /** The user's preferred name (from onboarding) */
  preferredName: '',
  /** Subscription tier */
  tier: 'free',
  /** Monthly message budget */
  messagesUsed: 0,
  messagesLimit: 50,
  /** Local conversation history for the session  */
  history: [],
  /** true while waiting for an API reply */
  isTyping: false,
  /** Error state */
  error: null,
  /** Whether the initial state has been loaded from the backend */
  initialized: false,
  /** Whether the user enabled AI knowledge access in Settings */
  knowledgeAccessEnabled: false,
  /** Whether the user enabled proactive nudging in Settings */
  proactiveNudgingEnabled: false,
  /** Whether the pet roams autonomously around the screen */
  isRoamingEnabled: true,
  /**
   * A proactive nudge message from the backend, shown as a speech bubble
   * when the user first lands on the dashboard. Cleared after reading.
   */
  pendingNudge: null,
  /**
   * Lightweight context string describing what the user is currently
   * looking at. Set by individual pages/components via setViewContext().
   * Sent as grounding on every chat message.
   */
  viewContext: null,
  /** Pet customization — name, species slug, color slug */
  petName: null,
  petSpecies: null,
  petColor: null,
  /** AI-generated avatar portrait */
  avatarUrl: null,
  avatarStage: null,
  avatarRegenPending: false,
  avatarGenerating: false,
  avatarError: null,
  generationsRemaining: null,
  /** AI-generated looping animation */
  animationUrl: null,
  animationStage: null,
  animationRegenPending: false,
  animationGenerating: false,
  animationError: null,
  /** Proactive companion intervention */
  companionMessage: null, // { type, message, card_id? } | null
  companionIsLoading: false,
  companionInterventionCount: 0, // resets per session
  companionSilentUntil: null, // ms timestamp | null
  /**
   * Set by AGENT_REPLY when the backend signals quiz intent via `quiz_config`.
   * Shape: { mode: 'ai'|'deck', topic: string|null, question_count: number, deck_id: string|null }
   */
  pendingQuizConfig: null,
  /** Whether the DeckSelector fallback panel should be visible */
  showDeckSelector: false,
  /** Intervention control surface */
  interventionFrequency: 'balanced',
  focusModeEnabled: false,
  isInStudySession: false,
  isStudySessionFullscreen: false,
  interventionTypes: {
    wrong_answer: true,
    session_summary: true,
    pre_session: true,
    re_engagement: true,
    streak_milestone: true
  }
}

// ---------------------------------------------------------------------------
// Reducer — all state transitions are explicit and traceable
// ---------------------------------------------------------------------------
function agentReducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return {
        ...state,
        isActive: action.payload.pet_active ?? true,
        hasBeenRevealed: action.payload.pet_revealed ?? true,
        mood: action.payload.mood,
        level: action.payload.level,
        xp: action.payload.current_xp ?? 0,
        stage: action.payload.current_stage ?? 1,
        preferredName: action.payload.preferred_name,
        tier: action.payload.tier,
        messagesUsed: action.payload.messages_used,
        messagesLimit: action.payload.messages_limit,
        knowledgeAccessEnabled: action.payload.knowledge_access_enabled ?? false,
        proactiveNudgingEnabled: action.payload.proactive_nudging_enabled ?? false,
        isRoamingEnabled: action.payload.agent_roaming_enabled ?? true,
        petName: action.payload.pet_name ?? null,
        petSpecies: action.payload.pet_species ?? null,
        petColor: action.payload.pet_color ?? null,
        avatarUrl: action.payload.avatar_url ?? null,
        avatarStage: action.payload.avatar_stage ?? null,
        avatarRegenPending: action.payload.avatar_regen_pending ?? false,
        animationUrl: action.payload.animation_url ?? null,
        animationStage: action.payload.animation_stage ?? null,
        animationRegenPending: action.payload.animation_regen_pending ?? false,
        interventionFrequency: action.payload.agent_intervention_frequency ?? 'balanced',
        focusModeEnabled: action.payload.agent_focus_mode ?? false,
        interventionTypes: {
          wrong_answer: action.payload.agent_intervention_wrong_answer ?? true,
          session_summary: action.payload.agent_intervention_session_summary ?? true,
          pre_session: action.payload.agent_intervention_pre_session ?? true,
          re_engagement: action.payload.agent_intervention_re_engagement ?? true,
          streak_milestone: action.payload.agent_intervention_streak_milestone ?? true
        },
        initialized: true
      }
    case 'OPEN':
      return { ...state, isOpen: true }
    case 'OPEN_WITH_COMPANION_MESSAGE':
      return {
        ...state,
        isOpen: true,
        history: [...state.history, { role: 'model', content: action.payload }]
      }
    case 'CLOSE':
      return { ...state, isOpen: false }
    case 'TOGGLE':
      return { ...state, isOpen: !state.isOpen }
    case 'SET_MOOD':
      return { ...state, mood: action.payload }
    case 'SET_VIEW_CONTEXT':
      return { ...state, viewContext: action.payload }
    case 'SET_NUDGE':
      return { ...state, pendingNudge: action.payload }
    case 'CLEAR_NUDGE':
      return { ...state, pendingNudge: null }
    case 'USER_MESSAGE':
      return {
        ...state,
        history: [...state.history, { role: 'user', content: action.payload }],
        isTyping: true,
        mood: 'thinking',
        error: null
      }
    case 'AGENT_REPLY':
      return {
        ...state,
        history: [...state.history, { role: 'model', content: action.payload.reply }],
        isTyping: false,
        mood: action.payload.mood || 'speaking',
        messagesUsed: action.payload.messages_used,
        messagesLimit: action.payload.messages_limit,
        // If the backend signals quiz intent, store the config for StudyPet to act on
        pendingQuizConfig: action.payload.quiz_config ?? state.pendingQuizConfig
      }
    case 'QUIZ_CONFIG_RECEIVED':
      return { ...state, pendingQuizConfig: action.payload }
    case 'CLEAR_QUIZ_CONFIG':
      return { ...state, pendingQuizConfig: null }
    case 'SHOW_DECK_SELECTOR':
      return { ...state, showDeckSelector: true }
    case 'HIDE_DECK_SELECTOR':
      return { ...state, showDeckSelector: false }
    case 'REPLY_ERROR':
      return {
        ...state,
        isTyping: false,
        mood: 'idle',
        error: action.payload
      }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    case 'UPDATE_AGENT_PREFS':
      return {
        ...state,
        knowledgeAccessEnabled: action.payload.knowledgeAccessEnabled ?? state.knowledgeAccessEnabled,
        proactiveNudgingEnabled: action.payload.proactiveNudgingEnabled ?? state.proactiveNudgingEnabled,
        isRoamingEnabled: action.payload.isRoamingEnabled ?? state.isRoamingEnabled,
        interventionFrequency: action.payload.interventionFrequency ?? state.interventionFrequency,
        focusModeEnabled: action.payload.focusModeEnabled ?? state.focusModeEnabled,
        interventionTypes: action.payload.interventionTypes ?? state.interventionTypes
      }
    case 'SET_STUDY_SESSION':
      return { ...state, isInStudySession: action.payload }
    case 'SET_STUDY_SESSION_FULLSCREEN':
      return { ...state, isStudySessionFullscreen: action.payload }
    case 'AVATAR_GENERATING':
      return { ...state, avatarGenerating: true, avatarError: null }

    case 'AVATAR_GENERATED':
      return {
        ...state,
        avatarGenerating: false,
        avatarUrl: action.payload.avatar_url,
        avatarStage: action.payload.avatar_stage,
        avatarRegenPending: false,
        generationsRemaining: action.payload.generations_remaining,
        avatarError: null
      }

    case 'AVATAR_GENERATE_ERROR':
      return { ...state, avatarGenerating: false, avatarError: action.payload }

    case 'AVATAR_CLEAR_ERROR':
      return { ...state, avatarError: null }

    case 'AVATAR_URL_FAILED':
      return { ...state, avatarUrl: null, avatarError: null }

    case 'SET_AVATAR_REGEN_PENDING':
      return { ...state, avatarRegenPending: true }

    case 'ANIMATION_GENERATING':
      return { ...state, animationGenerating: true, animationError: null }

    case 'ANIMATION_GENERATED':
      return {
        ...state,
        animationGenerating: false,
        animationUrl: action.payload.animation_url,
        animationStage: action.payload.avatar_stage,
        animationRegenPending: false,
        animationError: null
      }

    case 'ANIMATION_GENERATE_ERROR':
      return { ...state, animationGenerating: false, animationError: action.payload }

    case 'ANIMATION_CLEAR_ERROR':
      return { ...state, animationError: null }

    case 'SET_ANIMATION_REGEN_PENDING':
      return { ...state, animationRegenPending: true }

    case 'LEVEL_UP':
      return {
        ...state,
        level: action.payload.newLevel,
        stage: action.payload.newStage,
        justLeveledUp: true,
        levelUpData: { newLevel: action.payload.newLevel, newStage: action.payload.newStage }
      }
    case 'LEVEL_UP_CLEAR':
      return { ...state, justLeveledUp: false, levelUpData: null }
    case 'SET_PET_ACTIVE':
      return { ...state, isActive: action.payload }
    case 'PET_REVEALED':
      return {
        ...state,
        isActive: true,
        hasBeenRevealed: true,
        justRevealed: true,
        revealData: action.payload
      }
    case 'PET_REVEAL_CLEAR':
      return { ...state, justRevealed: false, revealData: null }
    case 'COMPANION_LOADING':
      return { ...state, companionIsLoading: true, companionMessage: null }
    case 'COMPANION_SUCCESS':
      return {
        ...state,
        companionIsLoading: false,
        companionMessage: action.payload,
        companionInterventionCount: state.companionInterventionCount + 1
      }
    case 'COMPANION_DISMISS': {
      const SILENCE = { conservative: 1200000, balanced: 600000, frequent: 180000 }
      return {
        ...state,
        companionMessage: null,
        companionIsLoading: false,
        companionSilentUntil: Date.now() + (SILENCE[state.interventionFrequency] ?? 600000)
      }
    }
    case 'COMPANION_RESET_SESSION':
      return {
        ...state,
        companionInterventionCount: 0,
        companionSilentUntil: null,
        companionMessage: null,
        companionIsLoading: false
      }
    case 'UPDATE_PET_CUSTOMIZATION':
      return {
        ...state,
        petName: action.payload.petName !== undefined ? action.payload.petName : state.petName,
        petSpecies: action.payload.petSpecies !== undefined ? action.payload.petSpecies : state.petSpecies,
        petColor: action.payload.petColor !== undefined ? action.payload.petColor : state.petColor
      }
    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const AgentContext = createContext(null)

export const AgentProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth()
  const { i18n } = useTranslation()
  const [state, dispatch] = useReducer(agentReducer, initialState)
  // Keep a stable ref to the full state so companion callbacks are never stale
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })
  // Keep a stable ref to history so sendMessage closure is never stale
  const historyRef = useRef(state.history)
  historyRef.current = state.history
  // Keep a stable ref to viewContext so sendMessage always sends the latest
  const viewContextRef = useRef(state.viewContext)
  viewContextRef.current = state.viewContext
  // Keep a stable ref to avatarUrl so sendMessage can check for an existing portrait
  const avatarUrlRef = useRef(state.avatarUrl)
  useEffect(() => {
    avatarUrlRef.current = state.avatarUrl
  }, [state.avatarUrl])
  // Keep a stable ref to animationUrl so sendMessage can check for an existing animation
  const animationUrlRef = useRef(state.animationUrl)
  useEffect(() => {
    animationUrlRef.current = state.animationUrl
  }, [state.animationUrl])

  // Load the pet's initial state once the user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user || state.initialized) return

    agentService
      .getState()
      .then((data) => dispatch({ type: 'INIT', payload: data }))
      .catch(() => {
        // Non-fatal: pet will still work with default state
        dispatch({
          type: 'INIT',
          payload: {
            mood: 'idle',
            level: 1,
            preferred_name: user.username || 'there',
            tier: user.subscription?.tier || 'free',
            messages_used: 0,
            messages_limit: 50,
            knowledge_access_enabled: false,
            proactive_nudging_enabled: false
          }
        })
      })
  }, [isAuthenticated, user, state.initialized])

  // On init, auto-trigger evolution regeneration if pending and portrait/animation already exists
  useEffect(() => {
    if (!state.initialized) return
    if (state.avatarRegenPending && state.avatarUrl) {
      generateAvatar('evolution')
    }
    if (state.animationRegenPending && state.animationUrl) {
      generateAnimation('evolution')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.initialized])

  // Once initialized, check for a proactive nudge (once per session)
  const nudgeFetchedRef = useRef(false)
  useEffect(() => {
    if (!state.initialized || nudgeFetchedRef.current) return
    if (!state.proactiveNudgingEnabled || !state.knowledgeAccessEnabled) return

    nudgeFetchedRef.current = true
    agentService
      .getNudge()
      .then((data) => {
        if (data.has_nudge && data.nudge) {
          dispatch({ type: 'SET_NUDGE', payload: data.nudge })
        }
      })
      .catch(() => {
        // Non-fatal — nudges are optional
      })
  }, [state.initialized, state.proactiveNudgingEnabled, state.knowledgeAccessEnabled])

  const generateAvatar = useCallback(async (trigger = 'manual') => {
    dispatch({ type: 'AVATAR_GENERATING' })
    try {
      const data = await agentService.generateAvatar(trigger)
      dispatch({ type: 'AVATAR_GENERATED', payload: data })
    } catch (err) {
      const code = err?.response?.data?.detail
      const errorKey =
        {
          avatar_generation_requires_plus: 'agent.avatar.freeTierError',
          avatar_rate_limit_exceeded: 'agent.avatar.rateLimitError',
          avatar_missing_species: 'agent.avatar.missingSpeciesError',
          avatar_generation_failed: 'agent.avatar.generateError',
          avatar_regen_not_pending: 'agent.avatar.generateError'
        }[code] || 'agent.avatar.generateError'
      dispatch({ type: 'AVATAR_GENERATE_ERROR', payload: errorKey })
    }
  }, [])

  const clearAvatarUrl = useCallback(() => dispatch({ type: 'AVATAR_URL_FAILED' }), [])

  const generateAnimation = useCallback(async (trigger = 'manual') => {
    dispatch({ type: 'ANIMATION_GENERATING' })
    try {
      const data = await agentService.generateAnimation(trigger)
      dispatch({ type: 'ANIMATION_GENERATED', payload: data })
    } catch (err) {
      const code = err?.response?.data?.detail
      const errorKey =
        {
          animation_generation_requires_plus: 'agent.animation.freeTierError',
          animation_rate_limit_exceeded: 'agent.animation.rateLimitError',
          animation_requires_avatar: 'agent.animation.requiresAvatar',
          animation_requires_hosted_avatar: 'agent.animation.requiresHostedAvatar'
        }[code] || 'agent.animation.generateError'
      dispatch({ type: 'ANIMATION_GENERATE_ERROR', payload: errorKey })
    }
  }, [])

  /**
   * Send a message to the Study Buddy.
   * Automatically includes the current view context as grounding.
   * @param {string} message
   * @param {string|null} context - Overrides viewContext for this message only.
   */
  const sendMessage = useCallback(
    async (message, context = null) => {
      if (!message.trim()) return

      dispatch({ type: 'USER_MESSAGE', payload: message })

      // Use explicit context override, or fall back to the current view context
      const effectiveContext = context || viewContextRef.current

      try {
        const response = await agentService.chat(message, historyRef.current, effectiveContext, i18n.language)
        dispatch({ type: 'AGENT_REPLY', payload: response })
        if (response.level_up && response.new_level > 0 && response.new_stage > 0) {
          dispatch({ type: 'LEVEL_UP', payload: { newLevel: response.new_level, newStage: response.new_stage } })
          if (response.avatar_regen_pending) {
            dispatch({ type: 'SET_AVATAR_REGEN_PENDING' })
            if (avatarUrlRef.current) {
              // User already has a portrait — silently regenerate for the new evolution stage
              generateAvatar('evolution')
            }
            // No existing portrait → user still needs to generate their first one manually
            dispatch({ type: 'SET_ANIMATION_REGEN_PENDING' })
            if (animationUrlRef.current) {
              // User already has an animation — silently regenerate for the new evolution stage
              generateAnimation('evolution')
            }
          }
        }
      } catch (err) {
        const detail = err?.response?.data?.detail || 'agent.errors.resting'
        dispatch({ type: 'REPLY_ERROR', payload: detail })
      }
    },
    [generateAnimation, generateAvatar, i18n.language]
  )

  /**
   * Set the current view context.
   * Called by individual pages/components to give the agent structured grounding.
   * Example: setViewContext({ page: 'study_session', deckId: '...', cardIndex: 1, ... })
   * @param {Object|null} context - Structured screen context object, or null to clear.
   *   Known shapes:
   *   - StudyCardContext: { page, deckId, deckName, cardIndex, totalCards, cardType, isFlipped, front, back, isDailyReview }
   *   - BookPageContext: { page, bookId, bookTitle, chapterIndex, ... }
   */
  const setViewContext = useCallback((context) => dispatch({ type: 'SET_VIEW_CONTEXT', payload: context }), [])

  /** Clear the pending nudge after it has been displayed. */
  const clearNudge = useCallback(() => dispatch({ type: 'CLEAR_NUDGE' }), [])

  /**
   * Update agent preferences in local state (after a settings save).
   * @param {{ knowledgeAccessEnabled?: boolean, proactiveNudgingEnabled?: boolean }} prefs
   */
  const updateAgentPrefs = useCallback((prefs) => dispatch({ type: 'UPDATE_AGENT_PREFS', payload: prefs }), [])

  const updatePetCustomization = useCallback(({ petName, petSpecies, petColor }) => {
    dispatch({ type: 'UPDATE_PET_CUSTOMIZATION', payload: { petName, petSpecies, petColor } })
  }, [])

  const levelUpClear = useCallback(() => dispatch({ type: 'LEVEL_UP_CLEAR' }), [])

  /**
   * Toggle whether the pet is mounted/visible at all.
   * Optimistic — flips local state immediately, rolls back if the write fails.
   * @param {boolean} active
   */
  const setPetActive = useCallback(async (active) => {
    const previous = stateRef.current.isActive
    dispatch({ type: 'SET_PET_ACTIVE', payload: active })
    try {
      await petService.updatePetPreferences({ pet_active: active })
    } catch {
      // Revert on failure
      dispatch({ type: 'SET_PET_ACTIVE', payload: previous })
    }
  }, [])

  /**
   * Fire the pet's contextual first-reveal. Idempotent on the backend — call
   * once, first time only (guarded by hasBeenRevealed at the call site).
   * Non-fatal on failure: no error UI, it simply retries next session.
   * @param {number} [cardsReviewed] - Cards reviewed in the session that triggered the reveal, for the celebration copy.
   */
  const revealPet = useCallback(async (cardsReviewed = 0) => {
    try {
      const data = await agentService.revealPet()
      dispatch({ type: 'PET_REVEALED', payload: { ...data, cardsReviewed } })
    } catch {
      // Non-fatal — will simply retry next session
    }
  }, [])

  const petRevealClear = useCallback(() => dispatch({ type: 'PET_REVEAL_CLEAR' }), [])

  /**
   * Queue a proactive companion intervention.
   * Respects the per-session cap (2 interventions max) and the silent window
   * applied after the user dismisses a message.
   * @param {{ type: string, card_id?: string, [key: string]: any }} event
   */
  const queueIntervention = useCallback(async (event) => {
    const {
      companionInterventionCount,
      companionSilentUntil,
      interventionFrequency,
      focusModeEnabled,
      isInStudySession,
      interventionTypes
    } = stateRef.current

    // Gate 1: type enabled?
    const typeKey = event.type // 'wrong_answer', 'session_summary', etc.
    if (interventionTypes && !interventionTypes[typeKey]) return

    // Gate 2: focus mode blocks in-session types
    const IN_SESSION_TYPES = ['wrong_answer']
    if (focusModeEnabled && isInStudySession && IN_SESSION_TYPES.includes(typeKey)) return

    // Gate 3: per-session cap
    const CAPS = { conservative: 1, balanced: 2, frequent: 4 }
    const cap = CAPS[interventionFrequency] ?? 2
    if (companionInterventionCount >= cap) return

    // Gate 4: silence window (wrong_answer only)
    if (typeKey === 'wrong_answer' && companionSilentUntil && Date.now() < companionSilentUntil) return

    dispatch({ type: 'COMPANION_LOADING' })

    // 12-second timeout — LLM can be slow; if it exceeds this, dismiss silently
    const timeoutId = setTimeout(() => {
      dispatch({ type: 'COMPANION_DISMISS' })
    }, 12000)

    try {
      const result = await agentService.postIntervention(event)
      clearTimeout(timeoutId)
      dispatch({ type: 'COMPANION_SUCCESS', payload: result })
    } catch {
      clearTimeout(timeoutId)
      dispatch({ type: 'COMPANION_DISMISS' })
    }
  }, [])

  /**
   * Queue a pre-session companion intervention.
   * Unlike queueIntervention, this does NOT check the per-session cap — pre-session
   * triggers are outside the session flow. Still respects the 10-min silence window.
   * Takes an already-resolved API result as its argument (caller owns the fetch).
   * @param {{ type: string, message: string, [key: string]: any }} result
   */
  const queuePreSessionIntervention = useCallback((result) => {
    const { companionSilentUntil, interventionTypes, focusModeEnabled, isInStudySession } = stateRef.current
    const typeKey = result?.type // e.g. 'pre_session_framing', 're_engagement', 'streak_milestone'
    // Map API type strings to interventionTypes keys
    const TYPE_MAP = {
      pre_session_framing: 'pre_session',
      re_engagement: 're_engagement',
      streak_milestone: 'streak_milestone'
    }
    const key = TYPE_MAP[typeKey]
    if (key && interventionTypes && !interventionTypes[key]) return
    if (focusModeEnabled && isInStudySession && typeKey === 'pre_session_framing') return
    if (companionSilentUntil && Date.now() < companionSilentUntil) return
    dispatch({ type: 'COMPANION_SUCCESS', payload: result })
  }, [])

  /** Dismiss the current companion message and enter the 10-minute silent window. */
  const dismissCompanion = useCallback(() => dispatch({ type: 'COMPANION_DISMISS' }), [])

  /** Dismiss the companion bubble and open the chat panel, injecting the message into history. */
  const openChatFromCompanion = useCallback(() => {
    const msg = stateRef.current.companionMessage?.message
    dispatch({ type: 'COMPANION_DISMISS' })
    if (msg) {
      dispatch({ type: 'OPEN_WITH_COMPANION_MESSAGE', payload: msg })
    } else {
      dispatch({ type: 'OPEN' })
    }
  }, [])

  /** Reset companion session state (call on study session unmount). */
  const resetCompanionSession = useCallback(() => dispatch({ type: 'COMPANION_RESET_SESSION' }), [])

  /** Signal whether the user is currently in an active study session. */
  const setStudySession = useCallback((val) => {
    dispatch({ type: 'SET_STUDY_SESSION', payload: val })
  }, [])

  /** Signal whether the active study session is currently in fullscreen mode. */
  const setStudySessionFullscreen = useCallback((val) => {
    dispatch({ type: 'SET_STUDY_SESSION_FULLSCREEN', payload: val })
  }, [])

  const open = useCallback(() => dispatch({ type: 'OPEN' }), [])
  const close = useCallback(() => dispatch({ type: 'CLOSE' }), [])
  const toggle = useCallback(() => dispatch({ type: 'TOGGLE' }), [])
  const setMood = useCallback((mood) => dispatch({ type: 'SET_MOOD', payload: mood }), [])
  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), [])
  const clearQuizConfig = useCallback(() => dispatch({ type: 'CLEAR_QUIZ_CONFIG' }), [])
  const showDeckSelectorAction = useCallback(() => dispatch({ type: 'SHOW_DECK_SELECTOR' }), [])
  const hideDeckSelectorAction = useCallback(() => dispatch({ type: 'HIDE_DECK_SELECTOR' }), [])

  return (
    <AgentContext.Provider
      value={{
        ...state,
        sendMessage,
        open,
        close,
        toggle,
        setMood,
        clearError,
        setViewContext,
        clearNudge,
        updateAgentPrefs,
        updatePetCustomization,
        levelUpClear,
        setPetActive,
        revealPet,
        petRevealClear,
        generateAvatar,
        clearAvatarUrl,
        generateAnimation,
        animationUrl: state.animationUrl,
        animationGenerating: state.animationGenerating,
        animationError: state.animationError,
        animationRegenPending: state.animationRegenPending,
        queueIntervention,
        queuePreSessionIntervention,
        dismissCompanion,
        openChatFromCompanion,
        resetCompanionSession,
        setStudySession,
        setStudySessionFullscreen,
        clearQuizConfig,
        showDeckSelectorAction,
        hideDeckSelectorAction
      }}
    >
      {children}
    </AgentContext.Provider>
  )
}

export const usePet = () => {
  const context = useContext(AgentContext)
  if (!context) {
    throw new Error('usePet must be used within an AgentProvider')
  }
  return context
}

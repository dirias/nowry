/**
 * Agent Service
 * Handles all communication with the /agent backend endpoints.
 */
import { apiClient } from '../client'

export const agentService = {
  /**
   * Fetch the Study Buddy's current state for the logged-in user.
   * @returns {Promise<AgentState>}
   */
  getState: async () => {
    const { data } = await apiClient.get('/agent/me')
    return data
  },

  /**
   * Send a chat message to the Study Buddy.
   * @param {string} message - The user's message.
   * @param {Array<{role: string, content: string}>} history - Prior conversation turns.
   * @param {Object|null} context - Structured screen context (StudyCardContext, BookPageContext, etc.)
   * @param {string} language - BCP 47 language code (e.g. 'en', 'es', 'fr')
   * @returns {Promise<ChatResponse>}
   */
  chat: async (message, history = [], context = null, language = 'en') => {
    const { data } = await apiClient.post(
      '/agent/chat',
      {
        message,
        history,
        context,
        language
      },
      { timeout: 60000 } // Extended timeout for AI generation + tool calls
    )
    return data
  },

  /**
   * Fetch a proactive nudge message from the Study Buddy.
   * Only returns a nudge if the user has enabled proactive nudging
   * and knowledge access in their settings.
   * @returns {Promise<{nudge: string|null, has_nudge: boolean}>}
   */
  getNudge: async () => {
    const { data } = await apiClient.get('/agent/nudge')
    return data
  },

  /**
   * Update agent-specific preferences for the current user.
   * @param {{ agent_knowledge_access?: boolean, agent_proactive_nudging?: boolean }} prefs
   * @returns {Promise<void>}
   */
  updatePreferences: async (prefs) => {
    const { data } = await apiClient.put('/users/preferences/general', prefs)
    return data
  },

  /**
   * Trigger AI avatar generation for the current user's pet.
   * Plus/Pro only — backend enforces tier.
   * @param {'manual' | 'evolution'} trigger - How the generation was initiated.
   * @returns {{ avatar_url: string, avatar_stage: number, generated_at: string, generations_remaining: number }}
   */
  generateAvatar: async (trigger = 'manual') => {
    const { data } = await apiClient.post(
      '/agent/generate-avatar',
      { trigger },
      { timeout: 120000 } // Extended timeout: fal.ai FLUX Pro (30–60s) + Cloudinary upload
    )
    return data
  },

  /**
   * Post a proactive intervention event and receive a contextual companion message.
   * Called from StudySession when the user grades a card 'again' or a session ends.
   * @param {{ type: string, card_id?: string, [key: string]: any }} event - Intervention event payload.
   * @returns {Promise<{ type: string, message: string, card_id?: string }>}
   */
  postIntervention: async (event) => {
    const { data } = await apiClient.post('/agent/intervention', event, { timeout: 30000 })
    return data
  },

  /**
   * Trigger AI animation generation for the current user's pet.
   * Returns a looping video URL stored as animation_url.
   * @param {'manual' | 'evolution'} trigger - How the generation was initiated.
   * @returns {{ animation_url: string, avatar_stage: number }}
   */
  generateAnimation: async (trigger = 'manual') => {
    const { data } = await apiClient.post(
      '/agent/generate-animation',
      { trigger },
      { timeout: 360000 } // Extended timeout: Luma generation (1–5 min) + Cloudinary upload
    )
    return data
  },

  /**
   * Trigger AI personality generation for the current user's pet.
   * Plus users get 1/month, Pro users get 3/month. Backend enforces limit (402 when exceeded).
   * @param {string} styleHints - Optional style description from the user.
   * @param {string} petSpecies - The pet's species (e.g. 'owl', 'fox').
   * @returns {{ personality_text: string, generations_used: number, generations_limit: number, reset_date: string }}
   */
  generatePersonality: async (styleHints, petSpecies) => {
    const { data } = await apiClient.post('/agent/generate-personality', {
      style_hints: styleHints || '',
      pet_species: petSpecies || 'owl'
    })
    return data // { personality_text, generations_used, generations_limit, reset_date }
  },

  /**
   * Fire the pet's contextual first-reveal. Idempotent — safe to call more than
   * once; the backend just reports `already_revealed: true` after the first time.
   * @returns {Promise<{ pet_active: boolean, pet_revealed: boolean, already_revealed: boolean }>}
   */
  revealPet: async () => {
    const { data } = await apiClient.post('/agent/pet/reveal')
    return data
  },

  /**
   * Award XP for completing a study session.
   * @param {number} cardsReviewed - Cards graded this session. Backend accepts 1–500.
   * @param {string} deckId - The deck studied, or 'daily-review'.
   * @returns {Promise<{ xp_awarded: number, level_up: boolean, new_level: number, new_stage: number }>}
   */
  awardSessionXp: async (cardsReviewed, deckId) => {
    const { data } = await apiClient.post('/agent/xp/session', {
      cards_reviewed: cardsReviewed,
      deck_id: deckId
    })
    return data
  },

  /**
   * Award the once-per-day streak bonus. Idempotent — the backend records the
   * award date and returns `xp_awarded: 0` for any later call the same day, so
   * this is safe to fire on every completed session.
   * @returns {Promise<{ xp_awarded: number, level_up: boolean, new_level: number, new_stage: number }>}
   */
  awardStreakXp: async () => {
    const { data } = await apiClient.post('/agent/xp/streak')
    return data
  },

  /**
   * Fetch the pet's full evolution arc — every form it has been and will become.
   * `reached_at` is null for stages passed before evolution history was recorded,
   * so callers must render an undated stage rather than assume a date.
   * @returns {Promise<{ current_stage: number, current_level: number, current_xp: number,
   *   stages: Array<{ stage: number, level_required: number, xp_required: number,
   *   reached: boolean, reached_at: string|null, xp_remaining: number|null }> }>}
   */
  getJourney: async () => {
    const { data } = await apiClient.get('/agent/journey')
    return data
  }
}

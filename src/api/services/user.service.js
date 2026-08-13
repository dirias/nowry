import { apiClient } from '../client'

/**
 * User Service
 * Handles user profile, settings, and account management
 */
export const userService = {
  /**
   * Get current user's profile
   * @returns {Promise<Object>} User profile data
   */
  async getProfile() {
    const { data } = await apiClient.get('/users/profile')
    return data
  },

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @param {string} profileData.full_name - Full name
   * @param {string} profileData.bio - Bio
   * @returns {Promise<Object>} Updated profile
   */
  async updateProfile(profileData) {
    const { data } = await apiClient.put('/users/profile', profileData)
    return data
  },

  /**
   * Upload user avatar
   * @param {File} file - Image file to upload
   * @returns {Promise<Object>} Upload result with avatar URL
   */
  async uploadAvatar(file) {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await apiClient.post('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return data
  },

  /**
   * Patch user profile (partial update)
   * @param {Object} profileData
   * @param {string} [profileData.full_name]
   * @returns {Promise<Object>} Updated profile
   */
  async patchProfile(profileData) {
    const { data } = await apiClient.patch('/users/profile', profileData)
    return data
  },

  // changePassword has been removed — password changes are now handled
  // client-side via Firebase (EmailAuthProvider + updatePassword).

  /**
   * Update notification preferences
   * @param {Object} preferences
   * @param {boolean} preferences.email_digest
   * @param {boolean} preferences.study_reminders
   * @param {boolean} preferences.news_updates
   * @param {boolean} preferences.marketing
   * @returns {Promise<Object>}
   */
  async updateNotifications(preferences) {
    const { data } = await apiClient.put('/users/notifications', preferences)
    return data
  },

  /**
   * Get current user's general preferences
   * @returns {Promise<Object>} Current preferences including agent settings
   */
  async getGeneralPreferences() {
    const { data } = await apiClient.get('/users/preferences/general')
    return data
  },

  /**
   * Update general preferences (interests, theme, language)
   * @param {Object} preferences
   * @param {string[]} preferences.interests
   * @param {string} preferences.theme_color
   * @param {string} preferences.language
   * @returns {Promise<Object>}
   */
  async updateGeneralPreferences(preferences) {
    const { data } = await apiClient.put('/users/preferences/general', preferences)
    return data
  },

  /**
   * Complete onboarding wizard
   *
   * @deprecated Legacy wizard only. The redesigned onboarding never calls this:
   * activation is owned exclusively by the onboarding-context deck fork
   * (ADR-006), which is the only path that can prove a curated deck was copied.
   * @returns {Promise<Object>}
   */
  async completeWizard() {
    const { data } = await apiClient.post('/users/complete-wizard')
    return data
  },

  /**
   * Read the server-authoritative onboarding journey (ADR-003, FR-037/FR-038).
   *
   * `show_reentry` and `resume_screen` are *derived by the server* — the client
   * must never recompute them from `postponed_at` or a local clock, which is
   * the whole reason the 24-hour grace period is truthful. An activated user
   * receives `resume_screen: null`.
   *
   * @returns {Promise<{
   *   status: 'incomplete'|'activated',
   *   last_meaningful_point: 'welcome'|'personalization'|'first_deck',
   *   postponed_at: string|null,
   *   activated_at: string|null,
   *   updated_at: string,
   *   show_reentry: boolean,
   *   resume_screen: 'welcome'|'personalization'|'first_deck'|null
   * }>} Journey snapshot
   */
  async getOnboardingState() {
    const { data } = await apiClient.get('/users/onboarding')
    return data
  },

  /**
   * Record a meaningful journey point so the user can resume there.
   *
   * The route accepts exactly one action per call and only `personalization`
   * or `first_deck` are recordable — Welcome is the server default. Progress is
   * monotonic server-side, so replaying an earlier point never regresses the
   * resume screen. This action can never activate onboarding.
   *
   * @param {'personalization'|'first_deck'} point - Meaningful point reached
   * @returns {Promise<Object>} Refreshed journey snapshot
   */
  async recordOnboardingPoint(point) {
    const { data } = await apiClient.patch('/users/onboarding', {
      action: 'record_point',
      point
    })
    return data
  },

  /**
   * Postpone onboarding. The server writes `postponed_at` with its own UTC
   * clock and keeps any later meaningful point already recorded, so a user who
   * resumed further and then postponed still returns to that later screen.
   *
   * @returns {Promise<Object>} Refreshed journey snapshot
   */
  async postponeOnboarding() {
    const { data } = await apiClient.patch('/users/onboarding', { action: 'postpone' })
    return data
  },

  /**
   * Enable two-factor authentication
   * @returns {Promise<Object>} Backup codes
   */
  async enable2FA() {
    const { data } = await apiClient.post('/users/2fa/enable')
    return data
  },

  /**
   * Disable two-factor authentication
   * @returns {Promise<Object>}
   */
  async disable2FA() {
    const { data } = await apiClient.post('/users/2fa/disable')
    return data
  },

  /**
   * Delete user account
   * @returns {Promise<Object>}
   */
  async deleteAccount() {
    const { data } = await apiClient.delete('/users/account')
    return data
  },

  /**
   * Export all user data as a downloadable JSON file.
   * The server responds with Content-Disposition: attachment.
   * @returns {Promise<Blob>} JSON blob for download
   */
  async exportData() {
    const response = await apiClient.get('/users/export', {
      responseType: 'blob'
    })
    return response.data
  }
}

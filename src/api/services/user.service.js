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
   * Change user password
   * @param {Object} passwordData
   * @param {string} passwordData.current_password
   * @param {string} passwordData.new_password
   * @returns {Promise<Object>}
   */
  async changePassword(passwordData) {
    const { data } = await apiClient.put('/users/password', passwordData)
    return data
  },

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
   * @returns {Promise<Object>}
   */
  async completeWizard() {
    const { data } = await apiClient.post('/users/complete-wizard')
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
  }
}

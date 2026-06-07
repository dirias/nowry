import { apiClient } from '../client'
import { ENDPOINTS } from '../utils/endpoints'

/**
 * Goal AI Service
 * Handles Goal AI analysis API operations.
 * Backend: Nowry-API/app/routers/goal_ai.py (08-03-PLAN)
 * Pro-only endpoint — backend enforces 403 for non-Pro users.
 */
const goalAIService = {
  /**
   * POST /goal-ai/analyze
   * Pro-only. Returns GoalAnalysisResponse with suggestions, conflicts, archiving_recommendations.
   * @param {number|null} year - Optional year; defaults to current year on backend
   * @returns {Promise<{suggestions: [], conflicts: [], archiving_recommendations: []}>}
   */
  async analyzeGoals(year = null) {
    const payload = year ? { year } : {}
    const { data } = await apiClient.post(ENDPOINTS.goalAI.analyze, payload)
    return data
  }
}

export default goalAIService

import { apiClient } from '../client'

/**
 * Tasks Service
 * Handles task management operations
 */
export const tasksService = {
  /**
   * Get all tasks
   * @param {boolean} completed - Filter by completion status
   * @param {string} category - Filter by category
   */
  async getAll(completed = null, category = null) {
    const params = {}
    if (completed !== null) params.completed = completed
    if (category) params.category = category

    const { data } = await apiClient.get('/tasks/', { params })
    return data
  },

  /**
   * Create a new task
   */
  async create(taskData) {
    const { data } = await apiClient.post('/tasks/', taskData)
    return data
  },

  /**
   * Update an existing task
   */
  async update(id, updates) {
    const { data } = await apiClient.patch(`/tasks/${id}`, updates)
    return data
  },

  /**
   * Delete a task
   */
  async delete(id) {
    const { data } = await apiClient.delete(`/tasks/${id}`)
    return data
  },

  /**
   * Toggle task completion
   */
  async toggleComplete(id, isCompleted) {
    return this.update(id, { is_completed: !isCompleted })
  }
}

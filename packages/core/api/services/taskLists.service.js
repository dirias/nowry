import { apiClient } from '../client'

/**
 * Task lists (PLAN-021, PRD-items D13): a list is a name the learner keeps, and
 * a task's `category` holds its list's id. They used to live in one browser's
 * storage; `importLegacy` hands those over once and the server remaps the tasks.
 */
export const taskListsService = {
  async getAll() {
    const { data } = await apiClient.get('/task-lists/')
    return data
  },

  async create(name) {
    const { data } = await apiClient.post('/task-lists/', { name })
    return data
  },

  async rename(id, name) {
    const { data } = await apiClient.patch(`/task-lists/${id}`, { name })
    return data
  },

  async remove(id) {
    await apiClient.delete(`/task-lists/${id}`)
  },

  /** `lists`: `[{ legacy_id, name }]`. Answers every list the learner has after the import. */
  async importLegacy(lists) {
    const { data } = await apiClient.post('/task-lists/import', { lists })
    return data
  }
}

export default taskListsService

/**
 * Boards service (BOARD-002, ADR-047). Thin: every call returns the API's own
 * document; `domain/board/readers` turns it into the client's shape.
 *
 * The whole-document PUT is gone (it answers 410): a board is saved by
 * change through `patchBoard`, whose body `toApiChanges` builds.
 */
import { apiClient } from '../client'

/*
 * The board bar owns its save state ("Not saved · retrying") and the save
 * queue retries on its own, so a failed PATCH must not also raise the
 * client's global toast on every retry.
 */
const QUIET = { suppressErrorToast: true }

export const blackboardService = {
  async getBoard(boardId) {
    const { data } = await apiClient.get(`/blackboards/${boardId}`)
    return data
  },

  async listBoards() {
    const { data } = await apiClient.get('/blackboards')
    return data
  },

  async createBoard(name) {
    const { data } = await apiClient.post('/blackboards', { name })
    return data
  },

  /**
   * @param {string} boardId
   * @param {object} changes  the PATCH body: `{ rev, name?, viewport?, upsert_nodes?, delete_nodes?, upsert_links?, delete_links? }`
   * @returns {Promise<{ rev: number, updated_at: string }>}
   */
  async patchBoard(boardId, changes) {
    const { data } = await apiClient.patch(`/blackboards/${boardId}`, changes, QUIET)
    return data
  },

  /** A rename alone: a PATCH that carries only the name. */
  async renameBoard(boardId, name, rev) {
    const { data } = await apiClient.patch(`/blackboards/${boardId}`, { rev, name })
    return data
  },

  async duplicateBoard(boardId) {
    const { data } = await apiClient.post(`/blackboards/${boardId}/duplicate`)
    return data
  },

  /** Soft-deletes the board. */
  async deleteBoard(boardId) {
    const { data } = await apiClient.delete(`/blackboards/${boardId}`)
    return data
  },

  async inviteCollaborator(boardId, inviteeEmail) {
    const { data } = await apiClient.put(`/blackboards/${boardId}/invite`, {
      invitee_email: inviteeEmail
    })
    return data
  },

  async generateCards(boardId, { nodeIds, nodeTexts }) {
    const { data } = await apiClient.post(
      `/blackboards/${boardId}/generate-cards`,
      { node_ids: nodeIds, node_texts: nodeTexts },
      { timeout: 30000 }
    )
    return data
  }
}

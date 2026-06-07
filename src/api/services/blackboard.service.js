import { apiClient } from '../client'

export const blackboardService = {
  async getBoard(boardId) {
    const { data } = await apiClient.get(`/blackboards/${boardId}`)
    return data
  },

  async saveBoard(boardId, { nodes, edges, viewport, name }) {
    const { data } = await apiClient.put(`/blackboards/${boardId}`, {
      nodes,
      edges,
      viewport,
      ...(name !== undefined ? { name } : {})
    })
    return data
  },

  async clearBoard(boardId) {
    const { data } = await apiClient.delete(`/blackboards/${boardId}`)
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

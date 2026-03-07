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
  }
}

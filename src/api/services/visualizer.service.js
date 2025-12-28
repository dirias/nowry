import { apiClient } from '../client'

export const visualizerService = {
  generate: async (text, type = 'mindmap') => {
    const response = await apiClient.post('/visualizer/generate', {
      text,
      viz_type: type
    })
    return response.data
  }
}

import { apiClient } from '../client'
import { ENDPOINTS } from '../utils/endpoints'

/**
 * Illustration Magic service.
 * Returns { mermaid_code: string, explanation: string } from backend.
 */
export const illustrationsService = {
  generateDiagram: async (bookId, selectedText, diagramType = 'auto') => {
    const { data } = await apiClient.post(ENDPOINTS.books.diagram(bookId), {
      selected_text: selectedText,
      diagram_type: diagramType,
    })
    return data
  },
}

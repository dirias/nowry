import { apiClient } from '../client'
import { ENDPOINTS } from '../utils/endpoints'

/**
 * Illustration Magic service.
 * Returns { mermaid_code: string, explanation: string } from backend.
 */
export const illustrationsService = {
  generateDiagram: async (bookId, selectedText, diagramType = 'auto') => {
    const { data } = await apiClient.post(
      ENDPOINTS.books.diagram(bookId),
      {
        selected_text: selectedText,
        diagram_type: diagramType
      },
      { timeout: 120000 }
    )
    return data
  },

  /** Increment the per-book illustration counter when the user inserts a diagram.
   *  Returns true on success, throws with status 403 if Free-tier cap is reached. */
  confirmDiagram: async (bookId) => {
    await apiClient.post(ENDPOINTS.books.diagramConfirm(bookId))
    return true
  }
}

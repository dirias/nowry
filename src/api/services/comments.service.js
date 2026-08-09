import { apiClient } from '../client'
import { ENDPOINTS } from '../utils/endpoints'

/**
 * Comments Service
 * Handles all comment-annotation API operations.
 *
 * Deliberately resource-agnostic: `resourceType`/`resourceId` identify what the
 * comment is anchored to (e.g. 'book' + a book id) but this service has no
 * knowledge of books, decks, or any other Nowry-API/ concern.
 *
 * Contract (Nowry-API, /v1/comments):
 *   GET    /v1/comments?resource_type=&resource_id=  -> Comment[]  (scoped to current user server-side)
 *   POST   /v1/comments                               -> Comment   (201)
 *   PATCH  /v1/comments/{id}                          -> Comment
 *   DELETE /v1/comments/{id}                          -> 204
 */

/**
 * Normalise a comment from the wire shape into this codebase's shape.
 *
 * Nowry-API's `CommentResponse` (app/models/Comment.py) declares `id: str` with
 * no alias, so comments arrive as `{ id, ... }` with NO `_id` — unlike books,
 * decks and cards, which all expose `_id`. Every consumer here (useComments,
 * CommentAnchorPlugin, CommentMarginRail) keys off `_id`.
 *
 * Left unnormalised, `comment._id` is `undefined` for every server-fetched
 * comment, and the plugin's `rects[comment._id] = …` / `statuses[comment._id] = …`
 * maps collapse EVERY comment into one entry under the string key "undefined" —
 * so only the last comment's highlight is painted (looks like adding a note
 * deletes the previous one) and the rail can never match a position back to a
 * comment (so no bubbles are ever placed).
 *
 * Normalising once here, at the adapter boundary, is the single choke point:
 * `id` is preserved so nothing that reads it breaks.
 */
const withInternalId = (comment) =>
  comment && comment._id === undefined && comment.id !== undefined ? { ...comment, _id: comment.id } : comment

export const commentsService = {
  /**
   * List comments for a resource.
   * @param {string} resourceType - e.g. 'book'
   * @param {string} resourceId - the resource's id
   * @returns {Promise<Array>} Array of comments
   */
  async list(resourceType, resourceId) {
    const { data } = await apiClient.get(ENDPOINTS.comments.list, {
      params: { resource_type: resourceType, resource_id: resourceId }
    })
    return Array.isArray(data) ? data.map(withInternalId) : []
  },

  /**
   * Create a comment anchored to a text selection.
   * @param {string} resourceType - e.g. 'book'
   * @param {string} resourceId - the resource's id
   * @param {Object} anchor - { quote, prefix, suffix, start_offset, end_offset, block_index }
   * @param {string} body - Comment text
   * @returns {Promise<Object>} Created comment
   */
  async create(resourceType, resourceId, anchor, body) {
    const { data } = await apiClient.post(ENDPOINTS.comments.create, {
      resource_type: resourceType,
      resource_id: resourceId,
      anchor,
      body
    })
    return withInternalId(data)
  },

  /**
   * Update a comment's body and/or resolved state.
   * @param {string} id - Comment id
   * @param {Object} updates
   * @param {string} [updates.body]
   * @param {boolean} [updates.resolved]
   * @returns {Promise<Object>} Updated comment
   */
  async update(id, { body, resolved } = {}) {
    const payload = {}
    if (body !== undefined) payload.body = body
    if (resolved !== undefined) payload.resolved = resolved

    const { data } = await apiClient.patch(ENDPOINTS.comments.update(id), payload)
    return withInternalId(data)
  },

  /**
   * Delete a comment.
   * @param {string} id - Comment id
   * @returns {Promise<void>}
   */
  async remove(id) {
    const { data } = await apiClient.delete(ENDPOINTS.comments.delete(id))
    return data
  }
}

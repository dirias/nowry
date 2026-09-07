import { apiClient } from '../client'

/**
 * Image Service
 * Handles image upload and deletion
 */
export const imageService = {
  /**
   * Upload an image
   * @param {File} file - Image file to upload
   * @param {string} bookId - Optional book ID for organization
   * @param {Function} onProgress - Progress callback (percent: number) => void
   * @returns {Promise<Object>} { url, thumbnail_url, width, height, size, format }
   */
  async upload(file, bookId = null, onProgress = null) {
    const formData = new FormData()
    formData.append('file', file)
    if (bookId) formData.append('book_id', bookId)

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }

    // Add progress tracking if callback provided
    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(percentCompleted)
      }
    }

    const { data } = await apiClient.post('/image/upload', formData, config)
    return data
  },

  /**
   * Delete an image
   * @param {string} publicId - Cloudinary public_id (extracted from URL)
   * @returns {Promise<Object>} { message: string }
   */
  async delete(publicId) {
    const { data } = await apiClient.delete(`/image/delete/${encodeURIComponent(publicId)}`)
    return data
  },

  /**
   * Extract public_id from Cloudinary URL
   * @param {string} url - Full Cloudinary URL
   * @returns {string} public_id
   */
  extractPublicId(url) {
    // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567/nowry/user123/book456/image.jpg
    // Public ID: nowry/user123/book456/image
    const match = url.match(/\/v\d+\/(.+)\.\w+$/)
    return match ? match[1] : null
  }
}

/**
 * The rules the image upload applies before and after the network, kept pure
 * so they can be tested without an editor (docs/prd-editor-media.md FR-002).
 */

export const MAX_UPLOAD_MB = 8
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/** The compression the browser applies before the bytes leave it. */
export const COMPRESSION = { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true }

const MAX_WIDTH = 500
const MAX_HEIGHT = 400
const MAX_SQUARE = 300

/**
 * Why a file cannot be uploaded, as a translation key with its values, or
 * null when it can. The keys live under `books.editor.images`.
 */
export function refusalFor(file, bookId) {
  if (!bookId) return { key: 'notSaved' }
  if (!file) return { key: 'noFile' }
  if (!ALLOWED_TYPES.includes(file.type)) return { key: 'unsupported' }
  const sizeMb = file.size / 1024 / 1024
  if (sizeMb > MAX_UPLOAD_MB) return { key: 'tooLarge', values: { size: sizeMb.toFixed(2), limit: MAX_UPLOAD_MB } }
  return null
}

/**
 * The size an image is drawn at from its natural size: capped by width, then
 * by height, and a square-ish image is held to a smaller square so a photo
 * never takes the page.
 */
export function displaySize(naturalWidth, naturalHeight) {
  const ratio = naturalWidth / naturalHeight
  let width = naturalWidth
  let height = naturalHeight
  if (width > MAX_WIDTH) {
    width = MAX_WIDTH
    height = Math.round(width / ratio)
  }
  if (height > MAX_HEIGHT) {
    height = MAX_HEIGHT
    width = Math.round(height * ratio)
  }
  if (ratio >= 0.9 && ratio <= 1.1 && width > MAX_SQUARE) {
    width = MAX_SQUARE
    height = MAX_SQUARE
  }
  return { width, height }
}

/**
 * The key for an upload that the API refused, read from the response: the
 * plan's monthly limit (402), the size cap (413), not an image (415), and
 * everything else as a plain failure.
 */
export function failureKeyFor(error, sizeMb = 0) {
  const status = error?.response?.status
  const detail = error?.response?.data?.detail
  const code = typeof detail === 'object' && detail !== null ? detail.code : detail
  if (status === 402 || code === 'image_limit_reached') return { key: 'limitReached', limit: true }
  if (status === 413) return { key: 'tooLarge', values: { size: Number(sizeMb).toFixed(2), limit: MAX_UPLOAD_MB } }
  if (status === 415) return { key: 'unsupported' }
  return { key: 'failed' }
}

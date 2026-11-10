/**
 * Why a file was not imported, as a sentence the reader can act on (IMPORT-007).
 *
 * The API refuses an import with a stable code; the page itself refuses a file
 * whose type it does not take, before any request. Both land here, so the
 * library says the same thing whichever side said no — and names the file,
 * because a drop can hold several.
 */
import { limitRefusalKey, limitRefusalOptions, refusalCode } from '../limits'

/** The extensions the import reads. `.doc` is not one: it is the old binary Word format. */
export const IMPORT_EXTENSIONS = Object.freeze(['pdf', 'docx', 'txt'])

const KEY_BY_CODE = Object.freeze({
  import_unsupported_type: 'books.import.unsupportedType',
  import_legacy_doc: 'books.import.legacyDoc',
  import_empty: 'books.import.empty',
  import_password_protected: 'books.import.passwordProtected',
  import_unreadable: 'books.import.unreadable',
  import_too_large: 'books.import.tooLarge'
})

const extensionOf = (fileName) => {
  const name = String(fileName || '')
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

/**
 * The refusal for a file the page will not send: wrong type, or the old `.doc`.
 * @returns {{key: string, options: object}}
 */
export function rejectedFileRefusal(fileName) {
  const key = extensionOf(fileName) === 'doc' ? KEY_BY_CODE.import_legacy_doc : KEY_BY_CODE.import_unsupported_type
  return { key, options: { name: fileName } }
}

/**
 * The refusal for an import request that failed.
 * @param {object} error - the axios error
 * @param {string} fileName - the file the request carried
 * @returns {{key: string, options: object}}
 */
export function importRefusal(error, fileName) {
  const name = fileName
  // ADR-041: the word ceiling has its own sentence, shared with the editor.
  const limitKey = limitRefusalKey(error)
  if (limitKey) return { key: limitKey, options: { ...limitRefusalOptions(error), name } }

  const key = KEY_BY_CODE[refusalCode(error)]
  if (key) {
    const limit = error?.response?.data?.detail?.limit_mb
    return { key, options: typeof limit === 'number' ? { name, limit } : { name } }
  }
  // No answer at all is the connection's fault, not the file's.
  if (!error?.response) return { key: 'books.import.notReached', options: { name } }
  return { key: 'books.import.failed', options: { name } }
}

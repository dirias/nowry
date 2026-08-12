import { useCallback, useEffect, useRef, useState } from 'react'

import { booksService } from '../api/services'
import { focusFirstControl } from '../components/Common/Form/formUtils'
import useFormCore from './useFormCore'

/**
 * Book creation — Variant A′, the only surface where an empty required field
 * is a success state (BOOKS.md §2).
 *
 * There was no book-create form before this one. A click called
 * `booksService.create` with three hardcoded values and navigated away, which
 * is why this hook carries three data fixes rather than a refactor:
 *
 * - The title was `New book ${allBooks.length}` — derived from a *count*, so
 *   creating three books and deleting one made the next book "New book 2"
 *   again. There is no number here at all; a wrong number is worse than none.
 * - `isbn` was the Spanish string `'Sin ISBN'`, written to the database for
 *   every user in every locale. It travels as `null` now and is not collected:
 *   an ISBN belongs to a published work, not to a book being written.
 * - `author` fell back to the English word `'Unknown'`. A null is a truthful
 *   "unknown"; an English word stored as a value is not.
 *
 * The last two are fixed as **data**, never through `t()` — a translated value
 * in a database column is a worse bug than an untranslated one. Only the title
 * default is translated, because the user reads and renames it.
 *
 * `defaultTitle` arrives already resolved from the caller so this module keeps
 * the no-`t()` constraint every form hook holds (§5.3). It is the same key the
 * sheet hands the field as its placeholder, so what the user sees before
 * pressing Enter is exactly what gets saved.
 */

/** One chip. The rail reports what is on offer, and only the author is. */
const GROUPS = ['author']

const useBookCreate = ({ open, defaultTitle, username, onCreated }) => {
  const [limitReached, setLimitReached] = useState(false)

  const nodes = useRef({})
  const refCallbacks = useRef({})
  const defaults = useRef({})
  defaults.current = { defaultTitle, username }

  const refFor = useCallback((name) => {
    if (!refCallbacks.current[name]) {
      refCallbacks.current[name] = (node) => {
        nodes.current[name] = node
      }
    }
    return refCallbacks.current[name]
  }, [])

  // The author defaults to the signed-in user because a book you are writing
  // is usually your own. The chip exists for the transcription case.
  const initialValues = useCallback(() => ({ title: '', author: defaults.current.username || '' }), [])

  const buildPayload = useCallback(
    (values) => ({
      title: values.title.trim() || defaults.current.defaultTitle,
      author: values.author.trim() || null,
      isbn: null
    }),
    []
  )

  /** 403 is the plan's book limit, and it wants an Upgrade action, not a sentence. */
  const persist = useCallback(async (payload) => {
    setLimitReached(false)
    try {
      return await booksService.create(payload)
    } catch (error) {
      if (error?.response?.status === 403) setLimitReached(true)
      throw error
    }
  }, [])

  const core = useFormCore({
    open,
    entity: null,
    initialValues,
    groups: GROUPS,
    // Deliberately empty: the title defaults, so there is no invalid state to
    // reject and no "required" message that would be telling the truth (§4.1).
    requiredFields: [],
    buildPayload,
    persist
  })

  const { reveal: coreReveal, submit } = core

  useEffect(() => {
    if (!open) return
    setLimitReached(false)
  }, [open])

  const reveal = useCallback(
    (group) => {
      coreReveal(group)
      // Blocking, not a nicety: the chip unmounts the moment it is used, so
      // without this focus falls to <body>.
      setTimeout(() => focusFirstControl(nodes.current[group]), 0)
    },
    [coreReveal]
  )

  // A failed create keeps the sheet open with the typed title intact, which is
  // what makes the plan-limit regression survivable: the user upgrades, presses
  // Create again, and their title is still there (§4.3).
  const create = useCallback(() => submit(onCreated), [submit, onCreated])

  return { ...core, reveal, refFor, limitReached, create }
}

export default useBookCreate

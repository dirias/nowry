import { useCallback, useEffect, useRef } from 'react'

import { booksService } from '../api/services'
import { focusFirstControl, parseTagInput } from '../components/Common/Form/formUtils'
import useFormCore from './useFormCore'

/**
 * Book editing — Variant A (BOOKS.md §3).
 *
 * Edit-only. Creation is `useBookCreate`, and the two are deliberately not one
 * hook with an `isEdit` branch: they share exactly one field, and even that
 * differs — defaulted on create, enforced here. An empty title on create means
 * "I have not decided yet", and the default answers it. An empty title on edit
 * means the user deleted the name of a book that had one, which is a
 * destructive act on existing content; substituting "Untitled book" there would
 * overwrite their data with a placeholder.
 *
 * The defect this closes: `BookEditor.js:87` caught every save failure and only
 * `console.error`d it, so a book whose save failed looked exactly like one that
 * succeeded — the sheet simply closed. Errors reach `FormErrorBanner` now.
 */

/** Named for their payload. Cover colour and cover image share one group. */
const GROUPS = ['cover', 'tags', 'summary']

/**
 * S3: a group opens if it already holds content. A cover *colour* always has a
 * value, so it cannot be the predicate — only an image the user actually set
 * counts as content worth reopening.
 */
const HAS_CONTENT = {
  cover: (book) => Boolean(book?.cover_image),
  tags: (book) => Boolean(book?.tags?.length),
  summary: (book) => Boolean(book?.summary)
}

const useBookForm = ({ open, book, defaultCoverColor, onSaved, onClose }) => {
  const nodes = useRef({})
  const refCallbacks = useRef({})
  const tagInputRef = useRef(null)
  const fallbackColor = useRef(defaultCoverColor)
  fallbackColor.current = defaultCoverColor

  const refFor = useCallback((name) => {
    if (!refCallbacks.current[name]) {
      refCallbacks.current[name] = (node) => {
        nodes.current[name] = node
      }
    }
    return refCallbacks.current[name]
  }, [])

  const toFormState = useCallback(
    (entity) => ({
      title: entity.title || '',
      coverColor: entity.cover_color || fallbackColor.current,
      coverImage: entity.cover_image || '',
      summary: entity.summary || '',
      tags: entity.tags || []
    }),
    []
  )

  // A tag typed but never Entered is still a tag the user meant. Read straight
  // from the input, which `values` has not seen the commit for yet.
  const buildPayload = useCallback(
    (values) => ({
      title: values.title.trim(),
      coverColor: values.coverColor,
      coverImage: values.coverImage || null,
      summary: values.summary,
      tags: parseTagInput([...values.tags, tagInputRef.current?.pendingTag?.() || ''])
    }),
    []
  )

  const persist = useCallback((payload) => booksService.update(book._id, payload), [book?._id])

  const core = useFormCore({
    open,
    entity: book,
    // Also the *initial* state, not just the edit-mode one: without it the
    // first render hands the inputs `undefined` and React logs a controlled /
    // uncontrolled switch when the open effect fills them a tick later.
    initialValues: () => toFormState(book),
    toFormState,
    groups: GROUPS,
    hasContent: HAS_CONTENT,
    requiredFields: [{ field: 'title', errorKey: 'books.titleRequired' }],
    buildPayload,
    persist
  })

  const { reveal: coreReveal, errorAt, firstErrorField, submit } = core

  const focusGroup = useCallback((name) => focusFirstControl(nodes.current[name]), [])

  const reveal = useCallback(
    (group) => {
      coreReveal(group)
      // Blocking: the chip unmounts the moment it is used, so without this a
      // keyboard user is dropped onto <body> mid-form.
      setTimeout(() => focusGroup(group), 0)
    },
    [coreReveal, focusGroup]
  )

  // A rejected save moves focus to what it complained about. `errorAt` counts
  // rejections so a *second* Save re-focuses even though the flag is already up.
  useEffect(() => {
    if (!errorAt || !firstErrorField) return
    focusGroup(firstErrorField)
  }, [errorAt, firstErrorField, focusGroup])

  const save = useCallback(() => {
    tagInputRef.current?.commitPending()
    return submit(onSaved, onClose)
  }, [submit, onSaved, onClose])

  return { ...core, reveal, refFor, tagInputRef, save }
}

export default useBookForm

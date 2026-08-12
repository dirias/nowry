import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Button, Stack } from '@mui/joy'

import FormDisclosureRail from '../Common/Form/FormDisclosureRail'
import FormErrorBanner from '../Common/Form/FormErrorBanner'
import FormSheet from '../Common/Form/FormSheet'
import FormTextField from '../Common/Form/FormTextField'
import { focusRing } from '../Common/Form/formStyles'
import { useAuth } from '../../context/AuthContext'
import useBookCreate from '../../hooks/useBookCreate'

/**
 * Book creation — four elements at rest, and the fastest form in the system
 * (BOOKS.md §2.3).
 *
 * Creating a book used to be a single click, and the ruling that added a form
 * did not licence adding a toll gate in front of writing. So the title is
 * required *with a default*: submitting it empty is valid and produces a book
 * named `books.untitled`, and the field's placeholder is that same key — the
 * outcome is visible before the user acts.
 *
 * The fast path is therefore click → Enter, with no typing, and the naming path
 * is click → type → Enter, which is cheaper than today's rename-in-the-editor.
 * One keypress is the whole cost of the form.
 *
 * The one-chip rail is honest rather than thin. Padding it with cover, tags and
 * summary chips would move edit-time concerns into the creation moment, and a
 * summary of an empty book is not a thing that can be written (§2.5).
 */
const RAIL_LABELS = { author: 'books.setAuthor' }

const actionSx = { width: { xs: '100%', sm: 'auto' }, minHeight: 44, ...focusRing }

export default function BookCreateSheet({ open, onClose }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const onCreated = useCallback(
    (book) => {
      // Exactly as the old immediate-create path did: the book is handed
      // forward in router state so the editor does not refetch what it was
      // just given.
      navigate(`/book/${book._id}`, { state: { book } })
    },
    [navigate]
  )

  const form = useBookCreate({
    open,
    // One key, two call sites: the value saved when the field is blank and the
    // placeholder that announces it. They cannot drift.
    defaultTitle: t('books.untitled'),
    username: user?.username,
    onCreated
  })

  const banner = form.saveError ? (
    <FormErrorBanner
      titleKey='books.createFailed'
      detailText={form.limitReached ? t('subscription.errors.bookLimit') : form.saveError}
      action={form.limitReached ? { labelKey: 'subscription.upgrade', onClick: () => navigate('/profile') } : null}
    />
  ) : null

  /**
   * The §5.9 exception, scoped to this one input: three conditions hold here
   * and nowhere else. One field at rest, so nothing is waiting to be filled;
   * that field has a safe default, so Enter can never produce an invalid
   * object; and the object is immediately editable on the very next screen, so
   * nothing is destroyed by submitting early.
   *
   * An explicit onKeyDown, not a restored <form> — which is why the revealed
   * author field below does not inherit it.
   */
  const submitOnEnter = (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    form.create()
  }

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      titleKey='books.createTitle'
      width='simple'
      banner={banner}
      footer={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='flex-end'>
          {/* Cancel stays enabled while saving so a stuck request is escapable. */}
          <Button variant='plain' color='neutral' onClick={onClose} sx={actionSx}>
            {t('common.cancel')}
          </Button>
          {/* "Create & write", not "Create": a button that changes screens says so. */}
          <Button variant='solid' loading={form.saving} onClick={form.create} sx={actionSx}>
            {t('books.createAction')}
          </Button>
        </Stack>
      }
    >
      <Stack spacing={2.5}>
        <FormTextField
          labelKey='books.titleLabel'
          placeholderKey='books.untitled'
          value={form.values.title}
          onChange={(value) => form.setField('title', value)}
          onKeyDown={submitOnEnter}
          required
          // Declarative, not a post-mount .focus(): Joy's Drawer and Modal run a
          // focus trap on open that re-claims focus from a scheduled call. It is
          // also what makes the keyboard path open → Enter.
          autoFocus
          inputRef={form.refFor('title')}
        />

        {form.revealed.has('author') && (
          <Box ref={form.refFor('author')}>
            <FormTextField
              labelKey='books.authorLabel'
              placeholderKey='books.authorPlaceholder'
              value={form.values.author}
              onChange={(value) => form.setField('author', value)}
            />
          </Box>
        )}

        <FormDisclosureRail available={form.availableChips} labels={RAIL_LABELS} onReveal={form.reveal} />
      </Stack>
    </FormSheet>
  )
}

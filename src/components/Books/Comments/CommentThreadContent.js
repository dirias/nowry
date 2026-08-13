import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Typography, Textarea, Stack, Button, IconButton, Alert, Divider } from '@mui/joy'
import { Pencil, X } from 'lucide-react'

const focusRingSx = {
  '&:focus-visible': {
    outline: '2px solid',
    outlineOffset: '2px',
    outlineColor: 'primary.outlinedBorder'
  }
}

function classifyError(err) {
  const status = err?.response?.status
  if (status === 403) return 'notAuthor'
  if (status === 404) return 'notFound'
  if (status === 400 || status === 422) return 'invalidBody'
  return 'generic'
}

/**
 * CommentThreadContent — the read/edit/delete body of a comment thread, with
 * no opinion about how it's positioned on screen. Shared by CommentCard
 * (inline inside the desktop margin-rail card, Google-Docs style) and
 * CommentMobileDrawer (inline list item), so read/edit/delete +
 * failure-classification logic lives in exactly one place.
 *
 * This module used to also export a floating `CommentThreadPopover`. The
 * margin rail now edits inline within the card instead — see CommentCard —
 * so the popover has been retired and the file renamed to match what it
 * actually is.
 *
 * `initialMode` / `initialConfirmingDelete` let a caller mount this straight
 * into edit or delete-confirm (the rail's per-card pencil / trash actions do
 * exactly that). They are initial state only: the component owns the
 * transitions from there on, so no caller can desync them.
 */
export function CommentThreadContent({
  comment,
  isOrphaned = false,
  onClose,
  onSave,
  onDelete,
  showCloseButton = true,
  showHeader = true,
  initialMode = 'read',
  initialConfirmingDelete = false
}) {
  const { t } = useTranslation()
  const [mode, setMode] = useState(isOrphaned ? 'read' : initialMode) // 'read' | 'edit'
  const [value, setValue] = useState(comment?.body || '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(initialConfirmingDelete)
  const [errorKey, setErrorKey] = useState(null)

  const errorMessages = {
    notAuthor: t('comments.errors.notAuthor'),
    notFound: t('comments.errors.notFound'),
    invalidBody: t('comments.errors.invalidBody'),
    generic: t('comments.errors.generic')
  }

  const handleSave = async () => {
    const trimmed = value.trim()
    if (!trimmed || saving) return
    setSaving(true)
    setErrorKey(null)
    try {
      await onSave(trimmed)
      setMode('read')
    } catch (err) {
      setErrorKey(classifyError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    setDeleting(true)
    setErrorKey(null)
    try {
      await onDelete()
    } catch (err) {
      setErrorKey(classifyError(err))
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  return (
    <>
      {showHeader && (
        <>
          <Stack direction='row' alignItems='flex-start' justifyContent='space-between' sx={{ p: 1.5, pb: 1 }}>
            <Typography level='title-sm' sx={{ flex: 1, pr: 1 }}>
              {isOrphaned ? t('comments.orphanedTitle') : t('comments.threadTitle')}
            </Typography>
            <Stack direction='row' spacing={0.5}>
              {!isOrphaned && mode === 'read' && (
                <IconButton
                  size='sm'
                  variant='plain'
                  color='neutral'
                  aria-label={t('comments.editAriaLabel')}
                  onClick={() => {
                    setValue(comment?.body || '')
                    setMode('edit')
                  }}
                  sx={focusRingSx}
                >
                  <Pencil size={14} />
                </IconButton>
              )}
              {showCloseButton && (
                <IconButton size='sm' variant='plain' color='neutral' aria-label={t('common.close')} onClick={onClose} sx={focusRingSx}>
                  <X size={14} />
                </IconButton>
              )}
            </Stack>
          </Stack>

          <Divider />
        </>
      )}

      <Stack sx={{ p: 1.5 }} spacing={1}>
        {isOrphaned && (
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            {t('comments.orphanedExplain')}
          </Typography>
        )}

        {mode === 'edit' ? (
          <Textarea
            autoFocus
            minRows={2}
            maxRows={6}
            aria-label={t('comments.composerTextareaAriaLabel')}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            sx={focusRingSx}
          />
        ) : (
          <Typography level='body-sm' sx={{ whiteSpace: 'pre-wrap', color: 'text.primary' }}>
            {comment?.body}
          </Typography>
        )}

        {errorKey && (
          <Alert color='danger' variant='soft'>
            {errorMessages[errorKey]}
          </Alert>
        )}

        {confirmingDelete ? (
          <Stack spacing={1}>
            <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
              {t('comments.deleteConfirm')}
            </Typography>
            <Stack direction='row' spacing={1} justifyContent='flex-end'>
              <Button
                size='sm'
                variant='plain'
                color='neutral'
                onClick={() => {
                  setConfirmingDelete(false)
                  // Opened straight into the confirm step (the card's trash
                  // action) — backing out should close the whole thing rather
                  // than stranding the user in an edit view they never asked for.
                  if (initialConfirmingDelete) onClose?.()
                }}
                sx={focusRingSx}
              >
                {t('common.cancel')}
              </Button>
              <Button size='sm' variant='solid' color='danger' onClick={handleConfirmDelete} loading={deleting} sx={focusRingSx}>
                {t('comments.deleteConfirmAction')}
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack direction='row' spacing={1} justifyContent='flex-end'>
            <Button
              size='sm'
              variant='plain'
              color='neutral'
              // Cancelling an edit that this component was *mounted* into
              // (the rail card's pencil action) has no read view to fall back
              // to inside the card — it closes. Cancelling an edit entered
              // from the read view falls back to that read view.
              onClick={() => (mode === 'edit' && initialMode !== 'edit' ? setMode('read') : onClose?.())}
              sx={focusRingSx}
            >
              {mode === 'edit' ? t('common.cancel') : t('common.close')}
            </Button>
            <Button size='sm' variant='soft' color='danger' onClick={() => setConfirmingDelete(true)} sx={focusRingSx}>
              {t('common.delete')}
            </Button>
            {!isOrphaned && mode === 'edit' && (
              <Button
                size='sm'
                variant='solid'
                color='primary'
                onClick={handleSave}
                loading={saving}
                disabled={!value.trim()}
                sx={focusRingSx}
              >
                {t('common.save')}
              </Button>
            )}
          </Stack>
        )}
      </Stack>
    </>
  )
}

export default CommentThreadContent

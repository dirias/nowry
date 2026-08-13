import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet, Textarea, Stack, Button, Alert } from '@mui/joy'

const focusRingSx = {
  '&:focus-visible': {
    outline: '2px solid',
    outlineOffset: '2px',
    outlineColor: 'primary.outlinedBorder'
  }
}

/**
 * CommentComposer — the "new note" draft box, anchored to the same
 * selection-position state FloatingToolbarPlugin/CommentAnchorPlugin already
 * compute (see CommentAnchorPlugin.openComposerForSelection).
 *
 * Resource-agnostic: it only knows how to collect a body string and hand it
 * to `onSave`. On failure it shows an inline Alert and keeps the draft — never
 * silently discards what the user typed.
 */
export default function CommentComposer({ position, onSave, onCancel }) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const sheetRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sheetRef.current && !sheetRef.current.contains(event.target)) {
        onCancel?.()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    const trimmed = value.trim()
    if (!trimmed || saving) return
    setSaving(true)
    setError(null)
    try {
      await onSave(trimmed)
      // Success — the parent (CommentAnchorPlugin) unmounts this composer.
    } catch (err) {
      setError(t('comments.errors.generic'))
      setSaving(false)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel?.()
    } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      handleSave()
    }
  }

  return (
    <Sheet
      ref={sheetRef}
      variant='outlined'
      role='dialog'
      aria-label={t('comments.composerAriaLabel')}
      onKeyDown={handleKeyDown}
      sx={{
        position: 'fixed',
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        zIndex: 9999,
        width: 300,
        p: 1.5,
        borderRadius: 'md',
        boxShadow: 'md',
        bgcolor: 'background.surface',
        borderColor: 'divider'
      }}
    >
      <Textarea
        autoFocus
        minRows={2}
        maxRows={6}
        placeholder={t('comments.composerPlaceholder')}
        aria-label={t('comments.composerTextareaAriaLabel')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        sx={{ ...focusRingSx }}
      />

      {error && (
        <Alert color='danger' variant='soft' sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}

      <Stack direction='row' spacing={1} justifyContent='flex-end' sx={{ mt: 1.5 }}>
        <Button size='sm' variant='plain' color='neutral' onClick={onCancel} sx={focusRingSx}>
          {t('common.cancel')}
        </Button>
        <Button size='sm' variant='solid' color='primary' onClick={handleSave} loading={saving} disabled={!value.trim()} sx={focusRingSx}>
          {t('common.save')}
        </Button>
      </Stack>
    </Sheet>
  )
}

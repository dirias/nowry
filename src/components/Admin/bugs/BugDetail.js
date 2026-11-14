import React, { forwardRef, useState } from 'react'
import { Alert, Box, Button, FormControl, FormLabel, Modal, ModalClose, ModalDialog, Sheet, Stack, Textarea, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@nowry/core/context/AuthContext'
import { BUG_STATUSES, REPORT_LIMITS, notesOldestFirst } from '@nowry/core/domain/bugReports'
import { focusRing, formLabel, segment, segmentedGroup } from '../../Common/Form/formStyles'
import { bugCaption, noteHead, saveColor, saveText } from './bugText'

const prose = { color: 'text.secondary', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }

/** The screenshots as thumbnails; one opens at full size in a dialog. */
const Screenshots = ({ shots }) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(null)
  if (!shots?.length) return null
  return (
    <>
      <Stack direction='row' gap={1} flexWrap='wrap' role='group' aria-label={t('admin.bugs.item.screenshots')}>
        {shots.map((shot, index) => (
          <Box
            key={`${shot.filename}-${index}`}
            component='button'
            type='button'
            onClick={() => setOpen(index)}
            aria-label={t('admin.bugs.item.openScreenshot', { number: index + 1 })}
            sx={{
              p: 0,
              width: 64,
              height: 44,
              borderRadius: 'sm',
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.level1',
              cursor: 'zoom-in',
              ...focusRing
            }}
          >
            <Box component='img' src={shot.data} alt='' sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </Box>
        ))}
      </Stack>
      <Modal open={open !== null} onClose={() => setOpen(null)}>
        <ModalDialog layout='center' sx={{ p: 1.5, pt: 5, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100dvh - 32px)' }}>
          <ModalClose aria-label={t('admin.bugs.item.closeScreenshot')} sx={focusRing} />
          {open !== null && (
            <Box
              component='img'
              src={shots[open]?.data}
              alt={t('admin.bugs.item.screenshot', { number: open + 1 })}
              sx={{ maxWidth: '100%', maxHeight: 'calc(100dvh - 120px)', objectFit: 'contain', display: 'block', mx: 'auto' }}
            />
          )}
        </ModalDialog>
      </Modal>
    </>
  )
}

/** "Status" as one segmented control (BUTTONS.md §5, board C). */
const StatusControl = ({ value, onChange }) => {
  const { t } = useTranslation()
  return (
    <FormControl>
      <FormLabel id='bug-status-label' sx={formLabel}>
        {t('admin.bugs.item.status')}
      </FormLabel>
      <Sheet
        variant='outlined'
        role='group'
        aria-labelledby='bug-status-label'
        sx={{
          ...segmentedGroup,
          // At phone width the four sit two by two, so no state is cut off in any language.
          display: { xs: 'grid', sm: 'flex' },
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))' },
          width: { xs: '100%', sm: 'fit-content' },
          maxWidth: '100%'
        }}
      >
        {BUG_STATUSES.map((status, index) => (
          <Button
            key={status}
            variant='plain'
            color='neutral'
            aria-pressed={value === status}
            onClick={() => onChange(status)}
            sx={{
              ...segment(value === status, index === 0),
              flex: 'none',
              minWidth: 0,
              borderLeft: { xs: index % 2 ? '1px solid' : 0, sm: index ? '1px solid' : 0 },
              borderTop: { xs: index >= 2 ? '1px solid' : 0, sm: 0 },
              borderColor: 'divider'
            }}
          >
            {t(`admin.bugs.states.${status}`)}
          </Button>
        ))}
      </Sheet>
    </FormControl>
  )
}

/** The notes, oldest first: "You · yesterday" and the text. */
const Notes = ({ bug }) => {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const notes = notesOldestFirst(bug)
  if (notes.length === 0) return null
  return (
    <Stack component='ul' gap={1} aria-label={t('admin.bugs.item.notes')} sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {notes.map((note, index) => {
        const head = noteHead(t, note, user, i18n?.language)
        return (
          <Box component='li' key={`${note.at}-${index}`} sx={{ bgcolor: 'background.level1', borderRadius: 'md', px: 1.25, py: 1 }}>
            {head && (
              <Typography level='body-xs' sx={{ fontWeight: 'lg', color: 'text.primary' }}>
                {head}
              </Typography>
            )}
            <Typography level='body-sm' sx={prose}>
              {note.text}
            </Typography>
          </Box>
        )
      })}
    </Stack>
  )
}

/**
 * The selected report's card (board C): the caption, the title, what happened,
 * the steps, the screenshots, Status, the notes and "Add a note", and one
 * primary Save that is never disabled — an empty save says "Nothing to save yet".
 */
const BugDetail = forwardRef(function BugDetail({ bug, busy, outcome, onSave }, ref) {
  const { t, i18n } = useTranslation()
  const [status, setStatus] = useState(bug.status)
  const [note, setNote] = useState('')
  const save = async () => {
    if (await onSave(bug, { status, note })) setNote('')
  }
  return (
    <Sheet
      ref={ref}
      tabIndex={-1}
      variant='outlined'
      role='region'
      aria-label={t('admin.bugs.item.label')}
      sx={{
        bgcolor: 'background.surface',
        borderRadius: 'lg',
        p: { xs: 1.75, sm: 2 },
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        minWidth: 0,
        scrollMarginTop: 16,
        outline: 'none'
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography level='body-xs' sx={{ color: 'text.tertiary', overflowWrap: 'anywhere' }}>
          {bugCaption(t, bug, i18n?.language)}
        </Typography>
        <Typography component='h2' level='title-lg' sx={{ mt: 0.25, overflowWrap: 'anywhere' }}>
          {bug.title}
        </Typography>
      </Box>
      {bug.description && (
        <Typography level='body-sm' sx={prose}>
          {bug.description}
        </Typography>
      )}
      {bug.steps_to_reproduce && (
        <Box>
          <Typography level='body-xs' sx={{ color: 'text.tertiary', fontWeight: 'lg' }}>
            {t('admin.bugs.item.steps')}
          </Typography>
          <Typography level='body-sm' sx={prose}>
            {bug.steps_to_reproduce}
          </Typography>
        </Box>
      )}
      <Screenshots shots={bug.screenshots} />
      <StatusControl value={status} onChange={setStatus} />
      <Notes bug={bug} />
      <FormControl>
        <FormLabel sx={formLabel}>{t('admin.bugs.item.addNote')}</FormLabel>
        <Textarea
          minRows={2}
          maxRows={6}
          value={note}
          placeholder={t('admin.bugs.item.notePlaceholder')}
          onChange={(event) => setNote(event.target.value.slice(0, REPORT_LIMITS.text))}
        />
      </FormControl>
      <Box role='status' aria-live='polite'>
        {outcome && (
          <Alert variant='soft' color={saveColor(outcome)} data-testid='bug-save-result'>
            {saveText(t, outcome)}
          </Alert>
        )}
      </Box>
      <Stack direction='row' justifyContent='flex-end'>
        <Button loading={busy} onClick={save} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          {t('admin.bugs.item.save')}
        </Button>
      </Stack>
    </Sheet>
  )
})

export default BugDetail

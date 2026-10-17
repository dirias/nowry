import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, Divider, IconButton, Input, Stack, Typography } from '@mui/joy'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import FormSheet from '../../Common/Form/FormSheet'
import DeleteConfirmationModal from '../../Common/DeleteConfirmationModal'
import { focusRing, listRow } from '../../Common/Form/formStyles'

/**
 * The learner's lists (PLAN-021, PRD-items D13): add one, rename one in place,
 * delete one behind a confirmation. Deleting a list never deletes a task; its
 * tasks go back to General. Opened from the capture row's list menu.
 */
const ListRow = ({ list, onRename, onDelete, t }) => {
  const [name, setName] = React.useState(list.name)
  React.useEffect(() => setName(list.name), [list.name])

  const commit = () => {
    const next = name.trim()
    if (!next || next === list.name) return setName(list.name)
    onRename(list.id, next).catch(() => setName(list.name))
  }

  return (
    <Box sx={{ ...listRow, gap: 1 }}>
      <Input
        variant='plain'
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        slotProps={{ input: { 'aria-label': t('tasks.lists.renameAria', { name: list.name }), maxLength: 60 } }}
        sx={{ flex: 1, bgcolor: 'transparent', '--Input-focusedHighlight': 'var(--joy-palette-focusVisible)' }}
      />
      <IconButton
        size='sm'
        variant='plain'
        color='neutral'
        aria-label={t('tasks.lists.deleteAria', { name: list.name })}
        onClick={() => onDelete(list)}
        sx={focusRing}
      >
        <DeleteOutlineRoundedIcon />
      </IconButton>
    </Box>
  )
}

const TaskListsDialog = ({ open, onClose, lists, onCreate, onRename, onRemove, autoFocusNew = false }) => {
  const { t } = useTranslation()
  const [draft, setDraft] = React.useState('')
  const [error, setError] = React.useState(null)
  const [confirm, setConfirm] = React.useState(null)

  React.useEffect(() => {
    if (open) {
      setDraft('')
      setError(null)
    }
  }, [open])

  const add = async () => {
    const name = draft.trim()
    if (!name) return
    setError(null)
    try {
      await onCreate(name)
      setDraft('')
    } catch (err) {
      setError(err?.response?.status === 409 ? t('tasks.lists.exists') : t('tasks.lists.saveError'))
    }
  }

  const remove = async () => {
    const list = confirm
    setConfirm(null)
    try {
      await onRemove(list.id)
    } catch {
      setError(t('tasks.lists.saveError'))
    }
  }

  return (
    <FormSheet open={open} onClose={onClose} titleKey='tasks.lists.dialogTitle' width='simple'>
      <Stack spacing={1}>
        <Stack direction='row' spacing={1} alignItems='center'>
          <Input
            autoFocus={autoFocusNew}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder={t('tasks.lists.listPlaceholder')}
            slotProps={{ input: { 'aria-label': t('tasks.lists.addList'), maxLength: 60 } }}
            sx={{ flex: 1 }}
          />
          <Button variant='outlined' color='neutral' onClick={add} disabled={!draft.trim()} sx={focusRing}>
            {t('common.add')}
          </Button>
        </Stack>
        {error ? (
          <Typography level='body-sm' role='alert' sx={{ color: 'danger.plainColor' }}>
            {error}
          </Typography>
        ) : null}
        {lists.length === 0 ? (
          <Typography level='body-sm' sx={{ color: 'text.tertiary', py: 1 }}>
            {t('tasks.lists.none')}
          </Typography>
        ) : (
          <Box>
            {lists.map((list, index) => (
              <React.Fragment key={list.id}>
                {index > 0 && <Divider />}
                <ListRow list={list} onRename={onRename} onDelete={setConfirm} t={t} />
              </React.Fragment>
            ))}
          </Box>
        )}
      </Stack>
      <DeleteConfirmationModal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        title={t('tasks.lists.deleteTitle', { name: confirm?.name ?? '' })}
        description={t('tasks.lists.deleteBody', { general: t('tasks.lists.general') })}
        confirmText={t('items.sheet.delete')}
      />
    </FormSheet>
  )
}

export default TaskListsDialog

import * as React from 'react'
import { IconButton, Snackbar, Tooltip } from '@mui/joy'
import { BugReportRounded } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@nowry/core/context/AuthContext'
import BugReportModal from '../Bugs/BugReportModal'
import { bugsService } from '@nowry/core/api/services/bugs.service'

/**
 * Floating admin-only bug report button — fixed bottom-left.
 * Renders nothing for anyone but an admin.
 */
const DevBugReportButton = () => {
  const { isAdmin } = useAuth()
  const { t } = useTranslation()

  const [bugReportOpen, setBugReportOpen] = React.useState(false)
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', color: 'success' })

  // ADMIN-004b: `role` is retired; admins keep this until batch 4 removes it.
  if (!isAdmin) return null

  const handleBugSubmit = async (bugData) => {
    const response = await bugsService.submitBug(bugData)
    setSnackbar({ open: true, message: response.message || t('footer.bugReport'), color: 'success' })
    setBugReportOpen(false)
  }

  return (
    <>
      <Tooltip title={t('footer.bugReport')} placement='top'>
        <IconButton
          variant='soft'
          size='sm'
          onClick={() => setBugReportOpen(true)}
          aria-label={t('footer.bugReport')}
          sx={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            zIndex: 1200,
            opacity: 0.7,
            '&:hover': { opacity: 1 },
            '&:focus-visible': { outline: '2px solid', outlineColor: 'var(--joy-palette-focusVisible)', outlineOffset: '2px' }
          }}
        >
          <BugReportRounded />
        </IconButton>
      </Tooltip>

      <BugReportModal open={bugReportOpen} onClose={() => setBugReportOpen(false)} onSubmit={handleBugSubmit} />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        color={snackbar.color}
        variant='soft'
      >
        {snackbar.message}
      </Snackbar>
    </>
  )
}

export default DevBugReportButton

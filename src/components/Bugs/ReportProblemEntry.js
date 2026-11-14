import React from 'react'
import { ListDivider, ListItem, ListItemButton, ListItemDecorator, MenuItem, Typography } from '@mui/joy'
import { FeedbackRounded } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@nowry/core/context/AuthContext'
import { useBeta } from '@nowry/core/context/BetaContext'
import { canReport } from '@nowry/core/domain/bugReports'

/** Whether this account can report a problem (BUG-001, FR-007): signed in, while the beta is on. */
export const useCanReport = () => {
  const { user } = useAuth()
  const { config } = useBeta()
  return canReport(user, config)
}

/**
 * "Report a problem" in the account menu (board F), opening a group with Admin
 * between Pomodoro and Log out. Nothing outside the beta.
 */
export function ReportMenuEntry({ onOpen }) {
  const { t } = useTranslation()
  if (!useCanReport()) return null
  return (
    <>
      <ListDivider sx={{ my: 0.5 }} />
      <MenuItem onClick={onOpen} aria-label={t('report.menu')} sx={{ gap: 1.5 }}>
        <ListItemDecorator sx={{ minWidth: 'unset' }}>
          <FeedbackRounded sx={{ fontSize: 'lg' }} />
        </ListItemDecorator>
        <Typography level='body-sm'>{t('report.menu')}</Typography>
      </MenuItem>
    </>
  )
}

/** The same entry in the phone-width drawer. */
export function ReportDrawerEntry({ onOpen }) {
  const { t } = useTranslation()
  if (!useCanReport()) return null
  return (
    <>
      <ListDivider sx={{ my: 1 }} />
      <ListItem>
        <ListItemButton onClick={onOpen} aria-label={t('report.menu')}>
          <ListItemDecorator>
            <FeedbackRounded />
          </ListItemDecorator>
          {t('report.menu')}
        </ListItemButton>
      </ListItem>
    </>
  )
}

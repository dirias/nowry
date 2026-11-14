import React from 'react'
import { Link } from 'react-router-dom'
import { ListDivider, ListItem, ListItemButton, ListItemDecorator, MenuItem, Typography } from '@mui/joy'
import AdminPanelSettingsRounded from '@mui/icons-material/AdminPanelSettingsRounded'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@nowry/core/context/AuthContext'

/**
 * "Admin" in the account menu, in its own group between Pomodoro and Log out
 * (ADMIN-007a, FR-011, board F). Admins only; everyone else sees nothing.
 */
export function AdminMenuEntry() {
  const { isAdmin } = useAuth()
  const { t } = useTranslation()
  if (!isAdmin) return null
  return (
    <>
      <ListDivider sx={{ my: 0.5 }} />
      <MenuItem component={Link} to='/admin' aria-label={t('admin.menu')} sx={{ gap: 1.5 }}>
        <ListItemDecorator sx={{ minWidth: 'unset' }}>
          <AdminPanelSettingsRounded sx={{ fontSize: 'lg' }} />
        </ListItemDecorator>
        <Typography level='body-sm'>{t('admin.menu')}</Typography>
      </MenuItem>
    </>
  )
}

/** The same entry in the phone-width drawer. */
export function AdminDrawerEntry({ onNavigate, selected }) {
  const { isAdmin } = useAuth()
  const { t } = useTranslation()
  if (!isAdmin) return null
  return (
    <>
      <ListDivider sx={{ my: 1 }} />
      <ListItem>
        <ListItemButton component={Link} to='/admin' onClick={onNavigate} selected={selected} aria-label={t('admin.menu')}>
          <ListItemDecorator>
            <AdminPanelSettingsRounded />
          </ListItemDecorator>
          {t('admin.menu')}
        </ListItemButton>
      </ListItem>
    </>
  )
}

import React from 'react'
import { Navigate } from 'react-router-dom'
import { Box, Skeleton } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@nowry/core/context/AuthContext'

/**
 * The admin area's door (ADMIN-007a, FR-011, ADR-086). Only an account whose
 * `/users/me` says `is_admin` gets in; anyone else, signed in or not, is sent
 * Home without a message. The API answers every admin call with 403 on its
 * own; this only decides what the web draws.
 */
export default function AdminRoute({ children }) {
  const { loading, isAdmin } = useAuth()
  const { t } = useTranslation()

  if (loading) {
    return (
      <Box
        data-testid='admin-route-loading'
        aria-busy='true'
        aria-label={t('admin.loading')}
        sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, py: 4, display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <Skeleton variant='text' level='h2' sx={{ width: 160 }} />
        <Skeleton variant='rectangular' sx={{ height: 36, borderRadius: 'md' }} />
      </Box>
    )
  }
  if (!isAdmin) return <Navigate to='/' replace />
  return children
}

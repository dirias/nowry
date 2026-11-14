import React from 'react'
import { Outlet } from 'react-router-dom'
import { Box, Chip, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import AdminTabs from './AdminTabs'

/**
 * `/admin` (ADMIN-007a, FR-011, board A): the title, the reminder that only an
 * admin sees it, the tab bar, and the open tab below. Behind `AdminRoute`.
 */
export default function AdminPage() {
  const { t } = useTranslation()
  return (
    <Box
      component='main'
      sx={{
        maxWidth: 1200,
        mx: 'auto',
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 4 },
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
        minWidth: 0
      }}
    >
      <Stack direction='row' alignItems='center' gap={1.5} flexWrap='wrap'>
        <Typography component='h1' level='h2'>
          {t('admin.title')}
        </Typography>
        <Chip size='sm' variant='soft' color='neutral'>
          {t('admin.onlyYou')}
        </Chip>
      </Stack>
      <AdminTabs />
      <Outlet />
    </Box>
  )
}

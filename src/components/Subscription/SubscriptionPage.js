// Placeholder — full implementation in plan 03-08
import React from 'react'
import { Box, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'

const SubscriptionPage = () => {
  const { t } = useTranslation()
  return (
    <Box sx={{ p: 4 }}>
      <Typography level='h2'>{t('subscription.title')}</Typography>
    </Box>
  )
}

export default SubscriptionPage

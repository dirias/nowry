// Placeholder — full implementation in plan 03-07
import React from 'react'
import { Box, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'

const PlansPage = () => {
  const { t } = useTranslation()
  return (
    <Box sx={{ p: 4 }}>
      <Typography level='h2'>{t('plans.title')}</Typography>
    </Box>
  )
}

export default PlansPage

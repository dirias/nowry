import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Button, Stack, Typography } from '@mui/joy'

/**
 * What stands where prices were while `SHOW_PRICING` is off (ADR-073): one
 * sentence and one key to the early-access sign-up. The landing renders it as
 * its `#pricing` section (an `h2`), `/pricing` as the page's own `h1`.
 */
const EarlyAccess = ({ id, headingComponent = 'h2' }) => {
  const { t } = useTranslation()

  return (
    <Box component='section' id={id} aria-labelledby='early-access-title' sx={{ py: { xs: 6, md: 10 }, scrollMarginTop: 80 }}>
      <Stack spacing={3} alignItems='flex-start' sx={{ maxWidth: 640 }}>
        <Stack spacing={1.5}>
          <Typography id='early-access-title' level='h2' component={headingComponent} sx={{ color: 'text.primary' }}>
            {t('beta.earlyAccess')}
          </Typography>
          <Typography level='body-lg' sx={{ color: 'text.secondary' }}>
            {t('beta.pricing.message')}
          </Typography>
        </Stack>
        <Button component={Link} to='/register' size='lg'>
          {t('beta.pricing.cta')}
        </Button>
      </Stack>
    </Box>
  )
}

export default EarlyAccess

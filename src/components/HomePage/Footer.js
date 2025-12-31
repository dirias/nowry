import * as React from 'react'
import { Box, Typography, Divider, useColorScheme } from '@mui/joy'
import { useTranslation } from 'react-i18next'

const Footer = () => {
  const { mode } = useColorScheme()
  const isDark = mode === 'dark'
  const { t } = useTranslation()

  return (
    <Box
      component='footer'
      sx={{
        textAlign: 'center',
        py: 2,
        mt: 4,
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: isDark ? 'neutral.900' : 'background.level1'
      }}
    >
      <Typography level='body-sm' color='neutral'>
        © {new Date().getFullYear()} Nowry — {t('footer.rights')}
      </Typography>
    </Box>
  )
}

export default Footer

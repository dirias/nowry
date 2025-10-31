import * as React from 'react'
import { Box, Typography, Divider, useColorScheme } from '@mui/joy'

const Footer = () => {
  const { mode } = useColorScheme()
  const isDark = mode === 'dark'

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
        © {new Date().getFullYear()} Nowry — All rights reserved.
      </Typography>
    </Box>
  )
}

export default Footer

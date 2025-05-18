import React from 'react'
import { Box, Typography, useColorScheme, Sheet } from '@mui/joy'
import HomePhrase from '../../images/Phrase1.jpeg'

const Landing = () => {
  const { mode } = useColorScheme()
  const isDark = mode === 'dark'

  return (
    <Sheet
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        p: { xs: 3, md: 6 },
        backgroundColor: isDark ? 'neutral.900' : 'background.body'
      }}
    >
      <Box sx={{ textAlign: { xs: 'center', md: 'left' }, maxWidth: 480 }}>
        <Typography level='h1' sx={{ mb: 2, fontWeight: 'bold', color: isDark ? 'primary.300' : 'primary.700' }}>
          Nowry
        </Typography>
        <Typography level='body-lg' sx={{ color: 'text.secondary' }}>
          Use Artificial Intelligence to boost the way you learn.
        </Typography>
      </Box>

      <Box
        component='img'
        src={HomePhrase}
        alt='Motivational Phrase'
        sx={{
          width: { xs: '100%', md: '50%' },
          maxWidth: 500,
          borderRadius: 'md',
          boxShadow: 'lg',
          objectFit: 'cover'
        }}
      />
    </Sheet>
  )
}

export default Landing

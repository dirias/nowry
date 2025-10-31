import * as React from 'react'
import { Box, Typography, Button, Sheet, Stack } from '@mui/joy'
import { useColorScheme } from '@mui/joy/styles'
import HomePhrase from '../../images/Phrase1.jpeg'
import { Link } from 'react-router-dom'

const Landing = () => {
  const { mode } = useColorScheme()
  const isDark = mode === 'dark'

  return (
    <Sheet
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: { xs: 'column-reverse', md: 'row' },
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        px: { xs: 3, md: 8 },
        py: { xs: 4, md: 6 },
        backgroundColor: isDark ? 'neutral.900' : 'background.body'
      }}
    >
      {/* Text Section */}
      <Stack
        spacing={2}
        sx={{
          textAlign: { xs: 'center', md: 'left' },
          maxWidth: 480
        }}
      >
        <Typography
          level='h1'
          sx={{
            fontWeight: 800,
            letterSpacing: -1,
            color: isDark ? 'primary.300' : 'primary.700'
          }}
        >
          Learn Smarter, Faster, Better.
        </Typography>
        <Typography level='body-lg' sx={{ color: 'text.secondary' }}>
          Boost your learning with Nowry — the AI platform that helps you study, organize, and grow effortlessly.
        </Typography>

        <Stack direction='row' spacing={2} sx={{ mt: 2, justifyContent: { xs: 'center', md: 'flex-start' } }}>
          <Button component={Link} to='/login' size='lg' variant='solid' color='primary'>
            Get Started
          </Button>
          <Button component={Link} to='/about' size='lg' variant='outlined' color='neutral'>
            Learn More
          </Button>
        </Stack>
      </Stack>

      {/* Image Section */}
      <Box
        component='img'
        src={HomePhrase}
        alt='Motivational Phrase'
        sx={{
          width: { xs: '100%', md: '50%' },
          maxWidth: 500,
          borderRadius: 'lg',
          boxShadow: 'xl',
          objectFit: 'cover'
        }}
      />
    </Sheet>
  )
}

export default Landing

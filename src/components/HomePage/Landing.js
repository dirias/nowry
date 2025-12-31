import React from 'react'
import { Box, Typography, Button, Sheet, Stack, Card, CardContent, Container, Grid } from '@mui/joy'
import { useColorScheme } from '@mui/joy/styles'
import { Link } from 'react-router-dom'
import HomePhrase from '../../images/Phrase1.jpeg'
import {
  AutoStoriesRounded,
  PsychologyRounded,
  SpeedRounded,
  GroupsRounded,
  TrendingUpRounded,
  CheckCircleRounded
} from '@mui/icons-material'

const Landing = () => {
  const { mode } = useColorScheme()
  const isDark = mode === 'dark'

  const features = [
    {
      icon: <AutoStoriesRounded />,
      title: 'Smart Books',
      description: 'Create, import, and organize your learning materials in one beautiful space',
      color: 'primary'
    },
    {
      icon: <PsychologyRounded />,
      title: 'AI-Powered',
      description: 'Intelligent flashcards and study recommendations tailored to your learning style',
      color: 'success'
    },
    {
      icon: <SpeedRounded />,
      title: 'Spaced Repetition',
      description: 'Proven learning techniques that optimize retention and save you time',
      color: 'warning'
    },
    {
      icon: <TrendingUpRounded />,
      title: 'Track Progress',
      description: 'Visual analytics to monitor your growth and celebrate achievements',
      color: 'danger'
    }
  ]

  return (
    <Sheet
      sx={{
        minHeight: '100vh',
        backgroundColor: isDark ? 'neutral.900' : 'background.body'
      }}
    >
      <Container maxWidth='lg'>
        {/* Hero Section */}
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: { xs: 'column-reverse', md: 'row' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 4, md: 8 },
            py: { xs: 4, md: 8 }
          }}
        >
          {/* Text Section */}
          <Stack
            spacing={3}
            sx={{
              flex: 1,
              textAlign: { xs: 'center', md: 'left' },
              maxWidth: 600
            }}
          >
            {/* Main Headline */}
            <Typography
              level='h1'
              sx={{
                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
                fontWeight: 800,
                letterSpacing: -2,
                lineHeight: 1.1,
                color: isDark ? 'primary.300' : 'primary.700'
              }}
            >
              Learn Smarter,
              <br />
              Not Harder
            </Typography>

            {/* Subheadline */}
            <Typography
              level='body-lg'
              sx={{
                color: 'text.secondary',
                fontSize: { xs: '1rem', md: '1.25rem' }
              }}
            >
              Transform your study habits with AI-powered flashcards, smart books, and spaced repetition. Start learning more effectively
              today.
            </Typography>

            {/* CTA Buttons */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: { xs: 'center', md: 'flex-start' } }}>
              <Button
                component={Link}
                to='/register'
                size='lg'
                variant='solid'
                color='primary'
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 'lg'
                  }
                }}
              >
                Start Learning Free
              </Button>
              <Button
                component={Link}
                to='/about'
                size='lg'
                variant='outlined'
                color='neutral'
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    borderColor: 'primary.500',
                    color: 'primary.500'
                  }
                }}
              >
                Learn More
              </Button>
            </Stack>
          </Stack>

          {/* Image Section */}
          <Box
            component='img'
            src={HomePhrase}
            alt='Motivational Learning Quote'
            sx={{
              flex: 1,
              width: { xs: '100%', md: '50%' },
              maxWidth: 550,
              borderRadius: 'xl',
              boxShadow: 'xl',
              objectFit: 'cover',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.02)',
                boxShadow: '0 20px 60px rgba(42, 105, 113, 0.3)'
              }
            }}
          />
        </Box>

        {/* Features Section */}
        <Box sx={{ py: 8 }}>
          <Typography
            level='h2'
            textAlign='center'
            fontWeight={700}
            sx={{ mb: 2, fontSize: { xs: '2rem', md: '2.5rem' }, color: isDark ? 'primary.300' : 'primary.700' }}
          >
            Everything You Need to Excel
          </Typography>
          <Typography level='body-lg' textAlign='center' sx={{ color: 'text.secondary', mb: 6, maxWidth: 600, mx: 'auto' }}>
            Powerful features designed to make learning enjoyable and effective
          </Typography>

          <Grid container spacing={3}>
            {features.map((feature, index) => (
              <Grid key={index} xs={12} sm={6} md={3}>
                <Card
                  variant='outlined'
                  sx={{
                    height: '100%',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 'lg',
                      borderColor: `${feature.color}.500`
                    }
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 'lg',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: `${feature.color}.50`,
                        color: `${feature.color}.500`,
                        mb: 2,
                        fontSize: 28
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography level='title-lg' fontWeight={600} mb={1}>
                      {feature.title}
                    </Typography>
                    <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Social Proof */}
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Card
            variant='soft'
            color='primary'
            sx={{
              p: 6
            }}
          >
            <GroupsRounded sx={{ fontSize: 60, color: 'primary.500', mb: 2 }} />
            <Typography level='h3' fontWeight={700} mb={2}>
              Start Learning Today
            </Typography>
            <Typography level='body-lg' sx={{ color: 'text.secondary', maxWidth: 600, mx: 'auto', mb: 4 }}>
              Join Nowry and discover a better way to learn with modern tools designed for your success
            </Typography>

            <Stack spacing={2} sx={{ maxWidth: 500, mx: 'auto', textAlign: 'left' }}>
              {[
                'Create unlimited books and flashcards',
                'Access from any device, anywhere',
                'Track your progress with analytics',
                'Join study groups and collaborate'
              ].map((benefit, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CheckCircleRounded sx={{ color: 'success.500', fontSize: 24 }} />
                  <Typography level='body-md'>{benefit}</Typography>
                </Box>
              ))}
            </Stack>

            <Button
              component={Link}
              to='/register'
              size='lg'
              variant='solid'
              color='primary'
              sx={{
                mt: 4,
                px: 5,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg'
                }
              }}
            >
              Get Started Now
            </Button>
          </Card>
        </Box>
      </Container>
    </Sheet>
  )
}

export default Landing

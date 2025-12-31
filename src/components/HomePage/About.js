import React from 'react'
import { Box, Typography, Button, Sheet, Stack, Card, CardContent, Container, Grid, Avatar } from '@mui/joy'
import { useColorScheme } from '@mui/joy/styles'
import { Link } from 'react-router-dom'
import {
  RocketLaunchRounded,
  VisibilityRounded,
  FavoriteBorder,
  LightbulbRounded,
  PeopleRounded,
  TrendingUpRounded,
  SecurityRounded,
  SupportAgentRounded
} from '@mui/icons-material'

const About = () => {
  const { mode } = useColorScheme()
  const isDark = mode === 'dark'

  const values = [
    {
      icon: <LightbulbRounded />,
      title: 'Innovation',
      description: 'We constantly evolve our platform with cutting-edge learning techniques and AI',
      color: 'warning'
    },
    {
      icon: <PeopleRounded />,
      title: 'Community',
      description: 'Building a supportive environment where learners help each other succeed',
      color: 'primary'
    },
    {
      icon: <SecurityRounded />,
      title: 'Trust',
      description: 'Your data and privacy are our top priorities, always secure and protected',
      color: 'success'
    },
    {
      icon: <SupportAgentRounded />,
      title: 'Support',
      description: 'Dedicated to helping you achieve your learning goals with responsive assistance',
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
            pt: { xs: 12, md: 16 },
            pb: { xs: 8, md: 12 },
            textAlign: 'center'
          }}
        >
          <Typography
            level='h1'
            sx={{
              fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1.1,
              mb: 3,
              color: isDark ? 'primary.300' : 'primary.700'
            }}
          >
            About Nowry
          </Typography>
          <Typography
            level='body-lg'
            sx={{
              maxWidth: 700,
              mx: 'auto',
              color: 'text.secondary',
              fontSize: { xs: '1rem', md: '1.25rem' },
              mb: 4
            }}
          >
            We&apos;re on a mission to make learning accessible, effective, and enjoyable for everyone through innovative technology and
            evidence-based methods.
          </Typography>
        </Box>

        {/* Mission & Vision */}
        <Grid container spacing={4} sx={{ mb: 12 }}>
          <Grid xs={12} md={6}>
            <Card
              variant='soft'
              color='primary'
              sx={{
                height: '100%',
                p: 4,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 'lg'
                }
              }}
            >
              <RocketLaunchRounded sx={{ fontSize: 48, color: 'primary.500', mb: 2 }} />
              <Typography level='h3' fontWeight={700} mb={2}>
                Our Mission
              </Typography>
              <Typography level='body-md' sx={{ color: 'text.secondary' }}>
                To empower learners worldwide with intelligent tools that adapt to their unique learning style, making knowledge acquisition
                faster, more efficient, and more enjoyable than ever before.
              </Typography>
            </Card>
          </Grid>
          <Grid xs={12} md={6}>
            <Card
              variant='soft'
              color='success'
              sx={{
                height: '100%',
                p: 4,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 'lg'
                }
              }}
            >
              <VisibilityRounded sx={{ fontSize: 48, color: 'success.500', mb: 2 }} />
              <Typography level='h3' fontWeight={700} mb={2}>
                Our Vision
              </Typography>
              <Typography level='body-md' sx={{ color: 'text.secondary' }}>
                A world where every person has access to personalized, AI-powered learning experiences that unlock their full potential. We
                envision education that adapts to you, not the other way around.
              </Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Core Values */}
        <Box sx={{ mb: 12 }}>
          <Typography level='h2' textAlign='center' fontWeight={700} sx={{ mb: 2, fontSize: { xs: '2rem', md: '2.5rem' } }}>
            Our Core Values
          </Typography>
          <Typography level='body-lg' textAlign='center' sx={{ color: 'text.secondary', mb: 6, maxWidth: 600, mx: 'auto' }}>
            The principles that guide everything we do
          </Typography>

          <Grid container spacing={3}>
            {values.map((value, index) => (
              <Grid key={index} xs={12} sm={6} md={3}>
                <Card
                  variant='outlined'
                  sx={{
                    height: '100%',
                    textAlign: 'center',
                    p: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 'lg',
                      borderColor: `${value.color}.500`
                    }
                  }}
                >
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${value.color}.50`,
                      color: `${value.color}.500`,
                      mx: 'auto',
                      mb: 2,
                      fontSize: 32
                    }}
                  >
                    {value.icon}
                  </Box>
                  <Typography level='title-lg' fontWeight={600} mb={1}>
                    {value.title}
                  </Typography>
                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                    {value.description}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* CTA Section */}
        <Box sx={{ pb: 12, textAlign: 'center' }}>
          <Card
            variant='soft'
            color='primary'
            sx={{
              p: 6
            }}
          >
            <FavoriteBorder sx={{ fontSize: 60, color: 'primary.500', mb: 2 }} />
            <Typography level='h3' fontWeight={700} mb={2}>
              Ready to Get Started?
            </Typography>
            <Typography level='body-lg' sx={{ color: 'text.secondary', maxWidth: 600, mx: 'auto', mb: 4 }}>
              Start your learning journey with Nowry today. Create your free account now!
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'center' }}>
              <Button
                component={Link}
                to='/register'
                size='lg'
                sx={{
                  px: 4,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 'lg'
                  }
                }}
              >
                Get Started Free
              </Button>
              <Button component={Link} to='/contact' size='lg' variant='outlined' color='neutral'>
                Contact Us
              </Button>
            </Stack>
          </Card>
        </Box>
      </Container>
    </Sheet>
  )
}

export default About

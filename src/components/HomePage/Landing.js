import React from 'react'
import { Box, Typography, Button, Sheet, Stack, Card, CardContent, Container, Grid } from '@mui/joy'
import { useColorScheme } from '@mui/joy/styles'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()

  const features = [
    {
      icon: <AutoStoriesRounded />,
      title: t('landing.features.smartBooks.title'),
      description: t('landing.features.smartBooks.desc'),
      color: 'primary'
    },
    {
      icon: <PsychologyRounded />,
      title: t('landing.features.aiPowered.title'),
      description: t('landing.features.aiPowered.desc'),
      color: 'success'
    },
    {
      icon: <SpeedRounded />,
      title: t('landing.features.spacedRepetition.title'),
      description: t('landing.features.spacedRepetition.desc'),
      color: 'warning'
    },
    {
      icon: <TrendingUpRounded />,
      title: t('landing.features.trackProgress.title'),
      description: t('landing.features.trackProgress.desc'),
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
            minHeight: { xs: 'auto', md: '100vh' },
            display: 'flex',
            flexDirection: { xs: 'column-reverse', md: 'row' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 3, md: 8 },
            py: { xs: 3, md: 8 }
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
                fontSize: { xs: '2rem', sm: '3rem', md: '4rem' },
                fontWeight: 800,
                letterSpacing: { xs: -1, md: -2 },
                lineHeight: 1.1,
                color: isDark ? 'primary.300' : 'primary.700'
              }}
            >
              <span style={{ whiteSpace: 'pre-line' }}>{t('landing.hero.title')}</span>
            </Typography>

            {/* Subheadline */}
            <Typography
              level='body-lg'
              sx={{
                color: 'text.secondary',
                fontSize: { xs: '1rem', md: '1.25rem' }
              }}
            >
              {t('landing.hero.subtitle')}
            </Typography>

            {/* CTA Buttons */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ justifyContent: { xs: 'center', md: 'flex-start' }, width: { xs: '100%', sm: 'auto' } }}
            >
              <Button
                component={Link}
                to='/register'
                size='lg'
                variant='solid'
                color='primary'
                fullWidth={{ xs: true, sm: false }}
                sx={{
                  px: 4,
                  py: 1.5,
                  minHeight: 48,
                  fontSize: '1.1rem',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 'lg'
                  }
                }}
              >
                {t('landing.hero.ctaPrimary')}
              </Button>
              <Button
                component={Link}
                to='/about'
                size='lg'
                variant='outlined'
                color='neutral'
                fullWidth={{ xs: true, sm: false }}
                sx={{
                  px: 4,
                  py: 1.5,
                  minHeight: 48,
                  fontSize: '1.1rem',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    borderColor: 'primary.500',
                    color: 'primary.500'
                  }
                }}
              >
                {t('landing.hero.ctaSecondary')}
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
              maxWidth: { xs: 400, md: 550 },
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
        <Box sx={{ py: { xs: 4, md: 8 } }}>
          <Typography
            level='h2'
            textAlign='left'
            fontWeight={700}
            sx={{ mb: 2, fontSize: { xs: '2rem', md: '2.5rem' }, color: isDark ? 'primary.300' : 'primary.700' }}
          >
            {t('landing.features.title')}
          </Typography>
          <Typography level='body-lg' textAlign='left' sx={{ color: 'text.secondary', mb: 6, maxWidth: 600 }}>
            {t('landing.features.subtitle')}
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
        <Box sx={{ py: { xs: 4, md: 8 }, textAlign: 'left' }}>
          <Card
            variant='soft'
            color='primary'
            sx={{
              p: { xs: 3, md: 6 }
            }}
          >
            <GroupsRounded sx={{ fontSize: 60, color: 'primary.500', mb: 2 }} />
            <Typography level='h3' fontWeight={700} mb={2}>
              {t('landing.social.title')}
            </Typography>
            <Typography level='body-lg' sx={{ color: 'text.secondary', maxWidth: 600, mb: 4 }}>
              {t('landing.social.subtitle')}
            </Typography>

            <Stack spacing={2} sx={{ maxWidth: 500, textAlign: 'left' }}>
              {[
                t('landing.social.benefits.1'),
                t('landing.social.benefits.2'),
                t('landing.social.benefits.3'),
                t('landing.social.benefits.4')
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
              fullWidth={{ xs: true, sm: false }}
              sx={{
                mt: 4,
                px: 5,
                minHeight: 48,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg'
                }
              }}
            >
              {t('landing.social.cta')}
            </Button>
          </Card>
        </Box>
      </Container>
    </Sheet>
  )
}

export default Landing

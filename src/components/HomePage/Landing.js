import React from 'react'
import { Box, Typography, Button, Stack, Container, Grid } from '@mui/joy'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import HomePhrase from '../../images/Phrase1.jpeg'
import { AutoStoriesRounded, PsychologyRounded, SpeedRounded, TrendingUpRounded } from '@mui/icons-material'

const HowItWorksStep = ({ number, title, description }) => (
  <Box sx={{ flex: 1, textAlign: { xs: 'left', md: 'center' } }}>
    <Typography
      level='h1'
      sx={{
        fontSize: '3rem',
        fontWeight: 800,
        color: 'primary.plainColor',
        opacity: 0.3,
        lineHeight: 1,
        mb: 1
      }}
    >
      {String(number).padStart(2, '0')}
    </Typography>
    <Typography level='title-lg' sx={{ color: 'text.primary', mb: 0.5 }}>
      {title}
    </Typography>
    <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
      {description}
    </Typography>
  </Box>
)

const FeatureRow = ({ icon, title, description, color }) => (
  <Stack direction='row' spacing={2} alignItems='flex-start' sx={{ py: 2 }}>
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: 'md',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: `${color}.softBg`,
        color: `${color}.plainColor`,
        fontSize: 20
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography level='title-md' sx={{ color: 'text.primary', mb: 0.5 }}>
        {title}
      </Typography>
      <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
        {description}
      </Typography>
    </Box>
  </Stack>
)

const Landing = () => {
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
    <Box sx={{ bgcolor: 'background.body' }}>
      <Container maxWidth='lg'>
        {/* HERO */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column-reverse', md: 'row' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 3, md: 8 },
            py: { xs: 6, md: 10 }
          }}
        >
          <Stack spacing={3} sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' }, maxWidth: 600 }}>
            <Typography
              level='display-lg'
              component='h1'
              sx={{
                fontWeight: 800,
                letterSpacing: { xs: -1, md: -2 },
                lineHeight: 1.1,
                color: 'primary.plainColor'
              }}
            >
              <span style={{ whiteSpace: 'pre-line' }}>{t('landing.hero.title')}</span>
            </Typography>
            <Typography level='body-lg' sx={{ color: 'text.secondary' }}>
              {t('landing.hero.subtitle')}
            </Typography>
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
                  minHeight: 48,
                  fontSize: '1.1rem',
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: 'lg' }
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
                sx={{
                  px: 4,
                  py: 1.5,
                  minHeight: 48,
                  fontSize: '1.1rem',
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'translateY(-2px)', borderColor: 'primary.outlinedBorder', color: 'primary.plainColor' }
                }}
              >
                {t('landing.hero.ctaSecondary')}
              </Button>
            </Stack>
          </Stack>
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
              '&:hover': { transform: 'scale(1.02)', boxShadow: 'xl' }
            }}
          />
        </Box>

        {/* HOW IT WORKS */}
        <Box sx={{ py: { xs: 4, md: 6 }, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography level='h1' fontWeight={700} sx={{ mb: 1, color: 'text.primary' }}>
            {t('landing.howItWorks.title')}
          </Typography>
          <Typography level='body-lg' sx={{ color: 'text.secondary', mb: 6, maxWidth: 500 }}>
            {t('landing.howItWorks.subtitle')}
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <HowItWorksStep number={1} title={t('landing.howItWorks.step1.title')} description={t('landing.howItWorks.step1.desc')} />
            <HowItWorksStep number={2} title={t('landing.howItWorks.step2.title')} description={t('landing.howItWorks.step2.desc')} />
            <HowItWorksStep number={3} title={t('landing.howItWorks.step3.title')} description={t('landing.howItWorks.step3.desc')} />
          </Stack>
        </Box>

        {/* FEATURES */}
        <Box sx={{ py: { xs: 4, md: 6 }, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography level='h2' fontWeight={700} sx={{ mb: 1, color: 'text.primary' }}>
            {t('landing.features.title')}
          </Typography>
          <Typography level='body-md' sx={{ color: 'text.secondary', mb: 4, maxWidth: 600 }}>
            {t('landing.features.subtitle')}
          </Typography>
          <Grid container spacing={2}>
            {features.map((feature, index) => (
              <Grid key={index} xs={12} sm={6}>
                <FeatureRow {...feature} />
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* CTA */}
        <Box sx={{ py: { xs: 4, md: 6 }, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography level='h1' fontWeight={700} sx={{ mb: 2, color: 'text.primary' }}>
            {t('landing.cta.title')}
          </Typography>
          <Typography level='body-lg' sx={{ color: 'text.secondary', mb: 4, maxWidth: 500, mx: 'auto' }}>
            {t('landing.cta.subtitle')}
          </Typography>
          <Button
            component={Link}
            to='/register'
            size='lg'
            variant='solid'
            color='primary'
            sx={{ px: 5, minHeight: 52, fontSize: '1.1rem', '&:hover': { transform: 'translateY(-2px)', boxShadow: 'lg' } }}
          >
            {t('landing.cta.primary')}
          </Button>
          <Stack direction='row' spacing={1} justifyContent='center' alignItems='center' sx={{ mt: 4 }}>
            <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
              {t('landing.cta.social')}
            </Typography>
            <Button
              component='a'
              href='https://www.tiktok.com/@nowry_app'
              target='_blank'
              rel='noopener noreferrer'
              variant='plain'
              color='neutral'
              size='sm'
              aria-label={t('footer.social.tiktok')}
            >
              TT
            </Button>
            <Button
              component='a'
              href='https://www.instagram.com/nowry_app/'
              target='_blank'
              rel='noopener noreferrer'
              variant='plain'
              color='neutral'
              size='sm'
              aria-label={t('footer.social.instagram')}
            >
              IG
            </Button>
            <Button
              component='a'
              href='https://x.com/Nowry_app'
              target='_blank'
              rel='noopener noreferrer'
              variant='plain'
              color='neutral'
              size='sm'
              aria-label={t('footer.social.x')}
            >
              &#x1D54F;
            </Button>
            <Button
              component='a'
              href='https://www.facebook.com/profile.php?id=61575408886765'
              target='_blank'
              rel='noopener noreferrer'
              variant='plain'
              color='neutral'
              size='sm'
              aria-label={t('footer.social.facebook')}
            >
              FB
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  )
}

export default Landing

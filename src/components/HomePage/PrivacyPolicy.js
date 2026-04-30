import React from 'react'
import { Container, Typography, Box, Stack, Divider, Link, Button } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowBackRounded as ArrowBackIcon } from '@mui/icons-material'
import DOMPurify from 'dompurify'

const PrivacyPolicy = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const lastUpdatedDate = new Date().toLocaleDateString(i18n.language, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <Container sx={{ py: { xs: 4, md: 8 }, maxWidth: '800px' }}>
      <Button
        variant='plain'
        color='neutral'
        startDecorator={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2, ml: -1, '&:hover': { bgcolor: 'transparent', color: 'primary.main' } }}
      >
        {t('common.back')}
      </Button>

      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography level='h1' sx={{ mb: 2, fontSize: '3rem', fontWeight: 800 }}>
          {t('legal.privacy.title')}
        </Typography>
        <Typography level='body-md' sx={{ color: 'text.secondary' }}>
          {t('legal.privacy.lastUpdated', { date: lastUpdatedDate })}
        </Typography>
      </Box>

      <Stack spacing={4}>
        <section>
          <Typography level='h3' sx={{ mb: 2 }}>
            {t('legal.privacy.intro.title')}
          </Typography>
          <Typography level='body-md' sx={{ mb: 2 }}>
            {t('legal.privacy.intro.content')}
          </Typography>
        </section>

        <Divider />

        <section>
          <Typography level='h3' sx={{ mb: 2 }}>
            {t('legal.privacy.dataCollect.title')}
          </Typography>
          <Typography level='body-md' sx={{ mb: 2 }}>
            {t('legal.privacy.dataCollect.content')}
          </Typography>
          <Box component='ul' sx={{ pl: 4 }}>
            {['identity', 'contact', 'technical', 'usage'].map((item) => (
              <li key={item}>
                <Typography level='body-md' component='span'>
                  <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t(`legal.privacy.dataCollect.items.${item}`)) }} />
                </Typography>
              </li>
            ))}
          </Box>
        </section>

        <Divider />

        <section>
          <Typography level='h3' sx={{ mb: 2 }}>
            {t('legal.privacy.usage.title')}
          </Typography>
          <Typography level='body-md' sx={{ mb: 2 }}>
            {t('legal.privacy.usage.content')}
          </Typography>
          <Box component='ul' sx={{ pl: 4 }}>
            {(t('legal.privacy.usage.items', { returnObjects: true }) || []).map((item, index) => (
              <li key={index}>
                <Typography level='body-md'>{item}</Typography>
              </li>
            ))}
          </Box>
        </section>

        <Divider />

        <section>
          <Typography level='h3' sx={{ mb: 2 }}>
            {t('legal.privacy.ai.title')}
          </Typography>
          <Typography level='body-md' sx={{ mb: 2 }}>
            {t('legal.privacy.ai.content')}
          </Typography>
        </section>

        <Divider />

        <section>
          <Typography level='h3' sx={{ mb: 2 }}>
            {t('legal.privacy.security.title')}
          </Typography>
          <Typography level='body-md' sx={{ mb: 2 }}>
            {t('legal.privacy.security.content')}
          </Typography>
        </section>

        <Divider />

        <section>
          <Typography level='h3' sx={{ mb: 2 }}>
            {t('legal.privacy.rights.title')}
          </Typography>
          <Typography level='body-md' sx={{ mb: 2 }}>
            {t('legal.privacy.rights.content')}
          </Typography>
        </section>

        <Divider />

        <section>
          <Typography level='h3' sx={{ mb: 2 }}>
            {t('legal.privacy.contact.title')}
          </Typography>
          <Typography level='body-md'>
            {t('legal.privacy.contact.content')}
            <br />
            <Link href='mailto:support@nowry.app'>support@nowry.app</Link>
          </Typography>
        </section>
      </Stack>
    </Container>
  )
}

export default PrivacyPolicy

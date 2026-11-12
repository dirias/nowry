import React from 'react'
import { Container, Typography, Box, Stack, Divider, Link, Button } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowBackRounded as ArrowBackIcon } from '@mui/icons-material'
import DOMPurify from 'dompurify'
import { LEGAL_PRIVACY_UPDATED } from '@nowry/core/constants/site'

const PrivacyPolicy = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  // The date the text last changed, not today's (GTM-008).
  const lastUpdatedDate = new Date(LEGAL_PRIVACY_UPDATED).toLocaleDateString(i18n.language, {
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
            {['identity', 'contact', 'waitlist', 'technical', 'usage'].map((item) => (
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

        {/* What is sent to whom, and how a person leaves the waitlist (ADR-078, ADR-080). */}
        <section>
          <Typography level='h3' sx={{ mb: 2 }}>
            {t('legal.privacy.emails.title')}
          </Typography>
          {(t('legal.privacy.emails.items', { returnObjects: true }) || []).map((paragraph, index) => (
            <Typography key={index} level='body-md' sx={{ mb: 2 }}>
              {paragraph}
            </Typography>
          ))}
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
            {t('legal.privacy.services.title')}
          </Typography>
          <Typography level='body-md' sx={{ mb: 2 }}>
            {t('legal.privacy.services.content')}
          </Typography>
          <Box component='ul' sx={{ pl: 4, mb: 2 }}>
            {(t('legal.privacy.services.items', { returnObjects: true }) || []).map((item, index) => (
              <li key={index}>
                <Typography level='body-md' component='span'>
                  <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item) }} />
                </Typography>
              </li>
            ))}
          </Box>
          <Typography level='body-md' sx={{ mb: 2 }}>
            {t('legal.privacy.services.closing')}
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

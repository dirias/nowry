import React from 'react'
import { Container, Typography, Box, Stack, Divider, Link, Button } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowBackRounded as ArrowBackIcon } from '@mui/icons-material'

const TermsOfService = () => {
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
          {t('legal.terms.title')}
        </Typography>
        <Typography level='body-md' sx={{ color: 'text.secondary' }}>
          {t('legal.terms.lastUpdated', { date: lastUpdatedDate })}
        </Typography>
      </Box>

      <Stack spacing={4}>
        <section>
          <Typography level='h3' sx={{ mb: 2 }}>
            {t('legal.terms.acceptance.title')}
          </Typography>
          <Typography level='body-md' sx={{ mb: 2 }}>
            {t('legal.terms.acceptance.content')}
          </Typography>
        </section>

        <Divider />

        <section>
          <Typography level='h3' sx={{ mb: 2 }}>
            {t('legal.terms.service.title')}
          </Typography>
          <Typography level='body-md' sx={{ mb: 2 }}>
            {t('legal.terms.service.content')}
          </Typography>
        </section>

        <Divider />

        <section>
          <Typography level='h3' sx={{ mb: 2 }}>
            {t('legal.terms.accounts.title')}
          </Typography>
          <Typography level='body-md' sx={{ mb: 2 }}>
            {t('legal.terms.accounts.content')}
          </Typography>
        </section>

        <Divider />

        <section>
          <Typography level='h3' sx={{ mb: 2 }}>
            {t('legal.terms.content.title')}
          </Typography>
          <Typography level='body-md' sx={{ mb: 2 }}>
            {t('legal.terms.content.content1')}
          </Typography>
          <Typography level='body-md' sx={{ mb: 2 }}>
            {t('legal.terms.content.content2')}
          </Typography>
        </section>

        <Divider />

        <section>
          <Typography level='h3' sx={{ mb: 2 }}>
            {t('legal.terms.conduct.title')}
          </Typography>
          <Typography level='body-md' sx={{ mb: 2 }}>
            {t('legal.terms.conduct.content')}
          </Typography>
          <Box component='ul' sx={{ pl: 4 }}>
            {(t('legal.terms.conduct.items', { returnObjects: true }) || []).map((item, index) => (
              <li key={index}>
                <Typography level='body-md'>{item}</Typography>
              </li>
            ))}
          </Box>
        </section>

        <Divider />

        <section>
          <Typography level='h3' sx={{ mb: 2 }}>
            {t('legal.terms.liability.title')}
          </Typography>
          <Typography level='body-md' sx={{ mb: 2 }}>
            {t('legal.terms.liability.content')}
          </Typography>
        </section>

        <Divider />

        <section>
          <Typography level='h3' sx={{ mb: 2 }}>
            {t('legal.terms.termination.title')}
          </Typography>
          <Typography level='body-md' sx={{ mb: 2 }}>
            {t('legal.terms.termination.content')}
          </Typography>
        </section>

        <Divider />

        <section>
          <Typography level='h3' sx={{ mb: 2 }}>
            {t('legal.terms.changes.title')}
          </Typography>
          <Typography level='body-md' sx={{ mb: 2 }}>
            {t('legal.terms.changes.content')}
          </Typography>
        </section>

        <Divider />

        <section>
          <Typography level='h3' sx={{ mb: 2 }}>
            {t('legal.terms.contact.title')}
          </Typography>
          <Typography level='body-md'>
            {t('legal.terms.contact.content')}
            <br />
            <Link href='mailto:support@nowry.app'>support@nowry.app</Link>
          </Typography>
        </section>
      </Stack>
    </Container>
  )
}

export default TermsOfService

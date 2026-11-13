import React from 'react'
import { Box, Container, Divider, Link, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { LANGFUSE_FINDABLE_DAYS, LANGFUSE_LEDGER_SINCE, SENTRY_RETENTION_DAYS } from '@nowry/core/constants/site'

/**
 * How to delete a Nowry account, public and signed out (ADR-081, FR-029).
 *
 * Google Play links here. It names the app, gives the steps on the web and on
 * Android in the words those screens use, the way to ask by email, and what is
 * removed at once, what after 30 days, and what other services keep.
 */
const Steps = ({ items }) => (
  <Box component='ol' sx={{ pl: 3, m: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
    {items.map((item, index) => (
      <li key={index}>
        <Typography level='body-md'>{item}</Typography>
      </li>
    ))}
  </Box>
)

const Bullets = ({ items }) => (
  <Box component='ul' sx={{ pl: 3, m: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
    {items.map((item, index) => (
      <li key={index}>
        <Typography level='body-md'>{item}</Typography>
      </li>
    ))}
  </Box>
)

const Section = ({ title, children }) => (
  <Stack component='section' spacing={1.5}>
    <Typography level='h3' component='h2'>
      {title}
    </Typography>
    {children}
  </Stack>
)

const DeleteAccountInfo = () => {
  const { t, i18n } = useTranslation()
  const list = (key, options) => t(key, { returnObjects: true, ...options }) || []
  // The names the screens themselves use, so the steps match what is on them.
  const screen = { settings: t('settings.title'), danger: t('settings.dangerZone.title'), button: t('settings.dangerZone.deleteButton') }
  // The day the trace ledger reached production, in the reader's language (ADR-081 amendment).
  const since = new Date(`${LANGFUSE_LEDGER_SINCE}T12:00:00Z`).toLocaleDateString(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const days = { sentryDays: SENTRY_RETENTION_DAYS, langfuseDays: LANGFUSE_FINDABLE_DAYS, since }

  return (
    <Container component='main' sx={{ py: { xs: 4, md: 8 }, maxWidth: '760px' }}>
      <Stack spacing={4}>
        <Stack spacing={1.5}>
          <Typography level='h1'>{t('legal.deleteAccount.title')}</Typography>
          <Typography level='body-lg' sx={{ color: 'text.secondary' }}>
            {t('legal.deleteAccount.intro')}
          </Typography>
        </Stack>

        <Section title={t('legal.deleteAccount.webTitle')}>
          <Steps items={list('legal.deleteAccount.web', screen)} />
        </Section>

        <Section title={t('legal.deleteAccount.androidTitle')}>
          <Steps items={list('legal.deleteAccount.android', screen)} />
        </Section>

        <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
          {t('legal.deleteAccount.publicNote')}
        </Typography>

        <Section title={t('legal.deleteAccount.emailTitle')}>
          <Typography level='body-md'>{t('legal.deleteAccount.email')}</Typography>
        </Section>

        <Divider />

        <Section title={t('legal.deleteAccount.nowTitle')}>
          <Bullets items={list('legal.deleteAccount.now')} />
        </Section>

        <Section title={t('legal.deleteAccount.laterTitle')}>
          <Typography level='body-md'>{t('legal.deleteAccount.later')}</Typography>
        </Section>

        <Section title={t('legal.deleteAccount.elsewhereTitle')}>
          <Bullets items={list('legal.deleteAccount.elsewhere', days)} />
          <Typography level='body-md'>{t('legal.deleteAccount.waitlist')}</Typography>
        </Section>

        <Divider />

        <Typography level='body-md'>
          <Link href='mailto:support@nowry.app'>{t('legal.deleteAccount.contact')}</Link>
        </Typography>
      </Stack>
    </Container>
  )
}

export default DeleteAccountInfo

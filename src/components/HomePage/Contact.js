import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { Alert, Box, Button, Container, FormControl, FormLabel, Input, Link, Stack, Textarea, Typography } from '@mui/joy'
import { contactService } from '@nowry/core/api/services/contact.service'

/** Where the public conversation happens; the same four the footer carries. */
const FOLLOW = [
  { key: 'tiktok', href: 'https://www.tiktok.com/@nowry_app' },
  { key: 'instagram', href: 'https://www.instagram.com/nowry_app/' },
  { key: 'x', href: 'https://x.com/Nowry_app' },
  { key: 'facebook', href: 'https://www.facebook.com/profile.php?id=61575408886765' }
]

const FAQ = ['start', 'free', 'anki', 'phone']
const EMPTY = { name: '', email: '', message: '' }

/**
 * Contact (docs/prd-public-site.md D6): the support address, a form that
 * sends through the API, and four questions with answers the product can
 * back. Nothing else — no phone, no address, no hours, no map.
 *
 * On success the message is cleared and a soft success Alert says so; on
 * failure the message stays and a soft danger Alert says so (FR-6).
 */
const Contact = () => {
  const { t, i18n } = useTranslation()
  const [form, setForm] = useState(EMPTY)
  const [status, setStatus] = useState('idle') // idle | sending | sent | failed

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    try {
      await contactService.send({ ...form, locale: i18n.language, page: window.location.pathname })
      setForm(EMPTY)
      setStatus('sent')
    } catch {
      setStatus('failed')
    }
  }

  return (
    <Box sx={{ bgcolor: 'background.body', flex: 1 }}>
      <Container maxWidth='lg' sx={{ py: { xs: 6, md: 10 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 7fr) minmax(0, 5fr)' },
            columnGap: { md: 12 },
            rowGap: 6
          }}
        >
          <Stack spacing={4} component='section' aria-labelledby='contact-title'>
            <Stack spacing={1.5}>
              <Typography id='contact-title' level='h1' sx={{ color: 'text.primary' }}>
                {t('contact.title')}
              </Typography>
              <Typography level='body-lg' sx={{ color: 'text.secondary' }}>
                {t('contact.lead')}{' '}
                <Link href='mailto:support@nowry.app' sx={{ fontWeight: 'lg' }}>
                  support@nowry.app
                </Link>
              </Typography>
            </Stack>

            {status === 'sent' && (
              <Alert color='success' variant='soft'>
                {t('contact.form.sent')}
              </Alert>
            )}
            {status === 'failed' && (
              <Alert color='danger' variant='soft'>
                {t('contact.form.failed')}
              </Alert>
            )}

            <form onSubmit={onSubmit}>
              <Stack spacing={2.5}>
                <FormControl required>
                  <FormLabel>{t('contact.form.name')}</FormLabel>
                  <Input name='name' value={form.name} onChange={onChange} size='lg' autoComplete='name' />
                </FormControl>
                <FormControl required>
                  <FormLabel>{t('contact.form.email')}</FormLabel>
                  <Input
                    type='email'
                    name='email'
                    value={form.email}
                    onChange={onChange}
                    size='lg'
                    autoComplete='email'
                    placeholder={t('auth.emailPlaceholder')}
                  />
                </FormControl>
                <FormControl required>
                  <FormLabel>{t('contact.form.message')}</FormLabel>
                  <Textarea
                    name='message'
                    value={form.message}
                    onChange={onChange}
                    minRows={6}
                    size='lg'
                    placeholder={t('contact.form.messagePlaceholder')}
                  />
                </FormControl>
                <Box>
                  <Button type='submit' size='lg' loading={status === 'sending'}>
                    {t('contact.form.send')}
                  </Button>
                </Box>
              </Stack>
            </form>
          </Stack>

          <Stack spacing={5} component='aside'>
            <Stack component='section' aria-labelledby='contact-faq-title' spacing={1}>
              <Typography id='contact-faq-title' level='title-md' component='h2' sx={{ color: 'text.tertiary' }}>
                {t('contact.faq.title')}
              </Typography>
              <Stack component='dl' sx={{ m: 0 }}>
                {FAQ.map((key) => (
                  <Box key={key} sx={{ py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography component='dt' level='title-md' sx={{ color: 'text.primary', mb: 0.5 }}>
                      {t(`contact.faq.${key}.q`)}
                    </Typography>
                    <Typography component='dd' level='body-sm' sx={{ color: 'text.secondary', m: 0 }}>
                      {t(`contact.faq.${key}.a`)}
                      {key === 'free' && (
                        <>
                          {' '}
                          <Link component={RouterLink} to={{ pathname: '/', hash: '#pricing' }} sx={{ fontWeight: 'lg' }}>
                            {t('contact.faq.free.link')}
                          </Link>
                        </>
                      )}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Stack>

            <Stack component='section' aria-labelledby='contact-follow-title' spacing={1.5}>
              <Typography id='contact-follow-title' level='title-md' component='h2' sx={{ color: 'text.tertiary' }}>
                {t('contact.follow')}
              </Typography>
              <Stack direction='row' spacing={2.5} flexWrap='wrap' useFlexGap>
                {FOLLOW.map(({ key, href }) => (
                  <Link
                    key={key}
                    href={href}
                    target='_blank'
                    rel='noopener noreferrer'
                    level='body-md'
                    sx={{ color: 'text.secondary', fontWeight: 'lg' }}
                  >
                    {t(`contact.networks.${key}`)}
                  </Link>
                ))}
              </Stack>
            </Stack>
          </Stack>
        </Box>
      </Container>
    </Box>
  )
}

export default Contact

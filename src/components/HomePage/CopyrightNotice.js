import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  FormControl,
  FormLabel,
  Input,
  Link,
  List,
  ListItem,
  Stack,
  Textarea,
  Typography
} from '@mui/joy'

import { copyrightService } from '@nowry/core/api/services/copyright.service'
import { COPYRIGHT_AGENT_EMAIL } from '@nowry/core/constants/site'
import { focusRing } from '../Common/Form/formStyles'

const EMPTY = { name: '', email: '', work: '', location: '', statement: false, signature: '' }

/**
 * The takedown page (GTM-008, ADR-037's missing half; docs/prd-road-to-market.md FR-012).
 *
 * What a notice needs, where else it can go, what happens after a removal,
 * and a form that sends one through the API. Laid out like Contact: the
 * explanation on the left, the form on the right, one column on a phone.
 * Four states for the form, as Contact has: idle, sending, sent, failed.
 */
const CopyrightNotice = () => {
  const { t, i18n } = useTranslation()
  const [form, setForm] = useState(EMPTY)
  const [status, setStatus] = useState('idle') // idle | sending | sent | failed

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.statement) return
    setStatus('sending')
    try {
      await copyrightService.sendNotice({ ...form, locale: String(i18n.language ?? '').split('-')[0] || undefined })
      setForm(EMPTY)
      setStatus('sent')
    } catch {
      setStatus('failed')
    }
  }

  const steps = t('legal.copyright.steps', { returnObjects: true })

  return (
    <Box sx={{ bgcolor: 'background.body', flex: 1 }}>
      <Container maxWidth='lg' sx={{ py: { xs: 6, md: 10 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 6fr) minmax(0, 6fr)' },
            columnGap: { md: 10 },
            rowGap: 6
          }}
        >
          <Stack spacing={4} component='section' aria-labelledby='copyright-title'>
            <Stack spacing={1.5}>
              <Typography id='copyright-title' level='h1' sx={{ color: 'text.primary' }}>
                {t('legal.copyright.title')}
              </Typography>
              <Typography level='body-lg' sx={{ color: 'text.secondary' }}>
                {t('legal.copyright.lead')}
              </Typography>
            </Stack>

            <Stack spacing={1}>
              <Typography level='title-md'>{t('legal.copyright.stepsTitle')}</Typography>
              <List marker='decimal' sx={{ '--ListItem-paddingY': '2px' }}>
                {(Array.isArray(steps) ? steps : []).map((step) => (
                  <ListItem key={step}>
                    <Typography level='body-md' sx={{ color: 'text.secondary' }}>
                      {step}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </Stack>

            <Stack spacing={1}>
              <Typography level='title-md'>{t('legal.copyright.agentTitle')}</Typography>
              <Typography level='body-md' sx={{ color: 'text.secondary' }}>
                {t('legal.copyright.agentLead')}{' '}
                <Link href={`mailto:${COPYRIGHT_AGENT_EMAIL}`} sx={{ fontWeight: 'lg' }}>
                  {COPYRIGHT_AGENT_EMAIL}
                </Link>
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                {t('legal.copyright.agentNote')}
              </Typography>
            </Stack>

            <Stack spacing={1}>
              <Typography level='title-md'>{t('legal.copyright.counterTitle')}</Typography>
              <Typography level='body-md' sx={{ color: 'text.secondary' }}>
                {t('legal.copyright.counterLead')}
              </Typography>
            </Stack>
          </Stack>

          <Stack component='form' onSubmit={onSubmit} spacing={2.5} aria-labelledby='copyright-form-title'>
            <Typography id='copyright-form-title' level='title-lg'>
              {t('legal.copyright.form.title')}
            </Typography>

            {status === 'sent' && (
              <Alert color='success' variant='soft'>
                {t('legal.copyright.form.sent')}
              </Alert>
            )}
            {status === 'failed' && (
              <Alert color='danger' variant='soft'>
                {t('legal.copyright.form.failed')}
              </Alert>
            )}

            <FormControl required>
              <FormLabel>{t('legal.copyright.form.name')}</FormLabel>
              <Input name='name' id='copyright-name' value={form.name} onChange={onChange} size='md' autoComplete='name' />
            </FormControl>
            <FormControl required>
              <FormLabel>{t('legal.copyright.form.email')}</FormLabel>
              <Input type='email' name='email' id='copyright-email' value={form.email} onChange={onChange} size='md' autoComplete='email' />
            </FormControl>
            <FormControl required>
              <FormLabel>{t('legal.copyright.form.work')}</FormLabel>
              <Textarea
                name='work'
                id='copyright-work'
                value={form.work}
                onChange={onChange}
                minRows={3}
                placeholder={t('legal.copyright.form.workPlaceholder')}
              />
            </FormControl>
            <FormControl required>
              <FormLabel>{t('legal.copyright.form.location')}</FormLabel>
              <Input
                name='location'
                id='copyright-location'
                value={form.location}
                onChange={onChange}
                size='md'
                placeholder={t('legal.copyright.form.locationPlaceholder')}
              />
            </FormControl>
            <FormControl required>
              <Checkbox
                name='statement'
                id='copyright-statement'
                checked={form.statement}
                onChange={onChange}
                label={
                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                    {t('legal.copyright.form.statement')}
                  </Typography>
                }
              />
            </FormControl>
            <FormControl required>
              <FormLabel>{t('legal.copyright.form.signature')}</FormLabel>
              <Input name='signature' id='copyright-signature' value={form.signature} onChange={onChange} size='md' autoComplete='off' />
            </FormControl>

            <Button
              type='submit'
              size='lg'
              loading={status === 'sending'}
              disabled={!form.statement}
              sx={{ alignSelf: 'flex-start', ...focusRing }}
            >
              {t('legal.copyright.form.submit')}
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  )
}

export default CopyrightNotice

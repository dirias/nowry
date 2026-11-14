import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Autocomplete,
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Option,
  Select,
  Sheet,
  Stack,
  Textarea,
  Typography
} from '@mui/joy'
import { adminInvitesService } from '@nowry/core/api/services/adminInvites.service'
import { useInviteCohorts, useInviteDryRun, useRefreshInvites } from '@nowry/core/hooks/useAdminInvites'
import { isReauthCancelled } from '@nowry/core/domain/recentSignIn'
import {
  DEFAULT_COHORT,
  DEFAULT_LIFETIME_DAYS,
  INVITE_LOCALES,
  MAX_BATCH,
  defaultInviteLocale,
  inviteCount,
  isValidCohort,
  parseAddresses,
  sendRefusal,
  unsentEntries
} from '@nowry/core/domain/invitations'
import { focusRing } from '../../Common/Form/formStyles'
import CheckSummary from './CheckSummary'
import SendResult from './SendResult'
import EmailPreview from './EmailPreview'

const LIFETIMES = [7, 14, 30, 60, 90]

/** The cohort and lifetime start on the API's defaults, once, unless the admin already chose. */
const useSettings = (cohorts) => {
  const [cohort, setCohort] = useState(DEFAULT_COHORT)
  const [lifetime, setLifetime] = useState(DEFAULT_LIFETIME_DAYS)
  const touched = useRef(false)
  useEffect(() => {
    if (!cohorts || touched.current) return
    touched.current = true
    if (cohorts.default_cohort) setCohort(cohorts.default_cohort)
    if (cohorts.default_lifetime) setLifetime(cohorts.default_lifetime)
  }, [cohorts])
  const choose = (setter) => (value) => {
    touched.current = true
    setter(value)
  }
  return { cohort, lifetime, setCohort: choose(setCohort), setLifetime: choose(setLifetime) }
}

/** Sends the batch and turns the answer or the refusal into what the alert says. */
const useSend = ({ run, onSent }) => {
  const [sending, setSending] = useState(false)
  const [outcome, setOutcome] = useState(null)
  const send = async (batch) => {
    setSending(true)
    setOutcome(null)
    try {
      const data = await run('send', () => adminInvitesService.sendBatch({ ...batch, dryRun: false }))
      setOutcome({ kind: 'sent', results: data?.results ?? [] })
      onSent(data?.results)
    } catch (error) {
      if (isReauthCancelled(error)) return
      setOutcome(sendRefusal(error))
    } finally {
      setSending(false)
    }
  }
  return { sending, outcome, send }
}

const AddressesField = ({ text, setText, onBlur, error }) => {
  const { t } = useTranslation()
  return (
    <FormControl error={Boolean(error)} sx={{ minWidth: 0 }}>
      <FormLabel>{t('admin.inv.form.addresses')}</FormLabel>
      <Textarea
        minRows={6}
        maxRows={14}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={onBlur}
        placeholder={t('admin.inv.form.addressesPlaceholder')}
        slotProps={{ textarea: { 'aria-label': t('admin.inv.form.addresses'), spellCheck: false, autoCapitalize: 'none' } }}
        sx={{ fontFamily: 'code', fontSize: 'sm', bgcolor: 'background.body' }}
      />
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  )
}

const CohortField = ({ value, options, onChange, onBlur }) => {
  const { t } = useTranslation()
  const valid = isValidCohort(value)
  return (
    <FormControl error={!valid} sx={{ minWidth: 0 }}>
      <FormLabel>{t('admin.inv.form.cohort')}</FormLabel>
      <Autocomplete
        freeSolo
        options={options}
        inputValue={value}
        onInputChange={(_, next) => onChange(next ?? '')}
        onBlur={onBlur}
        slotProps={{ input: { 'aria-label': t('admin.inv.form.cohort') } }}
      />
      {!valid && <FormHelperText>{t('admin.inv.form.cohortHelp')}</FormHelperText>}
    </FormControl>
  )
}

const LifetimeField = ({ value, options, onChange }) => {
  const { t } = useTranslation()
  return (
    <FormControl sx={{ minWidth: 0 }}>
      <FormLabel id='invite-lifetime-label'>{t('admin.inv.form.lifetime')}</FormLabel>
      <Select
        value={value}
        onChange={(_, next) => next && onChange(next)}
        aria-label={t('admin.inv.form.lifetime')}
        slotProps={{ button: { 'aria-labelledby': 'invite-lifetime-label', sx: focusRing } }}
      >
        {options.map((days) => (
          <Option key={days} value={days}>
            {t('admin.inv.form.days', { count: days })}
          </Option>
        ))}
      </Select>
    </FormControl>
  )
}

const LanguageField = ({ value, onChange }) => {
  const { t } = useTranslation()
  return (
    <FormControl sx={{ minWidth: 0 }}>
      <FormLabel id='invite-language-label'>{t('admin.inv.form.language')}</FormLabel>
      <Select
        value={value}
        onChange={(_, next) => next && onChange(next)}
        aria-label={t('admin.inv.form.language')}
        slotProps={{ button: { 'aria-labelledby': 'invite-language-label', sx: focusRing } }}
      >
        {INVITE_LOCALES.map((locale) => (
          <Option key={locale} value={locale}>
            {t(`admin.inv.languages.${locale}`)}
          </Option>
        ))}
      </Select>
    </FormControl>
  )
}

const SendBar = ({ left, count, sending, previewOpen, onPreview, onSend }) => {
  const { t } = useTranslation()
  const label = count > 0 ? t('admin.inv.bar.send', { count }) : t('admin.inv.bar.sendNone')
  return (
    <Sheet
      variant='soft'
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 1.5,
        px: 1.75,
        py: 1.25,
        borderRadius: 'lg',
        bgcolor: 'background.level1',
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Stack direction='row' alignItems='center' gap={1} flexWrap='wrap' sx={{ flex: 1, minWidth: 0 }}>
        {left != null && (
          <Typography level='body-sm' sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
            {t('admin.inv.bar.left', { count: left })}
          </Typography>
        )}
        <Button variant='plain' size='sm' onClick={onPreview} aria-expanded={previewOpen} aria-controls='invite-preview'>
          {previewOpen ? t('admin.inv.bar.hidePreview') : t('admin.inv.bar.preview')}
        </Button>
      </Stack>
      <Button loading={sending} onClick={onSend} aria-label={label} sx={{ width: { xs: '100%', sm: 'auto' } }}>
        {label}
      </Button>
    </Sheet>
  )
}

/** The message under the addresses: none to send, or more than one batch takes. */
const addressesError = (t, entries, pressedEmpty) => {
  if (entries.length > MAX_BATCH) return t('admin.inv.check.tooMany', { count: entries.length, max: MAX_BATCH })
  if (pressedEmpty && entries.length === 0) return t('admin.inv.check.empty')
  return null
}

/**
 * "Invite people" (ADMIN-007a, FR-012, boards D and I): paste addresses, check
 * them as a dry run while typing, choose the cohort, the link's lifetime and
 * the email's language, preview the email, and send with the count on the key.
 * Lines that were not sent stay in the field to be fixed.
 */
export default function InviteForm({ run }) {
  const { t, i18n } = useTranslation()
  const { data: cohorts } = useInviteCohorts()
  const refresh = useRefreshInvites()
  const { cohort, lifetime, setCohort, setLifetime } = useSettings(cohorts)
  const [locale, setLocale] = useState(() => defaultInviteLocale(i18n?.language))
  const [text, setText] = useState('')
  const [pressedEmpty, setPressedEmpty] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const entries = useMemo(() => parseAddresses(text), [text])
  const check = useInviteDryRun({ addresses: entries, cohort, expiresInDays: lifetime, locale, run })
  const { sending, outcome, send } = useSend({
    run,
    onSent: (results) => {
      const left = unsentEntries(entries, results)
      if (left.length !== entries.length) setText(left.join('\n'))
      refresh()
    }
  })

  const changeText = (value) => {
    setPressedEmpty(false)
    setText(value)
  }
  const pressSend = () => {
    if (entries.length === 0) return setPressedEmpty(true)
    if (entries.length > MAX_BATCH || !isValidCohort(cohort)) return undefined
    return send({ addresses: entries, cohort, expiresInDays: lifetime, locale })
  }

  const left = check.left ?? cohorts?.invitations_left_today ?? null
  const count = check.status === 'done' ? inviteCount(check.results) : 0

  return (
    <Stack gap={1.5}>
      <Sheet
        variant='outlined'
        component='section'
        aria-labelledby='invite-form-title'
        sx={{ bgcolor: 'background.surface', borderRadius: 'lg', p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <Stack direction='row' gap={1} alignItems='baseline' flexWrap='wrap'>
          <Typography id='invite-form-title' component='h2' level='title-lg'>
            {t('admin.inv.form.title')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            {t('admin.inv.form.lead')}
          </Typography>
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: 2 }}>
          <AddressesField text={text} setText={changeText} onBlur={check.flush} error={addressesError(t, entries, pressedEmpty)} />
          <Stack gap={1.5} sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: 1.5 }}>
              <CohortField value={cohort} options={cohorts?.cohorts ?? [DEFAULT_COHORT]} onChange={setCohort} onBlur={check.flush} />
              <LifetimeField value={lifetime} options={cohorts?.lifetimes ?? LIFETIMES} onChange={setLifetime} />
            </Box>
            <LanguageField value={locale} onChange={setLocale} />
            <CheckSummary status={check.status} results={check.results} />
          </Stack>
        </Box>
        <SendBar
          left={left}
          count={count}
          sending={sending}
          previewOpen={previewOpen}
          onPreview={() => setPreviewOpen((open) => !open)}
          onSend={pressSend}
        />
      </Sheet>
      <SendResult outcome={outcome} />
      {previewOpen && (
        <Box id='invite-preview'>
          <EmailPreview locale={locale} lifetimeDays={lifetime} />
        </Box>
      )}
    </Stack>
  )
}

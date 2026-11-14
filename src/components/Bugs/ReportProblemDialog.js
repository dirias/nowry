import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Alert, Box, Button, Modal, ModalDialog, Snackbar, Stack, Typography } from '@mui/joy'
import { useBugReport } from '@nowry/core/hooks/useBugReport'
import { areaForPath, emptyReport, isTextField, reportBody, reportProblems } from '@nowry/core/domain/bugReports'
import { focusRing } from '../Common/Form/formStyles'
import { AreaSelect, LimitedField, ScreenshotField, SeverityControl } from './ReportFields'
import { browserContext } from './reportContext'

const footerSx = {
  display: 'flex',
  // BUTTONS.md §6: Cancel on the left, the action on the right; stacked on xs, Cancel first.
  flexDirection: { xs: 'column', sm: 'row' },
  justifyContent: 'space-between',
  gap: 1.5,
  '& > button': { width: { xs: '100%', sm: 'auto' }, ...focusRing }
}

/** What a refusal says in the form (FR-008); a text field over its limit is said under the field instead. */
const OUTCOME_TEXT = {
  dailyLimit: 'report.answers.dailyLimit',
  closed: 'report.answers.closed',
  failed: 'report.answers.failed'
}
const outcomeKey = (outcome) => {
  if (!outcome || outcome.kind === 'sent') return null
  if (outcome.kind === 'tooLarge') {
    if (isTextField(outcome.field)) return null
    return outcome.field === 'screenshots' ? 'report.errors.imageTooLarge' : 'report.answers.tooLarge'
  }
  return OUTCOME_TEXT[outcome.kind] ?? OUTCOME_TEXT.failed
}

const FIELD_ORDER = ['title', 'description', 'steps_to_reproduce']
const isPristine = (form) => !form.title && !form.description && !form.steps_to_reproduce && form.screenshots.length === 0

/** The draft, its problems, and the area guessed from the page each time an untouched form opens. */
const useReportForm = (open, pathname) => {
  const [form, setForm] = useState(() => emptyReport(pathname))
  const [problems, setProblems] = useState({})
  useEffect(() => {
    if (open) setForm((draft) => (isPristine(draft) ? { ...draft, category: areaForPath(pathname) } : draft))
  }, [open, pathname])
  const change = (field, value) => {
    setForm((draft) => ({ ...draft, [field]: value }))
    setProblems(({ [field]: _gone, ...rest }) => rest)
  }
  const clear = () => {
    setForm(emptyReport(pathname))
    setProblems({})
  }
  return { form, problems, setProblems, change, clear }
}

/** The three texts (board G): what went wrong, what happened, and the optional steps. */
const TextFields = ({ form, problems, change, refs }) => {
  const { t } = useTranslation()
  const common = (field) => ({ field, value: form[field], problem: problems[field], onChange: change, inputRef: refs[field] })
  return (
    <>
      <LimitedField {...common('title')} label={t('report.fields.title')} placeholder={t('report.fields.titlePlaceholder')} />
      <LimitedField
        {...common('description')}
        multiline
        label={t('report.fields.description')}
        placeholder={t('report.fields.descriptionPlaceholder')}
      />
      <LimitedField
        {...common('steps_to_reproduce')}
        multiline
        optional
        label={t('report.fields.steps')}
        placeholder={t('report.fields.stepsPlaceholder')}
      />
    </>
  )
}

/**
 * "Report a problem" (BUG-001, ADMIN-008a; FR-007, FR-008; board G): the form
 * every signed-in account opens from the account menu while the beta is on.
 * The limits are said under the fields before sending; Send report is never
 * disabled for them. On success the dialog closes and "Thanks. Your report
 * reached us." is said; a refusal is said in the form's live region.
 */
export default function ReportProblemDialog({ open, onClose }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const report = useBugReport()
  const { form, problems, setProblems, change, clear } = useReportForm(open, pathname)
  const [thanks, setThanks] = useState(false)
  const refs = { title: useRef(null), description: useRef(null), steps_to_reproduce: useRef(null) }

  const close = () => {
    if (report.sending) return
    report.reset()
    onClose()
  }

  const submit = async (event) => {
    event?.preventDefault()
    const found = reportProblems(form)
    setProblems(found)
    const first = FIELD_ORDER.find((field) => found[field])
    if (first) return refs[first].current?.focus()
    const answer = await report.send(reportBody(form, browserContext()))
    if (answer.kind === 'tooLarge' && isTextField(answer.field)) setProblems({ [answer.field]: 'tooLong' })
    if (answer.kind !== 'sent') return
    clear()
    report.reset()
    onClose()
    setThanks(true)
  }

  const refusal = outcomeKey(report.outcome)
  return (
    <>
      <Modal open={open} onClose={close}>
        <ModalDialog
          aria-labelledby='report-title'
          aria-describedby='report-lead'
          sx={{
            width: { xs: '100%', sm: 520 },
            maxWidth: { xs: 'calc(100vw - 16px)', sm: 520 },
            maxHeight: 'calc(100dvh - 32px)',
            overflowY: 'auto',
            p: { xs: 2, sm: 3 },
            gap: 2,
            borderRadius: 'lg'
          }}
        >
          <Stack spacing={0.5}>
            <Typography id='report-title' component='h2' level='title-lg'>
              {t('report.title')}
            </Typography>
            <Typography id='report-lead' level='body-sm' sx={{ color: 'text.secondary' }}>
              {t('report.lead')}
            </Typography>
          </Stack>
          <Stack component='form' noValidate spacing={2} onSubmit={submit}>
            <TextFields form={form} problems={problems} change={change} refs={refs} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1.3fr) minmax(0, 1fr)' }, gap: 2 }}>
              <SeverityControl value={form.severity} onChange={change} />
              <AreaSelect value={form.category} onChange={change} />
            </Box>
            <ScreenshotField shots={form.screenshots} onChange={change} />
          </Stack>
          <Box role='status' aria-live='polite'>
            {refusal && (
              <Alert variant='soft' color='danger' data-testid='report-refusal'>
                {t(refusal)}
              </Alert>
            )}
          </Box>
          <Stack sx={footerSx}>
            <Button variant='plain' color='neutral' size='lg' onClick={close} disabled={report.sending}>
              {t('common.cancel')}
            </Button>
            <Button size='lg' loading={report.sending} onClick={submit}>
              {t('report.send')}
            </Button>
          </Stack>
        </ModalDialog>
      </Modal>
      <Snackbar open={thanks} color='success' variant='soft' autoHideDuration={5000} onClose={() => setThanks(false)}>
        <span role='status'>{t('report.answers.sent')}</span>
      </Snackbar>
    </>
  )
}

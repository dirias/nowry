/**
 * Report a problem (BUG-001, ADMIN-008a; FR-007, FR-008; board H).
 *
 * Text only: what went wrong, what happened, the optional steps and the area
 * as chips. The phone attaches its system, model and the app's version, and
 * says so above the keys; there are no screenshots from the phone in this
 * version. The limits are the web's: fields stop at their length, and the two
 * required ones say so under the field when Send is pressed — the key is never
 * disabled for it. On success the tester reads the thanks and is back on
 * Profile; a refusal is said here, in a live region.
 */
import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { notify } from '@nowry/core'
import { useBugReport } from '@nowry/core/hooks/useBugReport'
import {
  REPORT_AREAS,
  appVersionLabel,
  emptyReport,
  fieldLimit,
  phoneContext,
  phoneDeviceLabel,
  reportBody,
  reportProblems
} from '@nowry/core/domain/bugReports'
import { deviceInfo } from '../platform/deviceInfo'
import { useTheme } from '../theme'
import { Button, Chip, FormField, Input, Screen, Stack, Typography } from '../ui'
import { reportAnswerKey } from './reportAnswer'

const REQUIRED_KEYS = { title: 'report.errors.titleRequired', description: 'report.errors.descriptionRequired' }

export function ReportProblem() {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const report = useBugReport()
  const device = useMemo(() => deviceInfo(), [])
  const [form, setForm] = useState(() => ({ ...emptyReport(), category: 'study' }))
  const [problems, setProblems] = useState({})

  const change = (field) => (value) => {
    setForm((draft) => ({ ...draft, [field]: value }))
    setProblems(({ [field]: _gone, ...rest }) => rest)
  }

  const send = async () => {
    if (report.sending) return
    const found = reportProblems(form)
    setProblems(found)
    if (Object.keys(found).length) return
    const answer = await report.send(reportBody(form, phoneContext(device)))
    if (answer.kind !== 'sent') return
    notify(t('report.answers.sent'), 'success')
    router.back()
  }

  // The fields stop at their length, so the one problem left to say is a missing one.
  const errorKey = (field) => (problems[field] ? REQUIRED_KEYS[field] : null)
  const answerKey = reportAnswerKey(report.outcome)
  const text = (field, labelKey, options = {}, qualifierKey = null) => (
    <FormField labelKey={labelKey} qualifierKey={qualifierKey} errorKey={errorKey(field)}>
      <Input
        value={form[field]}
        onChangeText={change(field)}
        invalid={Boolean(problems[field])}
        maxLength={fieldLimit(field)}
        accessibilityLabel={t(labelKey)}
        {...options}
      />
    </FormField>
  )

  return (
    <Screen>
      <Stack spacing={2.5}>
        <Typography level='title-lg' accessibilityRole='header'>
          {t('report.title')}
        </Typography>
        {text('title', 'report.fields.title', { placeholder: t('report.fields.titlePlaceholder') })}
        {text('description', 'report.fields.description', { multiline: true, placeholder: t('report.fields.descriptionPlaceholder') })}
        {text(
          'steps_to_reproduce',
          'report.fields.steps',
          { multiline: true, placeholder: t('report.fields.stepsPlaceholder') },
          'report.fields.optional'
        )}
        <FormField labelKey='report.fields.area'>
          <View accessibilityRole='radiogroup' style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[1] }}>
            {REPORT_AREAS.map((area) => (
              <Chip
                key={area}
                selected={form.category === area}
                onPress={() => change('category')(area)}
                accessibilityRole='radio'
                accessibilityState={{ checked: form.category === area }}
                accessibilityLabel={t(`report.areas.${area}`)}
              >
                {t(`report.areas.${area}`)}
              </Chip>
            ))}
          </View>
        </FormField>
        <Typography level='body-xs' color='text.tertiary'>
          {t('report.phone.sentWith', { device: phoneDeviceLabel(device), version: appVersionLabel(device.appVersion, device.build) })}
        </Typography>
        <View accessibilityLiveRegion='polite'>
          {answerKey ? (
            <Typography level='body-sm' color='danger.plainColor'>
              {t(answerKey)}
            </Typography>
          ) : null}
        </View>
        <Stack spacing={1.5}>
          <Button variant='tertiary' onPress={() => router.back()} disabled={report.sending}>
            {t('common.cancel')}
          </Button>
          <Button loading={report.sending} onPress={send}>
            {t('report.send')}
          </Button>
        </Stack>
      </Stack>
    </Screen>
  )
}

export default ReportProblem

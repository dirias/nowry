import React from 'react'
import { Alert } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { sendSummary } from '@nowry/core/domain/invitations'

const PART_KEYS = Object.freeze({
  sent: 'admin.inv.result.sent',
  send_failed: 'admin.inv.result.sendFailed',
  open_invite: 'admin.inv.result.openInvite',
  has_account: 'admin.inv.result.hasAccount',
  left_list: 'admin.inv.result.leftList',
  invalid: 'admin.inv.result.invalid'
})

/** The sentences of a send's answer (board I, first alert). */
const sentText = (t, results) => {
  const { tone, parts } = sendSummary(results)
  const sentences = parts
    .filter((part) => PART_KEYS[part.outcome])
    .map((part) => t(PART_KEYS[part.outcome], { count: part.count, lines: part.lines.join(', ') }))
  if (!parts.some((part) => part.outcome === 'sent')) sentences.unshift(t('admin.inv.result.none'))
  return { tone, text: sentences.join(' ') }
}

/**
 * What a send said (board I): what went and what did not, the refusal over
 * today's budget (nothing sent), or a failure.
 * @param {{outcome: {kind: 'sent', results: Object[]} | {kind: 'overBudget', needed: number, left: number} | {kind: 'failed'} | null}} props
 */
export default function SendResult({ outcome }) {
  const { t } = useTranslation()
  if (!outcome) return null
  if (outcome.kind === 'sent') {
    const { tone, text } = sentText(t, outcome.results)
    return (
      <Alert variant='soft' color={tone} data-testid='invite-result'>
        {text}
      </Alert>
    )
  }
  const text =
    outcome.kind === 'overBudget'
      ? t('admin.inv.result.overBudget', { count: outcome.needed, left: outcome.left })
      : t('admin.inv.result.failed')
  return (
    <Alert variant='soft' color='danger' data-testid='invite-result'>
      {text}
    </Alert>
  )
}

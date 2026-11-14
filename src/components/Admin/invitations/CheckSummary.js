import React from 'react'
import { Chip, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { summarizeCheck } from '@nowry/core/domain/invitations'

/** The tag colour of each outcome (board D): green goes out, grey stays, red cannot go. */
export const OUTCOME_COLOR = Object.freeze({
  will_invite: 'success',
  sent: 'success',
  send_failed: 'danger',
  open_invite: 'neutral',
  invalid: 'danger',
  has_account: 'neutral',
  left_list: 'warning'
})

const Line = ({ outcome, count, lines }) => {
  const { t } = useTranslation()
  const where = outcome === 'invalid' ? ` · ${t('admin.inv.check.lines', { count: lines.length, lines: lines.join(', ') })}` : ''
  return (
    <Stack direction='row' gap={1} alignItems='center'>
      <Chip size='sm' variant='soft' color={OUTCOME_COLOR[outcome] ?? 'neutral'} sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {count}
      </Chip>
      <Typography level='body-sm' sx={{ color: 'text.secondary', minWidth: 0 }}>
        {t(`admin.inv.check.outcome.${outcome}`, { count })}
        {where}
      </Typography>
    </Stack>
  )
}

/**
 * What the dry run found, one line per outcome with its count (board D). A
 * polite live region, so a screen reader hears the check finish.
 */
export default function CheckSummary({ status, results }) {
  const { t } = useTranslation()
  const lines = status === 'done' ? summarizeCheck(results) : []
  return (
    <Stack role='status' aria-live='polite' gap={0.75} data-testid='invite-check'>
      {status === 'checking' && (
        <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
          {t('admin.inv.check.checking')}
        </Typography>
      )}
      {status === 'error' && (
        <Typography level='body-sm' sx={{ color: 'danger.plainColor' }}>
          {t('admin.inv.check.failed')}
        </Typography>
      )}
      {lines.map((line) => (
        <Line key={line.outcome} {...line} />
      ))}
    </Stack>
  )
}

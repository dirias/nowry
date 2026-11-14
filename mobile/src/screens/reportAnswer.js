/**
 * What the phone's report form says after Send (BUG-001, FR-007, FR-008): the
 * key of the refusal, or null when there is nothing to say on the form (sent,
 * or not yet sent). A plain module so it is tested without a device runtime.
 */
const ANSWERS = {
  dailyLimit: 'report.answers.dailyLimit',
  tooLarge: 'report.answers.tooLarge',
  closed: 'report.answers.closed',
  failed: 'report.answers.failed'
}

export const reportAnswerKey = (outcome) => {
  if (!outcome || outcome.kind === 'sent') return null
  return ANSWERS[outcome.kind] ?? ANSWERS.failed
}

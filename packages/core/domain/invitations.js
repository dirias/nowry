/**
 * The admin Invitations tab's rules (ADMIN-007a, FR-012, ADR-077 amendment).
 *
 * Pasted text becomes the entries sent to `POST /beta/admin/invites/batch`;
 * the API's answer, one result per entry, becomes the summary lines the tab
 * shows (board D) and the alert after a send (board I). Platform-free.
 */

/** At most this many addresses go in one batch; the API refuses more. */
export const MAX_BATCH = 50

/** The API's cohort pattern; a cohort is also at most 40 characters long. */
export const COHORT_PATTERN = /^[a-z0-9][a-z0-9-]*$/
export const COHORT_MAX_LENGTH = 40

/** What the API defaults to; the tab starts from these before `/cohorts` answers. */
export const DEFAULT_COHORT = 'c1-waitlist'
export const DEFAULT_LIFETIME_DAYS = 14

/** The languages an invitation email is written in. */
export const INVITE_LOCALES = Object.freeze(['en', 'es', 'fr', 'de', 'ja'])

/** The states an invitation can be in, in the filter order (board D). */
export const INVITE_STATES = Object.freeze(['open', 'used', 'expired', 'revoked'])

/**
 * Every outcome a result can carry, in the order the summary reads them:
 * what goes out first, then what is left as it was, then what cannot go.
 */
const OUTCOME_ORDER = Object.freeze(['will_invite', 'sent', 'send_failed', 'open_invite', 'invalid', 'has_account', 'left_list'])

/** Pasted text → the entries, split on newlines and commas, trimmed, empty pieces dropped. */
export const parseAddresses = (text) =>
  String(text ?? '')
    .split(/[\n\r,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)

/** Whether a cohort name is one the API accepts. */
export const isValidCohort = (name) =>
  typeof name === 'string' && name.length > 0 && name.length <= COHORT_MAX_LENGTH && COHORT_PATTERN.test(name)

/** The email language to offer first: the admin's own when it is one of the five, else English. */
export const defaultInviteLocale = (language) => {
  const base = String(language ?? '')
    .toLowerCase()
    .split('-')[0]
  return INVITE_LOCALES.includes(base) ? base : 'en'
}

/**
 * The results grouped by outcome, in reading order, with the 1-based line of
 * each entry ("is not a complete address · line 5"). Outcomes nobody had are
 * left out.
 *
 * @param {Array<{input: string, outcome: string}>|null|undefined} results
 * @returns {Array<{outcome: string, count: number, lines: number[]}>}
 */
export const summarizeCheck = (results) => {
  const lines = new Map()
  ;(results ?? []).forEach((result, index) => {
    const list = lines.get(result.outcome) ?? []
    list.push(index + 1)
    lines.set(result.outcome, list)
  })
  const known = OUTCOME_ORDER.filter((outcome) => lines.has(outcome))
  const unknown = [...lines.keys()].filter((outcome) => !OUTCOME_ORDER.includes(outcome))
  return [...known, ...unknown].map((outcome) => ({ outcome, count: lines.get(outcome).length, lines: lines.get(outcome) }))
}

/** How many addresses a dry run says will be invited: the count on the send button. */
export const inviteCount = (results) => (results ?? []).filter((result) => result.outcome === 'will_invite').length

/**
 * The alert after a send (board I): its tone and the parts it states.
 * Success when every email left, warning when one failed, neutral when none went.
 */
export const sendSummary = (results) => {
  const parts = summarizeCheck(results)
  const has = (outcome) => parts.some((part) => part.outcome === outcome)
  const tone = has('send_failed') ? 'warning' : has('sent') ? 'success' : 'neutral'
  return { tone, parts }
}

/** The entries a send did not email, in order, so the admin can fix them and send again. */
export const unsentEntries = (entries, results) => {
  if (!Array.isArray(results)) return [...entries]
  return entries.filter((_, index) => results[index]?.outcome !== 'sent')
}

/** What a row of the list offers: Resend for open and expired, Invite again for revoked, Revoke for open. */
export const rowActions = (invite) => {
  switch (invite?.state) {
    case 'open':
      return ['resend', 'revoke']
    case 'expired':
      return ['resend']
    case 'revoked':
      return ['inviteAgain']
    default:
      return []
  }
}

/** The `code` an API refusal carries in its detail, or null. */
export const apiErrorCode = (error) => {
  const detail = error?.response?.data?.detail
  return detail && typeof detail === 'object' && typeof detail.code === 'string' ? detail.code : null
}

/** The detail object of an API refusal (`needed`, `left`, `retry_at`…), or an empty object. */
export const apiErrorDetail = (error) => {
  const detail = error?.response?.data?.detail
  return detail && typeof detail === 'object' ? detail : {}
}

/**
 * What a refused send says (board I): over today's budget, with what was asked
 * and what is left (nothing was sent), or a failure.
 * @returns {{kind: 'overBudget', needed: number, left: number} | {kind: 'failed'}}
 */
export const sendRefusal = (error) => {
  if (apiErrorCode(error) !== 'over_budget') return { kind: 'failed' }
  const { needed, left } = apiErrorDetail(error)
  return { kind: 'overBudget', needed, left }
}

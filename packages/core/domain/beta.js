/**
 * The beta gate as the clients read it (ADR-038, docs/prd-road-to-market.md FR-006).
 *
 * The server owns three flags and refuses two things with stable codes: a
 * brand-new account without an invite, and a checkout while upgrades are
 * closed. This module names those once so the web header, the register form,
 * the plans page and the upgrade prompt all read the same truth, and so the
 * phone can later read it too. No platform, no React.
 */

/** What every client assumes until the server answers, and when it cannot: no beta. */
export const DEFAULT_BETA_CONFIG = Object.freeze({ active: false, invite_required: false, upgrades_open: true })

/** The header a sign-up request carries its invite code in. */
export const INVITE_HEADER = 'X-Invite-Code'

export const BETA_INVITE_REQUIRED_CODE = 'beta_invite_required'
export const UPGRADES_CLOSED_CODE = 'upgrades_closed'
/** A sign-up with a personal invitation, refused until its email is confirmed (ADR-077). */
export const INVITE_VERIFY_EMAIL_CODE = 'invite_verify_email'

/** What a personal invitation's token starts with; a cohort code never does (ADR-077). */
export const PERSONAL_INVITE_PREFIX = 'nwi_'

/** The query parameter an invite link carries its token in. The address is never in the link. */
export const INVITE_PARAM = 'invite'

/** `GET /beta/config` as a plain, complete object. Anything missing reads as off. */
export const normalizeBetaConfig = (data) => ({
  active: data?.active === true,
  invite_required: data?.invite_required === true,
  upgrades_open: data?.upgrades_open !== false
})

const refusalCode = (error) => {
  const detail = error?.response?.data?.detail
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return null
  return detail.code ?? null
}

/** Did the server refuse this because a new account needs an invite? */
export const isInviteRefusal = (error) => error?.response?.status === 403 && refusalCode(error) === BETA_INVITE_REQUIRED_CODE

/** Did the server refuse this sign-up until the invited email is confirmed? (ADR-077) */
export const isVerifyEmailRefusal = (error) => error?.response?.status === 403 && refusalCode(error) === INVITE_VERIFY_EMAIL_CODE

/** Is this a personal invitation's token rather than a cohort code? */
export const isPersonalInvite = (code) =>
  String(code ?? '')
    .trim()
    .startsWith(PERSONAL_INVITE_PREFIX)

/**
 * The invite a link carries, from a location's search string; '' when there is none.
 * Bounded to what the server accepts, so a pasted novel never reaches the field.
 */
export const inviteFromSearch = (search) => {
  const value = new URLSearchParams(String(search ?? '')).get(INVITE_PARAM)
  const trimmed = String(value ?? '').trim()
  return trimmed.length <= 64 ? trimmed : ''
}

/** Did the server refuse this because upgrades are closed for the beta? */
export const isUpgradesClosed = (error) => error?.response?.status === 403 && refusalCode(error) === UPGRADES_CLOSED_CODE

/** The request headers a sign-up adds for its code; empty when there is none. */
export const inviteHeaders = (code) => {
  const trimmed = String(code ?? '').trim()
  return trimmed ? { [INVITE_HEADER]: trimmed } : {}
}

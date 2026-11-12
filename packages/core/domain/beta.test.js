/**
 * The beta gate as the clients read it (ADR-038).
 */
import {
  BETA_INVITE_REQUIRED_CODE,
  DEFAULT_BETA_CONFIG,
  INVITE_HEADER,
  INVITE_VERIFY_EMAIL_CODE,
  UPGRADES_CLOSED_CODE,
  inviteFromSearch,
  inviteHeaders,
  isInviteRefusal,
  isPersonalInvite,
  isUpgradesClosed,
  isVerifyEmailRefusal,
  normalizeBetaConfig
} from './beta'

const refused = (code, status = 403) => ({ response: { status, data: { detail: { code } } } })

describe('normalizeBetaConfig', () => {
  it('reads the three flags and treats anything missing as off', () => {
    expect(normalizeBetaConfig({ active: true, invite_required: true, upgrades_open: false })).toEqual({
      active: true,
      invite_required: true,
      upgrades_open: false
    })
    expect(normalizeBetaConfig({})).toEqual(DEFAULT_BETA_CONFIG)
    expect(normalizeBetaConfig(undefined)).toEqual(DEFAULT_BETA_CONFIG)
    expect(normalizeBetaConfig({ active: 'yes' })).toEqual(DEFAULT_BETA_CONFIG)
  })
})

describe('refusals', () => {
  it('recognise the two codes only on a 403', () => {
    expect(isInviteRefusal(refused(BETA_INVITE_REQUIRED_CODE))).toBe(true)
    expect(isUpgradesClosed(refused(UPGRADES_CLOSED_CODE))).toBe(true)
    expect(isInviteRefusal(refused(UPGRADES_CLOSED_CODE))).toBe(false)
    expect(isInviteRefusal(refused(BETA_INVITE_REQUIRED_CODE, 401))).toBe(false)
  })

  it('are false for other shapes of error', () => {
    expect(isInviteRefusal(null)).toBe(false)
    expect(isInviteRefusal({ response: { status: 403, data: { detail: 'Forbidden' } } })).toBe(false)
    expect(isUpgradesClosed({ response: { status: 403, data: { detail: [{ msg: 'x' }] } } })).toBe(false)
    expect(isUpgradesClosed({ code: 'ERR_NETWORK' })).toBe(false)
  })
})

describe('inviteHeaders', () => {
  it('names the header only when there is a code', () => {
    expect(inviteHeaders(' c0-7f3a ')).toEqual({ [INVITE_HEADER]: 'c0-7f3a' })
    expect(inviteHeaders('')).toEqual({})
    expect(inviteHeaders(undefined)).toEqual({})
  })
})

describe('personal invitations (ADR-077)', () => {
  it('tells the wait-for-your-email refusal from the missing-code one', () => {
    expect(isVerifyEmailRefusal(refused(INVITE_VERIFY_EMAIL_CODE))).toBe(true)
    expect(isVerifyEmailRefusal(refused(BETA_INVITE_REQUIRED_CODE))).toBe(false)
    expect(isVerifyEmailRefusal(refused(INVITE_VERIFY_EMAIL_CODE, 500))).toBe(false)
    expect(isVerifyEmailRefusal(new Error('network'))).toBe(false)
    expect(isInviteRefusal(refused(INVITE_VERIFY_EMAIL_CODE))).toBe(false)
  })

  it('tells a personal token from a cohort code', () => {
    expect(isPersonalInvite('nwi_abc')).toBe(true)
    expect(isPersonalInvite('  nwi_abc ')).toBe(true)
    for (const other of ['c0-7f3a', 'NWI_abc', '', null, undefined]) expect(isPersonalInvite(other)).toBe(false)
  })

  it('reads the invite from a link and nothing else', () => {
    expect(inviteFromSearch('?invite=nwi_abc-DEF_123')).toBe('nwi_abc-DEF_123')
    expect(inviteFromSearch('?returnUrl=%2Fonboarding&invite=%20friends-1%20')).toBe('friends-1')
    expect(inviteFromSearch('?email=ana@example.com')).toBe('')
    expect(inviteFromSearch('')).toBe('')
    expect(inviteFromSearch(undefined)).toBe('')
    expect(inviteFromSearch(`?invite=${'x'.repeat(65)}`)).toBe('')
  })
})

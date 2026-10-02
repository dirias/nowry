/**
 * The beta gate as the clients read it (ADR-038).
 */
import {
  BETA_INVITE_REQUIRED_CODE,
  DEFAULT_BETA_CONFIG,
  INVITE_HEADER,
  UPGRADES_CLOSED_CODE,
  inviteHeaders,
  isInviteRefusal,
  isUpgradesClosed,
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

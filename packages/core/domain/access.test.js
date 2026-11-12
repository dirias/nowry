import { betaBadgeTone, planBadge, planLabelKey, showsBetaNote, subscriptionAccess } from './access'
import { BRAND, EARNED_GOLD } from '../tokens/colorSystem'
import { contrastRatio } from '../tokens/oklch'

const tester = { tier: 'pro', access: 'beta', paid_tier: 'free' }

describe('subscriptionAccess', () => {
  it('reads the plan in effect, the paid plan and why', () => {
    expect(subscriptionAccess(tester)).toEqual({ tier: 'pro', paidTier: 'free', access: 'beta', isBeta: true })
  })

  it('reads an older API, with no paid_tier, as paying for its tier', () => {
    expect(subscriptionAccess({ tier: 'plus' })).toEqual({ tier: 'plus', paidTier: 'plus', access: 'paid', isBeta: false })
  })

  it('reads nothing, and an unknown plan, as free', () => {
    expect(subscriptionAccess(null)).toEqual({ tier: 'free', paidTier: 'free', access: 'free', isBeta: false })
    expect(subscriptionAccess({ tier: 'enterprise', paid_tier: 'student' }).paidTier).toBe('free')
  })
})

describe('planBadge', () => {
  it('is Beta for a tester who pays nothing', () => {
    expect(planBadge(tester)).toEqual({ kind: 'beta', labelKey: 'beta.mark' })
    expect(showsBetaNote(tester)).toBe(true)
  })

  it('is the paid plan for an account that pays, a tester included', () => {
    expect(planBadge({ tier: 'pro', access: 'paid', paid_tier: 'pro' })).toEqual({ kind: 'paid', labelKey: 'subscription.tier.pro' })
    expect(planBadge({ tier: 'pro', access: 'beta', paid_tier: 'plus' })).toEqual({ kind: 'paid', labelKey: 'subscription.tier.plus' })
    expect(showsBetaNote({ tier: 'pro', access: 'beta', paid_tier: 'plus' })).toBe(false)
  })

  it('has a label for Plus, which the header once lacked', () => {
    expect(planBadge({ tier: 'plus', access: 'paid', paid_tier: 'plus' }).labelKey).toBe('subscription.tier.plus')
  })

  it('is nothing for a free account, whose plan is still named', () => {
    expect(planBadge({ tier: 'free' })).toBeNull()
    expect(planLabelKey({ tier: 'free' })).toBe('subscription.tier.free')
    expect(planLabelKey(tester)).toBe('beta.mark')
  })
})

describe('betaBadgeTone', () => {
  const hex = /^#[0-9a-f]{6}$/i

  it('is Ink Teal in light, and never gold', () => {
    const light = betaBadgeTone('light')
    expect(light.bg.toLowerCase()).toBe(BRAND.inkTeal.toLowerCase())
    expect(light.color).toMatch(hex)
    expect(betaBadgeTone('dark').bg.toLowerCase()).not.toBe(EARNED_GOLD.toLowerCase())
  })

  it('differs by mode and reads anything unknown as light', () => {
    expect(betaBadgeTone('dark').bg).not.toBe(betaBadgeTone('light').bg)
    expect(betaBadgeTone(undefined)).toEqual(betaBadgeTone('light'))
  })

  it('keeps its text at 4.5:1 in both modes', () => {
    for (const mode of ['light', 'dark']) {
      const { bg, color } = betaBadgeTone(mode)
      expect(contrastRatio(bg, color)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

import { FEATURED_TIER_ID, PLAN_FEATURE_ROWS, PLAN_INTERVALS, PLAN_TIERS, planTier } from '../plans'
import en from '../../locales/en/translation.json'

const resolve = (key) => key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), en)

describe('PLAN_TIERS', () => {
  it('lists free, plus and pro in that order', () => {
    expect(PLAN_TIERS.map((tier) => tier.id)).toEqual(['free', 'plus', 'pro'])
  })

  it('prices every tier for both intervals', () => {
    for (const tier of PLAN_TIERS) {
      for (const interval of PLAN_INTERVALS) {
        expect(typeof tier.price[interval]).toBe('string')
        expect(tier.price[interval]).toMatch(/^\$\d/)
      }
    }
  })

  it('answers the same six rows in the same order on every tier', () => {
    for (const tier of PLAN_TIERS) {
      expect(tier.features.map((f) => f.label)).toEqual(PLAN_FEATURE_ROWS.map((row) => `plans.features.${row}`))
    }
  })

  it('points every label, value and name at a string the English bundle has', () => {
    for (const tier of PLAN_TIERS) {
      expect(typeof resolve(tier.nameKey)).toBe('string')
      for (const { label, value } of tier.features) {
        expect(typeof resolve(label)).toBe('string')
        expect(typeof resolve(value)).toBe('string')
      }
    }
  })

  it('features a tier that exists and is paid', () => {
    const featured = planTier(FEATURED_TIER_ID)
    expect(featured).not.toBeNull()
    expect(featured.price.monthly).not.toBe('$0')
    expect(planTier('enterprise')).toBeNull()
  })
})

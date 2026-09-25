/**
 * The three tiers, once (docs/prd-public-site.md D4, ADR-035 §5).
 *
 * `/plans` and the public pricing section both read this table, so the price
 * a visitor sees before signing up is the price the account is charged after.
 * Prices are display strings, as Stripe's checkout is the source of truth for
 * what is billed; the ids of the prices themselves stay in each client's
 * environment (`REACT_APP_STRIPE_*_PRICE_ID`), never here.
 *
 * Feature rows are translation keys in pairs: the row's label and this tier's
 * value for it. Every tier carries the same six rows in the same order, so
 * three cards side by side line up row for row.
 */

export const PLAN_INTERVALS = Object.freeze(['monthly', 'annual'])

/** The six rows every tier answers, in the order the cards show them. */
export const PLAN_FEATURE_ROWS = Object.freeze(['cardGeneration', 'bookExpansion', 'quizGeneration', 'aiUsage', 'studyCards', 'support'])

const rows = (suffixes) =>
  PLAN_FEATURE_ROWS.map((row, i) => ({
    label: `plans.features.${row}`,
    value: `plans.features.${row}${suffixes[i]}`
  }))

export const PLAN_TIERS = Object.freeze([
  {
    id: 'free',
    nameKey: 'subscription.tier.free',
    price: { monthly: '$0', annual: '$0' },
    features: rows(['Free', 'Free', 'Free', 'Free', 'All', 'Free'])
  },
  {
    id: 'plus',
    nameKey: 'subscription.tier.plus',
    price: { monthly: '$8.99', annual: '$89.99' },
    features: rows(['Plus', 'Plus', 'Plus', 'Plus', 'All', 'Plus'])
  },
  {
    id: 'pro',
    nameKey: 'subscription.tier.pro',
    price: { monthly: '$19.99', annual: '$199.99' },
    features: rows(['Pro', 'Pro', 'Pro', 'Pro', 'All', 'Pro'])
  }
])

/** The tier the public site leads with: the first paid one. */
export const FEATURED_TIER_ID = 'plus'

export const planTier = (id) => PLAN_TIERS.find((tier) => tier.id === id) ?? null

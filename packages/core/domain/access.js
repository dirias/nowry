/**
 * Which plan an account is answered as, and what badge it wears (ADR-079, FR-025).
 *
 * The API decides the plan. `subscription.tier` is the plan in effect, so every
 * lock reads it unchanged; `access` says why (`paid`, `beta`, `free`) and
 * `paid_tier` what the account pays for. Screens about billing read the paid
 * plan; the badge reads both. No platform, no React.
 */
import { BRAND_TEAL_SPEC, buildTone } from '../tokens/colorSystem'

export const ACCESS_PAID = 'paid'
export const ACCESS_BETA = 'beta'
export const ACCESS_FREE = 'free'

const PAID_TIERS = Object.freeze(['plus', 'pro'])
const TIERS = Object.freeze(['free', ...PAID_TIERS])

const knownTier = (value) => (TIERS.includes(value) ? value : 'free')

/**
 * The subscription as the clients read it. An API from before ADR-079 sends no
 * `paid_tier`; its `tier` was the paid plan, so that is what is read.
 *
 * @param {{tier?: string, access?: string, paid_tier?: string}|null|undefined} subscription
 * @returns {{tier: string, paidTier: string, access: string, isBeta: boolean}}
 */
export const subscriptionAccess = (subscription) => {
  const tier = knownTier(subscription?.tier)
  const paidTier = knownTier(subscription?.paid_tier ?? tier)
  const isBeta = subscription?.access === ACCESS_BETA
  const access = isBeta ? ACCESS_BETA : PAID_TIERS.includes(paidTier) ? ACCESS_PAID : ACCESS_FREE
  return { tier, paidTier, access, isBeta }
}

/**
 * The badge an account wears where "Pro" is shown, or null for a free account.
 * An account that pays shows its paid plan, a tester included; otherwise a
 * tester shows "Beta".
 *
 * @returns {{kind: 'paid'|'beta', labelKey: string}|null}
 */
export const planBadge = (subscription) => {
  const { paidTier, isBeta } = subscriptionAccess(subscription)
  if (PAID_TIERS.includes(paidTier)) return { kind: 'paid', labelKey: `subscription.tier.${paidTier}` }
  if (isBeta) return { kind: 'beta', labelKey: 'beta.mark' }
  return null
}

/** The translation key for the plan's name wherever it is written out. */
export const planLabelKey = (subscription) => planBadge(subscription)?.labelKey ?? 'subscription.tier.free'

/** Does this account read "Beta: all features unlocked" where its plan is described? */
export const showsBetaNote = (subscription) => planBadge(subscription)?.kind === 'beta'

/**
 * The Beta badge's colours: the brand's teal as a solid. Ink Teal with paper
 * text in light; in dark a solid is light with ink text (ADR-074), so the
 * teal stays readable on the teal grounds. Gold stays for what is earned.
 *
 * @param {'light'|'dark'} mode
 * @returns {{bg: string, color: string}}
 */
export const betaBadgeTone = (mode) => {
  const tone = buildTone(BRAND_TEAL_SPEC, mode === 'dark' ? 'dark' : 'light')
  return { bg: tone.solidBg, color: tone.solidColor }
}

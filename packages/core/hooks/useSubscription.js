import { useAuth } from '../context/AuthContext'
import { subscriptionAccess } from '../domain/access'

export const useSubscription = () => {
  const { user } = useAuth()
  // ADR-079: `tier` is the plan in effect (Pro for a tester); `paidTier` is what
  // the account pays for, which is what a billing screen must read.
  const { paidTier, access, isBeta } = subscriptionAccess(user?.subscription)
  return {
    tier: user?.subscription?.tier ?? 'free',
    paidTier,
    access,
    isBeta,
    status: user?.subscription?.status ?? 'active',
    aiUsageCount: user?.subscription?.ai_usage_count ?? 0,
    aiUsageResetDate: user?.subscription?.ai_usage_reset_date,
    nextBillingDate: user?.subscription?.next_billing_date,
    statusUpdatedAt: user?.subscription?.subscription_status_updated_at,
    isPastDue: user?.subscription?.status === 'past_due',
    // Flashcard plan-limit fields — may be absent until the backend exposes them;
    // consumers must treat a non-finite flashcardLimit as "no known limit"
    flashcardLimit: user?.subscription?.flashcard_limit ?? null,
    flashcardCount: user?.subscription?.flashcard_count ?? 0
  }
}

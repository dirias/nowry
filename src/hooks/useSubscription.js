import { useAuth } from '../context/AuthContext'

export const useSubscription = () => {
  const { user } = useAuth()
  return {
    tier: user?.subscription?.tier ?? 'free',
    status: user?.subscription?.status ?? 'active',
    aiUsageCount: user?.subscription?.ai_usage_count ?? 0,
    aiUsageResetDate: user?.subscription?.ai_usage_reset_date,
    nextBillingDate: user?.subscription?.next_billing_date,
    statusUpdatedAt: user?.subscription?.subscription_status_updated_at,
    isPastDue: user?.subscription?.status === 'past_due',
  }
}

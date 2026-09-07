/**
 * The upgrade-prompt state, without the prompt.
 *
 * `SubscriptionContext` used to render `UpgradePrompt` inside its provider,
 * which made the provider a view. The state moves here and each client renders
 * its own prompt around it.
 *
 * Session-scoped on purpose: this resets on reload and is deliberately NOT
 * persisted (D-06, Pitfall 3). It does not replace `useSubscription`, which
 * remains the source of tier data.
 */
import { useCallback, useState } from 'react'

export const useSubscriptionState = () => {
  const [upgradeDismissed, setUpgradeDismissed] = useState(false)
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  // Which headline the prompt shows. The client reads it; the context value does not expose it.
  const [upgradeHeadline, setUpgradeHeadline] = useState(null)

  const dismissUpgrade = useCallback(() => setUpgradeDismissed(true), [])

  const openUpgradeModal = useCallback((headline = null) => {
    setUpgradeHeadline(headline)
    setIsUpgradeModalOpen(true)
  }, [])

  const closeUpgradeModal = useCallback(() => {
    setIsUpgradeModalOpen(false)
    setUpgradeHeadline(null)
  }, [])

  return { upgradeDismissed, dismissUpgrade, isUpgradeModalOpen, openUpgradeModal, closeUpgradeModal, upgradeHeadline }
}

export default useSubscriptionState

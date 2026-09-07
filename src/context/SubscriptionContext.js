/**
 * SubscriptionProvider — the web client's upgrade prompt.
 *
 * The state lives in `@nowry/core/context/useSubscriptionState`; this file is
 * the one thing that cannot be shared, the `UpgradePrompt` it renders.
 *
 * Does NOT replace `useSubscription()` — that remains the source of tier data.
 * Dismiss state is session-scoped and resets on reload (D-06, Pitfall 3).
 */
import React, { createContext, useContext } from 'react'
import { useSubscriptionState } from '@nowry/core/context/useSubscriptionState'
import UpgradePrompt from '../components/Common/UpgradePrompt'

const SubscriptionContext = createContext(null)

export const SubscriptionProvider = ({ children }) => {
  const { upgradeDismissed, dismissUpgrade, isUpgradeModalOpen, openUpgradeModal, closeUpgradeModal, upgradeHeadline } =
    useSubscriptionState()

  return (
    <SubscriptionContext.Provider
      value={{
        upgradeDismissed,
        dismissUpgrade,
        isUpgradeModalOpen,
        openUpgradeModal,
        closeUpgradeModal
      }}
    >
      <UpgradePrompt open={isUpgradeModalOpen} onClose={closeUpgradeModal} headline={upgradeHeadline} />
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscriptionContext = () => {
  const context = useContext(SubscriptionContext)
  if (!context) throw new Error('useSubscriptionContext must be used within a SubscriptionProvider')
  return context
}

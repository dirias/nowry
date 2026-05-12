/**
 * SubscriptionContext — Phase 4 (D-10, D-11, D-12)
 *
 * Manages session-local upgrade CTA dismiss state and upgrade modal visibility.
 * Does NOT replace useSubscription() hook — that remains the source of tier data.
 *
 * Usage:
 *   const { upgradeDismissed, dismissUpgrade, isUpgradeModalOpen, openUpgradeModal, closeUpgradeModal }
 *     = useSubscriptionContext()
 *
 * State resets on page reload (React state only, no localStorage — per D-06).
 */
import React, { createContext, useContext, useState } from 'react'

const SubscriptionContext = createContext(null)

export const SubscriptionProvider = ({ children }) => {
  // Session-scoped dismiss: resets on page reload (do NOT use localStorage — per D-06, Pitfall 3)
  const [upgradeDismissed, setUpgradeDismissed] = useState(false)
  // Upgrade modal visibility
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)

  const dismissUpgrade = () => setUpgradeDismissed(true)
  const openUpgradeModal = () => setIsUpgradeModalOpen(true)
  const closeUpgradeModal = () => setIsUpgradeModalOpen(false)

  return (
    <SubscriptionContext.Provider
      value={{
        upgradeDismissed,
        dismissUpgrade,
        isUpgradeModalOpen,
        openUpgradeModal,
        closeUpgradeModal,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscriptionContext = () => {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider')
  }
  return ctx
}

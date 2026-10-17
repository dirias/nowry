import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSubscription } from '@nowry/core/hooks/useSubscription'
import { useSubscriptionContext } from '../../context/SubscriptionContext'

/**
 * Who may share, and with which board the share sheet is open. Sharing is a
 * Plus and Pro feature, as it was on the Blackboard: on Free the Share key
 * stays where it is and opens the plans, never a disabled key.
 */
export default function useBoardShare() {
  const { t } = useTranslation()
  const { tier } = useSubscription()
  const { openUpgradeModal } = useSubscriptionContext()
  const [shareId, setShareId] = useState(null)

  const share = useCallback(
    (boardId) => {
      if (tier === 'free') openUpgradeModal(t('boards.share.upgrade'))
      else setShareId(boardId)
    },
    [tier, openUpgradeModal, t]
  )

  const closeShare = useCallback(() => setShareId(null), [])

  return { shareId, share, closeShare }
}

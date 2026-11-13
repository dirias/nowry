/**
 * The re-registration notice (ADR-089, FR-041), for both clients.
 *
 * `/users/me` carries `previous_account` only when it may be shown: a verified
 * address, an account made after a deletion with the same address less than
 * 30 days old, and not dismissed. Dismissing hides it at once and tells the API.
 */
import { useCallback, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { userService } from '../api/services/user.service'
import { previousAccountDates } from '../domain/previousAccount'

export function usePreviousAccountNotice(language) {
  const { user, updateUser } = useAuth()
  const [hidden, setHidden] = useState(false)
  const dates = hidden ? null : previousAccountDates(user?.previous_account, language)

  const dismiss = useCallback(async () => {
    setHidden(true)
    updateUser((current) => ({ ...current, previous_account: null }))
    try {
      await userService.dismissPreviousAccount()
    } catch {
      // Shown again at the next load, which is the honest outcome.
    }
  }, [updateUser])

  return { visible: Boolean(dates), dates, dismiss }
}

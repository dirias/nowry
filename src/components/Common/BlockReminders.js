/**
 * Mounts the in-session block reminders (PLAN-007, PRD D6).
 *
 * The web has no scheduler, so the shared hook arms timers for today's
 * reminders while a tab is open and announces each through the browser's own
 * notification. The switch is this browser's own, from the account settings.
 */
import { useBlockReminders, useBlockReminderSetting } from '@nowry/core/hooks/useBlockReminders'

export default function BlockReminders() {
  const { enabled } = useBlockReminderSetting()
  useBlockReminders({ enabled })
  return null
}

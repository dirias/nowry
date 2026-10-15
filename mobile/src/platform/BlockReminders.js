/**
 * Mounts the week's block reminders (PLAN-007, PRD D6).
 *
 * Nothing to draw: the hook reads the week's occurrences and hands the OS one
 * dated notification per block that asked for one. The switch is the device's
 * own, from Settings.
 */
import { useBlockReminders, useBlockReminderSetting } from '@nowry/core/hooks/useBlockReminders'

export function BlockReminders() {
  const { enabled } = useBlockReminderSetting()
  useBlockReminders({ enabled })
  return null
}

export default BlockReminders

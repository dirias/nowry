import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBlocks } from './useBlocks'
import { alerts, storage } from '../platform'
import { addDaysKey, localDateKey } from '../domain/blocks/dates'
import { REMINDER_HORIZON_DAYS, REMINDER_ROUTE, reminderItems } from '../domain/blocks/reminders'

/**
 * The switch lives on the device, not on the account (PRD D6): a reminder is a
 * local notification, and wanting them on the phone and not on the laptop is
 * the ordinary case. Default on.
 */
export const BLOCK_REMINDERS_KEY = 'nowry_block_reminders'

const listeners = new Set()

export const readBlockRemindersSetting = () => {
  try {
    return storage.get(BLOCK_REMINDERS_KEY) !== 'off'
  } catch {
    return true
  }
}

export function useBlockReminderSetting() {
  const [enabled, setState] = useState(readBlockRemindersSetting)
  useEffect(() => {
    listeners.add(setState)
    return () => listeners.delete(setState)
  }, [])
  const setEnabled = useCallback((value) => {
    try {
      storage.set(BLOCK_REMINDERS_KEY, value ? 'on' : 'off')
    } catch {
      // The switch still flips for this session.
    }
    listeners.forEach((notify) => notify(Boolean(value)))
  }, [])
  return { enabled, setEnabled }
}

/** The words of a reminder: the block's own, never "time to study". */
export const reminderCopy = (item, t) => {
  const o = item.occurrence
  const title = o.title || o.block?.title || ''
  const source = t(`blocks.source.${o.block?.source?.type ?? 'free'}`)
  return {
    title: item.leadMin > 0 ? t('blocks.reminder.inMinutes', { title, count: item.leadMin }) : t('blocks.reminder.now', { title }),
    body: t('blocks.reminder.body', { minutes: o.lengthMin, source })
  }
}

/**
 * useBlockReminders — stand one reminder per occurrence for the week ahead
 * (PRD D6, ADR-045 §5).
 *
 * Mount once per client. On the phone the port hands the OS a dated
 * notification per item and reports how many it holds; the web has no
 * scheduler, the port says `null`, and this hook arms in-session timers for
 * today's items instead, so a tab left open still says "Morning review in 5
 * min" at 07:25. Re-planned whenever the week's occurrences change — an edit,
 * a tick, a new day — and cleared when the switch is off.
 */
export function useBlockReminders({ enabled = true } = {}) {
  const { t } = useTranslation()
  const todayKey = localDateKey(new Date())
  const { occurrences } = useBlocks({ from: todayKey, to: addDaysKey(todayKey, REMINDER_HORIZON_DAYS - 1), enabled })

  useEffect(() => {
    if (!enabled) {
      Promise.resolve(alerts.cancelBlockReminders()).catch(() => {})
      return undefined
    }
    if (!occurrences) return undefined
    const items = reminderItems(occurrences, new Date()).map((item) => ({ ...item, ...reminderCopy(item, t), route: REMINDER_ROUTE }))
    let timers = []
    Promise.resolve(alerts.scheduleBlockReminders(items))
      .then((scheduled) => {
        if (scheduled !== null) return
        timers = items
          .filter((item) => item.date === todayKey)
          .map((item) => setTimeout(() => alerts.announce(item.title, item.body), Math.max(0, item.fireAt.getTime() - Date.now())))
      })
      .catch(() => {})
    return () => timers.forEach((timer) => clearTimeout(timer))
  }, [occurrences, enabled, t, todayKey])
}

export default useBlockReminders

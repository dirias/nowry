/**
 * The outbox (MOB-026).
 *
 * A grade is the one write that must not wait for a signal. Recall practice is
 * a rhythm, and a session that stops on a spinner in a tunnel is a session the
 * user abandons. So a grade that fails to reach the server is written here
 * instead, and sent when sending starts working again.
 *
 * **Durable, because the app can die.** The queue is MMKV, not memory: a phone
 * that runs out of battery on the underground must still have those grades
 * tomorrow.
 *
 * **Strictly in order, and only removed on success.** Two grades for the same
 * card must reach the server in the order they were given, and a failed drain
 * must leave the queue exactly as it found it. That makes delivery at-least-
 * once, not exactly-once: a request that the server accepted but whose response
 * never arrived will be sent again. Making it exactly-once needs an idempotency
 * key the server honours, which is a backend change and is recorded as one.
 *
 * **Reconnection is discovered, not announced.** There is no connectivity
 * listener here on purpose: `expo-network` is a native module and would cost a
 * rebuild for a signal the queue can infer by trying. It drains when the app
 * comes back to the foreground and after each successful send.
 */
import { storage } from '@nowry/core'

const KEY = 'NOWRY_SYNC_QUEUE'
const MAX_ENTRIES = 500

/** A bad or half-written record must lose itself, never the caller's session. */
const read = () => {
  try {
    const raw = storage.get(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const write = (entries) => {
  try {
    storage.set(KEY, JSON.stringify(entries))
  } catch {
    // A device that cannot write has already lost the grade; nothing here helps.
  }
}

export const size = () => read().length

export const clearQueue = () => {
  try {
    storage.remove(KEY)
  } catch {
    // As above.
  }
}

/**
 * Add one entry. `kind` names a sender in the table the drainer is given, and
 * `args` is whatever that sender takes.
 *
 * The cap is a safety valve, not a policy: a queue that has grown past five
 * hundred entries is a queue that has been failing for a very long time, and
 * dropping the oldest keeps the app from carrying an unbounded blob forever.
 */
export const enqueue = (kind, args) => {
  const entries = read()
  entries.push({ kind, args, at: Date.now() })
  write(entries.slice(-MAX_ENTRIES))
}

/**
 * Send what is queued, oldest first, stopping at the first failure.
 *
 * Stopping rather than skipping is the point: order is the whole reason this
 * exists, and a later grade sent before an earlier one would schedule the card
 * from the wrong answer.
 *
 * @param {Record<string, (args: any) => Promise<unknown>>} senders
 * @returns {Promise<{ sent: number, remaining: number }>}
 */
export const drain = async (senders) => {
  let entries = read()
  let sent = 0

  while (entries.length > 0) {
    const [head] = entries
    const send = senders[head.kind]

    // An entry no sender claims can never leave. Drop it rather than block
    // every grade behind it forever.
    if (!send) {
      entries = entries.slice(1)
      write(entries)
      continue
    }

    try {
      await send(head.args)
    } catch {
      break
    }

    entries = entries.slice(1)
    write(entries)
    sent += 1
  }

  return { sent, remaining: entries.length }
}

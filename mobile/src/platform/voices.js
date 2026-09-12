/**
 * The voice list, on a phone.
 *
 * There was none: the phone offered a deck's whole Audio section — side,
 * auto-play, voice — for audio it could never play, and the voice picker was
 * permanently empty. That was recorded here as a decision, and it was the wrong
 * one to keep once the session learned to speak (MOB-077).
 *
 * `useDeckSettings` takes the subscription as a parameter (MOB-004), so this
 * file is still the only thing that knows the engine exists. What changed is
 * that it now asks it.
 *
 * The list is asynchronous and, on Android, can come back empty on the first
 * call while the engine is still starting. A subscription is the right shape
 * for that: the picker draws with whatever it has, and fills in.
 */
import { listVoices } from './speech'

/**
 * Android's engine takes a moment to enumerate. Three tries over four seconds,
 * and then it is a device with no voices installed rather than a slow one —
 * asking forever would be a timer that never stops on exactly those devices.
 */
const RETRY_MS = 1200
const TRIES = 3

export const subscribeToDeviceVoices = (onVoices) => {
  let cancelled = false
  let timer = null

  const load = async (attempt = 1) => {
    const voices = await listVoices()
    if (cancelled) return
    onVoices(voices)
    if (voices.length === 0 && attempt < TRIES) timer = setTimeout(() => load(attempt + 1), RETRY_MS)
  }

  onVoices([])
  load()

  return () => {
    cancelled = true
    if (timer) clearTimeout(timer)
  }
}

export default subscribeToDeviceVoices

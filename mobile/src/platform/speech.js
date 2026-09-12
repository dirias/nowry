/**
 * Speaking, on a phone.
 *
 * The web has `speechSynthesis` and a service wrapped around it. Android and
 * iOS have their own engines, reached through `expo-speech`, and the two APIs
 * differ in three ways that matter:
 *
 * 1. **A voice is an identifier, not a name.** iOS calls Samantha
 *    `com.apple.ttsbundle.Samantha-compact`; a deck stores the name. So the
 *    list is normalised to the web's `{name, lang}` shape for matching, and the
 *    identifier is carried alongside for the engine.
 * 2. **There is no pause on Android.** `Speech.pause()` is iOS-only, so the
 *    control this serves is Listen and Stop, not Listen and Pause. A control
 *    that silently does nothing on the platform most of these users are on is
 *    worse than one that does something honest.
 * 3. **Rate is not the browser's rate.** Both call 1.0 normal, which is the
 *    only agreement needed: a deck's saved rate travels unchanged.
 *
 * Nothing here decides WHICH voice. That is `voiceMatch` in the shared package,
 * because the web asks the same question and the answer has to be the same one.
 */
/*
 * Required, not imported. `expo-speech` is a native module: on a build made
 * before it was added — which is every build already on a device — reaching
 * for it throws at import time and takes the whole screen with it. A screen
 * that fails to render is a far worse answer than a phone that cannot speak,
 * so the absence is a fact this file reports rather than a crash it causes.
 */
let Speech = null
try {
  // eslint-disable-next-line global-require
  Speech = require('expo-speech')
} catch {
  Speech = null
}

/** Whether this build can speak at all. The Listen control asks. */
export const canSpeak = () => Speech !== null

/** The web's voice shape, plus the identifier the engine needs back. */
const asVoice = (voice) => ({
  name: voice?.name || voice?.identifier || '',
  lang: voice?.language || '',
  identifier: voice?.identifier || null
})

/** Every voice installed on this device, or `[]` if the engine will not say. */
export async function listVoices() {
  if (!Speech) return []
  try {
    const voices = await Speech.getAvailableVoicesAsync()
    return (voices ?? []).map(asVoice).filter((voice) => voice.name && voice.lang)
  } catch {
    return []
  }
}

/**
 * Say `text`, cancelling whatever is being said.
 *
 * `onDone` fires once, whether the utterance finished or was stopped, so a
 * caller's "speaking" flag can never be left stuck on — `onStopped` is not
 * emitted by every engine and `onError` is emitted by some for a plain cancel.
 */
export function speak(text, { lang, rate, pitch, voice, onStart, onDone, onError } = {}) {
  if (!text || !Speech) return

  let settled = false
  const settle = (report) => {
    if (settled) return
    settled = true
    report?.()
    onDone?.()
  }

  try {
    Speech.speak(String(text), {
      language: lang || undefined,
      voice: voice || undefined,
      rate: rate ?? 1.0,
      pitch: pitch ?? 1.0,
      onStart: () => onStart?.(),
      onDone: () => settle(),
      onStopped: () => settle(),
      onError: (error) => settle(() => onError?.(error))
    })
  } catch (error) {
    // An engine that refuses the utterance still has to release the caller:
    // a "speaking" flag nothing ever clears leaves a Stop button that stops
    // nothing.
    settle(() => onError?.(error))
  }
}

/** Silence, now. Safe to call when nothing is speaking. */
export function stop() {
  if (!Speech) return
  try {
    Speech.stop()
  } catch {
    /* The engine was never started; there is nothing to stop. */
  }
}

/** Whether the engine is mid-utterance, which only it knows. */
export async function isSpeaking() {
  if (!Speech) return false
  try {
    return await Speech.isSpeakingAsync()
  } catch {
    return false
  }
}

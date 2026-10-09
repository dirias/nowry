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

/**
 * How long the engine gets to START before the utterance is given up on, and
 * how long it gets to FINISH. The second scales with the text: a long answer
 * takes a while, and a cap that cut it off mid-sentence would be the bug.
 */
export const START_GRACE_MS = 2500
export const MS_PER_CHARACTER = 350
export const MIN_FINISH_MS = 6000
export const finishBudgetFor = (text) => Math.max(MIN_FINISH_MS, String(text ?? '').length * MS_PER_CHARACTER)

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
 * `onDone` fires once, whether the utterance finished, was stopped, or never
 * happened, so a caller's "speaking" flag can never be left stuck on —
 * `onStopped` is not emitted by every engine and `onError` is emitted by some
 * for a plain cancel.
 *
 * **An utterance the engine drops sends nothing back** (MOB-113). Android's
 * `TextToSpeech.speak` returns an error code the native module ignores, and a
 * voice that cannot synthesise — a network voice with no network — is exactly
 * such a drop: no start, no done, no error, ever. That left the Listen control
 * on Stop after the first card, on a real phone, with every later tap halting
 * nothing. So the utterance is given a grace period to start and a budget to
 * finish, and is settled as an error when either runs out.
 */
export function speak(text, { lang, rate, pitch, voice, onStart, onDone, onError } = {}) {
  if (!text || !Speech) return

  let settled = false
  let started = false
  let startTimer = null
  let finishTimer = null
  const settle = (report) => {
    if (settled) return
    settled = true
    clearTimeout(startTimer)
    clearTimeout(finishTimer)
    report?.()
    onDone?.()
  }

  try {
    Speech.speak(String(text), {
      language: lang || undefined,
      voice: voice || undefined,
      rate: rate ?? 1.0,
      pitch: pitch ?? 1.0,
      onStart: () => {
        started = true
        clearTimeout(startTimer)
        onStart?.()
      },
      onDone: () => settle(),
      onStopped: () => settle(),
      onError: (error) => settle(() => onError?.(error))
    })
    startTimer = setTimeout(() => {
      if (!started) settle(() => onError?.(new Error('speech never started')))
    }, START_GRACE_MS)
    finishTimer = setTimeout(() => settle(() => onError?.(new Error('speech never finished'))), finishBudgetFor(text))
  } catch (error) {
    // An engine that refuses the utterance still has to release the caller:
    // a "speaking" flag nothing ever clears leaves a Stop button that stops
    // nothing.
    settle(() => onError?.(error))
  }
}

/**
 * The voice to hand the engine, if any (MOB-113).
 *
 * Only a voice the learner picked BY NAME on this device goes to the engine.
 * A voice matched by language alone stays with the engine's own default for
 * that language: the matcher cannot tell a local voice from a network one,
 * and Google's engine lists the network voices first, so "best for ja" was a
 * voice that needs Google's servers and fails silently without them. The
 * default is what the first tap used, and the first tap always worked.
 *
 * @param {{ name?: string, identifier?: string | null } | null} resolved - what `resolveVoice` chose
 * @param {{ voiceName?: string | null } | null} settings - the deck's saved side
 * @returns {string | null} an identifier for the engine, or null for its default
 */
export function voiceToRequest(resolved, settings) {
  const chosen = settings?.voiceName
  if (!chosen || !resolved || resolved.name !== chosen) return null
  return resolved.identifier ?? null
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

/**
 * The browser's voice list, shaped for `useDeckSettings`.
 *
 * `speechSynthesis.getVoices()` is empty on first call in most browsers and
 * fills in asynchronously, which is why this subscribes rather than reads once.
 * The mobile client will implement the same contract over whatever its TTS
 * engine exposes.
 *
 * @param {(voices: SpeechSynthesisVoice[]) => void} onVoices
 * @returns {() => void} unsubscribe
 */
export const subscribeToBrowserVoices = (onVoices) => {
  const speech = window.speechSynthesis
  const load = () => onVoices(speech?.getVoices() || [])
  load()
  if (!speech) return () => {}
  speech.onvoiceschanged = load
  return () => {
    speech.onvoiceschanged = null
  }
}

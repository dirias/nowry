/**
 * The voice list, on a phone.
 *
 * There is none yet, deliberately. The web enumerates voices through
 * `speechSynthesis`, which does not exist here; the mobile equivalent is
 * `expo-speech`, and that is a native module — another build, for a picker that
 * only matters once mobile actually speaks. Mobile TTS is not in v1.
 *
 * What this does NOT block is the criterion that matters: a deck's voice
 * settings written on the phone — the side, the rate, the pitch, and a voice
 * name already chosen on the web — are saved through the shared service and
 * honoured by the web's TTS. Only *discovering* new voice names waits.
 *
 * When mobile TTS lands, this becomes `Speech.getAvailableVoicesAsync()` and
 * nothing above it changes: `useDeckSettings` already takes the subscription as
 * a parameter (MOB-004).
 */
export const subscribeToDeviceVoices = (onVoices) => {
  onVoices([])
  return () => {}
}

export default subscribeToDeviceVoices

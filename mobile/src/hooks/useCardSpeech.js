/**
 * Reading a card aloud (MOB-077).
 *
 * The phone has shown a deck's Audio section since MOB-021 — which side to
 * read, whether to read it automatically, which voice — and has never read
 * anything. Settings for a feature that does not exist is worse than no
 * settings: the learner configures it, hears nothing, and concludes the app is
 * broken rather than incomplete.
 *
 * What this owns is the part that is genuinely the phone's: holding the
 * engine's state, sequencing utterances, and stopping when the card changes.
 * What it does not own is any decision the web also makes —
 *
 *   - what a card sounds like → `cardSpeech.speechTextFor`
 *   - which voice a saved setting means here → `voiceMatch.resolveVoice`
 *   - how mixed-language text is split → `speechSegments.fetchSegments`
 *
 * all three shared, because an audio feature that disagreed with the web about
 * what to read would be a different feature wearing the same switch.
 *
 * **Auto-play is not gated on a gesture.** The web needs a first tap because
 * browsers refuse to speak without one; a native engine has no such rule, so a
 * deck with auto-play on speaks the card it is showing. That is what the
 * setting says, and making the phone wait for a tap would make the setting a
 * lie on the platform it was written for.
 *
 * **A card change silences whatever is speaking.** Grading fast would
 * otherwise stack utterances, and the fifth card would be hearing the second.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { speechTextFor } from '@nowry/core/domain/cardSpeech'
import { fetchSegments, segmentLang, segmentText } from '@nowry/core/domain/speechSegments'
import { resolveVoice } from '@nowry/core/domain/voiceMatch'
import { canSpeak, speak, stop } from '../platform/speech'
import { subscribeToDeviceVoices } from '../platform/voices'

export function useCardSpeech({ card, flipped = false, settings = null } = {}) {
  const [voices, setVoices] = useState([])
  const [speaking, setSpeaking] = useState(false)

  /*
   * Which utterance is current. Every callback checks it before touching
   * state, so a segment that finishes after the card moved on cannot restart
   * the sequence or flip `speaking` back on.
   */
  const runId = useRef(0)

  useEffect(() => subscribeToDeviceVoices(setVoices), [])

  const text = useMemo(() => speechTextFor(card, { flipped }), [card, flipped])

  /** The device's answer to what the deck saved, for a given language. */
  const voiceFor = useCallback(
    (lang) => resolveVoice(voices, { targetLang: lang || settings?.voiceLang, targetName: settings?.voiceName }),
    [voices, settings?.voiceLang, settings?.voiceName]
  )

  const halt = useCallback(() => {
    runId.current += 1
    stop()
    setSpeaking(false)
  }, [])

  /** One utterance, or a chain of them, depending on what the text is. */
  const play = useCallback(async () => {
    if (!text) return
    halt()
    const run = runId.current
    const current = () => runId.current === run

    const rate = settings?.rate ?? 1.0
    const pitch = settings?.pitch ?? 1.0

    // Auto-detect (ADR-001) is the default. A failure here is silence from the
    // server, not from the phone: the whole text is still spoken below.
    const segments = (settings?.mode ?? 'auto') === 'auto' ? await fetchSegments(text) : null
    if (!current()) return

    if (!segments) {
      const voice = voiceFor(null)
      setSpeaking(true)
      speak(text, {
        lang: voice?.lang || settings?.voiceLang || undefined,
        voice: voice?.identifier,
        rate,
        pitch,
        onDone: () => current() && setSpeaking(false)
      })
      return
    }

    setSpeaking(true)
    const next = (index) => {
      if (!current()) return
      if (index >= segments.length) return setSpeaking(false)
      const language = segmentLang(segments[index])
      const voice = voiceFor(language)
      speak(segmentText(segments[index]), {
        lang: voice?.lang || language,
        voice: voice?.identifier,
        rate,
        pitch,
        onDone: () => next(index + 1)
      })
    }
    next(0)
  }, [text, halt, settings?.mode, settings?.rate, settings?.pitch, settings?.voiceLang, voiceFor])

  const toggle = useCallback(() => (speaking ? halt() : play()), [speaking, halt, play])

  /*
   * Auto-play, and the silence that has to come with it. The cleanup runs on
   * every card and on leaving the session, which is what keeps a session the
   * user walked away from from talking to an empty room.
   */
  useEffect(() => {
    if (settings?.autoPlay && text) play()
    return halt
    // `play` is deliberately absent: it changes identity with `text`, and
    // including it fires this twice per card — the web carries the same note
    // for the same reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, settings?.autoPlay, halt])

  /*
   * `canSpeak` is false on a build made before the speech module was added, so
   * the control simply is not there — an offer that does nothing is worse than
   * no offer, and this is exactly the mistake the deck screen was making by
   * showing an Audio section for audio that never played.
   */
  return { speaking, canSpeak: canSpeak() && Boolean(text), toggle, stop: halt }
}

export default useCardSpeech

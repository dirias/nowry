/**
 * Text-to-Speech Service using Web Speech API
 * Supports multi-language and voice selection
 */

class TTSService {
  constructor() {
    this.synth = window.speechSynthesis
    this.utterance = null
    this.voices = []
    this.selectedVoice = null
    this.selectedLanguage = 'en-US'
    this.isPlaying = false
    this._voiceListeners = []

    // Load voices when they become available
    if (this.synth) {
      this.loadVoices()
      // Chrome/Android loads voices asynchronously via this event
      this.synth.onvoiceschanged = () => {
        this.loadVoices()
        // Notify all registered components that voices are now available
        this._voiceListeners.forEach((cb) => cb(this.voices))
      }

      // iOS Safari & some mobile browsers never fire onvoiceschanged.
      // Poll until voices are available (max ~3 seconds).
      if (this.voices.length === 0) {
        let attempts = 0
        const poll = setInterval(() => {
          this.loadVoices()
          attempts++
          if (this.voices.length > 0 || attempts >= 30) {
            clearInterval(poll)
            if (this.voices.length > 0) {
              this._voiceListeners.forEach((cb) => cb(this.voices))
            }
          }
        }, 100)
      }
    }
  }

  onVoicesReady(callback) {
    if (this.voices.length > 0) {
      // Voices already loaded — call immediately
      callback(this.voices)
    } else {
      this._voiceListeners.push(callback)
    }
    // Return cleanup function
    return () => {
      this._voiceListeners = this._voiceListeners.filter((cb) => cb !== callback)
    }
  }

  loadVoices() {
    this.voices = this.synth.getVoices()

    // Auto-select first voice if none selected
    if (!this.selectedVoice && this.voices.length > 0) {
      // Prioritize "Google" or "Enhanced" voices for better quality
      const preferredVoice = this.voices.find(
        (v) => v.lang === this.selectedLanguage && (v.name.includes('Google') || v.name.includes('Enhanced') || v.name.includes('Premium'))
      )

      this.selectedVoice = preferredVoice || this.voices.find((v) => v.lang === this.selectedLanguage) || this.voices[0]
    }
  }

  getVoices() {
    return this.voices
  }

  getVoicesByLanguage(lang) {
    return this.voices.filter((v) => v.lang.startsWith(lang))
  }

  getLanguages() {
    const langs = new Set(this.voices.map((v) => v.lang.split('-')[0]))
    return Array.from(langs).sort()
  }

  setVoice(voice) {
    this.selectedVoice = voice
    this.selectedLanguage = voice.lang
  }

  setLanguage(lang) {
    this.selectedLanguage = lang
    const voice = this.voices.find((v) => v.lang.startsWith(lang))
    if (voice) {
      this.selectedVoice = voice
    }
  }

  speak(text, options = {}) {
    if (!this.synth) {
      console.error('Speech synthesis not supported')
      return
    }

    // Cancel any ongoing speech first. Chrome fires onerror('interrupted') on
    // the previous utterance when cancel() is called — that is expected, not a bug.
    // Mark the utterance as intentionally cancelled so the error handler stays quiet.
    if (this.utterance) {
      this.utterance._cancelled = true
    }
    this.stop()

    // Chrome bug: calling speak() synchronously right after cancel() silently
    // drops the new utterance on some versions. A minimal 50ms delay lets the
    // engine flush before we enqueue the new one.
    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(text)
      this.utterance = utterance

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice
      }

      utterance.lang = options.lang || this.selectedLanguage
      utterance.rate = options.rate || 1.0
      utterance.pitch = options.pitch || 1.0
      utterance.volume = options.volume || 1.0

      utterance.onstart = () => {
        this.isPlaying = true
        if (options.onStart) options.onStart()
      }

      utterance.onend = () => {
        this.isPlaying = false
        if (options.onEnd) options.onEnd()
      }

      utterance.onerror = (error) => {
        // 'interrupted' fires whenever cancel() is called on a speaking utterance.
        // Since we always cancel before a new speak(), this is expected — suppress it.
        if (error.error === 'interrupted' || utterance._cancelled) return
        this.isPlaying = false
        console.error('TTS Error:', error)
        if (options.onError) options.onError(error)
      }

      this.synth.speak(utterance)
    }

    // Only delay if the engine was actively speaking/pending
    if (this.synth.speaking || this.synth.pending) {
      setTimeout(doSpeak, 50)
    } else {
      doSpeak()
    }
  }

  pause() {
    if (this.synth && this.isPlaying) {
      this.synth.pause()
    }
  }

  resume() {
    if (this.synth) {
      this.synth.resume()
    }
  }

  stop() {
    if (this.synth) {
      this.synth.cancel()
      this.isPlaying = false
    }
  }

  togglePlayPause(text, options) {
    if (this.isPlaying) {
      if (this.synth.paused) {
        this.resume()
      } else {
        this.pause()
      }
    } else {
      this.speak(text, options)
    }
  }
}

// Singleton instance
const ttsService = new TTSService()

export default ttsService

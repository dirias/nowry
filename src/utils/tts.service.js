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

    // Load voices when they become available
    if (this.synth) {
      this.loadVoices()
      // Chrome loads voices asynchronously
      this.synth.onvoiceschanged = () => this.loadVoices()
    }
  }

  loadVoices() {
    this.voices = this.synth.getVoices()

    // Auto-select first voice if none selected
    if (!this.selectedVoice && this.voices.length > 0) {
      this.selectedVoice = this.voices.find((v) => v.lang === this.selectedLanguage) || this.voices[0]
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

    // Stop any ongoing speech
    this.stop()

    // Create new utterance
    this.utterance = new SpeechSynthesisUtterance(text)

    // Apply voice
    if (this.selectedVoice) {
      this.utterance.voice = this.selectedVoice
    }

    // Apply options
    this.utterance.lang = options.lang || this.selectedLanguage
    this.utterance.rate = options.rate || 1.0
    this.utterance.pitch = options.pitch || 1.0
    this.utterance.volume = options.volume || 1.0

    // Event handlers
    this.utterance.onstart = () => {
      this.isPlaying = true
      if (options.onStart) options.onStart()
    }

    this.utterance.onend = () => {
      this.isPlaying = false
      if (options.onEnd) options.onEnd()
    }

    this.utterance.onerror = (error) => {
      this.isPlaying = false
      console.error('TTS Error:', error)
      if (options.onError) options.onError(error)
    }

    // Speak
    this.synth.speak(this.utterance)
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

/**
 * Pomodoro Notification Sound Utility
 * Generates a pleasant notification tone when Pomodoro timer completes
 * Uses Web Audio API for cross-browser compatibility
 */

/**
 * Plays an extended notification sound (~30 seconds)
 * Pleasant repeating melody that gradually fades out
 */
export const playPomodoroNotification = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()

    // Function to play a single tone
    const playTone = (frequency, startTime, duration = 0.15, volume = 0.3) => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Use sine wave for a pleasant, bell-like sound
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency

      // Envelope: quick attack, sustain, quick release
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01) // Quick attack
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration) // Smooth decay

      oscillator.start(startTime)
      oscillator.stop(startTime + duration)
    }

    // Musical notes for a pleasant melody
    const notes = {
      C5: 523.25,
      D5: 587.33,
      E5: 659.25,
      F5: 698.46,
      G5: 783.99,
      A5: 880.0,
      B5: 987.77,
      C6: 1046.5
    }

    // Create a repeating pleasant melody (inspired by wind chimes/music box)
    const melody = [
      // Phrase 1 - Ascending
      { note: notes.C5, duration: 0.3 },
      { note: notes.E5, duration: 0.3 },
      { note: notes.G5, duration: 0.3 },
      { note: notes.C6, duration: 0.4 },
      { note: 0, duration: 0.2 }, // Rest

      // Phrase 2 - Descending
      { note: notes.B5, duration: 0.3 },
      { note: notes.G5, duration: 0.3 },
      { note: notes.E5, duration: 0.3 },
      { note: notes.C5, duration: 0.4 },
      { note: 0, duration: 0.2 }, // Rest

      // Phrase 3 - Wave pattern
      { note: notes.D5, duration: 0.3 },
      { note: notes.F5, duration: 0.3 },
      { note: notes.A5, duration: 0.3 },
      { note: notes.F5, duration: 0.3 },
      { note: 0, duration: 0.2 }, // Rest

      // Phrase 4 - Resolution
      { note: notes.E5, duration: 0.3 },
      { note: notes.G5, duration: 0.3 },
      { note: notes.C6, duration: 0.6 },
      { note: 0, duration: 0.4 } // Rest
    ]

    const phraseDuration = melody.reduce((sum, m) => sum + m.duration, 0) // ~5 seconds per phrase
    const numRepeats = 6 // 6 repeats = ~30 seconds

    const now = audioContext.currentTime
    let currentTime = now

    // Play the melody multiple times with gradual fade out
    for (let repeat = 0; repeat < numRepeats; repeat++) {
      // Calculate volume fade (start at 0.3, end at 0.05)
      const volumeFactor = 0.3 - (repeat / numRepeats) * 0.25

      for (const { note, duration } of melody) {
        if (note > 0) {
          // Skip rests (note = 0)
          playTone(note, currentTime, duration, volumeFactor)
        }
        currentTime += duration
      }
    }

    // Close the audio context after the sound finishes
    setTimeout(() => {
      audioContext.close()
    }, 32000)
  } catch (error) {
    console.error('Failed to play notification sound:', error)
    // Fallback: try to use browser notification sound
    try {
      const audio = new Audio(
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYHGGa77N2PLRMOU6Xh8bllHgU2j9XyzmgzBR9yvO/glEoNE1qq4/K4YxsEL4XO8tuJOwYZaLvt55xMEQxOouDxvWwhBSuBzvLaiTMGGGW77OacTBEMTqHg8bxrIQUrlc3y2ogzBxhnvOzhkUsSE1Sj4fGzYhoELIXO8tuJOwYZaLvt55xMEQxOouDxvWwhBSuBzvLaiTMGGGW77OacTBEMTqHg8bxrIQUrlc3y2ogzBxhnvOzhkUsSE1Sj4fGzYhoELIXO8tuJOwYZaLvt55xMEQxOouDxvWwhBSuBzvLaiTMGGGW77OacTBEMTqHg8bxrIQUrlc3y2ogzBxhnvOzhkUsSE1Sj4fGzYhoELIXO8tuJOwYZaLvt55xMEQxOouDxvWwhBSuBzvLaiTMGGGW77OacTBEMTqHg8bxrIQUrlc3y2ogzBxhnvOzhkUsSE1Sj4fGzYhoELIXO8tuJOwYZaLvt55xMEQxOouDxvWwhBSuBzvLaiTMGGGW77OacTBEMTqHg8bxrIQUrlc3y2ogzBxhnvOzhkUsSE1Sj4fGzYhoELIXO8tuJOwYZaLvt55xMEQxOouDxvWwhBSuBzvLaiTMGGGW77OacTBEMTqHg8bxrIQUrlc3y2ogzBxhnvOzhkUsSE1Sj4fGzYhoELIXO8tuJOwYZaLvt55xMEQxOouDxvWwhBSuBzvLaiTMGGGW77OacTBEMTqHg8bxrIQUrlc3y2ogzBxhnvOzhkUsSE1Sj4fGzYhoELIXO8tuJOwYZaLvt55xMEQxOouDxvWwhBSuBzvLaiTMGGGW77OacTBEMTqHg8bxrIQUrlc3y2ogzBxhnvOzhkUsSE1Sj4fGzYhoELIXO8tuJOwYZaLvt55xMEQxOouDxvWwhBSuBzvLaiTMGGGW77OacTBEMTqHg8bxrIQUrlc3y2ogzBxhnvOzhkUsSE1Sj4fGzYhoELIXO8tuJOwYZaLvt55xMEQxOouDxvWwhBSuBzvLaiTMGGGW77OacTBEMTqHg8bxrIQ=='
      )
      audio.play()
    } catch (fallbackError) {
      console.error('Fallback notification also failed:', fallbackError)
    }
  }
}

/**
 * Optional: Play a browser notification with permission
 */
export const showBrowserNotification = (title, body) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: 'pomodoro-complete'
    })
  }
}

/**
 * Request notification permission if not already granted
 */
export const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      return false
    }
  }
  return Notification.permission === 'granted'
}

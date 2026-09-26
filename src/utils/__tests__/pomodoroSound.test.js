/**
 * pomodoroSound — the chime is one pass and it can be stopped (POMO-005, ADR-036).
 *
 * Web Audio is faked at the seams the utility touches: a context that records
 * the oscillators it hands out and whether it was closed.
 */
import { playPomodoroNotification, stopPomodoroNotification, showBrowserNotification, MELODY, CHIME_SECONDS } from '../pomodoroSound'

const TONES_PER_PASS = MELODY.filter((step) => step.note > 0).length

class FakeParam {
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

const contexts = []

class FakeAudioContext {
  constructor() {
    this.currentTime = 0
    this.destination = {}
    this.started = 0
    this.closed = false
    contexts.push(this)
  }

  createOscillator() {
    const context = this
    return {
      type: 'sine',
      frequency: { value: 0 },
      connect() {},
      start() {
        context.started += 1
      },
      stop() {}
    }
  }

  createGain() {
    return { gain: new FakeParam(), connect() {} }
  }

  close() {
    this.closed = true
    return Promise.resolve()
  }
}

beforeEach(() => {
  jest.useFakeTimers()
  contexts.length = 0
  window.AudioContext = FakeAudioContext
})

afterEach(() => {
  stopPomodoroNotification()
  jest.useRealTimers()
  delete window.AudioContext
})

describe('the chime', () => {
  it('plays the melody exactly once and reports that it started', () => {
    expect(playPomodoroNotification()).toBe(true)
    expect(contexts).toHaveLength(1)
    expect(contexts[0].started).toBe(TONES_PER_PASS)
    expect(CHIME_SECONDS).toBeCloseTo(6, 1)
  })

  it('closes its context when the pass is over', () => {
    playPomodoroNotification()
    jest.advanceTimersByTime(CHIME_SECONDS * 1000 + 1000)
    expect(contexts[0].closed).toBe(true)
  })

  it('stop silences it early', () => {
    playPomodoroNotification()
    expect(contexts[0].closed).toBe(false)
    stopPomodoroNotification()
    expect(contexts[0].closed).toBe(true)
    // Idempotent: a second stop, or one with nothing sounding, is fine.
    expect(() => stopPomodoroNotification()).not.toThrow()
  })

  it('a second play stops the first', () => {
    playPomodoroNotification()
    playPomodoroNotification()
    expect(contexts).toHaveLength(2)
    expect(contexts[0].closed).toBe(true)
    expect(contexts[1].closed).toBe(false)
  })

  it('reports false when the browser has no Web Audio', () => {
    delete window.AudioContext
    expect(playPomodoroNotification()).toBe(false)
  })
})

describe('the browser notification', () => {
  let created

  beforeEach(() => {
    created = []
    function Notification(title, options) {
      this.title = title
      this.options = options
      this.close = jest.fn()
      created.push(this)
    }
    Notification.permission = 'granted'
    window.Notification = Notification
    window.focus = jest.fn()
  })

  afterEach(() => {
    delete window.Notification
  })

  it('is silent when asked, and a click brings the tab forward', () => {
    showBrowserNotification('Pomodoro', 'Focus session complete.', { silent: true })
    expect(created).toHaveLength(1)
    expect(created[0].options.silent).toBe(true)
    expect(created[0].options.tag).toBe('pomodoro-complete')
    created[0].onclick()
    expect(window.focus).toHaveBeenCalled()
    expect(created[0].close).toHaveBeenCalled()
  })

  it('keeps its own sound by default', () => {
    showBrowserNotification('Pomodoro', 'Break over.')
    expect(created[0].options.silent).toBe(false)
  })

  it('does nothing without permission', () => {
    window.Notification.permission = 'denied'
    showBrowserNotification('Pomodoro', 'Focus session complete.')
    expect(created).toHaveLength(0)
  })
})

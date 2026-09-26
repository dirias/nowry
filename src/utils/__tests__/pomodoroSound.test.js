/**
 * pomodoroSound — the chime is one pass, it can be stopped, and it copes with
 * a browser that suspends audio until a gesture (POMO-005, ADR-036).
 *
 * Web Audio is faked at the seams the utility touches: a context that records
 * the oscillators it hands out, their stops, and its own state.
 */
import {
  playPomodoroNotification,
  primePomodoroNotification,
  stopPomodoroNotification,
  showBrowserNotification,
  MELODY,
  CHIME_SECONDS
} from '../pomodoroSound'

const TONES_PER_PASS = MELODY.filter((step) => step.note > 0).length

class FakeParam {
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

const contexts = []
let initialState = 'running'
let resumeWorks = true

class FakeAudioContext {
  constructor() {
    this.currentTime = 0
    this.destination = {}
    this.state = initialState
    this.oscillators = []
    this.resumed = 0
    contexts.push(this)
  }

  createOscillator() {
    const oscillator = {
      type: 'sine',
      frequency: { value: 0 },
      started: false,
      stopped: 0,
      connect() {},
      disconnect() {},
      start() {
        oscillator.started = true
      },
      stop() {
        oscillator.stopped += 1
      }
    }
    this.oscillators.push(oscillator)
    return oscillator
  }

  createGain() {
    return { gain: new FakeParam(), connect() {} }
  }

  resume() {
    this.resumed += 1
    if (!resumeWorks) return Promise.reject(new Error('not allowed'))
    this.state = 'running'
    return Promise.resolve()
  }

  close() {
    this.state = 'closed'
    return Promise.resolve()
  }
}

beforeEach(() => {
  jest.useFakeTimers()
  contexts.length = 0
  initialState = 'running'
  resumeWorks = true
  window.AudioContext = FakeAudioContext
})

afterEach(() => {
  stopPomodoroNotification()
  // The module keeps one context for the page's life; close it so the next
  // test opens its own.
  contexts.forEach((ctx) => ctx.close())
  jest.useRealTimers()
  delete window.AudioContext
})

describe('the chime', () => {
  it('plays the melody exactly once and reports that it started', () => {
    expect(playPomodoroNotification()).toBe(true)
    expect(contexts).toHaveLength(1)
    expect(contexts[0].oscillators).toHaveLength(TONES_PER_PASS)
    expect(contexts[0].oscillators.every((o) => o.started)).toBe(true)
    expect(CHIME_SECONDS).toBeCloseTo(6, 1)
  })

  it('stop silences it early, and is idempotent', () => {
    playPomodoroNotification()
    stopPomodoroNotification()
    // Each oscillator had its scheduled stop; the early stop adds one call.
    expect(contexts[0].oscillators.every((o) => o.stopped === 2)).toBe(true)
    expect(() => stopPomodoroNotification()).not.toThrow()
    expect(contexts[0].oscillators.every((o) => o.stopped === 2)).toBe(true)
  })

  it('forgets the pass when it is over, so a later stop touches nothing', () => {
    playPomodoroNotification()
    jest.advanceTimersByTime(CHIME_SECONDS * 1000 + 1000)
    stopPomodoroNotification()
    expect(contexts[0].oscillators.every((o) => o.stopped === 1)).toBe(true)
  })

  it('a second play stops the first, on the same context', () => {
    playPomodoroNotification()
    const first = contexts[0].oscillators.slice()
    playPomodoroNotification()
    expect(contexts).toHaveLength(1)
    expect(first.every((o) => o.stopped === 2)).toBe(true)
    expect(contexts[0].oscillators).toHaveLength(TONES_PER_PASS * 2)
  })

  it('reports false when the browser has no Web Audio', () => {
    delete window.AudioContext
    expect(playPomodoroNotification()).toBe(false)
  })
})

describe('a browser that suspends audio until a gesture', () => {
  it('prime opens the context and resumes it from the click that starts a timer', () => {
    initialState = 'suspended'
    expect(primePomodoroNotification()).toBe(true)
    expect(contexts).toHaveLength(1)
    expect(contexts[0].resumed).toBe(1)
    expect(contexts[0].state).toBe('running')
    // Now play is synchronous and true, as on a page that was clicked.
    expect(playPomodoroNotification()).toBe(true)
  })

  it('play resumes a suspended context and reports, as a promise, that it started', async () => {
    initialState = 'suspended'
    const result = playPomodoroNotification()
    expect(typeof result.then).toBe('function')
    await expect(result).resolves.toBe(true)
    expect(contexts[0].oscillators).toHaveLength(TONES_PER_PASS)
  })

  it('reports false when the browser refuses to resume, so the notification keeps its own sound', async () => {
    initialState = 'suspended'
    resumeWorks = false
    await expect(playPomodoroNotification()).resolves.toBe(false)
    expect(contexts[0].oscillators).toHaveLength(0)
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

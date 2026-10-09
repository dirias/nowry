/**
 * An utterance the engine drops still releases the caller (MOB-113).
 *
 * The native module ignores the engine's refusal, so a voice that cannot
 * synthesise sends no event at all. These tests drive `speak` with a mocked
 * engine and fake timers: no start within the grace period, or no end within
 * the budget, settles the utterance as an error exactly once.
 */
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(), isSpeakingAsync: jest.fn() }), { virtual: true })

const Speech = require('expo-speech')
const { speak, voiceToRequest, START_GRACE_MS, finishBudgetFor, MIN_FINISH_MS, MS_PER_CHARACTER } = require('../speech')

beforeEach(() => {
  jest.useFakeTimers()
  Speech.speak.mockReset()
})
afterEach(() => jest.useRealTimers())

const engineOptions = () => Speech.speak.mock.calls[0][1]

describe('speak', () => {
  it('settles once with an error when the engine never starts', () => {
    const onDone = jest.fn()
    const onError = jest.fn()
    speak('こんにちは', { onDone, onError })
    expect(Speech.speak).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(START_GRACE_MS - 1)
    expect(onDone).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledTimes(1)

    // A late event from the engine changes nothing.
    engineOptions().onDone()
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('lets a started utterance run to its budget, then releases it', () => {
    const onDone = jest.fn()
    const onError = jest.fn()
    const text = 'x'.repeat(40)
    speak(text, { onDone, onError })
    engineOptions().onStart()

    jest.advanceTimersByTime(START_GRACE_MS + 1)
    expect(onDone).not.toHaveBeenCalled()

    jest.advanceTimersByTime(finishBudgetFor(text))
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('settles cleanly, without an error, when the engine finishes', () => {
    const onDone = jest.fn()
    const onError = jest.fn()
    speak('hello', { onDone, onError })
    engineOptions().onStart()
    engineOptions().onDone()
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
    jest.advanceTimersByTime(finishBudgetFor('hello') + START_GRACE_MS)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('hands the engine a language but no voice unless one is given', () => {
    speak('hello', { lang: 'en-US' })
    expect(engineOptions().language).toBe('en-US')
    expect(engineOptions().voice).toBeUndefined()
  })
})

describe('the finish budget', () => {
  it('scales with the text and never drops below the floor', () => {
    expect(finishBudgetFor('')).toBe(MIN_FINISH_MS)
    expect(finishBudgetFor('x'.repeat(100))).toBe(100 * MS_PER_CHARACTER)
  })
})

describe('which voice reaches the engine', () => {
  const resolved = { name: 'ja-jp-x-htm-network', identifier: 'ja-jp-x-htm-network', lang: 'ja-JP' }

  it('is none when the voice was matched by language alone', () => {
    expect(voiceToRequest(resolved, { voiceLang: 'ja-JP', voiceName: null })).toBeNull()
    expect(voiceToRequest(resolved, null)).toBeNull()
    expect(voiceToRequest(null, { voiceName: 'anything' })).toBeNull()
  })

  it('is the chosen voice when the learner picked it by name on this device', () => {
    expect(voiceToRequest(resolved, { voiceName: 'ja-jp-x-htm-network' })).toBe('ja-jp-x-htm-network')
  })

  it('is none when the saved name is a different voice than the match', () => {
    expect(voiceToRequest(resolved, { voiceName: 'Samantha' })).toBeNull()
  })
})

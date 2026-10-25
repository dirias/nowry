/**
 * TTSControls auto-play — TTS-004 (ADR-050).
 *
 * Auto-play spoke the whole card in one utterance and skipped segmentation,
 * and the first Listen tap — the gesture that unlocks auto-play — spoke the
 * card twice. Both now go through one play path, once.
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import TTSControls from '../TTSControls'

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }))

const mockSpeak = jest.fn()
jest.mock('../../../utils/tts.service', () => {
  const voices = [{ name: 'Kyoko', lang: 'ja-JP' }]
  return {
    __esModule: true,
    default: {
      onVoicesReady: (callback) => {
        callback(voices)
        return () => {}
      },
      getVoices: () => voices,
      setVoice: () => {},
      speak: (...args) => mockSpeak(...args),
      stop: () => {},
      pause: () => {}
    }
  }
})

const mockGetSegments = jest.fn()
const mockSpeakSegments = jest.fn()
jest.mock('../../../hooks/useSegmentedSpeech', () => ({
  useSegmentedSpeech: () => ({ getSegments: mockGetSegments, speakSegments: mockSpeakSegments })
}))

const settings = { mode: 'auto', voiceLang: 'ja-JP', voiceName: 'Kyoko', autoPlay: true, rate: 1 }

const renderControls = (text) =>
  render(<TTSControls compact text={text} langHint='ja' voiceSettings={settings} onVoiceSettingsChange={() => {}} />)

beforeEach(() => {
  mockSpeak.mockReset()
  mockSpeakSegments.mockReset()
  mockGetSegments.mockReset().mockImplementation((text) => Promise.resolve([{ text, lang_code: 'ja' }]))
})

it('speaks the first tapped card once, not once for the tap and again for auto-play', async () => {
  renderControls('学生')
  await act(async () => {
    fireEvent.click(screen.getAllByRole('button')[0])
  })
  expect(mockGetSegments).toHaveBeenCalledTimes(1)
  expect(mockSpeakSegments).toHaveBeenCalledTimes(1)
  expect(mockSpeak).not.toHaveBeenCalled()
})

it('auto-plays the next card through segmentation, with the hint', async () => {
  const { rerender } = renderControls('学生')
  await act(async () => {
    fireEvent.click(screen.getAllByRole('button')[0])
  })
  await act(async () => {
    rerender(<TTSControls compact text='日本語' langHint='ja' voiceSettings={settings} onVoiceSettingsChange={() => {}} />)
  })
  expect(mockGetSegments).toHaveBeenLastCalledWith('日本語', 'ja')
  expect(mockSpeakSegments).toHaveBeenCalledTimes(2)
  expect(mockSpeak).not.toHaveBeenCalled()
})

it('drops segments that arrive after the card has moved on', async () => {
  let release
  const { rerender } = renderControls('学生')
  await act(async () => {
    fireEvent.click(screen.getAllByRole('button')[0])
  })
  mockSpeakSegments.mockReset()
  mockGetSegments.mockImplementationOnce(() => new Promise((resolve) => (release = resolve)))
  await act(async () => {
    rerender(<TTSControls compact text='日本語' langHint='ja' voiceSettings={settings} onVoiceSettingsChange={() => {}} />)
  })
  await act(async () => {
    rerender(<TTSControls compact text='東京' langHint='ja' voiceSettings={settings} onVoiceSettingsChange={() => {}} />)
  })
  await act(async () => release([{ text: '日本語', lang_code: 'ja' }]))
  expect(mockSpeakSegments.mock.calls.map(([segments]) => segments[0].text)).toEqual(['東京'])
})

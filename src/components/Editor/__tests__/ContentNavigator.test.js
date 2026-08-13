/**
 * TASK-007 — TOC sidebar auto-detect (ADR-001/ADR-002 applied to the second,
 * previously-missed Books TTS surface).
 *
 * Mirrors the scope/depth of TTSToolbar.test.js (TASK-004/TASK-006):
 *   1. Manual language Select is hidden by default for tier === 'pro'
 *      (auto-detect toggle is ON, matching ADR-002's default).
 *   2. Toggling to manual reveals the Select.
 *   3. handlePlaySection calls ttsService.generate() with { autoDetect: true }
 *      by default, and { autoDetect: false } once switched to manual.
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ContentNavigator from '../ContentNavigator'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k })
}))

jest.mock('../../../context/SubscriptionContext', () => ({
  useSubscriptionContext: () => ({ openUpgradeModal: jest.fn() })
}))

const mockGenerate = jest.fn()
jest.mock('../../../api/services/tts.ai.service', () => ({
  ttsService: {
    generate: (...args) => mockGenerate(...args)
  }
}))

// A single heading whose Lexical node key matches the TOC entry's id, so
// extractSectionContent() (which walks $getRoot().getChildren()) resolves
// non-empty text and handlePlaySection proceeds to call ttsService.generate().
const HEADING_ID = 'heading-1'
const HEADING_TEXT = 'Section One'

jest.mock('lexical', () => ({
  $getRoot: () => ({
    getChildren: () => [
      {
        getKey: () => HEADING_ID,
        getType: () => 'heading',
        getTextContent: () => HEADING_TEXT
      }
    ]
  })
}))

const toc = [{ id: HEADING_ID, text: HEADING_TEXT, level: 'h1' }]

const editorInstanceRef = {
  current: {
    getEditorState: () => ({ read: (cb) => cb() })
  }
}

// ContentNavigator's ttsAutoDetect/ttsLanguage are controlled props owned by
// the caller (EditorHome lifts this state) — unlike TTSToolbar, which owns
// its own internal state. This harness reproduces that same lifted-state
// relationship so clicking the Switch/Select actually changes what's passed
// back down on re-render.
function Harness({ tier }) {
  const [ttsLanguage, setTtsLanguage] = React.useState('en-US')
  const [ttsAutoDetect, setTtsAutoDetect] = React.useState(true)
  return (
    <ContentNavigator
      toc={toc}
      readingTime={5}
      editorInstanceRef={editorInstanceRef}
      bookId='book-1'
      tier={tier}
      ttsLanguage={ttsLanguage}
      onTtsLanguageChange={setTtsLanguage}
      ttsAutoDetect={ttsAutoDetect}
      onTtsAutoDetectChange={setTtsAutoDetect}
    />
  )
}

const renderNavigator = (tier) => render(<Harness tier={tier} />)

const clickMic = () => fireEvent.click(screen.getByLabelText('aiMagic.tts.playSection'))

// Same rationale as TTSToolbar.test.js: Joy UI's <Switch> forwards aria-label
// to its wrapper, not the native input that receives click/change — toggling
// has to go through the "switch" role.
const clickAutoDetectSwitch = () => fireEvent.click(screen.getByRole('switch'))

beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => 'blob:mock')
  global.URL.revokeObjectURL = jest.fn()
  // jsdom does not implement HTMLMediaElement.play() — the component calls
  // audioRef.current.play(), which would otherwise log a noisy "not implemented" error.
  window.HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined)
})

beforeEach(() => {
  mockGenerate.mockReset()
})

describe('ContentNavigator — TOC sidebar auto-detect toggle (TASK-007)', () => {
  it('renders no auto-detect toggle or Select for tier !== "pro"', () => {
    renderNavigator('plus')
    expect(screen.queryByLabelText('aiMagic.tts.autoDetectAriaLabel')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('aiMagic.tts.languageAriaLabel')).not.toBeInTheDocument()
  })

  it('renders the toggle for tier === "pro", defaulting to ON with the manual Select hidden on first render (ADR-002)', () => {
    renderNavigator('pro')
    expect(screen.getByLabelText('aiMagic.tts.autoDetectAriaLabel')).toBeInTheDocument()
    expect(screen.getByRole('switch')).toBeChecked()
    expect(screen.queryByLabelText('aiMagic.tts.languageAriaLabel')).not.toBeInTheDocument()
  })

  it('toggling to manual reveals the language Select', () => {
    renderNavigator('pro')
    clickAutoDetectSwitch()
    expect(screen.getByLabelText('aiMagic.tts.languageAriaLabel')).toBeInTheDocument()
  })

  it('handlePlaySection calls ttsService.generate() with { autoDetect: true } by default', async () => {
    mockGenerate.mockResolvedValue('blob:fake-url')
    renderNavigator('pro')

    clickMic()

    await waitFor(() => expect(mockGenerate).toHaveBeenCalledTimes(1))
    expect(mockGenerate).toHaveBeenCalledWith('book-1', HEADING_TEXT, 'en-US', { autoDetect: true })
    // Let the resulting playing-state update (mic -> stop icon) settle before the test ends.
    await screen.findByTestId('StopRoundedIcon')
  })

  it('handlePlaySection calls ttsService.generate() with { autoDetect: false } once switched to manual', async () => {
    mockGenerate.mockResolvedValue('blob:fake-url')
    renderNavigator('pro')

    clickAutoDetectSwitch()
    clickMic()

    await waitFor(() => expect(mockGenerate).toHaveBeenCalledTimes(1))
    expect(mockGenerate).toHaveBeenCalledWith('book-1', HEADING_TEXT, 'en-US', { autoDetect: false })
    await screen.findByTestId('StopRoundedIcon')
  })
})

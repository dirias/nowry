/**
 * TASK-004/TASK-006 — Books "Listen" Pro-tier auto-detect toggle
 * (ADR-001 tier-gating + ADR-002 default-on reversal).
 *
 * Covers the acceptance criteria:
 *   1. Toggle absent for tier === 'free' and tier === 'plus'.
 *   2. Toggle present for tier === 'pro', defaulting to ON (manual Select
 *      hidden on initial render, no click required) — ADR-002.
 *   3. Auto-detect ON by default passes `autoDetect: true` through to
 *      ttsService.generate(); disabling the toggle passes `autoDetect: false`.
 *   4. A segmentation-specific error (`ttsDetail` prefixed
 *      `segmentation_failed:`) surfaces the new `aiMagic.tts.segmentError`
 *      key; any other error surfaces the existing `aiMagic.tts.error` key.
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TTSToolbar from '../TTSToolbar'

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

// Empty Lexical editor ref — extractSections()/getFullBookText() both
// early-return on `!editor`, so the play button goes straight to
// generateAndPlay('') without opening the section picker. What matters for
// these tests is the call made to ttsService.generate(), not text extraction.
const emptyEditorRef = { current: null }

const renderToolbar = (tier) => render(<TTSToolbar tier={tier} editorInstanceRef={emptyEditorRef} bookId='book-1' />)

const clickPlay = () => fireEvent.click(screen.getByLabelText('aiMagic.tts.playAriaLabel'))

// Joy UI's <Switch> forwards `aria-label` to its root wrapper, not to the
// native <input type="checkbox" role="switch"> that actually receives
// click/change events (checked/onChange are the only interaction props it
// merges into the input). So findable-by-label is right for
// presence/absence assertions, but toggling the value has to go through
// the input's "switch" role instead.
const clickAutoDetectSwitch = () => fireEvent.click(screen.getByRole('switch'))

beforeAll(() => {
  // jsdom does not implement these — the component calls
  // URL.revokeObjectURL() on unmount/replay, which would otherwise throw.
  global.URL.createObjectURL = jest.fn(() => 'blob:mock')
  global.URL.revokeObjectURL = jest.fn()
})

beforeEach(() => {
  mockGenerate.mockReset()
})

describe('TTSToolbar — Pro-tier auto-detect toggle (TASK-004)', () => {
  it('renders no toggle for tier === "free"', () => {
    renderToolbar('free')
    expect(screen.queryByLabelText('aiMagic.tts.autoDetectAriaLabel')).not.toBeInTheDocument()
  })

  it('renders no toggle for tier === "plus"', () => {
    renderToolbar('plus')
    expect(screen.queryByLabelText('aiMagic.tts.autoDetectAriaLabel')).not.toBeInTheDocument()
    // Plus keeps today's hardcoded en-US — no language Select either.
    expect(screen.queryByLabelText('aiMagic.tts.languageAriaLabel')).not.toBeInTheDocument()
  })

  it('renders the toggle for tier === "pro", defaulting to ON with the manual Select hidden on first render (ADR-002)', () => {
    renderToolbar('pro')
    const toggle = screen.getByLabelText('aiMagic.tts.autoDetectAriaLabel')
    expect(toggle).toBeInTheDocument()
    expect(screen.getByRole('switch')).toBeChecked()
    // The manual language Select must be hidden by default, not just after a click.
    expect(screen.queryByLabelText('aiMagic.tts.languageAriaLabel')).not.toBeInTheDocument()
  })

  it('passes autoDetect: true through to ttsService.generate() by default (ADR-002)', async () => {
    mockGenerate.mockResolvedValue('blob:fake-url')
    renderToolbar('pro')

    clickPlay()

    await waitFor(() => expect(mockGenerate).toHaveBeenCalledTimes(1))
    expect(mockGenerate).toHaveBeenCalledWith('book-1', '', 'en-US', { autoDetect: true })
    // Let the resulting 'playing' state update settle before the test ends.
    expect(await screen.findByLabelText('aiMagic.tts.pauseAriaLabel')).toBeInTheDocument()
  })

  it('disabling the toggle passes autoDetect: false through to ttsService.generate() and reveals the manual Select', async () => {
    mockGenerate.mockResolvedValue('blob:fake-url')
    renderToolbar('pro')

    clickAutoDetectSwitch()
    // Manual language Select should reappear once auto-detect is turned off.
    expect(screen.getByLabelText('aiMagic.tts.languageAriaLabel')).toBeInTheDocument()

    clickPlay()

    await waitFor(() => expect(mockGenerate).toHaveBeenCalledTimes(1))
    expect(mockGenerate).toHaveBeenCalledWith('book-1', '', 'en-US', { autoDetect: false })
    expect(await screen.findByLabelText('aiMagic.tts.pauseAriaLabel')).toBeInTheDocument()
  })

  it('shows the generic error message for a non-segmentation failure', async () => {
    const genericError = new Error('boom')
    genericError.ttsDetail = 'Audio generation failed. Please try again.'
    mockGenerate.mockRejectedValue(genericError)
    renderToolbar('pro')

    clickPlay()

    expect(await screen.findByText('aiMagic.tts.error')).toBeInTheDocument()
    expect(screen.queryByText('aiMagic.tts.segmentError')).not.toBeInTheDocument()
  })

  it('shows the segmentError message for a segmentation-specific failure (auto-detect on by default)', async () => {
    const segmentationError = new Error('boom')
    segmentationError.ttsDetail = 'segmentation_failed: lingua classifier unavailable'
    mockGenerate.mockRejectedValue(segmentationError)
    renderToolbar('pro')

    // Auto-detect is already ON by default (ADR-002) — no click needed.
    clickPlay()

    expect(await screen.findByText('aiMagic.tts.segmentError')).toBeInTheDocument()
    expect(screen.queryByText('aiMagic.tts.error')).not.toBeInTheDocument()
  })
})

/**
 * Phase 30 Plan 02 — Wave 0 test scaffold for StudyModePickerModal.js (MODE-01/D-01/D-02/D-04).
 *
 * This component does not exist yet (lands in 30-03-PLAN.md). This file is intentionally
 * RED at authoring time — do not stub the component to make it pass.
 *
 * Harness idiom: react-i18next mock only (no router/service mocks needed — this modal
 * takes `deck`/`onSelectMode` as props and performs no fetch/navigation of its own),
 * matching the lightweight ShareBoardModal.test.js shape.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k) })
}))

// require-after-mock: the component under test is imported only after the jest.mock()
// call above has registered, per the project's established mock-harness idiom.
const StudyModePickerModal = require('../StudyModePickerModal').default

describe('StudyModePickerModal', () => {
  it('renders Study/Browse/Cram buttons with the correct translated labels', () => {
    render(<StudyModePickerModal open onClose={jest.fn()} deck={{ _id: 'd1', due_cards: 3 }} onSelectMode={jest.fn()} />)
    expect(screen.getByText('study.modePicker.study.label')).toBeInTheDocument()
    expect(screen.getByText('study.modePicker.browse.label')).toBeInTheDocument()
    expect(screen.getByText('study.modePicker.cram.label')).toBeInTheDocument()
  })

  it('disables the Study option and shows the disabled hint when the deck has 0 due cards (D-04)', () => {
    render(<StudyModePickerModal open onClose={jest.fn()} deck={{ _id: 'd1', due_cards: 0 }} onSelectMode={jest.fn()} />)
    const studyButton = screen.getByText('study.modePicker.study.label').closest('button')
    expect(studyButton).toBeDisabled()
    expect(screen.getByText('study.modePicker.study.disabledHint')).toBeInTheDocument()
  })

  it('enables the Study option and hides the disabled hint when the deck has due cards', () => {
    render(<StudyModePickerModal open onClose={jest.fn()} deck={{ _id: 'd1', due_cards: 3 }} onSelectMode={jest.fn()} />)
    const studyButton = screen.getByText('study.modePicker.study.label').closest('button')
    expect(studyButton).not.toBeDisabled()
    expect(screen.queryByText('study.modePicker.study.disabledHint')).not.toBeInTheDocument()
  })

  it('calls onSelectMode with the correct mode string when each option is clicked (D-01/D-02)', () => {
    const onSelectMode = jest.fn()
    render(<StudyModePickerModal open onClose={jest.fn()} deck={{ _id: 'd1', due_cards: 3 }} onSelectMode={onSelectMode} />)

    fireEvent.click(screen.getByText('study.modePicker.study.label'))
    expect(onSelectMode).toHaveBeenCalledWith('study')

    fireEvent.click(screen.getByText('study.modePicker.browse.label'))
    expect(onSelectMode).toHaveBeenCalledWith('browse')

    fireEvent.click(screen.getByText('study.modePicker.cram.label'))
    expect(onSelectMode).toHaveBeenCalledWith('cram')
  })
})

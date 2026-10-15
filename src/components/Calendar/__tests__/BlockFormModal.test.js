/**
 * PLAN-004 — the block form on the shared sheet (PRD D4, D11, D12; ADR-017's
 * rule: the key is never disabled, errors are loud).
 */
import React from 'react'
import { render, screen, fireEvent, act, within } from '@testing-library/react'

// `t` keeps the key and appends the values, so a readout's number is visible:
// "calendarPage.blocks.minutes 20".
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? [k, ...Object.values(opts)].join(' ') : k), i18n: { language: 'en' } })
}))
const mockCreate = jest.fn()
const mockUpdate = jest.fn()
const mockRemove = jest.fn()
jest.mock('@nowry/core/hooks/useBlocks', () => ({
  useBlocks: () => ({ create: mockCreate, update: mockUpdate, remove: mockRemove })
}))
const mockKeep = jest.fn()
const mockSkip = jest.fn()
const mockUndo = jest.fn()
jest.mock('@nowry/core/hooks/useBlockLog', () => ({
  useBlockLog: () => ({ keep: mockKeep, skip: mockSkip, undo: mockUndo, pending: false })
}))
jest.mock('@nowry/core/hooks/useAnnualPlan', () => ({
  useAnnualPlan: () => ({
    goals: [{ _id: 'g1', title: 'Run a half marathon', status: 'in_progress', progress: 20, milestones: [], focus_area_id: 'a1' }],
    loading: false
  })
}))
const { localDateKey, addDaysKey } = require('@nowry/core/domain/blocks')
const todayKey = localDateKey(new Date())
const mockTomorrowKey = addDaysKey(todayKey, 1)
jest.mock('../../Study/useTodayData', () => ({
  useTodayData: () => ({ dueToday: 27, forecast: { days: [{ date: mockTomorrowKey, due: 9 }] } })
}))

const open = (props = {}) => {
  const BlockFormModal = require('../BlockFormModal').default
  const onClose = jest.fn()
  const onSaved = jest.fn()
  render(<BlockFormModal open onClose={onClose} onSaved={onSaved} mode='create' blocks={[]} {...props} />)
  return { onClose, onSaved }
}

const segment = (name) => screen.getByRole('button', { name })
// The required mark follows the label text, as on the event form.
const title = () => screen.getByLabelText(/calendarPage.blocks.form.title/)
const primary = () => screen.getByRole('button', { name: /calendarPage.blocks.form.(add|save)$/ })

beforeEach(() => {
  jest.clearAllMocks()
  mockCreate.mockResolvedValue({})
  mockUpdate.mockResolvedValue({})
  mockRemove.mockResolvedValue({})
  mockKeep.mockResolvedValue({})
  mockSkip.mockResolvedValue({})
  mockUndo.mockResolvedValue({})
})

describe('the sheet', () => {
  it('is title first, then For with Routine engaged, Starts, Lasts, seven weekday toggles all on, Remind off, and one key named Add block', () => {
    open()
    expect(screen.getByText('calendarPage.blocks.form.addTitle')).toBeInTheDocument()
    expect(title()).toHaveFocus()
    ;['routine', 'study', 'focus', 'goal'].forEach((source) =>
      expect(segment(`calendarPage.blocks.form.source.${source}`)).toHaveAttribute('aria-pressed', source === 'routine' ? 'true' : 'false')
    )
    expect(screen.getByLabelText('calendarPage.blocks.form.starts')).toHaveValue('07:00')
    expect(screen.getByText('calendarPage.blocks.minutes 20')).toBeInTheDocument()
    ;['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach((day) =>
      expect(segment(day)).toHaveAttribute('aria-pressed', 'true')
    )
    expect(segment('calendarPage.blocks.form.remindOff')).toHaveAttribute('aria-pressed', 'true')
    expect(primary()).toHaveTextContent('calendarPage.blocks.form.add')
    expect(primary()).not.toBeDisabled()
    expect(screen.queryByRole('button', { name: 'calendarPage.blocks.form.delete' })).toBeNull()
  })

  it('an empty title fails loudly under the field and sends nothing', async () => {
    open()
    await act(async () => {
      fireEvent.click(primary())
    })
    expect(screen.getByText('calendarPage.blocks.form.titleRequired')).toBeInTheDocument()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('no weekday is loud too, until the block is made a one-off on a date', async () => {
    open()
    fireEvent.change(title(), { target: { value: 'Stretch' } })
    ;['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach((day) => fireEvent.click(segment(day)))
    await act(async () => {
      fireEvent.click(primary())
    })
    expect(screen.getByText('calendarPage.blocks.form.daysRequired')).toBeInTheDocument()
    expect(mockCreate).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('switch'))
    expect(screen.queryByRole('button', { name: 'Monday' })).toBeNull()
    const date = screen.getByLabelText('calendarPage.blocks.form.onceDate')
    fireEvent.change(date, { target: { value: mockTomorrowKey } })
    await act(async () => {
      fireEvent.click(primary())
    })
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Stretch', daysOfWeek: [], date: mockTomorrowKey }))
  })

  it('sends the block in camelCase with its weekday rule, start, reminder and no goal', async () => {
    const { onClose, onSaved } = open()
    fireEvent.change(title(), { target: { value: '  Morning stretch ' } })
    fireEvent.change(screen.getByLabelText('calendarPage.blocks.form.starts'), { target: { value: '06:45' } })
    fireEvent.click(segment('Sunday'))
    fireEvent.click(screen.getAllByRole('button', { name: 'calendarPage.blocks.form.remindMinutes 5' })[0])
    await act(async () => {
      fireEvent.click(primary())
    })
    expect(mockCreate).toHaveBeenCalledWith({
      title: 'Morning stretch',
      source: { type: 'routine', id: null },
      start: '06:45',
      lengthMin: 20,
      daysOfWeek: [0, 1, 2, 3, 4, 5],
      date: null,
      reminderMin: 5,
      afterBlockId: null,
      areaId: null
    })
    expect(onSaved).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('a study block follows the forecast until the learner sets its length (PRD D4)', async () => {
    open()
    fireEvent.change(title(), { target: { value: 'Review' } })
    fireEvent.click(segment('calendarPage.blocks.form.source.study'))
    // 27 cards ≈ 18 min → 20 on the five-minute grid, with the hint under the stepper.
    expect(screen.getByText('calendarPage.blocks.minutes 20')).toBeInTheDocument()
    expect(screen.getByText('calendarPage.blocks.form.forecastHint 27 20')).toBeInTheDocument()

    // A one-off tomorrow reads tomorrow's forecast: 9 cards → 5 min.
    fireEvent.click(screen.getByRole('switch'))
    fireEvent.change(screen.getByLabelText('calendarPage.blocks.form.onceDate'), { target: { value: mockTomorrowKey } })
    expect(screen.getByText('calendarPage.blocks.minutes 5')).toBeInTheDocument()
    expect(screen.getByText('calendarPage.blocks.form.forecastHint 9 5')).toBeInTheDocument()

    // Once set by hand, the length is the learner's.
    fireEvent.click(screen.getByRole('button', { name: 'calendarPage.blocks.form.more' }))
    fireEvent.click(screen.getByRole('button', { name: 'calendarPage.blocks.form.more' }))
    expect(screen.getByText('calendarPage.blocks.minutes 15')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(primary())
    })
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ source: { type: 'study', id: null }, lengthMin: 15, date: mockTomorrowKey })
    )
  })

  it('a goal block needs its goal, then carries the goal and its area', async () => {
    open()
    fireEvent.change(title(), { target: { value: 'Long run' } })
    fireEvent.click(segment('calendarPage.blocks.form.source.goal'))
    await act(async () => {
      fireEvent.click(primary())
    })
    expect(screen.getByText('calendarPage.blocks.form.goalRequired')).toBeInTheDocument()
    expect(mockCreate).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(await screen.findByRole('option', { name: 'Run a half marathon' }))
    await act(async () => {
      fireEvent.click(primary())
    })
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ source: { type: 'goal', id: 'g1' }, areaId: 'a1' }))
  })

  it('offers the other recurring blocks as After, never itself or a one-off', () => {
    const blocks = [
      { id: 'b1', title: 'Me', date: null },
      { id: 'b2', title: 'Coffee', date: null },
      { id: 'b3', title: 'Dentist', date: todayKey }
    ]
    const block = {
      id: 'b1',
      title: 'Me',
      source: { type: 'routine', id: null },
      start: '07:00',
      lengthMin: 10,
      daysOfWeek: [0],
      date: null
    }
    open({ mode: 'edit', block, blocks })
    fireEvent.click(screen.getByRole('combobox', { name: 'calendarPage.blocks.form.after' }))
    const options = screen.getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['calendarPage.blocks.form.afterNone', 'Coffee'])
  })

  it('a rejected request shows the banner and leaves the sheet open', async () => {
    mockCreate.mockRejectedValue(new Error('500'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const { onClose } = open()
    fireEvent.change(title(), { target: { value: 'Stretch' } })
    await act(async () => {
      fireEvent.click(primary())
    })
    expect(screen.getByText('calendarPage.blocks.form.saveError')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('edit mode', () => {
  const block = {
    id: 'b1',
    title: 'Morning review',
    source: { type: 'study', id: null },
    start: '07:30',
    lengthMin: 25,
    daysOfWeek: [0, 1, 2, 3, 4],
    date: null,
    reminderMin: 15,
    afterBlockId: null,
    areaId: null
  }
  const occurrence = { date: todayKey, blockId: 'b1', start: '07:30', lengthMin: 25, title: 'Morning review', block, log: null }

  it('loads the block, names the key Save, and writes the changes through update', async () => {
    const { onSaved } = open({ mode: 'edit', block, occurrence })
    expect(screen.getByText('calendarPage.blocks.form.editTitle')).toBeInTheDocument()
    expect(title()).toHaveValue('Morning review')
    expect(segment('calendarPage.blocks.form.source.study')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('calendarPage.blocks.minutes 25')).toBeInTheDocument()
    expect(segment('Saturday')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getAllByRole('button', { name: 'calendarPage.blocks.form.remindMinutes 15' })[0]).toHaveAttribute('aria-pressed', 'true')
    fireEvent.change(title(), { target: { value: 'Evening review' } })
    await act(async () => {
      fireEvent.click(primary())
    })
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 'b1',
      changes: expect.objectContaining({ title: 'Evening review', lengthMin: 25, reminderMin: 15 })
    })
    expect(onSaved).toHaveBeenCalled()
  })

  it("the day's record offers Kept · Skip, then Undo, writing through the log", async () => {
    open({ mode: 'edit', block, occurrence })
    expect(screen.getByText('calendarPage.blocks.form.today')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'calendarPage.blocks.undo' })).toBeNull()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'calendarPage.blocks.kept' }))
    })
    expect(mockKeep).toHaveBeenCalledWith(occurrence)
    expect(screen.getByRole('button', { name: 'calendarPage.blocks.kept' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('calendarPage.blocks.state.kept')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'calendarPage.blocks.undo' }))
    })
    expect(mockUndo).toHaveBeenCalledWith(occurrence)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'calendarPage.blocks.skip' }))
    })
    expect(mockSkip).toHaveBeenCalledWith(occurrence)
    expect(screen.getByText('calendarPage.blocks.state.skipped')).toBeInTheDocument()
  })

  it('has no record for a day still to come', () => {
    open({ mode: 'edit', block, occurrence: { ...occurrence, date: mockTomorrowKey } })
    expect(screen.queryByRole('button', { name: 'calendarPage.blocks.kept' })).toBeNull()
  })

  it('Delete asks first, then removes the block', async () => {
    const { onSaved, onClose } = open({ mode: 'edit', block, occurrence })
    fireEvent.click(screen.getByRole('button', { name: 'calendarPage.blocks.form.delete' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(mockRemove).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'calendarPage.blocks.form.delete' }))
    })
    expect(mockRemove).toHaveBeenCalledWith('b1')
    expect(onSaved).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})

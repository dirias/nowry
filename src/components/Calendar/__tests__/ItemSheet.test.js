/**
 * PLAN-012 (ADR-046) — the item sheet: no kind to choose; the readout and the
 * key read the kind off the facts; context fills one fact; edit reads any
 * document; the key is never disabled and errors are loud.
 */
import React from 'react'
import { render, screen, fireEvent, act, within } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? [k, ...Object.values(opts)].join(' ') : k), i18n: { language: 'en' } })
}))
const mockSaveItem = jest.fn()
const mockDeleteItem = jest.fn()
jest.mock('@nowry/core/hooks/useItemWriter', () => ({ useItemWriter: () => ({ saveItem: mockSaveItem, deleteItem: mockDeleteItem }) }))
const mockKeep = jest.fn()
jest.mock('@nowry/core/hooks/useBlockLog', () => ({
  useBlockLog: () => ({ keep: mockKeep, skip: jest.fn(), undo: jest.fn(), pending: false })
}))
jest.mock('@nowry/core/hooks/useAnnualPlan', () => ({
  useAnnualPlan: () => ({
    goals: [{ _id: 'g1', title: 'Run a half marathon', status: 'in_progress', progress: 20, milestones: [], focus_area_id: 'a1' }],
    loading: false
  })
}))
jest.mock('../../Study/useTodayData', () => ({ useTodayData: () => ({ dueToday: 27, forecast: { days: [] } }) }))

const { localDateKey, addDaysKey } = require('@nowry/core/domain/blocks')
const todayKey = localDateKey(new Date())
const tomorrowKey = addDaysKey(todayKey, 1)

const open = (props = {}) => {
  const ItemSheet = require('../ItemSheet').default
  const onClose = jest.fn()
  const onSaved = jest.fn()
  render(<ItemSheet open onClose={onClose} onSaved={onSaved} mode='create' blocks={[]} {...props} />)
  return { onClose, onSaved }
}

const title = () => screen.getByLabelText(/items.sheet.title/)
const readout = () => screen.getByTestId('item-readout')
const key = (name) => screen.getByRole('button', { name })
const dayToggle = (name) => within(screen.getByRole('group', { name: 'items.sheet.days' })).getByRole('button', { name })

beforeEach(() => {
  jest.clearAllMocks()
  mockSaveItem.mockResolvedValue({})
  mockDeleteItem.mockResolvedValue({})
})

describe('no kind to choose: the readout and the key follow the facts', () => {
  it('opens blank as a task, and nothing asks what it is', () => {
    open()
    expect(screen.queryByRole('group', { name: /selectType|form.for/ })).toBeNull()
    expect(readout()).toHaveTextContent('items.reading.task')
    expect(key('items.key.add.task')).toBeInTheDocument()
  })

  it('setting a time on weekdays with no due date reads as a routine; a due date makes it a task again', () => {
    open()
    fireEvent.click(key('items.sheet.setTime'))
    fireEvent.click(dayToggle('Monday'))
    expect(readout()).toHaveTextContent('items.reading.routine')
    expect(key('items.key.add.routine')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('items.sheet.due'), { target: { value: tomorrowKey } })
    expect(key('items.key.add.task')).toBeInTheDocument()
  })

  it('picking a goal reads as a milestone; the priority switch says priority in the readout, never in the key', () => {
    open({ prefill: { goalId: 'g1' } })
    expect(key('items.key.add.milestone')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('items.sheet.priority'))
    expect(readout()).toHaveTextContent('items.readout.priority')
    expect(key('items.key.add.milestone')).toBeInTheDocument()
  })
})

describe('context fills one fact', () => {
  it('from the hours: scheduled once at that start, nothing else', async () => {
    open({ prefill: { scheduled: { start: '09:00', lengthMin: 30, date: todayKey } } })
    expect(screen.getByLabelText('calendarPage.blocks.form.starts')).toHaveValue('09:00')
    fireEvent.change(title(), { target: { value: 'Call the bank' } })
    await act(async () => {
      fireEvent.click(key('items.key.add.task'))
    })
    expect(mockSaveItem).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Call the bank',
        due: null,
        goalId: null,
        scheduled: expect.objectContaining({ start: '09:00', lengthMin: 30, daysOfWeek: [], date: todayKey })
      }),
      null,
      { areaId: null, done: null }
    )
  })

  it('from a day: due that day; the Study Center: a scheduled study time with its title', () => {
    open({ prefill: { due: tomorrowKey } })
    expect(screen.getByLabelText('items.sheet.due')).toHaveValue(tomorrowKey)
    expect(readout()).toHaveTextContent('items.readout.due')
  })

  it('from the Study Center: the study time, sized by the forecast until the learner sets it', () => {
    open({ prefill: { title: 'Morning review', origin: 'study', scheduled: { start: '07:30', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] } } })
    expect(key('items.key.add.study')).toBeInTheDocument()
    expect(screen.getByText(/calendarPage.blocks.form.forecastHint 27/)).toBeInTheDocument()
  })
})

describe('the key is never disabled; errors are loud', () => {
  it('an empty title fails under the field; a once time with no day and no due date fails under Scheduled', async () => {
    open()
    fireEvent.click(key('items.sheet.setTime'))
    await act(async () => {
      fireEvent.click(key('items.key.add.task'))
    })
    expect(mockSaveItem).not.toHaveBeenCalled()
    expect(screen.getByText('items.sheet.titleRequired')).toBeInTheDocument()
    expect(screen.getByText('items.sheet.dateRequired')).toBeInTheDocument()
  })

  it('a rejected request names itself in the banner and keeps everything typed', async () => {
    mockSaveItem.mockRejectedValueOnce(new Error('offline'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    open({ prefill: { due: todayKey } })
    fireEvent.change(title(), { target: { value: 'Essay' } })
    await act(async () => {
      fireEvent.click(key('items.key.add.task'))
    })
    expect(screen.getByText('calendarPage.blocks.form.saveError')).toBeInTheDocument()
    expect(title()).toHaveValue('Essay')
    console.error.mockRestore()
  })
})

describe('edit reads any document', () => {
  const task = { _id: 't1', title: 'Essay', deadline: `${tomorrowKey}T00:00:00`, is_priority: true, is_completed: false }
  const block = {
    id: 'b1',
    title: 'Essay',
    source: { type: 'task', id: 't1' },
    start: '13:00',
    lengthMin: 50,
    daysOfWeek: [],
    date: todayKey
  }

  it('a task with its block opens with due, priority and the time, its goal locked, and saves with done', async () => {
    open({ mode: 'edit', source: { task }, blocks: [block] })
    expect(screen.getByLabelText('items.sheet.due')).toHaveValue(tomorrowKey)
    expect(screen.getByLabelText('items.sheet.priority')).toBeChecked()
    expect(screen.getByLabelText('calendarPage.blocks.form.starts')).toHaveValue('13:00')
    expect(screen.queryByRole('button', { name: 'items.sheet.goal' })).toBeNull()
    fireEvent.click(screen.getByLabelText('items.sheet.done'))
    await act(async () => {
      fireEvent.click(key('items.key.save'))
    })
    expect(mockSaveItem).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Essay', due: tomorrowKey, priority: true }),
      expect.objectContaining({ task, block }),
      { areaId: null, done: true }
    )
  })

  it('a routine block opens as a scheduled item, shows the day’s record for today, and the tick keeps it', async () => {
    const routine = {
      id: 'b2',
      title: 'Read',
      source: { type: 'routine', id: null },
      start: '07:30',
      lengthMin: 20,
      daysOfWeek: [0, 1, 2, 3, 4],
      date: null
    }
    const occurrence = { date: todayKey, blockId: 'b2', start: '07:30', lengthMin: 20, title: 'Read', block: routine, log: null }
    mockKeep.mockResolvedValue({})
    open({ mode: 'edit', source: { block: routine, occurrence }, blocks: [routine] })
    expect(readout()).toHaveTextContent('items.reading.routine')
    expect(dayToggle('Monday')).toHaveAttribute('aria-pressed', 'true')
    await act(async () => {
      fireEvent.click(key('calendarPage.blocks.kept'))
    })
    expect(mockKeep).toHaveBeenCalledWith(occurrence)
  })

  it('delete confirms, then removes everything the item spans', async () => {
    const { onClose } = open({ mode: 'edit', source: { task }, blocks: [block] })
    fireEvent.click(key('items.sheet.delete'))
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'items.sheet.delete' }).at(-1))
    })
    expect(mockDeleteItem).toHaveBeenCalledWith(expect.objectContaining({ task, block }))
    expect(onClose).toHaveBeenCalled()
  })
})

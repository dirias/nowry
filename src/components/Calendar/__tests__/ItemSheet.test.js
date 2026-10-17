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
const row = (id) => within(screen.getByTestId(`row-${id}`))
const openRow = (id, label = 'items.sheet.set') => fireEvent.click(row(id).getByRole('button', { name: label }))

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
    openRow('scheduled')
    fireEvent.click(dayToggle('Monday'))
    expect(readout()).toHaveTextContent('items.reading.routine')
    expect(key('items.key.add.routine')).toBeInTheDocument()
    openRow('due')
    fireEvent.change(screen.getByLabelText('items.sheet.due'), { target: { value: tomorrowKey } })
    expect(key('items.key.add.task')).toBeInTheDocument()
    // One row open at a time: opening Due closed Scheduled.
    expect(screen.queryByRole('group', { name: 'items.sheet.days' })).toBeNull()
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

  it('from a day: due that day, read on its row and in the readout', () => {
    open({ prefill: { due: tomorrowKey } })
    expect(row('due').getByRole('button', { name: 'items.sheet.change' })).toBeInTheDocument()
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
    openRow('scheduled')
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

describe('the rows (PRD D10)', () => {
  it('a once time with a due date needs no second date; without one the once-date field appears; × removes the time', () => {
    open({ prefill: { due: tomorrowKey } })
    openRow('scheduled')
    expect(screen.queryByLabelText('items.sheet.onceDate')).toBeNull()
    expect(screen.getByText('items.sheet.onceOnDue')).toBeInTheDocument()
    openRow('due', 'items.sheet.change')
    fireEvent.click(row('due').getByRole('button', { name: 'items.sheet.noDate' }))
    openRow('scheduled', 'items.sheet.change')
    expect(screen.getByLabelText('items.sheet.onceDate')).toBeInTheDocument()
    fireEvent.click(row('scheduled').getByRole('button', { name: 'items.sheet.removeTime' }))
    expect(row('scheduled').getByRole('button', { name: 'items.sheet.set' })).toBeInTheDocument()
    expect(screen.queryByTestId('row-more')).toBeNull()
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
    expect(row('due').getByRole('button', { name: 'items.sheet.change' })).toBeInTheDocument()
    expect(screen.getByLabelText('items.sheet.priority')).toBeChecked()
    openRow('scheduled', 'items.sheet.change')
    expect(screen.getByLabelText('calendarPage.blocks.form.starts')).toHaveValue('13:00')
    // The goal is locked once the item exists: a value, no action.
    expect(row('goal').queryByRole('button')).toBeNull()
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
    openRow('scheduled', 'items.sheet.change')
    expect(dayToggle('Monday')).toHaveAttribute('aria-pressed', 'true')
    await act(async () => {
      fireEvent.click(key('calendarPage.blocks.kept'))
    })
    expect(mockKeep).toHaveBeenCalledWith(occurrence)
  })

  it('Start lives in the day record: today’s unlogged block offers it, late ones too, and it closes the sheet (PLAN-017)', async () => {
    const routine = {
      id: 'b3',
      title: 'Run',
      source: { type: 'goal', id: 'g1' },
      start: '00:05',
      lengthMin: 30,
      daysOfWeek: [],
      date: todayKey
    }
    const missed = { date: todayKey, blockId: 'b3', start: '00:05', lengthMin: 30, title: 'Run', block: routine, log: null }
    const onStart = jest.fn()
    const { onClose } = open({ mode: 'edit', source: { block: routine, occurrence: missed }, blocks: [routine], onStart })
    fireEvent.click(key('blocks.row.start'))
    expect(onStart).toHaveBeenCalledWith(missed)
    expect(onClose).toHaveBeenCalled()
  })

  it('a logged block, or a sheet with no timer to run, offers no Start', () => {
    const routine = {
      id: 'b3',
      title: 'Run',
      source: { type: 'routine', id: null },
      start: '07:30',
      lengthMin: 20,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      date: null
    }
    const kept = { date: todayKey, blockId: 'b3', start: '07:30', lengthMin: 20, title: 'Run', block: routine, log: { status: 'kept' } }
    open({ mode: 'edit', source: { block: routine, occurrence: kept }, blocks: [routine], onStart: jest.fn() })
    expect(screen.queryByRole('button', { name: 'blocks.row.start' })).toBeNull()
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

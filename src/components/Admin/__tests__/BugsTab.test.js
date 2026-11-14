/**
 * ADMIN-007b — the Bug reports tab (FR-011 Bug reports, boards C, J, L): the
 * four state filters with their counts, New by default; the rows with severity
 * as a dot and a word, the device and the age; the selected report's card with
 * its caption, screenshots, Status as one segmented control, the notes oldest
 * first and Save, which says "Nothing to save yet" when there is nothing; the
 * re-sign-in and its retry; and the list's states.
 */
import React from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import BugsTab from '../bugs/BugsTab'

const mockT = (key, options) => {
  const values = Object.entries(options ?? {}).filter(([name]) => name !== 'defaultValue')
  return values.length ? `${key}|${values.map(([name, value]) => `${name}=${value}`).join(',')}` : key
}
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT, i18n: { language: 'en' } }) }))
jest.mock('@nowry/core/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'admin-1', username: 'didier' } }) }))
jest.mock('@nowry/core/api/services/bugs.service', () => ({
  BUG_LIST_LIMIT: 100,
  bugsService: { list: jest.fn(), stats: jest.fn(), updateStatus: jest.fn() }
}))
jest.mock('@nowry/core/api/services/auth.service', () => ({
  authService: { signInProviders: jest.fn(), signInTime: jest.fn(), reauthenticate: jest.fn() }
}))
const { bugsService } = require('@nowry/core/api/services/bugs.service')
const { authService } = require('@nowry/core/api/services/auth.service')

const HOUR = 3600 * 1000
const ago = (ms) => new Date(Date.now() - ms).toISOString()
const FLIP = {
  id: 'b1',
  title: 'Card flips twice on a fast double tap',
  description: 'Tapping a card twice quickly shows the back, then the front again.',
  steps_to_reproduce: '1. Open a deck 2. Tap twice',
  severity: 'high',
  category: 'study',
  status: 'new',
  url: '/study',
  platform: 'web',
  browser_info: { name: 'Chrome', version: '131.0.0', os: 'Android 15', screen_resolution: '412x915' },
  screen_size: '412x915',
  created_at: ago(2 * HOUR),
  reporter_username: 'marta_l',
  screenshots: [{ filename: 'a.png', data: 'data:image/png;base64,QUJD' }],
  notes: [
    { text: 'Reproduced on a Pixel 7.', by: 'admin-1', at: ago(26 * HOUR) },
    { text: 'Older dev note', by: null, at: null }
  ]
}
const IMPORT = {
  id: 'b2',
  title: 'Book import stalls at 90 %',
  description: 'It stops.',
  severity: 'critical',
  category: 'books',
  status: 'new',
  platform: 'android',
  app_version: '1.0 (31)',
  device: 'Pixel 7 · Android 15',
  created_at: ago(30 * HOUR),
  reporter_username: 'jonas.k',
  screenshots: [],
  notes: []
}
const STATS = { total: 20, by_status: { new: 2, in_progress: 1, fixed: 14, wont_fix: 3 } }
const REAUTH = { response: { status: 401, data: { detail: { code: 'reauth_required' } } } }

const renderTab = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <BugsTab />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  bugsService.list.mockResolvedValue([FLIP, IMPORT])
  bugsService.stats.mockResolvedValue(STATS)
  bugsService.updateStatus.mockResolvedValue({ bug_id: 'b1', status: 'in_progress', notes: [] })
  authService.signInProviders.mockReturnValue(['password'])
  authService.signInTime.mockResolvedValue(null)
  authService.reauthenticate.mockResolvedValue(undefined)
  window.requestAnimationFrame = (callback) => callback()
})

const card = () => screen.getByRole('region', { name: 'admin.bugs.item.label' })

it('filters by state with the counts, New first and engaged', async () => {
  renderTab()
  const filters = screen.getByRole('group', { name: 'admin.bugs.filters' })
  await waitFor(() => expect(within(filters).getByRole('button', { name: 'admin.bugs.states.new · 2' })).toBeInTheDocument())
  expect(
    within(filters)
      .getAllByRole('button')
      .map((chip) => chip.getAttribute('aria-label'))
  ).toEqual([
    'admin.bugs.states.new · 2',
    'admin.bugs.states.in_progress · 1',
    'admin.bugs.states.fixed · 14',
    'admin.bugs.states.wont_fix · 3'
  ])
  expect(within(filters).getByRole('button', { name: 'admin.bugs.states.new · 2' })).toHaveAttribute('aria-pressed', 'true')
  expect(bugsService.list).toHaveBeenCalledWith({ status: 'new', limit: 100 })
  fireEvent.click(within(filters).getByRole('button', { name: 'admin.bugs.states.fixed · 14' }))
  await waitFor(() => expect(bugsService.list).toHaveBeenLastCalledWith({ status: 'fixed', limit: 100 }))
})

it('lists each report with its meta, severity, device and age, and selects the first', async () => {
  renderTab()
  const list = await screen.findByRole('group', { name: 'admin.bugs.list.title' })
  const [first, second] = within(list).getAllByRole('button')
  expect(first).toHaveTextContent('Card flips twice on a fast double tap')
  expect(first).toHaveTextContent('/study · admin.bugs.list.by|name=marta_l')
  expect(first).toHaveTextContent('report.severity.high')
  expect(first).toHaveTextContent('Android · Chrome')
  expect(first).toHaveTextContent(/2\s?h/)
  expect(first.querySelector('[data-tone]')).toHaveAttribute('data-tone', 'warning')
  expect(first).toHaveAttribute('aria-current', 'true')
  expect(second).toHaveTextContent('report.areas.books · admin.bugs.list.by|name=jonas.k')
  expect(second).toHaveTextContent('admin.bugs.list.app|os=Android')
  expect(second.querySelector('[data-tone]')).toHaveAttribute('data-tone', 'danger')
  expect(within(list).getByText('admin.bugs.list.head.severity')).toBeInTheDocument()
})

it('shows the selected report: caption, title, text, steps, screenshots, status and the notes oldest first', async () => {
  renderTab()
  await screen.findByRole('region', { name: 'admin.bugs.item.label' })
  const region = card()
  expect(region).toHaveTextContent(/admin\.bugs\.item\.reported\|when=2\s?h ago · Android 15 · Chrome 131 · 412 × 915/)
  expect(within(region).getByRole('heading', { level: 2 })).toHaveTextContent(FLIP.title)
  expect(region).toHaveTextContent(FLIP.description)
  expect(region).toHaveTextContent(FLIP.steps_to_reproduce)
  const status = within(region).getByRole('group', { name: 'admin.bugs.item.status' })
  expect(
    within(status)
      .getAllByRole('button')
      .map((button) => button.textContent)
  ).toEqual(['admin.bugs.states.new', 'admin.bugs.states.in_progress', 'admin.bugs.states.fixed', 'admin.bugs.states.wont_fix'])
  expect(within(status).getByRole('button', { name: 'admin.bugs.states.new' })).toHaveAttribute('aria-pressed', 'true')
  const notes = within(within(region).getByRole('list', { name: 'admin.bugs.item.notes' })).getAllByRole('listitem')
  expect(notes[0]).toHaveTextContent('Older dev note')
  expect(notes[0]).not.toHaveTextContent('admin.bugs.item')
  expect(notes[1]).toHaveTextContent('admin.bugs.item.you|when=yesterday')
  expect(notes[1]).toHaveTextContent('Reproduced on a Pixel 7.')
})

it('opens a screenshot at full size and closes it', async () => {
  renderTab()
  await screen.findByRole('region', { name: 'admin.bugs.item.label' })
  fireEvent.click(screen.getByRole('button', { name: 'admin.bugs.item.openScreenshot|number=1' }))
  const image = await screen.findByRole('img', { name: 'admin.bugs.item.screenshot|number=1' })
  expect(image).toHaveAttribute('src', FLIP.screenshots[0].data)
  fireEvent.click(screen.getByRole('button', { name: 'admin.bugs.item.closeScreenshot' }))
  await waitFor(() => expect(screen.queryByRole('img', { name: 'admin.bugs.item.screenshot|number=1' })).not.toBeInTheDocument())
})

it('shows a phone report as the app with its version and device', async () => {
  renderTab()
  const list = await screen.findByRole('group', { name: 'admin.bugs.list.title' })
  fireEvent.click(within(list).getAllByRole('button')[1])
  await waitFor(() => expect(card()).toHaveTextContent('admin.bugs.item.app|os=Android,version=1.0 (31) · Pixel 7 · Android 15'))
  expect(within(card()).queryByRole('list')).not.toBeInTheDocument()
})

it('says "Nothing to save yet" for an empty save, and Save is never disabled', async () => {
  renderTab()
  await screen.findByRole('region', { name: 'admin.bugs.item.label' })
  const save = within(card()).getByRole('button', { name: 'admin.bugs.item.save' })
  expect(save).not.toBeDisabled()
  await act(async () => {
    fireEvent.click(save)
  })
  expect(screen.getByTestId('bug-save-result')).toHaveTextContent('admin.bugs.result.nothing')
  expect(bugsService.updateStatus).not.toHaveBeenCalled()
})

it('saves a status change and a note together, says so and reads the list again', async () => {
  renderTab()
  await screen.findByRole('region', { name: 'admin.bugs.item.label' })
  fireEvent.click(within(card()).getByRole('button', { name: 'admin.bugs.states.in_progress' }))
  fireEvent.change(within(card()).getByPlaceholderText('admin.bugs.item.notePlaceholder'), {
    target: { value: ' The second tap lands early. ' }
  })
  bugsService.list.mockClear()
  await act(async () => {
    fireEvent.click(within(card()).getByRole('button', { name: 'admin.bugs.item.save' }))
  })
  expect(bugsService.updateStatus).toHaveBeenCalledWith('b1', { status: 'in_progress', note: 'The second tap lands early.' })
  expect(screen.getByTestId('bugs-result')).toHaveTextContent('admin.bugs.result.saved')
  expect(screen.getByTestId('bugs-result').parentElement).toHaveAttribute('aria-live', 'polite')
  await waitFor(() => expect(bugsService.list).toHaveBeenCalled())
})

it('asks for the sign-in again and retries the same save', async () => {
  bugsService.updateStatus.mockRejectedValueOnce(REAUTH).mockResolvedValueOnce({ bug_id: 'b1', status: 'new', notes: [] })
  renderTab()
  await screen.findByRole('region', { name: 'admin.bugs.item.label' })
  fireEvent.change(within(card()).getByPlaceholderText('admin.bugs.item.notePlaceholder'), { target: { value: 'Seen' } })
  fireEvent.click(within(card()).getByRole('button', { name: 'admin.bugs.item.save' }))
  const dialog = await screen.findByRole('dialog', { name: 'admin.reauth.saveBug.title' })
  fireEvent.change(within(dialog).getByLabelText('reauth.passwordLabel', { exact: false }), { target: { value: 'secret' } })
  await act(async () => {
    fireEvent.click(within(dialog).getByRole('button', { name: 'admin.reauth.saveBug.confirm' }))
  })
  expect(authService.reauthenticate).toHaveBeenCalledWith({ method: 'password', password: 'secret' })
  expect(bugsService.updateStatus).toHaveBeenCalledTimes(2)
  expect(bugsService.updateStatus).toHaveBeenLastCalledWith('b1', { note: 'Seen' })
  await waitFor(() => expect(screen.getByTestId('bugs-result')).toHaveTextContent('admin.bugs.result.saved'))
})

it('says a failed save', async () => {
  bugsService.updateStatus.mockRejectedValue(new Error('down'))
  renderTab()
  await screen.findByRole('region', { name: 'admin.bugs.item.label' })
  fireEvent.click(within(card()).getByRole('button', { name: 'admin.bugs.states.fixed' }))
  await act(async () => {
    fireEvent.click(within(card()).getByRole('button', { name: 'admin.bugs.item.save' }))
  })
  expect(screen.getByTestId('bugs-result')).toHaveTextContent('admin.bugs.result.failed')
})

describe('the list states (board L)', () => {
  it('draws skeleton rows while loading', () => {
    bugsService.list.mockReturnValue(new Promise(() => {}))
    renderTab()
    expect(screen.getByTestId('bugs-loading')).toHaveAttribute('aria-busy', 'true')
  })

  it('says when a state has no reports, and draws no card', async () => {
    bugsService.list.mockResolvedValue([])
    renderTab()
    expect(await screen.findByText('admin.bugs.list.empty')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'admin.bugs.item.label' })).not.toBeInTheDocument()
  })

  it('says when the list could not be read, and tries again', async () => {
    bugsService.list.mockRejectedValueOnce(new Error('down'))
    renderTab()
    expect(await screen.findByText('admin.bugs.list.error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'admin.tryAgain' }))
    await waitFor(() => expect(screen.getByRole('group', { name: 'admin.bugs.list.title' })).toBeInTheDocument())
  })
})

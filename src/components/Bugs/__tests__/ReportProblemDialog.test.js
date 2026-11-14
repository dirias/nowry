/**
 * BUG-001, ADMIN-008a — "Report a problem" (FR-007, FR-008, board G): the
 * form's fields as the board draws them, the limits said under the fields
 * before sending (Send report is never disabled for them), screenshots made
 * smaller and refused when they cannot be, what the report carries, and the
 * three answers: thanks, the daily limit, and a picture still too large.
 */
import React from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ReportProblemDialog from '../ReportProblemDialog'

const mockT = (key, options) => {
  const values = Object.entries(options ?? {}).filter(([name]) => name !== 'defaultValue')
  return values.length ? `${key}|${values.map(([name, value]) => `${name}=${value}`).join(',')}` : key
}
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT, i18n: { language: 'en' } }) }))
jest.mock('@nowry/core/api/services/bugs.service', () => ({ bugsService: { submit: jest.fn() } }))
jest.mock('browser-image-compression', () => {
  const compress = jest.fn()
  compress.getDataUrlFromFile = jest.fn()
  return { __esModule: true, default: compress }
})
const { bugsService } = require('@nowry/core/api/services/bugs.service')
const imageCompression = require('browser-image-compression').default

const smallPng = 'data:image/png;base64,QUJD'
const bigJpeg = `data:image/jpeg;base64,${'A'.repeat(3 * 1024 * 1024)}`
const refusal = (status, detail) => Object.assign(new Error('refused'), { response: { status, data: { detail } } })

const renderDialog = (props = {}) => {
  const onClose = jest.fn()
  const utils = render(
    <MemoryRouter initialEntries={['/study/deck-1']}>
      <ReportProblemDialog open onClose={onClose} {...props} />
    </MemoryRouter>
  )
  return { ...utils, onClose }
}

const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const fill = () => {
  type('report.fields.title', 'Card flips twice')
  type('report.fields.description', 'It shows the back, then the front.')
}
const send = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'report.send' }))
  })
}

beforeEach(() => {
  bugsService.submit.mockResolvedValue({ bug_id: 'b1' })
  imageCompression.mockImplementation(async (file) => file)
  imageCompression.getDataUrlFromFile.mockResolvedValue(smallPng)
})

it('draws board G: title, lead, the three texts, severity, area, screenshots and the house footer', () => {
  renderDialog()
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByRole('heading', { level: 2, name: 'report.title' })).toBeInTheDocument()
  expect(dialog).toHaveAccessibleDescription('report.lead')
  expect(screen.getByLabelText('report.fields.title')).toBeInTheDocument()
  expect(screen.getByLabelText('report.fields.description')).toBeInTheDocument()
  expect(screen.getByText('report.fields.optional')).toBeInTheDocument()
  const severity = screen.getByRole('group', { name: 'report.fields.severity' })
  expect(
    within(severity)
      .getAllByRole('button')
      .map((button) => button.textContent)
  ).toEqual(['report.severity.low', 'report.severity.medium', 'report.severity.high', 'report.severity.critical'])
  expect(within(severity).getByRole('button', { name: 'report.severity.medium' })).toHaveAttribute('aria-pressed', 'true')
  // The area is guessed from the page the tester is on.
  expect(screen.getByRole('combobox')).toHaveTextContent('report.areas.study')
  expect(screen.getByText('report.fields.screenshotsCaption|used=0')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'report.fields.addScreenshot' })).toBeInTheDocument()
  const [cancel, sendKey] = within(dialog).getAllByRole('button').slice(-2)
  expect(cancel).toHaveTextContent('common.cancel')
  expect(sendKey).toHaveTextContent('report.send')
  expect(sendKey).not.toBeDisabled()
})

it('says what is missing under the fields instead of sending, and moves to the first', async () => {
  renderDialog()
  await send()
  expect(bugsService.submit).not.toHaveBeenCalled()
  expect(screen.getByText('report.errors.titleRequired')).toBeInTheDocument()
  expect(screen.getByText('report.errors.descriptionRequired')).toBeInTheDocument()
  expect(screen.getByLabelText('report.fields.title')).toHaveFocus()
  type('report.fields.title', 'x')
  expect(screen.queryByText('report.errors.titleRequired')).not.toBeInTheDocument()
})

it('counts near a limit and refuses text over it before sending', async () => {
  renderDialog()
  type('report.fields.title', 'x'.repeat(100))
  expect(screen.queryByText(/report.fields.counter/)).not.toBeInTheDocument()
  type('report.fields.title', 'x'.repeat(120))
  expect(screen.getByText('report.fields.counter|length=120,max=140')).toBeInTheDocument()
  type('report.fields.title', 'x'.repeat(141))
  type('report.fields.description', 'y')
  await send()
  expect(bugsService.submit).not.toHaveBeenCalled()
  expect(screen.getByText('report.errors.tooLong|max=140')).toBeInTheDocument()
})

it('sends the report with the page, the browser and the platform, closes, and thanks the tester', async () => {
  const { onClose } = renderDialog()
  fill()
  fireEvent.click(screen.getByRole('button', { name: 'report.severity.high' }))
  await send()
  expect(bugsService.submit).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Card flips twice',
      description: 'It shows the back, then the front.',
      steps_to_reproduce: '',
      severity: 'high',
      category: 'study',
      screenshots: [],
      platform: 'web',
      url: '/',
      app_version: '',
      browser_info: expect.objectContaining({ name: expect.any(String), os: expect.any(String), screen_resolution: expect.any(String) })
    })
  )
  expect(onClose).toHaveBeenCalled()
  expect(await screen.findByText('report.answers.sent')).toHaveAttribute('role', 'status')
})

it('changes the area from the select', async () => {
  renderDialog()
  fireEvent.click(screen.getByRole('combobox'))
  fireEvent.click(await screen.findByRole('option', { name: 'report.areas.books' }))
  fill()
  await send()
  expect(bugsService.submit).toHaveBeenCalledWith(expect.objectContaining({ category: 'books' }))
})

it.each([
  [refusal(429, { code: 'daily_limit', retry_at: '2026-11-15T00:00:00Z' }), 'report.answers.dailyLimit'],
  [refusal(413, { code: 'too_large', field: 'screenshots' }), 'report.errors.imageTooLarge'],
  [refusal(413, { code: 'too_large', field: 'body' }), 'report.answers.tooLarge'],
  [refusal(403, { code: 'reports_closed' }), 'report.answers.closed'],
  [new Error('offline'), 'report.answers.failed']
])('says a refusal in the form and keeps it open', async (error, text) => {
  bugsService.submit.mockRejectedValue(error)
  const { onClose } = renderDialog()
  fill()
  await send()
  expect(screen.getByTestId('report-refusal')).toHaveTextContent(text)
  expect(screen.getByTestId('report-refusal').parentElement).toHaveAttribute('aria-live', 'polite')
  expect(onClose).not.toHaveBeenCalled()
})

it('says a text field the API found too long under that field', async () => {
  bugsService.submit.mockRejectedValue(refusal(413, { code: 'too_large', field: 'description' }))
  renderDialog()
  fill()
  await send()
  expect(screen.getByText('report.errors.tooLong|max=4000')).toBeInTheDocument()
  expect(screen.queryByTestId('report-refusal')).not.toBeInTheDocument()
})

describe('screenshots', () => {
  const pick = async (file) => {
    await act(async () => {
      fireEvent.change(screen.getByTestId('report-screenshot-input'), { target: { files: [file] } })
    })
  }
  const png = (name = 'shot.png') => new File(['png'], name, { type: 'image/png' })

  it('keeps a picture made smaller, counts it, sends it, and removes it', async () => {
    renderDialog()
    await pick(png())
    expect(imageCompression).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({ maxSizeMB: 1 }))
    expect(screen.getByRole('img', { name: 'report.fields.screenshot|number=1' })).toHaveAttribute('src', smallPng)
    expect(screen.getByText('report.fields.screenshotsCaption|used=1')).toBeInTheDocument()
    fill()
    await send()
    expect(bugsService.submit.mock.calls[0][0].screenshots).toEqual([expect.objectContaining({ filename: 'shot.png', data: smallPng })])
  })

  it('removes a kept picture', async () => {
    renderDialog()
    await pick(png())
    fireEvent.click(screen.getByRole('button', { name: 'report.fields.removeScreenshot|number=1' }))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('stops offering the tile at three', async () => {
    renderDialog()
    await pick(png('a.png'))
    await pick(png('b.png'))
    await pick(png('c.png'))
    expect(screen.getAllByRole('img')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'report.fields.addScreenshot' })).not.toBeInTheDocument()
  })

  it('refuses a type that is not PNG, JPEG or WebP', async () => {
    renderDialog()
    await pick(new File(['gif'], 'a.gif', { type: 'image/gif' }))
    expect(screen.getByText('report.errors.imageType')).toBeInTheDocument()
    expect(imageCompression).not.toHaveBeenCalled()
  })

  it('tries a JPEG when the first pass is too large, and says so when it still is', async () => {
    imageCompression.getDataUrlFromFile.mockResolvedValue(bigJpeg)
    renderDialog()
    await pick(png())
    expect(imageCompression).toHaveBeenLastCalledWith(expect.any(File), expect.objectContaining({ fileType: 'image/jpeg' }))
    expect(screen.getByText('report.errors.imageTooLarge')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('says a picture that cannot be read', async () => {
    imageCompression.mockRejectedValue(new Error('broken'))
    renderDialog()
    await pick(png())
    await waitFor(() => expect(screen.getByText('report.errors.imageUnreadable')).toBeInTheDocument())
  })
})

it('Cancel closes without sending', () => {
  const { onClose } = renderDialog()
  fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }))
  expect(onClose).toHaveBeenCalled()
  expect(bugsService.submit).not.toHaveBeenCalled()
})

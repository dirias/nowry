/** BUG-001, ADMIN-008a — sending a report and reading what the API answered (FR-007, FR-008). */
import { renderHook, act } from '@testing-library/react'
import { useBugReport } from './useBugReport'

jest.mock('../api/services/bugs.service', () => ({ bugsService: { submit: jest.fn() } }))
const { bugsService } = require('../api/services/bugs.service')

const refusal = (status, detail) => Object.assign(new Error('refused'), { response: { status, data: { detail } } })

it('sends the report and says it reached us', async () => {
  bugsService.submit.mockResolvedValue({ bug_id: 'b1' })
  const { result } = renderHook(() => useBugReport())
  let sent
  await act(async () => {
    sent = await result.current.send({ title: 'Flip' })
  })
  expect(sent).toEqual({ kind: 'sent' })
  expect(bugsService.submit).toHaveBeenCalledWith({ title: 'Flip' })
  expect(result.current.outcome).toEqual({ kind: 'sent' })
  expect(result.current.sending).toBe(false)
  act(() => result.current.reset())
  expect(result.current.outcome).toBeNull()
})

it.each([
  [refusal(429, { code: 'daily_limit', retry_at: 'tomorrow' }), { kind: 'dailyLimit', retryAt: 'tomorrow' }],
  [refusal(413, { code: 'too_large', field: 'screenshots' }), { kind: 'tooLarge', field: 'screenshots' }],
  [refusal(403, { code: 'reports_closed' }), { kind: 'closed' }],
  [new Error('offline'), { kind: 'failed' }]
])('reads a refusal as the form says it', async (error, outcome) => {
  bugsService.submit.mockRejectedValue(error)
  const { result } = renderHook(() => useBugReport())
  let sent
  await act(async () => {
    sent = await result.current.send({ title: 'Flip' })
  })
  expect(sent).toEqual(outcome)
  expect(result.current.outcome).toEqual(outcome)
})

it('does not send a body over 7 MB', async () => {
  const { result } = renderHook(() => useBugReport())
  await act(async () => {
    await result.current.send({ screenshots: [{ data: 'x'.repeat(7 * 1024 * 1024) }] })
  })
  expect(bugsService.submit).not.toHaveBeenCalled()
  expect(result.current.outcome).toEqual({ kind: 'tooLarge', field: 'body' })
})

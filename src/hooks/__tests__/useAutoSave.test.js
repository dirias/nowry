/**
 * QA-009 — the editor's autosave. The question each test asks is the user's:
 * is what I wrote on the server, and if not, will something tell me?
 */
import { act, renderHook } from '@testing-library/react'
import { SAVE_STATUS, useAutoSave } from '../useAutoSave'

jest.useFakeTimers()

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  console.error.mockRestore()
  console.log.mockRestore()
})

/** An onSave whose calls the test settles by hand, in any order. */
const controllableSave = () => {
  const calls = []
  const onSave = jest.fn(
    (content) =>
      new Promise((resolve, reject) => {
        calls.push({ content, resolve, reject })
      })
  )
  return { onSave, calls }
}

const mount = (onSave, content = 'v0') =>
  renderHook(({ text }) => useAutoSave({ id: 'book-1', content: text, onSave, debounceMs: 2000, forceSaveMs: 30000 }), {
    initialProps: { text: content }
  })

const settle = async (call, how = 'resolve', value) => {
  await act(async () => {
    call[how](value)
    await Promise.resolve()
  })
}

const advance = async (ms) => {
  await act(async () => {
    jest.advanceTimersByTime(ms)
    await Promise.resolve()
  })
}

const warnsOnClose = () => {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

it('saves what was typed once the typing stops', async () => {
  const { onSave, calls } = controllableSave()
  const { result, rerender } = mount(onSave)
  rerender({ text: 'v1' })
  expect(result.current.status).toBe(SAVE_STATUS.UNSAVED)

  await advance(2000)
  expect(calls.map((call) => call.content)).toEqual(['v1'])
  await settle(calls[0])
  expect(result.current.status).toBe(SAVE_STATUS.SAVED)
})

it('saves again what was typed while a save was in flight', async () => {
  const { onSave, calls } = controllableSave()
  const { result, rerender } = mount(onSave)
  rerender({ text: 'v1' })
  await advance(2000)

  rerender({ text: 'v2' }) // typed during the save, then stopped
  await settle(calls[0])

  expect(result.current.status).not.toBe(SAVE_STATUS.SAVED)
  await advance(8000)
  expect(calls.map((call) => call.content)).toEqual(['v1', 'v2'])
  await settle(calls[1])
  expect(result.current.status).toBe(SAVE_STATUS.SAVED)
})

it('never has two saves in flight, so an older one cannot land last', async () => {
  const { onSave, calls } = controllableSave()
  const { rerender } = mount(onSave)
  rerender({ text: 'v1' })
  await advance(2000)
  rerender({ text: 'v2' })
  await advance(30000) // debounce and the force-save interval both come due

  expect(calls).toHaveLength(1)
  await settle(calls[0])
  await advance(2000) // then the newer text, on the usual debounce
  expect(calls.map((call) => call.content)).toEqual(['v1', 'v2'])
})

it('retries a failed save without waiting for more typing', async () => {
  const { onSave, calls } = controllableSave()
  const { result, rerender } = mount(onSave)
  rerender({ text: 'v1' })
  await advance(2000)
  await settle(calls[0], 'reject', new Error('offline'))
  expect(result.current.status).toBe(SAVE_STATUS.ERROR)

  await advance(30000)
  expect(calls.length).toBeGreaterThanOrEqual(2)
  expect(calls[1].content).toBe('v1')
  await settle(calls[1])
  expect(result.current.status).toBe(SAVE_STATUS.SAVED)
})

it('warns before closing while anything is not on the server, including after a failure', async () => {
  const { onSave, calls } = controllableSave()
  const { rerender } = mount(onSave)
  expect(warnsOnClose()).toBe(false)

  rerender({ text: 'v1' })
  expect(warnsOnClose()).toBe(true) // unsaved
  await advance(2000)
  expect(warnsOnClose()).toBe(true) // saving
  await settle(calls[0], 'reject', new Error('offline'))
  expect(warnsOnClose()).toBe(true) // failed
})

it('does not save what is already saved', async () => {
  const { onSave } = controllableSave()
  mount(onSave)
  await advance(60000)
  expect(onSave).not.toHaveBeenCalled()
})

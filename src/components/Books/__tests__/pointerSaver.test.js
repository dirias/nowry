import { createPointerSaver } from '../pointerSaver'

describe('createPointerSaver (BOOK-006)', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('coalesces a burst of changes into one save after the delay', () => {
    const save = jest.fn()
    const saver = createPointerSaver(save, { delay: 5000 })
    saver.set({ last_section: 'Grammar' })
    saver.set({ last_section: 'Particles' })
    saver.set({ reading_position: 3 })
    expect(save).not.toHaveBeenCalled()
    jest.advanceTimersByTime(5000)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({ last_section: 'Particles', reading_position: 3 })
  })

  it('flushes at once on leave, and never resends what it already sent', () => {
    const save = jest.fn()
    const saver = createPointerSaver(save, { delay: 5000 })
    saver.set({ last_section: 'Verbs' })
    saver.flush()
    expect(save).toHaveBeenCalledWith({ last_section: 'Verbs' })
    saver.set({ last_section: 'Verbs' })
    saver.flush()
    expect(save).toHaveBeenCalledTimes(1)
    saver.set({ last_section: 'Particles' })
    jest.advanceTimersByTime(5000)
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('drops what is pending on dispose', () => {
    const save = jest.fn()
    const saver = createPointerSaver(save, { delay: 100 })
    saver.set({ reading_position: 9 })
    saver.dispose()
    jest.advanceTimersByTime(200)
    expect(save).not.toHaveBeenCalled()
  })
})

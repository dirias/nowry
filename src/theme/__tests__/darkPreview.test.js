import { previewAllowed, readDarkPreview } from '../darkPreview'

describe('the dark preview flag (ADR-082 §9)', () => {
  beforeEach(() => window.localStorage.clear())

  it('is never read on the production hosts or in a production build', () => {
    expect(previewAllowed('nowry.app', 'development')).toBe(false)
    expect(previewAllowed('www.nowry.app', 'development')).toBe(false)
    expect(previewAllowed('www.dev.nowry.app', 'production')).toBe(false)
    expect(previewAllowed('www.dev.nowry.app', 'development')).toBe(true)
    expect(readDarkPreview('?dark-preview=final', 'nowry.app')).toBe(false)
    expect(window.localStorage.getItem('nowry-dark-preview')).toBeNull()
  })

  it('turns on with ?dark-preview=final, stays on, and turns off with ?dark-preview=off', () => {
    expect(readDarkPreview('', 'localhost')).toBe(false)
    expect(readDarkPreview('?dark-preview=final', 'localhost')).toBe(true)
    expect(readDarkPreview('', 'localhost')).toBe(true)
    expect(readDarkPreview('?dark-preview=off', 'localhost')).toBe(false)
    expect(readDarkPreview('', 'localhost')).toBe(false)
  })

  it('is off when storage is unavailable', () => {
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readDarkPreview('', 'localhost')).toBe(false)
    getItem.mockRestore()
  })
})

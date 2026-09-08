import { messageFor } from '../formMessage'

describe('the line under a field', () => {
  it('shows the helper when there is no error', () => {
    expect(messageFor(null, 'form.titleHelp')).toEqual({ key: 'form.titleHelp', invalid: false })
  })

  it('replaces the helper with the error, never showing both', () => {
    // Two lines under one field is a field arguing with itself.
    expect(messageFor('form.titleRequired', 'form.titleHelp')).toEqual({ key: 'form.titleRequired', invalid: true })
  })

  it('shows nothing when there is nothing to say', () => {
    expect(messageFor()).toEqual({ key: null, invalid: false })
  })

  it('reports invalid from the error alone, so the state never depends on colour', () => {
    // The caller renders `key` as TEXT and uses `invalid` only to add colour on
    // top. A red outline alone says something is wrong to some people and
    // nothing at all to others.
    expect(messageFor('form.x').invalid).toBe(true)
    expect(messageFor(null, 'form.y').invalid).toBe(false)
  })
})

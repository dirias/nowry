/**
 * booksService.importFile — IMPORT-004. An import uploads, parses and stores
 * pictures inside one request; on the client's 10-second default it was given
 * up on while the server finished it, and the retry made a duplicate.
 */
const mockPost = jest.fn()
jest.mock('../client', () => ({
  apiClient: { post: (...args) => mockPost(...args) }
}))

const { booksService, IMPORT_TIMEOUT_MS } = require('./books.service')

class FakeFormData {
  constructor() {
    this.fields = {}
  }

  append(key, value) {
    this.fields[key] = value
  }
}

beforeEach(() => {
  global.FormData = FakeFormData
  mockPost.mockReset().mockResolvedValue({ data: { _id: 'b1' } })
})

describe('importFile', () => {
  it('asks for its own timeout, minutes not seconds', async () => {
    await booksService.importFile({ name: 'notes.pdf' }, 'ana', false, 'Notes')
    const [url, form, config] = mockPost.mock.calls[0]
    expect(url).toBe('/book/import')
    expect(form.fields).toEqual({ file: { name: 'notes.pdf' }, username: 'ana', preview: 'false', title: 'Notes' })
    expect(config.timeout).toBe(IMPORT_TIMEOUT_MS)
    expect(IMPORT_TIMEOUT_MS).toBeGreaterThanOrEqual(120000)
  })

  it('gives the preview the same room, since it uploads and parses the same file', async () => {
    await booksService.importFile({ name: 'notes.pdf' }, 'ana', true)
    expect(mockPost.mock.calls[0][1].fields.preview).toBe('true')
    expect(mockPost.mock.calls[0][2].timeout).toBe(IMPORT_TIMEOUT_MS)
  })
})

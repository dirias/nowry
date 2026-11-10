import { IMPORT_EXTENSIONS, importRefusal, rejectedFileRefusal } from '../books/importRefusal'

const refused = (status, detail) => ({ response: { status, data: { detail } } })

describe('rejectedFileRefusal', () => {
  it('names the file and says its type is not one the import reads', () => {
    expect(rejectedFileRefusal('notes.md')).toEqual({ key: 'books.import.unsupportedType', options: { name: 'notes.md' } })
    expect(rejectedFileRefusal('book.EPUB').key).toBe('books.import.unsupportedType')
    expect(rejectedFileRefusal('no-extension').key).toBe('books.import.unsupportedType')
  })

  it('tells an old .doc apart, because the fix is to save it as .docx', () => {
    expect(rejectedFileRefusal('thesis.DOC')).toEqual({ key: 'books.import.legacyDoc', options: { name: 'thesis.DOC' } })
    expect(IMPORT_EXTENSIONS).toEqual(['pdf', 'docx', 'txt'])
  })
})

describe('importRefusal', () => {
  it.each([
    ['import_unsupported_type', 'books.import.unsupportedType'],
    ['import_legacy_doc', 'books.import.legacyDoc'],
    ['import_empty', 'books.import.empty'],
    ['import_password_protected', 'books.import.passwordProtected'],
    ['import_unreadable', 'books.import.unreadable']
  ])('maps %s to its own sentence, with the file name', (code, key) => {
    expect(importRefusal(refused(400, { code }), 'a.pdf')).toEqual({ key, options: { name: 'a.pdf' } })
  })

  it('carries the size limit the server sent', () => {
    expect(importRefusal(refused(413, { code: 'import_too_large', limit_mb: 25 }), 'big.pdf')).toEqual({
      key: 'books.import.tooLarge',
      options: { name: 'big.pdf', limit: 25 }
    })
  })

  it('uses the word ceiling sentence the editor uses', () => {
    const result = importRefusal(refused(413, { code: 'document_too_long', limit: 200000, words: 250000 }), 'long.txt')
    expect(result).toEqual({ key: 'subscription.errors.documentTooLong', options: { limit: 200000, name: 'long.txt' } })
  })

  it('blames the connection, not the file, when no answer came back', () => {
    expect(importRefusal({ code: 'ECONNABORTED' }, 'a.pdf')).toEqual({ key: 'books.import.notReached', options: { name: 'a.pdf' } })
  })

  it('falls back to a generic sentence that still names the file', () => {
    expect(importRefusal(refused(500, 'Internal Server Error'), 'a.pdf')).toEqual({ key: 'books.import.failed', options: { name: 'a.pdf' } })
    expect(importRefusal(refused(422, [{ msg: 'Field required' }]), 'a.pdf').key).toBe('books.import.failed')
  })
})

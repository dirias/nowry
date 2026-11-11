import { IMPORT_EXTENSIONS, duplicateOf, importRefusal, rejectedFileRefusal } from '../books/importRefusal'

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

  it('uses the size ceiling sentence for a document the database could not hold (ADR-071)', () => {
    const result = importRefusal(refused(413, { code: 'document_too_large', limit: 12, megabytes: 20.6 }), 'hex.txt')
    expect(result).toEqual({ key: 'subscription.errors.documentTooLarge', options: { limit: 12, name: 'hex.txt' } })
  })

  it('says a file was too complex to read, and that a scan could not be stored (ADR-070, ADR-071)', () => {
    expect(importRefusal(refused(422, { code: 'import_too_complex' }), 'bomb.docx').key).toBe('books.import.tooComplex')
    expect(importRefusal(refused(422, { code: 'import_pictures_not_stored' }), 'scan.pdf').key).toBe('books.import.picturesNotStored')
  })

  it('words a coded server failure as a failure of the import, not of the connection', () => {
    expect(importRefusal(refused(500, { code: 'import_failed' }), 'a.pdf')).toEqual({ key: 'books.import.failed', options: { name: 'a.pdf' } })
    expect(importRefusal(refused(409, { code: 'import_in_progress' }), 'a.pdf').key).toBe('books.import.failed')
  })

  it('blames the connection, not the file, when no answer came back', () => {
    expect(importRefusal({ code: 'ECONNABORTED' }, 'a.pdf')).toEqual({ key: 'books.import.notReached', options: { name: 'a.pdf' } })
  })

  it('falls back to a generic sentence that still names the file', () => {
    expect(importRefusal(refused(500, 'Internal Server Error'), 'a.pdf')).toEqual({ key: 'books.import.failed', options: { name: 'a.pdf' } })
    expect(importRefusal(refused(422, [{ msg: 'Field required' }]), 'a.pdf').key).toBe('books.import.failed')
  })
})

describe('duplicateOf (ADR-066)', () => {
  it('reads the existing document from a duplicate refusal and nothing from any other', () => {
    const existing = { _id: 'b1', title: 'notes', created_at: '2026-11-11T00:00:00' }
    expect(duplicateOf(refused(409, { code: 'import_duplicate', existing }))).toEqual(existing)
    expect(duplicateOf(refused(400, { code: 'import_empty' }))).toBeNull()
    expect(duplicateOf(refused(409, 'conflict'))).toBeNull()
    expect(duplicateOf({ code: 'ERR_NETWORK' })).toBeNull()
  })
})

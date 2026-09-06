import { enclosingHeading, nodeText, resolveCardSource } from '../enclosingHeading'

const text = (s) => ({ type: 'text', text: s })
const para = (s) => ({ type: 'paragraph', children: [text(s)] })
const heading = (tag, s) => ({ type: 'heading', tag, children: [text(s)] })
const state = (...children) => ({ root: { children } })

const DOC = state(
  para('intro'),
  heading('h1', 'Grammar'),
  para('a'),
  heading('h2', 'Particles'),
  heading('h3', 'は vs が'),
  para('b'),
  heading('h2', 'Verbs'),
  para('c')
)

describe('enclosingHeading (BOOK-002)', () => {
  it('returns the nearest H1 or H2 at or above the block, and ignores H3', () => {
    expect(enclosingHeading(DOC, 0)).toBeNull()
    expect(enclosingHeading(DOC, 2)).toBe('Grammar')
    expect(enclosingHeading(DOC, 5)).toBe('Particles')
    expect(enclosingHeading(DOC, 7)).toBe('Verbs')
    expect(enclosingHeading(DOC, -1)).toBeNull()
  })

  it('reads text through nested inline nodes', () => {
    expect(nodeText({ type: 'heading', tag: 'h2', children: [{ type: 'link', children: [text('A '), text('B')] }] })).toBe('A  B')
  })
})

describe('resolveCardSource', () => {
  const editorAt = (index, json = DOC) => ({
    getEditorState: () => ({
      toJSON: () => json,
      read: (fn) => fn()
    })
  })

  beforeEach(() => {
    jest.resetModules()
  })

  it('stamps the document and the section the server knows by that heading', async () => {
    jest.doMock('lexical', () => ({
      $getSelection: () => ({ anchor: { getNode: () => ({ getParent: () => 'root', getIndexWithinParent: () => 5 }) } }),
      $isRangeSelection: () => true,
      $getRoot: () => 'root'
    }))
    const { resolveCardSource: resolve } = require('../enclosingHeading')
    const getSections = jest.fn().mockResolvedValue({ sections: [{ index: 1, heading: 'Particles', hash: 'abc123def456' }] })
    const source = await resolve({ book: { _id: 'b1', title: 'N3 Grammar' }, editor: editorAt(5), getSections })
    expect(source).toEqual({
      source_book_id: 'b1',
      source_book_title: 'N3 Grammar',
      source_section: { heading: 'Particles', index: 1, hash: 'abc123def456' }
    })
  })

  it('stamps the document only when the selection is above the first heading or its section is too short to exist', async () => {
    jest.doMock('lexical', () => ({
      $getSelection: () => ({ anchor: { getNode: () => ({ getParent: () => 'root', getIndexWithinParent: () => 7 }) } }),
      $isRangeSelection: () => true,
      $getRoot: () => 'root'
    }))
    const { resolveCardSource: resolve } = require('../enclosingHeading')
    const getSections = jest.fn().mockResolvedValue({ sections: [{ index: 0, heading: 'Particles', hash: 'x' }] })
    const source = await resolve({ book: { _id: 'b1', title: 'N3' }, editor: editorAt(7), getSections })
    expect(source.source_section).toBeNull()
    expect(source.source_book_id).toBe('b1')
  })

  it('is null without a book, and survives a failing sections call', async () => {
    expect(await resolveCardSource({ book: null, editor: null, getSections: jest.fn() })).toBeNull()
    jest.doMock('lexical', () => ({ $getSelection: () => null, $isRangeSelection: () => false, $getRoot: () => 'root' }))
    const { resolveCardSource: resolve } = require('../enclosingHeading')
    const source = await resolve({
      book: { _id: 'b1', title: 'N3' },
      editor: editorAt(3),
      getSections: jest.fn().mockRejectedValue(new Error('down'))
    })
    expect(source).toEqual({ source_book_id: 'b1', source_book_title: 'N3', source_section: null })
  })
})

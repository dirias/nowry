import { documentWordCount, readDocument } from '../books/lexicalDocument'

const doc = (children) => JSON.stringify({ root: { type: 'root', children } })
const text = (value, format = 0) => ({ type: 'text', text: value, format })

describe('reading a document body', () => {
  it('says which of the two formats it got', () => {
    expect(readDocument(null).format).toBe('empty')
    expect(readDocument('<p>An older document</p>').format).toBe('legacy-html')
    expect(readDocument(doc([])).format).toBe('lexical')
  })

  it('reports a broken body as legacy rather than throwing', () => {
    // A reader that crashes on one document takes the library with it.
    expect(readDocument('{not json').format).toBe('legacy-html')
  })

  it('accepts an object as well as a string, because the API has sent both', () => {
    expect(readDocument({ root: { children: [{ type: 'paragraph', children: [text('Hello')] }] } }).blocks).toHaveLength(1)
  })

  it('reads a heading with its level', () => {
    const { blocks } = readDocument(doc([{ type: 'heading', tag: 'h3', children: [text('Chapter')] }]))
    expect(blocks[0]).toMatchObject({ type: 'heading', level: 3 })
    expect(blocks[0].spans[0].text).toBe('Chapter')
  })

  it('splits a paragraph into styled spans', () => {
    const { blocks } = readDocument(doc([{ type: 'paragraph', children: [text('plain '), text('bold', 1), text(' and italic', 2)] }]))
    expect(blocks[0].spans.map((span) => [span.text, span.bold, span.italic])).toEqual([
      ['plain ', false, false],
      ['bold', true, false],
      [' and italic', false, true]
    ])
  })

  it('reads both bits when a run is bold AND italic', () => {
    const { blocks } = readDocument(doc([{ type: 'paragraph', children: [text('both', 3)] }]))
    expect(blocks[0].spans[0]).toMatchObject({ bold: true, italic: true })
  })

  it('keeps a link with the words it labels', () => {
    const { blocks } = readDocument(
      doc([{ type: 'paragraph', children: [{ type: 'link', url: 'https://nowry.app', children: [text('here')] }] }])
    )
    expect(blocks[0].spans[0]).toMatchObject({ text: 'here', link: 'https://nowry.app' })
  })

  it('drops an empty paragraph, which is spacing rather than content', () => {
    const { blocks } = readDocument(
      doc([
        { type: 'paragraph', children: [text('   ')] },
        { type: 'paragraph', children: [text('real')] }
      ])
    )
    expect(blocks).toHaveLength(1)
  })

  it('reads a list and says whether it is numbered', () => {
    const { blocks } = readDocument(
      doc([
        {
          type: 'list',
          listType: 'number',
          children: [
            { type: 'listitem', children: [text('first')] },
            { type: 'listitem', children: [text('second')] }
          ]
        }
      ])
    )
    expect(blocks[0]).toMatchObject({ type: 'list', ordered: true })
    expect(blocks[0].items.map((item) => item[0].text)).toEqual(['first', 'second'])
  })

  it('flattens a column layout into one column, in order', () => {
    const { blocks } = readDocument(
      doc([
        {
          type: 'columncontainer',
          children: [
            { type: 'column', children: [{ type: 'paragraph', children: [text('left')] }] },
            { type: 'column', children: [{ type: 'paragraph', children: [text('right')] }] }
          ]
        }
      ])
    )
    expect(blocks.map((block) => block.spans[0].text)).toEqual(['left', 'right'])
  })

  it('names a node it cannot draw rather than dropping it', () => {
    const { blocks } = readDocument(doc([{ type: 'math', children: [] }]))
    expect(blocks[0]).toEqual({ type: 'unsupported', name: 'math' })
  })

  it('carries an image with its source and its alt text', () => {
    const { blocks } = readDocument(doc([{ type: 'image', src: 'https://x/y.png', altText: 'A diagram' }]))
    expect(blocks[0]).toMatchObject({ type: 'image', src: 'https://x/y.png', alt: 'A diagram' })
  })

  it('keeps a soft line break, because a dropped one welds two lines together', () => {
    const { blocks } = readDocument(
      doc([{ type: 'paragraph', children: [text('first line'), { type: 'linebreak' }, text('second line')] }])
    )
    expect(blocks[0].spans.map((span) => span.text)).toEqual(['first line', '\n', 'second line'])
  })

  it('keeps a tab', () => {
    const { blocks } = readDocument(doc([{ type: 'paragraph', children: [text('a'), { type: 'tab' }, text('b')] }]))
    expect(blocks[0].spans.map((span) => span.text).join('')).toBe('a\tb')
  })

  it('still drops a paragraph that is only whitespace', () => {
    const { blocks } = readDocument(doc([{ type: 'paragraph', children: [{ type: 'linebreak' }] }]))
    expect(blocks).toHaveLength(0)
  })

  it('counts the words it can see', () => {
    const { blocks } = readDocument(
      doc([
        { type: 'paragraph', children: [text('one two three')] },
        { type: 'list', listType: 'bullet', children: [{ type: 'listitem', children: [text('four five')] }] }
      ])
    )
    expect(documentWordCount(blocks)).toBe(5)
  })
})

describe("a heading's plain text (MOB-067)", () => {
  const doc = (nodes) => JSON.stringify({ root: { children: nodes } })
  const heading = (children, tag = 'h2') => ({ type: 'heading', tag, children })

  it('names the section beside the spans that draw it', () => {
    const { blocks } = readDocument(doc([heading([{ type: 'text', text: 'Grammar' }])]))
    expect(blocks[0]).toMatchObject({ type: 'heading', text: 'Grammar' })
    expect(blocks[0].spans).toHaveLength(1)
  })

  it('joins a heading split across formatted runs, which is how the editor stores emphasis', () => {
    const { blocks } = readDocument(
      doc([
        heading([
          { type: 'text', text: 'The ' },
          { type: 'text', text: 'kanji', format: 1 },
          { type: 'text', text: ' list' }
        ])
      ])
    )
    // The pointer is a heading's WORDS, so it must not depend on how the editor
    // happened to split them.
    expect(blocks[0].text).toBe('The kanji list')
  })

  it('is an empty string for a heading with nothing in it', () => {
    const { blocks } = readDocument(doc([heading([])]))
    expect(blocks[0].text).toBe('')
  })
})

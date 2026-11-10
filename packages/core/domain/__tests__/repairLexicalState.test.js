import { repairLexicalState } from '../books/repairLexicalState'

const text = (value) => ({ type: 'text', text: value, format: [] })

// What the importer stored before IMPORT-001: no indent, no value, no version,
// and a nested list sitting directly inside its parent list.
const imported = () => ({
  root: {
    type: 'root',
    children: [
      { type: 'heading', tag: 'h2', children: [text('Organelles')] },
      {
        type: 'list',
        listType: 'bullet',
        children: [
          { type: 'listitem', children: [text('Nucleus')] },
          { type: 'list', listType: 'number', children: [{ type: 'listitem', children: [text('Envelope')] }] },
          { type: 'listitem', children: [text('Ribosome')] }
        ]
      },
      { type: 'paragraph', children: [text('After the list'), { type: 'linebreak' }] },
      { type: 'image', src: 'https://cdn.test/a.png', version: 1 }
    ]
  }
})

const walk = (node, visit) => {
  visit(node)
  ;(node.children || []).forEach((child) => walk(child, visit))
}

describe('repairLexicalState', () => {
  it('gives every list item the indent and value the editor refuses to parse without', () => {
    const { root } = repairLexicalState(imported())
    walk(root, (node) => {
      expect(node.version).toBe(1)
      if (node.type === 'listitem') {
        expect(typeof node.indent).toBe('number')
        expect(typeof node.value).toBe('number')
      }
      if (Array.isArray(node.children)) expect(typeof node.indent).toBe('number')
    })
  })

  it('wraps a nested list in a list item of its own, one level deeper', () => {
    const list = repairLexicalState(imported()).root.children[1]
    expect(list.children.map((row) => row.type)).toEqual(['listitem', 'listitem', 'listitem'])
    const wrapper = list.children[1]
    expect(wrapper.children).toHaveLength(1)
    expect(wrapper.children[0]).toMatchObject({ type: 'list', listType: 'number', tag: 'ol', start: 1 })
    expect(wrapper.children[0].children[0]).toMatchObject({ type: 'listitem', indent: 1, value: 1 })
    expect(list.children[0]).toMatchObject({ indent: 0, value: 1 })
    expect(list.children[2]).toMatchObject({ indent: 0, value: 2 })
    expect(list).toMatchObject({ tag: 'ul', start: 1 })
  })

  it('loses no text and no image', () => {
    const texts = []
    walk(repairLexicalState(imported()).root, (node) => node.type === 'text' && texts.push(node.text))
    expect(texts).toEqual(['Organelles', 'Nucleus', 'Envelope', 'Ribosome', 'After the list'])
    expect(repairLexicalState(imported()).root.children[3]).toEqual({ type: 'image', src: 'https://cdn.test/a.png', version: 1 })
  })

  it('returns a document the editor wrote exactly as it was', () => {
    const written = {
      root: {
        type: 'root',
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
        children: [
          {
            type: 'list',
            listType: 'number',
            start: 3,
            tag: 'ol',
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
            children: [
              {
                type: 'listitem',
                value: 3,
                indent: 0,
                direction: 'ltr',
                format: 'center',
                version: 1,
                children: [{ type: 'text', text: 'Third', format: 1, detail: 0, mode: 'normal', style: '', version: 1 }]
              }
            ]
          }
        ]
      }
    }
    expect(repairLexicalState(written)).toEqual(written)
  })

  it('turns a format stored as a list of names into the bitmask it meant', () => {
    const state = {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: 'plain', format: [] },
              { type: 'text', text: 'bold', format: ['bold'] },
              { type: 'text', text: 'both', format: ['bold', 'italic'] },
              { type: 'text', text: 'kept', format: 9 }
            ]
          }
        ]
      }
    }
    expect(repairLexicalState(state).root.children[0].children.map((node) => node.format)).toEqual([0, 1, 3, 9])
  })

  it('does not mutate what it was given, and passes through what is not a state', () => {
    const before = imported()
    repairLexicalState(before)
    expect(before).toEqual(imported())
    expect(repairLexicalState(null)).toBeNull()
    expect(repairLexicalState({ html: '<p>x</p>' })).toEqual({ html: '<p>x</p>' })
  })
})

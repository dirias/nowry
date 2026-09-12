/**
 * A document's body, flattened into blocks a client can draw (MOB-056).
 *
 * `full_content` holds a Lexical editor state — `editorState.toJSON()` — and
 * Lexical has no React Native build, so the phone cannot mount the editor to
 * read a document. It does not need to: the stored value is a node tree, and a
 * tree is data. This walks it once and hands back a flat list of blocks with
 * their text already split into styled spans, so each client maps blocks to its
 * own components and neither owns the format.
 *
 * **A shared module never returns a component** (ADR-031). It returns blocks.
 *
 * **Two formats, not one.** Documents written before the Content-First change
 * hold HTML, and the web's editor still falls back to parsing it. A phone has
 * no DOM to parse it with, so a legacy document is reported as such — one block
 * saying which format it is — rather than rendered wrong or rendered blank. A
 * reader that silently shows an empty page for a document with words in it is
 * the worst of the three outcomes.
 *
 * Text formatting is Lexical's own bitmask, which is stable across its
 * versions and is the only part of this that could be called a guess. It is
 * named here rather than at a call site so there is one place to correct.
 */

/** Lexical's text format bits. */
const BOLD = 1
const ITALIC = 2
const STRIKETHROUGH = 4
const UNDERLINE = 8
const CODE = 16

/** The block kinds a client has to know how to draw. */
export const BLOCK_TYPES = ['heading', 'paragraph', 'quote', 'list', 'code', 'image', 'rule', 'table', 'unsupported']

const spansOf = (node) => {
  const children = node?.children ?? []
  const spans = []

  const walk = (child, inherited) => {
    if (!child) return
    if (child.type === 'text') {
      const format = Number(child.format) || 0
      /*
       * Format comes from the text node's own bits and from nowhere else.
       * Element nodes do not carry it in Lexical, and treating them as if they
       * did produced `undefined` for an unset bit — neither true nor false,
       * which a renderer then reads as "no opinion". Only the link is
       * inherited, because a link genuinely wraps the words it labels.
       */
      spans.push({
        text: child.text ?? '',
        bold: Boolean(format & BOLD),
        italic: Boolean(format & ITALIC),
        strikethrough: Boolean(format & STRIKETHROUGH),
        underline: Boolean(format & UNDERLINE),
        code: Boolean(format & CODE),
        link: inherited.link ?? null
      })
      return
    }
    // A link wraps the text it labels; its own children carry the words.
    if (child.type === 'link' || child.type === 'autolink') {
      ;(child.children ?? []).forEach((inner) => walk(inner, { ...inherited, link: child.url ?? null }))
      return
    }
    ;(child.children ?? []).forEach((inner) => walk(inner, inherited))
  }

  children.forEach((child) => walk(child, { link: null }))
  return spans
}

const plain = (node) =>
  spansOf(node)
    .map((span) => span.text)
    .join('')

/** One list, with each item's spans. Nested lists are flattened one level. */
const listBlock = (node) => ({
  type: 'list',
  ordered: node.listType === 'number',
  items: (node.children ?? []).map((item) => spansOf(item))
})

const tableBlock = (node) => ({
  type: 'table',
  rows: (node.children ?? []).map((row) => (row.children ?? []).map((cell) => plain(cell)))
})

const blockFor = (node) => {
  switch (node?.type) {
    case 'heading':
      return { type: 'heading', level: Number(String(node.tag ?? 'h2').replace('h', '')) || 2, spans: spansOf(node) }
    case 'paragraph': {
      const spans = spansOf(node)
      // An empty paragraph is spacing in the editor and noise in a reader.
      return spans.some((span) => span.text.trim()) ? { type: 'paragraph', spans } : null
    }
    case 'quote':
      return { type: 'quote', spans: spansOf(node) }
    case 'list':
      return listBlock(node)
    case 'code':
      return { type: 'code', text: plain(node) }
    case 'image':
      return { type: 'image', src: node.src ?? null, alt: node.altText ?? '' }
    case 'horizontalrule':
      return { type: 'rule' }
    case 'table':
      return tableBlock(node)
    case 'callout':
      return { type: 'quote', spans: spansOf(node) }
    /*
     * Columns hold blocks rather than text, so their children are read in
     * order: a phone has one column, and side-by-side is a page-width idea.
     */
    case 'columncontainer':
    case 'column':
      return (node.children ?? []).flatMap((child) => blockFor(child) ?? [])
    default:
      // Named, not dropped: a reader that silently omits a node teaches the
      // writer that their content is gone.
      return node?.type ? { type: 'unsupported', name: node.type } : null
  }
}

/**
 * Read a document's stored body.
 *
 * @param {string|object|null} fullContent - the `full_content` field
 * @returns {{ format: 'lexical'|'legacy-html'|'empty', blocks: Array }}
 */
export function readDocument(fullContent) {
  if (!fullContent) return { format: 'empty', blocks: [] }

  const raw = typeof fullContent === 'object' ? fullContent : String(fullContent).trim()

  if (typeof raw === 'string' && !raw.startsWith('{')) {
    return { format: 'legacy-html', blocks: [] }
  }

  let parsed = null
  try {
    parsed = typeof raw === 'object' ? raw : JSON.parse(raw)
  } catch {
    return { format: 'legacy-html', blocks: [] }
  }

  if (!parsed?.root?.children) return { format: 'empty', blocks: [] }

  const blocks = parsed.root.children.flatMap((node) => {
    const block = blockFor(node)
    if (!block) return []
    return Array.isArray(block) ? block : [block]
  })

  return { format: 'lexical', blocks }
}

/** Roughly how much there is to read, for a progress readout. */
export const documentWordCount = (blocks = []) =>
  blocks.reduce((count, block) => {
    const text =
      block.type === 'list'
        ? block.items
            .flat()
            .map((span) => span.text)
            .join(' ')
        : block.type === 'code'
          ? block.text
          : (block.spans ?? []).map((span) => span.text).join(' ')
    return count + (text ? text.trim().split(/\s+/).filter(Boolean).length : 0)
  }, 0)

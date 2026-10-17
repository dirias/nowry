/**
 * Text in (PRD D9): Mermaid (flowchart and mindmap), indented outlines, JSON
 * Canvas, and plain lines. A parser returns a parsed graph
 *
 *   { type, direction?, nodes: [{ id, text, kind?, shape? }], links: [{ from, to, label, tree? }], frames: [{ id, title, members, parent }] }
 *
 * or `{ error }`. `fromParsed` turns a parsed graph into board nodes; JSON
 * Canvas comes back already as board nodes, positioned.
 */
import { DEFAULT_NOTE_COLOR, NOTE_COLORS } from './kinds'

const MERMAID_KINDS =
  /^(flowchart|graph|mindmap|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|journey|gitGraph|requirementDiagram|C4\w*|timeline|quadrantChart|sankey(?:-beta)?|xychart(?:-beta)?|block(?:-beta)?|packet(?:-beta)?|kanban|architecture(?:-beta)?|radar(?:-beta)?|zenuml|treemap(?:-beta)?)\b/

/** Strips a Markdown code fence an assistant wraps a diagram in. */
const unfence = (text) => {
  const trimmed = String(text ?? '').trim()
  const fenced = trimmed.match(/^```[\w-]*[^\n]*\n([\s\S]*?)\n?```\s*$/)
  return fenced ? fenced[1] : trimmed
}

/** Lines without Mermaid comments, front matter or init directives. */
const mermaidLines = (text) => {
  let body = unfence(text).replace(/\r\n?/g, '\n')
  body = body.replace(/^---\n[\s\S]*?\n---\n/, '')
  return body
    .split('\n')
    .map((line) => line.replace(/%%\{[\s\S]*?\}%%/g, ''))
    .filter((line) => !/^\s*%%/.test(line))
    .filter((line) => line.trim().length > 0)
}

/** A label as text: quotes, Markdown-string backticks, `<br>` and entities resolved. */
const cleanLabel = (raw) => {
  let label = String(raw ?? '').trim()
  if (label.length >= 2 && label.startsWith('"') && label.endsWith('"')) label = label.slice(1, -1)
  if (label.length >= 2 && label.startsWith('`') && label.endsWith('`')) label = label.slice(1, -1)
  return label
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/#quot;/g, '"')
    .replace(/#amp;/g, '&')
    .replace(/#lt;/g, '<')
    .replace(/#gt;/g, '>')
    .trim()
}

/* ------------------------------------------------------------------ flowchart */

const SHAPES = [
  ['(((', ')))', 'double-circle'],
  ['((', '))', 'circle'],
  ['([', '])', 'stadium'],
  ['[[', ']]', 'subroutine'],
  ['[(', ')]', 'cylinder'],
  ['{{', '}}', 'hexagon'],
  ['[/', '/]', 'parallelogram'],
  ['[/', '\\]', 'trapezoid'],
  ['[\\', '\\]', 'parallelogram-alt'],
  ['[\\', '/]', 'trapezoid-alt'],
  ['[', ']', 'rect'],
  ['(', ')', 'round'],
  ['{', '}', 'diamond'],
  ['>', ']', 'flag']
]

const ID_RE = /^[A-Za-z0-9_À-￿][A-Za-z0-9_.$À-￿-]*/

const skipSpace = (s, i) => {
  let j = i
  while (j < s.length && /\s/.test(s[j])) j += 1
  return j
}

/** The shape after a node id, if any: `[Label]`, `((Label))`, `["Label"]`… */
const readShape = (s, i) => {
  for (const [open, close, shape] of SHAPES) {
    if (!s.startsWith(open, i)) continue
    const start = i + open.length
    let end
    let label
    if (s[start] === '"') {
      const quote = s.indexOf('"', start + 1)
      if (quote < 0 || !s.startsWith(close, quote + 1)) continue
      label = s.slice(start + 1, quote)
      end = quote + 1 + close.length
    } else {
      const at = s.indexOf(close, start)
      if (at < 0) continue
      label = s.slice(start, at)
      end = at + close.length
    }
    return { label: cleanLabel(label), shape, end }
  }
  return null
}

// An id like `A-->B` must stop before the arrow, so an id never ends in `-`
// and never swallows a `--`, `-.` or `==`.
const readId = (s, i) => {
  const m = s.slice(i).match(ID_RE)
  if (!m) return null
  let id = m[0]
  const arrow = id.search(/--|-\.|==|-$|\.-/)
  if (arrow >= 0) id = id.slice(0, arrow)
  id = id.replace(/[-.]+$/, '')
  return id ? { id, end: i + id.length } : null
}

/** One node reference: an id, an optional shape and an optional `:::class`. */
const readNodeRef = (s, i) => {
  const at = skipSpace(s, i)
  const head = readId(s, at)
  if (!head) return null
  let end = head.end
  const shape = readShape(s, end)
  if (shape) end = shape.end
  const cls = s.slice(end).match(/^:::[\w-]+/)
  if (cls) end += cls[0].length
  return { id: head.id, label: shape?.label ?? null, shape: shape?.shape ?? null, end }
}

/** `A & B`: one or more node refs joined by `&`. */
const readGroup = (s, i) => {
  const refs = []
  let at = i
  for (;;) {
    const ref = readNodeRef(s, at)
    if (!ref) break
    refs.push(ref)
    const next = skipSpace(s, ref.end)
    if (s[next] !== '&') {
      at = ref.end
      break
    }
    at = next + 1
  }
  return refs.length ? { refs, end: at } : null
}

const TEXT_EDGE = /^(--|==|-\.)\s+([^\n]*?)\s*(-{2,}>|-{3,}|-{2,}o|-{2,}x|={2,}>|={3,}|\.-+>|\.-+)/
const ARROW = /^(<|o|x)?(-{2,}|={2,}|-\.+-|~{3,})(>|o|x)?/

const edgeStyle = (body) => (body.startsWith('=') ? 'thick' : body.includes('.') ? 'dotted' : 'solid')
const edgeHead = (head) => ({ '>': 'arrow', o: 'circle', x: 'cross' })[head] ?? 'none'

/** One edge: `-->`, `---`, `-.->`, `==>`, `--o`, `--x`, with `|label|` or `-- label -->`. */
const readEdge = (s, i) => {
  const at = skipSpace(s, i)
  const rest = s.slice(at)
  const text = rest.match(TEXT_EDGE)
  if (text && text[2] && !/^[->.=]/.test(text[2])) {
    const close = text[3]
    const head = /[>ox]$/.test(close) ? close.slice(-1) : null
    return { label: cleanLabel(text[2]), style: edgeStyle(text[1]), head: edgeHead(head), invisible: false, end: at + text[0].length }
  }
  const arrow = rest.match(ARROW)
  if (!arrow) return null
  // `--o`/`--x` only when the letter is not the start of the next id (`--oB` is rare; `-- oB` is a text edge).
  let end = at + arrow[0].length
  let head = arrow[3] ?? null
  if ((head === 'o' || head === 'x') && /[A-Za-z0-9_]/.test(s[end] ?? '')) {
    head = null
    end -= 1
  }
  let label = ''
  const pipeAt = skipSpace(s, end)
  if (s[pipeAt] === '|') {
    const close = s.indexOf('|', pipeAt + 1)
    if (close > 0) {
      label = cleanLabel(s.slice(pipeAt + 1, close))
      end = close + 1
    }
  }
  return { label, style: edgeStyle(arrow[2]), head: edgeHead(head), invisible: arrow[2].startsWith('~'), end }
}

const IGNORED = /^(classDef|class|style|linkStyle|click|direction|accTitle|accDescr)\b/

const subgraphHead = (rest) => {
  const body = rest.trim()
  const bracket = body.match(/^([^\s[]+)\s*\[(.*)\]$/)
  if (bracket) return { id: bracket[1], title: cleanLabel(bracket[2]) }
  if (/^".*"$/.test(body)) {
    const title = cleanLabel(body)
    return { id: null, title }
  }
  if (/\s/.test(body)) return { id: null, title: body }
  return { id: body, title: body }
}

// Mermaid's default is top to bottom; RL reads as LR and BT as TB.
const flowDirection = (raw) => (!raw || /^(TB|TD|BT)$/i.test(raw) ? 'TB' : 'LR')

const parseFlowchart = (lines, header) => {
  const nodes = new Map()
  const links = []
  const frames = []
  const stack = []
  let anonymous = 0

  const see = (ref) => {
    const existing = nodes.get(ref.id)
    if (existing) {
      if (ref.label !== null) Object.assign(existing, { text: ref.label, shape: ref.shape })
      return
    }
    const frame = stack[stack.length - 1]
    nodes.set(ref.id, { id: ref.id, text: ref.label ?? ref.id, shape: ref.shape ?? 'rect' })
    if (frame) frame.members.push(ref.id)
  }

  const statement = (raw) => {
    const line = raw.trim().replace(/;$/, '')
    if (!line || IGNORED.test(line)) return
    if (/^end$/.test(line)) {
      stack.pop()
      return
    }
    const sub = line.match(/^subgraph\b(.*)$/)
    if (sub) {
      const head = subgraphHead(sub[1])
      anonymous += 1
      const frame = { id: head.id ?? `subgraph-${anonymous}`, title: head.title, members: [], parent: stack[stack.length - 1]?.id ?? null }
      frames.push(frame)
      stack.push(frame)
      return
    }
    let group = readGroup(line, 0)
    if (!group) return
    group.refs.forEach(see)
    let at = group.end
    for (;;) {
      const edge = readEdge(line, at)
      if (!edge) break
      const next = readGroup(line, edge.end)
      if (!next) break
      next.refs.forEach(see)
      if (!edge.invisible) {
        group.refs.forEach((a) =>
          next.refs.forEach((b) => links.push({ from: a.id, to: b.id, label: edge.label, style: edge.style, head: edge.head }))
        )
      }
      group = next
      at = next.end
    }
  }

  lines.slice(1).forEach((line) => line.split(/;(?=(?:[^"]*"[^"]*")*[^"]*$)/).forEach(statement))

  // A link may name a subgraph; it then ends on the frame, not on a node.
  const frameIds = new Set(frames.map((f) => f.id))
  frameIds.forEach((id) => nodes.delete(id))
  frames.forEach((f) => {
    f.members = f.members.filter((id) => !frameIds.has(id))
  })
  return { type: 'flowchart', direction: flowDirection(header[2]), nodes: [...nodes.values()], links, frames }
}

/* -------------------------------------------------------------------- mindmap */

const MINDMAP_SHAPES = [
  ['((', '))', 'circle'],
  ['))', '((', 'bang'],
  ['{{', '}}', 'hexagon'],
  ['(', ')', 'round'],
  [')', '(', 'cloud'],
  ['[', ']', 'rect']
]

const indentOf = (line) => {
  const lead = line.match(/^[ \t]*/)[0]
  return [...lead].reduce((n, c) => n + (c === '\t' ? 4 : 1), 0)
}

const mindmapText = (raw) => {
  const body = raw
    .trim()
    .replace(/:::[\w\s-]+$/, '')
    .trim()
  const m = body.match(/^([^\s()[\]{}]*?)(\(\(|\)\)|\{\{|\(|\)|\[)([\s\S]*)$/)
  if (m) {
    const shape = MINDMAP_SHAPES.find(([open]) => open === m[2])
    if (shape && m[3].endsWith(shape[1])) return { text: cleanLabel(m[3].slice(0, -shape[1].length)), shape: shape[2] }
  }
  return { text: cleanLabel(body), shape: 'default' }
}

const parseMindmap = (lines) => {
  const nodes = []
  const links = []
  const stack = []
  lines.slice(1).forEach((line) => {
    const trimmed = line.trim()
    if (/^::icon\(/.test(trimmed) || /^:::/.test(trimmed)) return
    const indent = indentOf(line)
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop()
    const id = `m${nodes.length + 1}`
    nodes.push({ id, ...mindmapText(trimmed) })
    const parent = stack[stack.length - 1]
    if (parent) links.push({ from: parent.id, to: id, label: '', tree: true })
    stack.push({ id, indent })
  })
  return { type: 'mindmap', nodes, links, frames: [] }
}

/**
 * Mermaid: `flowchart`/`graph` and `mindmap`. Any other diagram is
 * `{ error: 'unsupported', kind }`; nothing at all is `{ error: 'empty' }`.
 */
export const parseMermaid = (text) => {
  const lines = mermaidLines(text)
  if (!lines.length) return { error: 'empty' }
  const first = lines[0].trim()
  const flow = first.match(/^(flowchart|graph)(?:\s+(\w+))?\s*;?\s*$/)
  if (flow) {
    const parsed = parseFlowchart(lines, flow)
    return parsed.nodes.length ? parsed : { error: 'empty' }
  }
  if (/^mindmap\s*$/.test(first)) {
    const parsed = parseMindmap(lines)
    return parsed.nodes.length ? parsed : { error: 'empty' }
  }
  return { error: 'unsupported', kind: first.split(/\s+/)[0] }
}

/* -------------------------------------------------------------------- outline */

const BULLET = /^([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/
const HEADING = /^(#{1,6})\s+(.*)$/

/**
 * An indented outline: spaces or tabs; `-`, `*`, `+`, `1.` bullets are
 * stripped; a Markdown heading becomes a `text` node and opens a new root
 * (a deeper heading sits under the one before it). A line without a bullet,
 * indented under a bulleted line, continues that line's note.
 */
export const parseOutline = (text) => {
  const lines = unfence(text).replace(/\r\n?/g, '\n').split('\n')
  const nodes = []
  const links = []
  const stack = []
  const add = (entry, node) => {
    nodes.push(node)
    const parent = stack[stack.length - 1]
    if (parent) links.push({ from: parent.id, to: node.id, label: '', tree: true })
    stack.push({ ...entry, id: node.id })
  }
  lines.forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed) return
    const heading = trimmed.match(HEADING)
    if (heading) {
      const level = heading[1].length
      while (stack.length && (stack[stack.length - 1].level === null || stack[stack.length - 1].level >= level)) stack.pop()
      add({ level, indent: -1, bulleted: false }, { id: `o${nodes.length + 1}`, text: heading[2].trim(), kind: 'text', level })
      return
    }
    const indent = indentOf(line)
    const bullet = trimmed.match(BULLET)
    const last = stack[stack.length - 1]
    if (!bullet && last && last.level === null && last.bulleted && indent > last.indent) {
      const node = nodes.find((n) => n.id === last.id)
      node.text = `${node.text}\n${trimmed}`
      return
    }
    while (stack.length && stack[stack.length - 1].level === null && stack[stack.length - 1].indent >= indent) stack.pop()
    const body = bullet ? trimmed.slice(bullet[0].length).trim() : trimmed
    add({ level: null, indent, bulleted: Boolean(bullet) }, { id: `o${nodes.length + 1}`, text: body, kind: 'note' })
  })
  if (!nodes.length) return { error: 'empty' }
  return { type: 'outline', nodes, links, frames: [] }
}

/** Plain text: one note per line. */
export const parseLines = (text) => {
  const nodes = String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => ({ id: `t${i + 1}`, text: line, kind: 'note' }))
  return nodes.length ? { type: 'lines', nodes, links: [], frames: [] } : { error: 'empty' }
}

/* ---------------------------------------------------------------- JSON Canvas */

const CANVAS_PRESETS = { 1: '#fb464c', 2: '#e9973f', 3: '#e0de71', 4: '#44cf6e', 5: '#53dfdd', 6: '#a882ff' }

const hexToHsl = (hex) => {
  let h = hex.replace('#', '')
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(h)) return null
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  let hue
  if (max === r) hue = ((g - b) / d) % 6
  else if (max === g) hue = (b - r) / d + 2
  else hue = (r - g) / d + 4
  return { h: (hue * 60 + 360) % 360, s, l }
}

/** A JSON Canvas colour (a preset "1"–"6" or a hex) → the nearest of the five; none → yellow. */
export const nearestNoteColor = (color) => {
  if (!color) return DEFAULT_NOTE_COLOR
  if (NOTE_COLORS.includes(color)) return color
  const hsl = hexToHsl(CANVAS_PRESETS[color] ?? String(color))
  if (!hsl) return DEFAULT_NOTE_COLOR
  if (hsl.s < 0.15) return 'grey'
  if (hsl.h < 20 || hsl.h >= 290) return 'pink'
  if (hsl.h < 75) return 'yellow'
  if (hsl.h < 165) return 'green'
  return 'blue'
}

const canvasText = (node) => {
  if (node.type === 'file') return node.subpath ? `${node.file}${node.subpath}` : (node.file ?? '')
  if (node.type === 'link') return node.url ?? ''
  return node.text ?? ''
}

/**
 * A JSON Canvas file (https://jsoncanvas.org) → board nodes and links, kept
 * where they were: text, file and link nodes become notes, groups frames.
 */
export const parseJsonCanvas = (text) => {
  let doc
  try {
    doc = JSON.parse(text)
  } catch (e) {
    return { error: 'invalid' }
  }
  if (!doc || !Array.isArray(doc.nodes)) return { error: 'invalid' }
  if (!doc.nodes.length) return { error: 'empty' }
  const nodes = doc.nodes
    .filter((n) => n && n.id !== undefined)
    .map((n, i) => {
      const group = n.type === 'group'
      return {
        id: String(n.id),
        kind: group ? 'frame' : 'note',
        x: Number(n.x) || 0,
        y: Number(n.y) || 0,
        w: Number(n.width) || null,
        h: Number(n.height) || null,
        z: group ? -1 : i + 1,
        text: group ? null : canvasText(n),
        color: group ? null : nearestNoteColor(n.color),
        size: null,
        title: group ? (n.label ?? '') : null,
        ref: null,
        cardIds: []
      }
    })
  const ids = new Set(nodes.map((n) => n.id))
  const links = (doc.edges ?? [])
    .filter((e) => e && ids.has(String(e.fromNode)) && ids.has(String(e.toNode)))
    .map((e, i) => ({ id: String(e.id ?? `e${i + 1}`), from: String(e.fromNode), to: String(e.toNode), label: e.label ?? '' }))
  return { type: 'canvas', nodes, links, frames: [] }
}

/* -------------------------------------------------------------------- detect */

/** What a pasted text is: 'mermaid' | 'canvas' | 'outline' | 'lines'. */
export const detectFormat = (text) => {
  const body = unfence(text)
  if (body.startsWith('{')) {
    try {
      const doc = JSON.parse(body)
      if (doc && Array.isArray(doc.nodes)) return 'canvas'
    } catch (e) {
      // not JSON: read on as text
    }
  }
  const lines = mermaidLines(text)
  if (lines.length && MERMAID_KINDS.test(lines[0].trim())) return 'mermaid'
  const rows = body.split(/\r?\n/).filter((l) => l.trim())
  if (rows.some((l) => BULLET.test(l.trim()) || HEADING.test(l.trim()))) return 'outline'
  const indents = new Set(rows.map(indentOf))
  if (rows.length > 1 && indents.size > 1) return 'outline'
  return 'lines'
}

/** Parses a text by its detected format. */
export const parseText = (text) => {
  const format = detectFormat(text)
  if (format === 'mermaid') return parseMermaid(text)
  if (format === 'canvas') return parseJsonCanvas(unfence(text))
  if (format === 'outline') return parseOutline(text)
  return parseLines(text)
}

/**
 * What "aligned" means on a public page at phone width, as something a browser
 * can measure (BRAND-016). Runs inside the page (`page.evaluate`), so it uses
 * nothing from outside its own body.
 *
 * Three rules:
 *   1. The page does not scroll sideways.
 *   2. Nothing crosses the edge of the box that holds it — a bordered or
 *      filled container never has a child poking through its side.
 *   3. One left edge. Every block of text that stands on the page itself (not
 *      inside a card, a field, a filled key or a drawn frame) starts on the
 *      gutter. A filled key or a card is held to the same edge by its box.
 *
 * Deliberate exceptions are marked in the markup, never listed here:
 *   data-align='rows'    rows with a leading tile; their words share one inner edge
 *   data-align='free'    a block laid out on its own terms (a centred object)
 */
module.exports.measureLayout = () => {
  const TOLERANCE = 1.5
  const root = document.getElementById('root')
  const vw = document.documentElement.clientWidth
  const round = (n) => Math.round(n * 10) / 10
  const label = (el) =>
    `<${el.tagName.toLowerCase()}> "${(el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40)}"`
  const styleOf = (el) => getComputedStyle(el)
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const s = styleOf(el)
    return r.width > 0.5 && r.height > 0.5 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05
  }
  const opaque = (color) => !/rgba\(.*,\s*0\)$|transparent/.test(color)
  const isBox = (el) => {
    const s = styleOf(el)
    const bordered = ['Left', 'Right'].some(
      (side) => parseFloat(s[`border${side}Width`]) > 0 && opaque(s[`border${side}Color`]) && s[`border${side}Style`] !== 'none'
    )
    return bordered || (opaque(s.backgroundColor) && el !== document.body && el.id !== 'root')
  }
  const skipped = (el) => el.closest('[class*="tsqd"], [role="dialog"], [role="tooltip"], [role="listbox"], .MuiModal-root')
  const violations = []

  // 1 — no sideways scroll
  if (document.documentElement.scrollWidth > vw + 1) {
    violations.push(`the page scrolls sideways: ${document.documentElement.scrollWidth}px of content in a ${vw}px viewport`)
  }

  // The gutter is where the page's main heading starts.
  const heading = [...root.querySelectorAll('main h1, h1, h2')].find(visible)
  const gutter = heading ? round(heading.getBoundingClientRect().left) : 16

  // 2 — nothing crosses the side of the box that holds it
  for (const el of root.querySelectorAll('*')) {
    if (!visible(el) || skipped(el) || el.closest('svg')) continue
    const s = styleOf(el)
    if (s.position === 'absolute' || s.position === 'fixed') continue
    let box = el.parentElement
    let clipped = false
    while (box && box !== root && !isBox(box)) {
      if (/(hidden|auto|scroll|clip)/.test(styleOf(box).overflowX)) clipped = true
      box = box.parentElement
    }
    if (!box || box === root || clipped || /(auto|scroll)/.test(styleOf(box).overflowX)) continue
    const r = el.getBoundingClientRect()
    const b = box.getBoundingClientRect()
    const over = Math.max(r.right - b.right, b.left - r.left)
    if (over > TOLERANCE && !/(hidden|clip)/.test(styleOf(box).overflowX)) {
      violations.push(`${label(el)} crosses the side of its box by ${round(over)}px`)
    }
  }

  // 3 — one left edge
  const insideBox = (el) => {
    for (let n = el; n && n !== root; n = n.parentElement) {
      if (n.matches('header, footer, main, section, article, nav, form') && !isBox(n)) continue
      if (isBox(n) && !n.matches('header, footer')) return n
    }
    return null
  }
  const starts = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const seen = new Set()
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent.trim()) continue
    let block = node.parentElement
    while (block && /^inline/.test(styleOf(block).display) && !block.matches('a, button')) block = block.parentElement
    if (!block || seen.has(block) || !visible(block) || skipped(block)) continue
    seen.add(block)
    // A tab's words sit inside its target; the strip is held to the edge by its first tab's box, below.
    if (block.closest('[aria-hidden="true"], [data-align="free"], [role="tab"], input, textarea, select, table, pre, blockquote')) continue
    if (block.closest('ul, ol') && styleOf(block.closest('ul, ol')).listStyleType !== 'none') continue
    if (/center|right|end/.test(styleOf(block).textAlign)) continue
    // A link or a word inside a sentence starts no edge; its sentence does.
    const inSentence = [...block.parentElement.childNodes].some(
      (sibling) => sibling.nodeType === Node.TEXT_NODE && sibling.textContent.trim()
    )
    if (inSentence && /^inline/.test(styleOf(block).display)) continue
    const range = document.createRange()
    range.selectNodeContents(block)
    // A leading glyph is part of the line: the line starts where the glyph does.
    const glyphs = [...block.querySelectorAll('svg, img')].filter(visible).map((glyph) => glyph.getBoundingClientRect())
    const left = Math.min(...[...range.getClientRects(), ...glyphs].filter((r) => r.width > 0.5).map((r) => r.left))
    if (!Number.isFinite(left)) continue
    starts.push({ block, left: round(left), rows: block.closest('[data-align="rows"]'), holder: insideBox(block) })
  }
  const rowEdges = new Map()
  for (const { block, left, rows, holder } of starts) {
    if (rows) {
      if (!rowEdges.has(rows)) rowEdges.set(rows, new Set())
      rowEdges.get(rows).add(left)
      continue
    }
    if (holder) continue
    // Text that begins mid-line (a link in a sentence, the second key of a row) starts no edge.
    const previous = block.previousElementSibling
    if (
      previous &&
      visible(previous) &&
      Math.abs(previous.getBoundingClientRect().top - block.getBoundingClientRect().top) < 4 &&
      previous.getBoundingClientRect().left < left - 4
    )
      continue
    const parent = block.parentElement
    const row = parent && /flex/.test(styleOf(parent).display) && !/column/.test(styleOf(parent).flexDirection)
    if (
      row &&
      parent.firstElementChild !== block &&
      Math.abs(parent.firstElementChild.getBoundingClientRect().top - block.getBoundingClientRect().top) <
        block.getBoundingClientRect().height
    )
      continue
    if (Math.abs(left - gutter) > TOLERANCE) violations.push(`${label(block)} starts at ${left}px; the page's edge is ${gutter}px`)
  }
  for (const [rows, edges] of rowEdges) {
    const distinct = [...edges].sort((a, b) => a - b)
    if (distinct[distinct.length - 1] - distinct[0] > TOLERANCE)
      violations.push(`rows in ${label(rows)} start their words at ${distinct.join(', ')}px; they share one edge`)
  }
  // A filled or bordered box that stands on the page starts on the same edge.
  for (const el of root.querySelectorAll('main a, main button, section a, section button, [role="main"] a')) {
    if (!visible(el) || skipped(el) || !isBox(el) || el.closest('[aria-hidden="true"], [data-align="free"], header, footer')) continue
    if (insideBox(el.parentElement)) continue
    const previous = el.previousElementSibling
    if (previous && visible(previous) && Math.abs(previous.getBoundingClientRect().top - el.getBoundingClientRect().top) < 4) continue
    if (
      /center|right|end/.test(styleOf(el.parentElement).textAlign) ||
      /center|end/.test(styleOf(el.parentElement).justifyContent + styleOf(el.parentElement).alignItems)
    )
      continue
    const left = round(el.getBoundingClientRect().left)
    if (el.getBoundingClientRect().width < vw - 2 * gutter - 2 && Math.abs(left - gutter) > TOLERANCE)
      violations.push(`${label(el)} (a box) starts at ${left}px; the page's edge is ${gutter}px`)
  }

  for (const list of root.querySelectorAll('[role="tablist"]')) {
    const first = [...list.querySelectorAll('[role="tab"]')].find(visible)
    if (!first || skipped(list) || insideBox(list.parentElement)) continue
    const left = round(first.getBoundingClientRect().left)
    if (Math.abs(left - gutter) > TOLERANCE)
      violations.push(`the first tab of ${label(list)} starts at ${left}px; the page's edge is ${gutter}px`)
  }

  return { gutter, violations: [...new Set(violations)] }
}

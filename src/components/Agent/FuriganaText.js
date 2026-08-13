/**
 * FuriganaText
 *
 * Parses text containing furigana notation — kanji(reading) — and renders
 * it as proper HTML <ruby> tags so the reading appears above the kanji.
 *
 * Input format (from AI):  精々(せいぜい)
 * Rendered as:             <ruby>精々<rt>せいぜい</rt></ruby>
 *
 * Falls back to plain text for non-Japanese content.
 */
import React from 'react'

// Matches: any sequence of CJK/kanji chars followed by (reading)
// e.g. 精々(せいぜい), 学習(がくしゅう), 東京(とうきょう)
const FURIGANA_PATTERN = /([\u3400-\u9FFF\uF900-\uFAFF々〆〤ヶ]+(?:々[\u3400-\u9FFF\uF900-\uFAFF]*)*)\(([^)]+)\)/g

/**
 * Convert a string with furigana notation into an array of React nodes.
 * Plain text segments are returned as strings; furigana segments as <ruby> elements.
 */
const parseFurigana = (text) => {
  if (!text) return [text]

  const nodes = []
  let lastIndex = 0
  let match

  FURIGANA_PATTERN.lastIndex = 0

  while ((match = FURIGANA_PATTERN.exec(text)) !== null) {
    const [full, kanji, reading] = match
    const before = text.slice(lastIndex, match.index)

    if (before) nodes.push(before)

    nodes.push(
      <ruby key={match.index}>
        {kanji}
        <rt>{reading}</rt>
      </ruby>
    )

    lastIndex = match.index + full.length
  }

  const after = text.slice(lastIndex)
  if (after) nodes.push(after)

  return nodes
}

const FuriganaText = ({ children, ...props }) => {
  const text = typeof children === 'string' ? children : String(children ?? '')
  const nodes = parseFurigana(text)

  return (
    <span
      {...props}
      style={{
        lineHeight: '2', // extra line height so rt (furigana) doesn't overlap
        ...props.style
      }}
    >
      {nodes}
    </span>
  )
}

export default FuriganaText

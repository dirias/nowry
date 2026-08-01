/**
 * PetMarkdown
 *
 * Minimal markdown renderer for SmartPet assistant chat bubbles.
 *
 * Scope (intentionally tiny — "Less is More"):
 *   - Supported: bold, italics, bullet/numbered lists, inline code, line breaks.
 *   - Everything else (headings, links, images, blockquotes, tables, code fences)
 *     is unwrapped and degrades gracefully to plain body text.
 *   - Raw HTML is never rendered (react-markdown default — no rehype-raw).
 *
 * Styling inherits the chat bubble's font size/line height/color so it works
 * with both bubble variants and in Light AND Dark mode (semantic tokens only).
 * CJK text wraps naturally via overflowWrap; list indentation uses
 * paddingInlineStart so it stays direction-safe.
 */
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import { Box } from '@mui/joy'

// Only the minimal subset renders as elements; everything else is unwrapped to text.
const ALLOWED_ELEMENTS = ['p', 'strong', 'em', 'ul', 'ol', 'li', 'code', 'br']

const markdownSx = {
  // Inherit the bubble's typography so markdown text is indistinguishable
  // from plain-text messages.
  fontSize: 'inherit',
  lineHeight: 'inherit',
  fontFamily: 'inherit',
  color: 'inherit',
  whiteSpace: 'normal',
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
  '& p': { m: 0 },
  '& p + p, & p + ul, & p + ol, & ul + p, & ol + p, & ul + ul, & ol + ol': { mt: 1 },
  '& ul, & ol': {
    m: 0,
    // Direction-safe indentation (logical property instead of paddingLeft)
    paddingInlineStart: '1.25em',
    listStylePosition: 'outside'
  },
  '& li': { m: 0 },
  '& li + li': { mt: 0.25 },
  '& code': {
    fontFamily: 'code',
    fontSize: '0.85em',
    px: 0.5,
    py: '1px',
    borderRadius: 'sm',
    bgcolor: 'background.surface',
    border: '1px solid',
    borderColor: 'divider'
  }
}

const PetMarkdown = ({ content }) => (
  <Box sx={markdownSx}>
    <ReactMarkdown remarkPlugins={[remarkBreaks]} allowedElements={ALLOWED_ELEMENTS} unwrapDisallowed skipHtml>
      {content ?? ''}
    </ReactMarkdown>
  </Box>
)

export default PetMarkdown

/* PetMarkdown — verifies the minimal markdown subset: bold, italics, lists, inline code, line breaks, header degradation, and HTML sanitization. */
import React from 'react'
import { render, screen } from '@testing-library/react'
import PetMarkdown from '../PetMarkdown'

test('renders bold, italics, lists, inline code; degrades headers; escapes html', () => {
  const md = [
    '# Heading degrades',
    '',
    'This is **宇宙における** and *italic* and `code()`.',
    '',
    '- first item',
    '- second item',
    '',
    '1. numbered one',
    '2. numbered two',
    '',
    '<script>alert(1)</script>',
    '',
    'Line one',
    'Line two'
  ].join('\n')

  const { container } = render(<PetMarkdown content={md} />)

  expect(screen.getByText('宇宙における').tagName).toBe('STRONG')
  expect(screen.getByText('italic').tagName).toBe('EM')
  expect(screen.getByText('code()').tagName).toBe('CODE')
  expect(container.querySelectorAll('ul > li')).toHaveLength(2)
  expect(container.querySelectorAll('ol > li')).toHaveLength(2)
  // Header unwraps to plain text (no h1 element)
  expect(container.querySelector('h1')).toBeNull()
  expect(screen.getByText('Heading degrades')).toBeInTheDocument()
  // Raw HTML is never rendered
  expect(container.querySelector('script')).toBeNull()
  // Single newline becomes a <br> (remark-breaks)
  expect(container.querySelectorAll('br').length).toBeGreaterThan(0)
})

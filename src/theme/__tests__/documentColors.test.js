/**
 * `public/index.html` paints before any script runs, so it spells out three
 * colours as literals (ADR-074 §5). This holds them to the tokens they copy.
 */
import fs from 'fs'
import path from 'path'
import { BRAND, NEUTRALS } from '@nowry/core/tokens/colorSystem'

const html = fs.readFileSync(path.resolve(__dirname, '../../../public/index.html'), 'utf8')

it('declares both colour schemes before any script', () => {
  expect(html).toMatch(/<meta name="color-scheme" content="light dark" \/>/)
  expect(html.indexOf('name="color-scheme"')).toBeLessThan(html.indexOf('<body'))
})

it('paints the browser bar in the header ground, per scheme', () => {
  const themeColors = [
    ...html.matchAll(/<meta name="theme-color" media="\(prefers-color-scheme: (light|dark)\)" content="(#[0-9a-f]{6})" \/>/g)
  ]
  expect(themeColors.map((match) => match[1])).toEqual(['light', 'dark'])
  for (const match of themeColors) expect(match[2]).toBe(BRAND.inkTeal)
})

it('paints each page ground first', () => {
  expect(html).toContain(`html { color-scheme: light dark; background-color: ${NEUTRALS.light.background.body}; }`)
  expect(html).toContain(
    `@media (prefers-color-scheme: dark) { html { background-color: var(--first-dark, ${NEUTRALS.dark.background.body}); } }`
  )
})

it('paints a remembered member’s own dark ground first (ADR-082)', () => {
  expect(html).toContain("window.localStorage.getItem('nowry-ground-dark')")
  expect(html).toContain("document.documentElement.style.setProperty('--first-dark', ground)")
})

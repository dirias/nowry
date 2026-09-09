/**
 * The two clients must agree on what `background.level1` is.
 *
 * The mobile client has no Joy, so it reads its semantic colours from
 * `@nowry/core/tokens/palette`. Those values were extracted from the web's own
 * resolved theme, not transcribed — but an extraction is a snapshot, and a
 * snapshot rots. This test is what stops it: if Joy changes a default, or
 * `theme.js` changes an override, the shared palette stops matching and this
 * fails here rather than showing up as two apps that look subtly different.
 *
 * It resolves Joy's `var(--joy-palette-…)` chains down to literals, which is
 * what a browser does at paint time and what the mobile client needs up front.
 */
import { extendTheme } from '@mui/joy/styles'
import { BASE_PALETTE } from '@nowry/core/tokens/palette'
import { buildDynamicTheme } from '../DynamicThemeProvider'

/** `var(--joy-palette-neutral-50)` → `#FBFCFE`, following the chain. */
const resolve = (palette, value, depth = 0) => {
  if (typeof value !== 'string' || depth > 6) return value
  const match = value.match(/^var\(--joy-palette-([a-zA-Z]+)-([a-zA-Z0-9]+)(?:,\s*(.+))?\)$/)
  if (!match) return value
  const [, group, key, fallback] = match
  const next = palette[group]?.[key]
  if (next === undefined) return fallback ? fallback.trim() : value
  return resolve(palette, next, depth + 1)
}

const webPalette = (scheme) => {
  const theme = buildDynamicTheme('#3a9dac')
  const joy = extendTheme(theme)
  return joy.colorSchemes[scheme].palette
}

const norm = (value) => String(value).toLowerCase().replace(/\s+/g, '')

describe.each(['light', 'dark'])('%s — the shared palette matches what the web resolves', (scheme) => {
  const shared = BASE_PALETTE[scheme]

  it.each(['level1', 'level2', 'level3', 'body', 'surface', 'popup'])('background.%s', (key) => {
    expect(norm(resolve(webPalette(scheme), webPalette(scheme).background[key]))).toBe(norm(shared.background[key]))
  })

  it.each(['primary', 'secondary', 'tertiary'])('text.%s', (key) => {
    expect(norm(resolve(webPalette(scheme), webPalette(scheme).text[key]))).toBe(norm(shared.text[key]))
  })

  it.each(['success', 'warning', 'danger'])('%s.plainColor and .outlinedBorder', (group) => {
    // These come from Joy's defaults, never from colorSchemeGenerator, and the
    // web writes them 102 times. Their absence from the shared palette threw on
    // a device before this covered them.
    const p = webPalette(scheme)
    expect(norm(resolve(p, p[group].plainColor))).toBe(norm(shared[group].plainColor))
    expect(norm(resolve(p, p[group].outlinedBorder))).toBe(norm(shared[group].outlinedBorder))
  })

  it('neutral.outlinedBorder', () => {
    expect(norm(resolve(webPalette(scheme), webPalette(scheme).neutral.outlinedBorder))).toBe(norm(shared.neutral.outlinedBorder))
  })
})

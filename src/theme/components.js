import { MOTION } from './tokens'

/**
 * Joy component overrides — the house button, theme-wide (CAL-009, ADR-020).
 *
 * BUTTONS.md is the standard; this file is where it becomes true for a bare
 * `<Button>` and `<IconButton>` anywhere in the app, so no call site spreads
 * `keyButton` any more. Numbers here are the Foundation geometry from the
 * "Nowry Buttons" canvas, restated in BUTTONS.md §2.
 */

// §2 — geometry per size. Sides are 40% of height; glyph one step under the
// label's cap height; gap 6/8/8. `lg` sides are 20, not Joy's 24.
const GEOMETRY = {
  sm: { minHeight: 32, paddingInline: 12, fontSize: 'sm', glyph: 16, gap: 6 },
  md: { minHeight: 40, paddingInline: 16, fontSize: 'sm', glyph: 18, gap: 8 },
  lg: { minHeight: 48, paddingInline: 20, fontSize: 'md', glyph: 20, gap: 8 }
}

const TRANSITION = ['transform', 'box-shadow', 'background-color', 'color']
  .map((prop) => `${prop} ${MOTION.duration.quick}ms ${MOTION.easing.standard}`)
  .join(', ')

// §3 — the edge is derived from the button's own colour, never a hue of its
// own: the accent's active shade under a solid, the neutral border under a
// secondary, the tone's border under a soft of any other colour (danger).
// Plain has no edge — it is the tertiary. Outlined is retired for buttons
// (§3, §9) and renders as the secondary: same ground, no border.
const edgeFor = (variant, color) => {
  if (variant === 'solid') return `var(--joy-palette-${color}-solidActiveBg)`
  if (variant === 'soft' || variant === 'outlined') {
    return color === 'neutral' ? 'var(--joy-palette-neutral-outlinedBorder)' : `var(--joy-palette-${color}-outlinedBorder)`
  }
  return null
}

// §4 — motion. Hover lifts 1px and deepens the edge to 3px; active travels the
// 2px the edge promised and the edge disappears. Under reduced motion the
// button does not move; the edge still appears and disappears.
const keyMotion = (edge) => ({
  transition: TRANSITION,
  ...(edge
    ? {
        boxShadow: `0 2px 0 0 ${edge}`,
        '&:hover': { transform: 'translateY(-1px)', boxShadow: `0 3px 0 0 ${edge}` },
        '&:active': { transform: 'translateY(2px)', boxShadow: 'none' }
      }
    : {}),
  '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover, &:active': { transform: 'none' } }
})

// §3 — a secondary is a ground, never a border. `level1` at rest, `level2`
// when pressed; hover moves the label (text.secondary → text.primary) and
// leaves the ground alone (§15.1). The same vars serve `outlined`, so a
// bordered secondary cannot be produced by a variant prop.
const secondaryGround = {
  '--variant-softBg': 'var(--joy-palette-background-level1)',
  '--variant-softHoverBg': 'var(--joy-palette-background-level1)',
  '--variant-softActiveBg': 'var(--joy-palette-background-level2)',
  '--variant-softColor': 'var(--joy-palette-text-secondary)',
  '--variant-softHoverColor': 'var(--joy-palette-text-primary)',
  '--variant-outlinedBg': 'var(--joy-palette-background-level1)',
  '--variant-outlinedHoverBg': 'var(--joy-palette-background-level1)',
  '--variant-outlinedActiveBg': 'var(--joy-palette-background-level2)',
  '--variant-outlinedBorder': 'transparent',
  '--variant-outlinedColor': 'var(--joy-palette-text-secondary)',
  '--variant-outlinedHoverColor': 'var(--joy-palette-text-primary)'
}

// §3 — the tertiary: no ground at rest, `level1` on hover, `level2` pressed.
const tertiaryGround = {
  '--variant-plainHoverBg': 'var(--joy-palette-background-level1)',
  '--variant-plainActiveBg': 'var(--joy-palette-background-level2)'
}

// §4 — disabled keeps its own colours at 0.45 opacity, so a disabled primary
// still reads as the primary. Only for genuinely unavailable actions; never
// to enforce validation.
const disabled = (variant) => ({
  [`--variant-${variant}DisabledBg`]: `var(--variant-${variant}Bg)`,
  [`--variant-${variant}DisabledColor`]: `var(--variant-${variant}Color)`,
  [`--variant-${variant}DisabledBorder`]: `var(--variant-${variant}Border)`,
  '&.Mui-disabled': { opacity: 0.45, pointerEvents: 'none', boxShadow: 'none' }
})

// §4 — the house focus ring, from the theme rather than a per-site spread.
const focus = {
  '--focus-outline-offset': '2px',
  '&:focus-visible': { outline: '2px solid', outlineColor: 'var(--joy-palette-primary-outlinedBorder)' }
}

const keyRoot = ({ ownerState, theme }) => {
  const size = GEOMETRY[ownerState.size] || GEOMETRY.md
  const variant = ownerState.variant || 'solid'
  const color = ownerState.color || 'primary'
  const edge = edgeFor(variant, color)
  return {
    '--Button-radius': theme.vars.radius.md,
    '--Button-gap': `${size.gap}px`,
    '--Icon-fontSize': `${size.glyph}px`,
    minHeight: size.minHeight,
    paddingInline: size.paddingInline,
    fontSize: theme.vars.fontSize[size.fontSize],
    fontWeight: theme.vars.fontWeight.lg,
    letterSpacing: 0,
    borderRadius: theme.vars.radius.md,
    // 44px at xs on every interactive control, from the theme (§2).
    [theme.breakpoints.down('sm')]: { minHeight: 44 },
    ...(variant === 'soft' || variant === 'outlined' ? secondaryGround : {}),
    ...(variant === 'plain' ? tertiaryGround : {}),
    ...(variant === 'outlined' ? { borderWidth: 0 } : {}),
    ...disabled(variant),
    ...focus,
    ...keyMotion(edge)
  }
}

// An icon-only button is a square of the row height with the same edge, ring
// and motion (§2, §3 "Icon").
const iconRoot = ({ ownerState, theme }) => {
  const size = GEOMETRY[ownerState.size] || GEOMETRY.md
  const variant = ownerState.variant || 'plain'
  const color = ownerState.color || 'neutral'
  const edge = edgeFor(variant, color)
  return {
    '--IconButton-size': `${size.minHeight}px`,
    '--IconButton-radius': theme.vars.radius.md,
    '--Icon-fontSize': `${size.glyph}px`,
    paddingInline: 0,
    borderRadius: theme.vars.radius.md,
    [theme.breakpoints.down('sm')]: { minWidth: 44, minHeight: 44 },
    ...(variant === 'soft' || variant === 'outlined' ? secondaryGround : {}),
    ...(variant === 'plain' ? tertiaryGround : {}),
    ...(variant === 'outlined' ? { borderWidth: 0 } : {}),
    ...disabled(variant),
    ...focus,
    ...keyMotion(edge)
  }
}

export const components = {
  JoyButton: { defaultProps: { size: 'md' }, styleOverrides: { root: keyRoot } },
  JoyIconButton: { defaultProps: { size: 'md' }, styleOverrides: { root: iconRoot } }
}

export { GEOMETRY, edgeFor }

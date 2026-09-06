import { buildDynamicTheme } from '../DynamicThemeProvider'
import { GEOMETRY, edgeFor } from '../components'
import { keyButton } from '../../components/Common/Form/formStyles'

jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: null }) }))

const theme = buildDynamicTheme('#2a6971')
const button = (ownerState) => theme.components.JoyButton.styleOverrides.root({ ownerState, theme })
const icon = (ownerState) => theme.components.JoyIconButton.styleOverrides.root({ ownerState, theme })

describe('the key, theme-wide (CAL-009, BUTTONS.md)', () => {
  it('gives a bare Button the Foundation geometry: md 40, sides at 40% of height, 14/600, glyph 18, radius md', () => {
    const md = button({ size: 'md', variant: 'solid', color: 'primary' })
    expect(md.minHeight).toBe(40)
    expect(md.paddingInline).toBe(16)
    expect(md['--Icon-fontSize']).toBe('18px')
    expect(md['--Button-gap']).toBe('8px')
    expect(md.fontWeight).toBe(theme.vars.fontWeight.lg)
    expect(md.fontSize).toBe(theme.vars.fontSize.sm)
    expect(md.borderRadius).toBe(theme.vars.radius.md)
    expect(theme.components.JoyButton.defaultProps.size).toBe('md')
  })

  it("keeps the table's sides — 12 / 16 / 20 — on every size, and lg at 20 rather than Joy's 24", () => {
    expect([GEOMETRY.sm, GEOMETRY.md, GEOMETRY.lg].map((g) => [g.minHeight, g.paddingInline])).toEqual([
      [32, 12],
      [40, 16],
      [48, 20]
    ])
    expect(button({ size: 'lg', variant: 'solid', color: 'primary' }).paddingInline).toBe(20)
  })

  it("draws the same edge the calendar's keyButton drew, from the accent, with no hue of its own", () => {
    const solid = button({ size: 'md', variant: 'solid', color: 'primary' })
    expect(solid.boxShadow).toBe(keyButton('primary').boxShadow)
    expect(solid['&:hover'].transform).toBe('translateY(-1px)')
    expect(solid['&:active']).toEqual({ transform: 'translateY(2px)', boxShadow: 'none' })
    expect(JSON.stringify(solid)).not.toMatch(/#[0-9a-f]{3,6}/i)
    expect(button({ size: 'md', variant: 'soft', color: 'neutral' }).boxShadow).toBe(keyButton('neutral').boxShadow)
  })

  it('renders an outlined button as the borderless secondary, so the retired variant cannot draw a border', () => {
    const outlined = button({ size: 'md', variant: 'outlined', color: 'neutral' })
    expect(outlined['--variant-outlinedBorder']).toBe('transparent')
    expect(outlined.borderWidth).toBe(0)
    expect(outlined['--variant-outlinedBg']).toBe('var(--joy-palette-background-level1)')
    expect(outlined.boxShadow).toBe(keyButton('neutral').boxShadow)
  })

  it('leaves the tertiary flat: no edge, level1 on hover, level2 pressed', () => {
    const plain = button({ size: 'md', variant: 'plain', color: 'primary' })
    expect(plain.boxShadow).toBeUndefined()
    expect(plain['--variant-plainHoverBg']).toBe('var(--joy-palette-background-level1)')
    expect(plain['--variant-plainActiveBg']).toBe('var(--joy-palette-background-level2)')
    expect(edgeFor('plain', 'primary')).toBeNull()
  })

  it('meets 44px at xs from the theme, keeps its colours when disabled, and stops moving under reduced motion', () => {
    const md = button({ size: 'md', variant: 'solid', color: 'primary' })
    expect(md[theme.breakpoints.down('sm')]).toEqual({ minHeight: 44 })
    expect(md['&.Mui-disabled']).toMatchObject({ opacity: 0.45, pointerEvents: 'none' })
    expect(md['--variant-solidDisabledBg']).toBe('var(--variant-solidBg)')
    expect(md['@media (prefers-reduced-motion: reduce)']['&:hover, &:active'].transform).toBe('none')
    expect(md.transition).toMatch(/80ms/)
  })

  it('makes an icon button a square of the row height with the same edge and ring', () => {
    const md = icon({ size: 'md', variant: 'soft', color: 'neutral' })
    expect(md['--IconButton-size']).toBe('40px')
    expect(md['--Icon-fontSize']).toBe('18px')
    expect(md.boxShadow).toBe(keyButton('neutral').boxShadow)
    expect(md[theme.breakpoints.down('sm')]).toEqual({ minWidth: 44, minHeight: 44 })
    expect(md['&:focus-visible'].outlineColor).toBe('var(--joy-palette-primary-outlinedBorder)')
  })
})

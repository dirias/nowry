/**
 * The house button, as data (BUTTONS.md, ADR-020).
 *
 * Every number here is from the standard's geometry table, not chosen. Kept
 * apart from the component so it can be tested without a device runtime, and so
 * a change to the standard is a change to one table.
 *
 * The standard's `hover` state has no mobile equivalent — there is no pointer to
 * hover with — so a phone has two states, rest and pressed, and the press is
 * where the whole signature lives: the surface travels exactly the 2px the edge
 * promised, and the edge disappears underneath it.
 */

/** BUTTONS.md §2. Sides are 40% of height at every size. */
export const BUTTON_SIZES = {
  sm: { height: 32, paddingX: 12, level: 'title-sm', glyph: 16, glyphGap: 6 },
  md: { height: 40, paddingX: 16, level: 'title-sm', glyph: 18, glyphGap: 8 },
  lg: { height: 48, paddingX: 20, level: 'title-md', glyph: 20, glyphGap: 8 }
}

/** The one radius, every size (BUTTONS.md §2). Never `full`. */
export const BUTTON_RADIUS = 'md'

/** The edge is 2px and the travel matches it exactly (BUTTONS.md §1). */
export const EDGE = 2

/** BUTTONS.md §2 — 44 from the theme, never from a call site. */
export const MIN_TOUCH_TARGET = 44

/**
 * BUTTONS.md §3 and §4, as semantic names only. Nothing here assumes teal:
 * every value is a token the generated palette already carries, so all eight
 * accent presets get the same button.
 *
 * `edge: null` means the variant has no edge at all, which is the tertiary.
 */
export const BUTTON_VARIANTS = {
  primary: {
    ground: 'primary.solidBg',
    groundPressed: 'primary.solidActiveBg',
    label: 'primary.solidColor',
    edge: 'primary.solidActiveBg'
  },
  secondary: {
    ground: 'background.level1',
    groundPressed: 'background.level2',
    label: 'text.secondary',
    edge: 'neutral.outlinedBorder'
  },
  tertiary: {
    ground: 'transparent',
    groundPressed: 'background.level2',
    label: 'primary.plainColor',
    edge: null
  },
  danger: {
    ground: 'danger.softBg',
    groundPressed: 'background.level2',
    label: 'danger.plainColor',
    // "2px derived from the text colour" — never solid, so it cannot compete
    // with the primary.
    edge: 'danger.plainColor'
  }
}

export const BUTTON_VARIANT_NAMES = Object.keys(BUTTON_VARIANTS)
export const BUTTON_SIZE_NAMES = Object.keys(BUTTON_SIZES)

/** BUTTONS.md §4 — disabled is only for genuinely unavailable actions. */
export const DISABLED_OPACITY = 0.45

/**
 * BUTTONS.md §5. The web's segments are 36 tall on desktop and 44 at `xs`; a
 * phone is always `xs`, so there is only one number here.
 */
export const SEGMENT_HEIGHT = 44

/** The engaged segment's accent underline: the key's edge, turned inward. */
export const SEGMENT_UNDERLINE = 2

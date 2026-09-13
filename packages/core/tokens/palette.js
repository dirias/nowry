/**
 * The semantic colour names, in one place, for both clients.
 *
 * These are the names components actually write — `text.secondary`,
 * `background.level1`, `divider` — as opposed to the numeric shades, which no
 * component may touch (DESIGN_GUIDELINES §2, and the `no-restricted-syntax`
 * rule that enforces it).
 *
 * Where the values come from (ADR-034): `colorSystem.js`, which computes them
 * on the OKLCH ladder. The web theme is built from the same module, and
 * `src/theme/__tests__/paletteParity.test.js` resolves the web's Joy theme and
 * fails if the two clients ever disagree. Before ADR-034 these were a snapshot
 * of Joy's defaults; a snapshot rots, a shared source does not.
 *
 * The accent groups are per user and come from `generateColorScheme(themeColor)`,
 * which each client merges over this base. The status and gold groups are here
 * too, because they do not depend on the accent and a screen may read them
 * before a theme colour has loaded.
 */
import { GOLD_SPEC, NEUTRALS, STATUS_SPEC, buildTone } from './colorSystem'

const STATUS_KEYS = ['plainColor', 'outlinedBorder', 'softColor', 'softBg', 'solidBg', 'solidColor']

const pick = (tone) => Object.fromEntries(STATUS_KEYS.map((key) => [key, tone[key]]))

const baseFor = (mode) => {
  const { background, text, neutral, divider } = NEUTRALS[mode]
  return {
    background: { ...background },
    text: { ...text },
    neutral: { ...neutral },
    success: pick(buildTone(STATUS_SPEC.success, mode)),
    warning: pick(buildTone(STATUS_SPEC.warning, mode)),
    danger: pick(buildTone(STATUS_SPEC.danger, mode)),
    gold: pick(buildTone(GOLD_SPEC, mode)),
    divider,
    common: { white: '#FFFFFF', black: '#000000' }
  }
}

export const BASE_PALETTE = {
  light: baseFor('light'),
  dark: baseFor('dark')
}

export default BASE_PALETTE

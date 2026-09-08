/**
 * The semantic colour names, in one place, for both clients.
 *
 * These are the names components actually write — `text.secondary`,
 * `background.level1`, `divider` — as opposed to the numeric shades, which no
 * component may touch (DESIGN_GUIDELINES §2, and the `no-restricted-syntax`
 * rule that enforces it).
 *
 * Where the values come from, and why this file exists:
 *
 *   - The web client gets most of them from Joy's own defaults. `level1`,
 *     `level2`, `divider` and `neutral.outlinedBorder` are never written down
 *     anywhere in this repository; Joy resolves them from its neutral scale.
 *   - `src/theme/theme.js` then overrides `background.body`, `surface`, `popup`
 *     and the three `text` levels.
 *   - `colorSchemeGenerator` overrides the accent groups per user.
 *
 * The mobile client has no Joy, so without this file it would have to guess at
 * the first group and would drift from the web the moment either changed. The
 * values below were extracted from the web's own resolved theme rather than
 * transcribed, and `src/theme/__tests__/paletteParity.test.js` fails if the two
 * ever disagree.
 *
 * The accent groups are NOT here. They are per user and come from
 * `generateColorScheme(themeColor)`, which each client merges over this base.
 */

export const BASE_PALETTE = {
  light: {
    // Joy's defaults, resolved. Nothing in the repo states these.
    background: {
      level1: '#F0F4F8',
      level2: '#DDE7EE',
      level3: '#CDD7E1',
      tooltip: '#636B74',
      // Overridden by src/theme/theme.js.
      body: '#ffffff',
      surface: '#f9f9f9',
      popup: '#ffffff'
    },
    text: {
      // Overridden by src/theme/theme.js.
      primary: '#1c1c1c',
      secondary: '#444',
      tertiary: '#777',
      // Joy's default.
      icon: '#636B74'
    },
    neutral: {
      outlinedBorder: '#CDD7E1',
      plainColor: '#32383E',
      softBg: '#F0F4F8',
      solidBg: '#636B74'
    },
    // Joy expresses this as rgba(neutral.mainChannel / 0.2).
    divider: 'rgba(99, 107, 116, 0.2)',
    common: { white: '#FFFFFF', black: '#000000' }
  },

  dark: {
    background: {
      level1: '#171A1C',
      level2: '#32383E',
      level3: '#555E68',
      tooltip: '#555E68',
      body: '#0d1117',
      surface: '#161b22',
      popup: '#1e242c'
    },
    text: {
      primary: '#e6edf3',
      secondary: '#9ba9b4',
      tertiary: '#7d8590',
      icon: '#9FA6AD'
    },
    neutral: {
      outlinedBorder: '#32383E',
      plainColor: '#CDD7E1',
      softBg: '#171A1C',
      solidBg: '#555E68'
    },
    divider: 'rgba(99, 107, 116, 0.16)',
    common: { white: '#FFFFFF', black: '#000000' }
  }
}

export default BASE_PALETTE

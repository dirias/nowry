# Nowry colour system

> The standard since ADR-034 (2026-09-13). It replaced a prototype that took its colours from four
> libraries — Material presets, Joy's blue-grey neutrals, Tailwind tags and GitHub's dark theme — and
> generated tints in HSL, whose lightness is not what the eye sees.

## The rule in one line

**Six roles, each with one job, all computed in OKLCH on one lightness ladder in `@nowry/core`.**
No component invents a colour; both clients read the same values; a test guards every contrast.

## The six roles

| # | Role | What it is for | Never |
|---|---|---|---|
| 1 | **Brand** — Ink Teal, Coil Gold, Paper | The Spiral mark, the app icon, marketing | UI state |
| 2 | **Neutrals** — Paper (light), Deep (dark) | Grounds, containers, borders, all text | Pure grey or pure black text |
| 3 | **Accent** — the learner's colour | Primary actions, selection, focus ring, links, the companion's body | Meaning (it is chosen, so it cannot signal) |
| 4 | **Status** — moss, amber, brick | Done, attention, destructive | Decoration or identity |
| 5 | **Gold** | What is earned: stage marks, motes, a finished year | A warning; decoration |
| 6 | **Categories** — eight hues and graphite | What a learner tags: focus areas, events, sticky notes, covers | Status — always a dot plus a label |

## Where it lives

```
packages/core/tokens/
├── oklch.js                OKLCH ↔ hex, gamut clamping, WCAG contrast, OKLab distance
├── colorSystem.js          the ladder: BRAND, NEUTRALS, buildTone, accentTone,
│                           STATUS_SPEC, GOLD_SPEC, EARNED_GOLD, CATEGORY_SPEC,
│                           categoryColors, categoryDot, CATEGORY_COLORS
├── colorSchemeGenerator.js generateColorScheme(hex) → every Joy group, both modes;
│                           getColorPresets, DEFAULT_ACCENT, STICKY_PALETTE, readableTextOn
├── palette.js              BASE_PALETTE — the phone's base, built from colorSystem
└── brandMark.js            the Spiral's geometry (see BRAND.md)
```

- **Web:** `src/theme/theme.js` spreads `generateColorScheme(DEFAULT_ACCENT)` into Joy's colour schemes,
  and `DynamicThemeProvider` spreads the learner's scheme over it. `theme.js` spells out no hex.
- **Phone:** `mobile/src/theme/buildTheme.js` merges `BASE_PALETTE` with the same generator.
- **Parity:** `src/theme/__tests__/paletteParity.test.js` resolves the web's Joy theme and fails if it
  disagrees with `BASE_PALETTE`.

## How a value is made

Every colour is a lightness **L**, a chroma **C** and a hue **h**. OKLCH's L is perceptual: hold it
fixed, move the hue, and contrast stays put. That is the whole guarantee.

- **Neutrals** are warm paper (h 85) in light and deep teal-ink (h 215) in dark, at chroma ≤ 0.022.
  They carry a 50–900 scale so every Joy token nobody names — an input border, a soft neutral —
  still lands on the ladder.
- **Tones** (`buildTone`) turn one `{C, h}` into every Joy variant key — solid, soft, plain,
  outlined, their hover and active states — plus a 50–900 scale, for light and dark. Light solids
  rest at L 0.505 with paper text; dark solids rest at L 0.70 with ink text.
- **The accent is normalised** (`accentTone`): the learner's hue, their chroma capped at 0.13, the
  ladder's lightness. Black, white, a neon and a preset all come out equally readable.

## Presets

Stored values. Teal keeps the backend's default so no account changes; the others sit at L 0.505.

| Key | Hex | | Key | Hex |
|---|---|---|---|---|
| teal *(default)* | `#2a6971` | | rose | `#924968` |
| lake | `#346898` | | umber | `#805c43` |
| iris | `#5f5c99` | | olive | `#6e6634` |
| plum | `#825080` | | graphite | `#5c666f` |

A custom hex is allowed on the web and kept on the phone; the generator puts it on the ladder.
Names are localized under `onboarding.welcome.accent.names.<key>`.

## What the tests guarantee

`packages/core/tokens/__tests__/` and `mobile/src/theme/__tests__/contrast.test.js`:

- 4.5:1 for solid, soft and plain text, for every preset and extreme accents (black, white, grey), in both modes
- 3:1 for the dark outlined border (focus rings)
- text primary, secondary and tertiary at 4.5:1 on body, surface and level1, in both modes
- every preset at least 0.08 apart (OKLab) from every status solid — a primary button never looks like Delete
- every category ink at 4.5:1 on its tint; gold at 4.5:1 on Ink Teal
- the stored swatches (presets, categories, covers) pinned by literal, so a moved constant cannot repaint user data

## Using it in components

```jsx
// ✅ semantic names — they follow the accent and the mode
sx={{ color: 'text.secondary', bgcolor: 'background.level1' }}
<Button color='danger' variant='soft'>
<Chip sx={{ bgcolor: 'gold.softBg', color: 'gold.softColor' }}>

// ✅ a literal only where a surface cannot resolve a variable, from core
import { EARNED_GOLD, categoryDot } from '@nowry/core/tokens/colorSystem'

// ❌ a hex, a numeric shade, or a colour from outside the system
sx={{ color: '#444', bgcolor: 'neutral.100' }}
```

User data is the one exception to "no hex": a focus area's, a cover's or an event's stored colour is
rendered as stored.

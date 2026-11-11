# Nowry colour system

> The standard since ADR-034 (2026-09-13). It replaced a prototype that took its colours from four
> libraries — Material presets, Joy's blue-grey neutrals, Tailwind tags and GitHub's dark theme — and
> generated tints in HSL, whose lightness is not what the eye sees.
>
> **Amended by ADR-074 (2026-11-12):** the dark grounds are the brand's teal, the header is Ink Teal
> with the gold coil in both modes, a guest wears the brand's tone, and a dark-mode solid is light
> with ink text. The sections below describe the system as amended.

## The rule in one line

**Six roles, each with one job, all computed in OKLCH on one lightness ladder in `@nowry/core`.**
No component invents a colour; both clients read the same values; a test guards every contrast.

## The six roles

| # | Role | What it is for | Never |
|---|---|---|---|
| 1 | **Brand** — Ink Teal, Coil Gold, Paper | The Spiral mark, the app icon, marketing | UI state |
| 2 | **Neutrals** — Paper (light), Deep Teal (dark) | Grounds, containers, borders, all text | Pure grey or pure black text; a near-black ground |
| 3 | **Accent** — the learner's colour; the brand's tone for a guest | Primary actions, selection, focus ring, links, the companion's body | Meaning (it is chosen, so it cannot signal) |
| 4 | **Status** — moss, amber, brick | Done, attention, destructive | Decoration or identity |
| 5 | **Gold** | What is earned: stage marks, motes, a finished year | A warning; decoration |
| 6 | **Categories** — eight hues and graphite | What a learner tags: focus areas, events, sticky notes, covers | Status — always a dot plus a label |

## Where it lives

```
packages/core/tokens/
├── oklch.js                OKLCH ↔ hex, gamut clamping, WCAG contrast, OKLab distance
├── colorSystem.js          the ladder: BRAND, NEUTRALS, buildTone, accentTone,
│                           STATUS_SPEC, GOLD_SPEC, EARNED_GOLD, earnedGold(mode),
│                           CATEGORY_SPEC,
│                           categoryColors, categoryDot, CATEGORY_COLORS
├── colorSchemeGenerator.js generateColorScheme(hex) → every Joy group, both modes;
│                           getColorPresets, DEFAULT_ACCENT, STICKY_PALETTE, readableTextOn
├── palette.js              BASE_PALETTE — the phone's base, built from colorSystem
├── ../constants/bookCovers.js  COVER_PRESETS — the category family and ink, shared by both clients
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

- **Neutrals** are warm paper (h 85) in light. In dark they sit on the mark's hue (h 205) at chroma
  about 0.05: the page is `#023135`, a card is Ink Teal itself (`#0b3e43`), and text is Paper.
  They carry a 50–900 scale so every Joy token nobody names — an input border, a soft neutral —
  still lands on the ladder.
- **Tones** (`buildTone`) turn one `{C, h}` into every Joy variant key — solid, soft, plain,
  outlined, their hover and active states — plus a 50–900 scale, for light and dark. In light a
  solid is **dark** (L 0.505) with paper text. In dark it is **light** (L 0.76) with ink text,
  because on teal grounds no colour can both carry paper text at 4.5:1 and stand 3:1 off the page.
  Text on a solid is always `solidColor`, never a literal white. Warning and gold are light with
  ink in both modes.
- **The focus ring** is `primary.outlinedBorder`: L 0.62 in light, L 0.68 in dark, 3:1 or better
  on body, surface and level1.
- **The brand tone** (`brandTone`, `generateBrandScheme`) is what a guest wears: Ink Teal solids
  and `#155157` links on paper; Coil Gold solids with ink text and gold links on teal. Signed in,
  the primary is the learner's and gold means earned.
- **Links and coloured text** read a tone's plain colour: the web theme points Joy's `mainChannel`
  at `plainColor`, since Joy would otherwise draw them from the 500 step (3.4:1 on paper).
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
- 3:1 for the outlined border (the focus ring) in both modes
- a solid dark with light text in light, light with ink text in dark, and 3:1 off body, surface and level1
- the eight presets and the brand tone: plain text at 4.5:1 and the focus ring at 3:1 on every ground, in both modes
- `public/index.html`'s first-paint grounds and theme colours equal the tokens
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
import { EARNED_GOLD, earnedGold, categoryDot } from '@nowry/core/tokens/colorSystem'
// earnedGold(mode): a small earned mark on the page (bright gold is 1.7:1 on paper)

// ❌ a hex, a numeric shade, or a colour from outside the system
sx={{ color: '#444', bgcolor: 'neutral.100' }}
```

User data is the one exception to "no hex": a focus area's, a cover's or an event's stored colour is
rendered as stored.

# Nowry Buttons — the standard

> The house button system, chosen on 2026-09-06 from three directions on the "Nowry Buttons"
> canvas ("Boost"). Governing decision: `docs/decisions.md` ADR-020. Rules it builds on:
> `DESIGN_GUIDELINES.md` §15 (toolbar grammar) and §15.9 (the key).
> Status: theme-wide since CAL-009 (2026-09-06) — `src/theme/components.js` overrides `JoyButton` and
> `JoyIconButton`, so a bare `<Button>` anywhere is this button. First applied to the calendar (CAL-008).

---

## 1. The signature, in one paragraph

A Nowry button is **a key you press**. It has mass — a 2px edge under it in a darker shade of its
own colour — and it travels: hover lifts it 1px and deepens the edge; pressing pushes it 2px down
and the edge disappears, so the button moves exactly the distance the edge promised. The motion is
80ms. Nothing about the signature is a colour: the edge is derived from whatever accent the user
chose, so all eight presets get the same button in light and dark. Restraint everywhere else —
one radius, one label size per height, sentence case, no borders on secondaries — is what makes
the one moving part read as premium instead of playful.

## 2. Geometry

| | `sm` | `md` (default) | `lg` |
|---|---|---|---|
| Height | 32 | **40** | 48 |
| Horizontal padding | 12 | 16 | 20 (sides = 40% of height) |
| Label | `fontSize.sm` 14px | `fontSize.sm` 14px | `fontSize.md` 16px |
| Label weight | `fontWeight.lg` 600 | 600 | 600 |
| Letter-spacing | 0 | 0 | 0 |
| Glyph | 16 | 18 | 20 |
| Glyph gap | 6 | 8 | 8 |
| Radius | `radius.md` 8px | 8px | 8px |
| Icon-only | 32 × 32 | 40 × 40 | 48 × 48 |
| Touch target at `xs` | 44 | 44 | 48 |

- **One radius, every size.** `md` (8px) — the same corner as the segmented group, so a row of
  controls shares one shape. Never `full` (§15.3).
- **Sides are 40% of height**, so every size has the same proportion. Joy's stock `lg` used 24;
  the standard uses 20.
- **A glyph sits one step under the label's cap height** and always before the label. An icon-only
  button is a square of the row height and carries an `aria-label`.
- **44px at `xs`** on every interactive control, from the theme, not from each call site.

## 3. Variants

| Variant | Joy `variant` | Ground | Label colour | Edge | Use |
|---|---|---|---|---|---|
| **Primary** | `solid` | `primary.solidBg` | `primary.solidColor` (derived) | 2px `primary.solidActiveBg` | The one action a surface is for. **One per surface.** |
| **Secondary** | `soft` neutral | `background.level1` | `text.secondary` → `text.primary` on hover | 2px `neutral.outlinedBorder` | Cancel, Show all, Add in a list header. |
| **Tertiary** | `plain` | none; `level1` on hover | `primary.plainColor` | none | Inline actions, menu triggers, the least important choice in a footer. |
| **Danger** | `soft` danger | `danger.softBg` | `danger.plainColor` | 2px derived from the text colour | Delete. Never solid — a solid danger button competes with the primary. |
| **Icon** | `plain` or `soft` neutral | as tertiary / secondary | `text.secondary` → `text.primary` | as its variant | Close, arrows, row actions. Square; `aria-label` required. |

- **Secondaries are grounds, never borders.** `variant='outlined'` is retired for buttons: a
  bordered secondary argues with every card border near it (§15.1).
- **State is a ground, never a hue** (§15.5). A toggle that is on sits on `level2` and says so with
  `aria-pressed`; it does not turn the accent colour.

## 4. States

| State | Primary | Secondary | Tertiary |
|---|---|---|---|
| Rest | `solidBg`, edge 2px | `level1`, edge 2px | transparent |
| Hover | `solidHoverBg`, lift −1px, edge 3px | label → `text.primary`, lift −1px, edge 3px | ground `level1` |
| Active (pressed) | `solidActiveBg`, travel +2px, no edge | `level2`, travel +2px, no edge | ground `level2` |
| Focus-visible | the house `focusRing`: 2px `primary.outlinedBorder`, 2px offset | same | same |
| Loading | label swaps to a spinner + verb ("Saving…"); the edge stays; width does not change | same | same |
| Disabled | opacity 0.45, no pointer events — **only for genuinely unavailable actions** | same | same |

- **Never disable the primary for validation.** An empty required field fails loudly under the
  field on press (form-system rule). A grey button that will not say why is a dead end.
- **Motion:** `transform` and `box-shadow`, 80ms, `ease`. Nothing else animates. Under
  `prefers-reduced-motion: reduce` the button does not move; the edge still appears and
  disappears, which carries the same information without motion.

## 5. Segmented controls

Two or more controls of one class over one list or view are **one object** (§15.2): a `Sheet`
with `segmentedGroup` (radius `md`, `level1`, 1px `divider` hairlines) holding `segment(active,
first)` buttons at 36px (44 at `xs`).

- **Engaged = `level2` ground + a 2px accent underline** inside the segment (`segment(true, …)` carries it since CAL-009).
  The underline is the key's edge turned inward; the ground is still the state.
- A menu segment carries `aria-haspopup`/`aria-expanded` and its readout in the label
  ("Types · 2"); a toggle segment carries `aria-pressed`. A multi-select menu stays open while
  rows are ticked (`event.defaultMuiPrevented = true` on the row).
- Icon-only segments are squares of the row height; never narrower than the height.

## 6. Composition

- **One solid per surface.** The primary action is the only accent-filled object on a screen; the
  key makes it heavier, not more numerous.
- **Footers:** Cancel (`plain`, `lg`) on the left, the primary (`solid`, `lg`, the key) on the right,
  `space-between`; on `xs` they stack full-width, Cancel first. The primary is named after what it
  does — "Add task", "Save changes" — never "OK" or "Submit".
- **Toolbars align to the content's rails** (§15.4); a readout is text beside its control, never a
  centred title.
- **Label copy:** sentence case, a verb first where the button acts ("Add event", "Show all"),
  never all-caps, never a trailing period, never an emoji (§13.4).

## 7. Colour

- **Accent-agnostic.** The primary is a per-user preset; nothing in the standard may assume teal.
  Every colour is a semantic token — `primary.solidBg`, `neutral.outlinedBorder`,
  `background.level1` — and every shade the key needs already exists in the generated palette.
- **No brand yellow on buttons.** `theme.js` sets success to yellow but the palette generator
  overrides it at runtime, and a fixed yellow beside a user's purple or orange accent is a clash
  the user did not choose.
- **Foreground is derived, never assumed.** `primary.solidColor` comes from `readableTextOn`, so a
  light accent gets dark text.

## 8. In code

**Since CAL-009:** the theme owns it — a bare `<Button>` is the key with the geometry above, `segment()`
carries the underline, and `variant='outlined'` renders as the borderless secondary. Nothing spreads
`keyButton` or `keySegment`; both stay exported as the pinned definition the theme test compares against.

**Before CAL-009 (CAL-008), for the record:** the fragments were spread at the calendar's call sites.

```jsx
import { focusRing, keyButton, keySegment, segment, touchTarget } from '../Common/Form/formStyles'

<Button size='sm' sx={{ ...focusRing, ...touchTarget, ...keyButton('primary') }}>Add event</Button>
<Button variant='soft' color='neutral' sx={{ ...focusRing, ...keyButton('neutral') }}>Show all</Button>
<Button variant='plain' color='neutral' aria-pressed={on} sx={{ ...segment(on, first), ...keySegment(on) }}>Habits</Button>
```

**Adding a button now:** write `<Button>` (primary), `<Button variant='soft' color='neutral'>` (secondary)
or `<Button variant='plain'>` (tertiary) and nothing else; a per-site `borderRadius`, `fontSize`,
`fontWeight` or `boxShadow` on a button is a lint-visible fight with the theme.

## 9. Do not

- Do not use `variant='outlined'` for a button.
- Do not use `radius.full`, a raw radius, a raw `fontSize` or a raw `fontWeight`.
- Do not tune the motion per call site. 80ms and 2px are the standard.
- Do not put two solid buttons on one surface.
- Do not disable a primary action to enforce validation.
- Do not paint a hue for a toggle's on-state, and do not use a shadow for elevation at rest — the
  edge is the only depth a Nowry button has.

## 10. References

- ADR-020 — the decision and the two directions set aside (Quiet, Lift).
- `DESIGN_GUIDELINES.md` §15 — the toolbar grammar the key sits inside; §15.9 — the key's rules.
- "Nowry Buttons" canvas — the three directions side by side, the interactive board (any
  direction, any accent, light or dark), the Foundation numbers, the type board.
- `formStyles.js` — `keyButton`, `keySegment`, `segment`, `segmentedGroup`, `focusRing`,
  `touchTarget`, and their tests.

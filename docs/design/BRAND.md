# Nowry brand

> The standard since ADR-034 (2026-09-13). Chosen from the "Nowry Snake Identity" canvas
> (https://claude.ai/code/artifact/56ab20c1-c401-445f-914e-dbf164b575f7); colours from
> "Nowry Colour System" (https://claude.ai/code/artifact/ec762202-4ced-4ceb-9fb2-7988ba03162a).
> It replaces the owl, which shared species, colour, style and role with Duolingo's mascot.

## The mark: the Spiral

A coil whose gaps widen with every turn, head at the outer end, one eye. Every turn is a return,
further out: a card comes back less often as you remember it, a focus round follows the last, a year
returns to January one ring wider. It is a snake only if you look — which is deliberate.

- **Geometry:** `@nowry/core/tokens/brandMark.js` → `spiralMark({ preset, headDeg, pad })`, a
  100 × 100 view box. Never redraw it by hand; never trace it into an image the code does not produce.
- **Web:** `src/components/Common/Brand/BrandMark.js` — `BrandMark` and `BrandLockup`.
- **Phone:** `mobile/src/ui/patterns/BrandMark.js` — the same two, on `react-native-svg`.
- **Icons:** `public/favicon.png`, `logo192.png`, `logo512.png` are rendered from the geometry.

### Sizes

| Where | Size | Preset |
|---|---|---|
| App icon, marketing | 120 px and up | `full` (2.4 turns) |
| Header, app bar | 28–30 px beside the wordmark | `full` above 32, `compact` at 32 and below |
| Favicon, notification badge | 16–32 px | `compact` (1.8 turns) |

**Minimum:** 16 px. **Clear space:** the head's diameter on every side.

### Colour

- **Brand surfaces** (icon, marketing): Coil Gold on Ink Teal. Nothing else.
- **Product chrome:** one colour, the foreground of the ground it sits on — white on the web
  header, `primary.solidColor` in the phone's app bar. The mark never takes the learner's accent as
  its own fill on a neutral ground; the accent is theirs, the mark is ours.
- The eye is always cut out, never painted, so it shows the real ground.

### Never

Slit pupils, fangs or a tongue · scale texture · green · a staff or rod · two snakes · an S-shaped
crest · outlines, shadows, gradients or a rotated mark · the owl.

## The wordmark

`nowry`, lower-case, the display face at its heaviest weight (`fontWeight: 'xl'`), tracking −0.03 em,
beside the mark at a gap of 8 px. It is a proper noun: never translated, never set in capitals. The
display face is the app's `display` token until DS-007 decides it.

## What stays fixed across accents

A learner can choose any of eight presets or a custom colour. Whatever they choose, these do not move:
the mark and the icon, the neutrals, the status colours, gold, and the category family. See
`COLOR_SYSTEM.md`.

## The companion

The default companion's illustrations are still the owl until BRAND-007 replaces them with the Spiral
creature (stages by turn count, moods by head and eye). Its colour already follows the system: the
body wears the learner's accent, and what a stage earns is gold.

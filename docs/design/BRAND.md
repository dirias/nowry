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

`nowry`, lower-case, the display face at its heaviest weight (`fontWeight: 'xl'`, which is 700),
tracking −0.03 em. It is a proper noun: never translated, never set in capitals. The display face is
**Bricolage Grotesque** since DS-007B (2026-09-25), through the app's `display` token — the name
wears it wherever it appears, which is why h4 keeps that token even though the two faces are
indistinguishable at 20px.

### Two lockups, chosen by size

| Lockup | Where | Component |
|---|---|---|
| **Standard** — the mark beside the word, gap 8 px | every product size; the only lockup below 40 px | `BrandLockup` |
| **Display** — the coil in place of the `o` | 40 px type and above: splash, landing header, marketing | `BrandWordmark` |

**The 40 px floor is not a preference.** Below it the coil's turns merge: at the app bar's 22 px it
reads as a bullet, so the word survives and the mark does not — at the one size every learner sees on
every screen. Measured on 2026-09-25 (ADR-034's amendment). Above it the display lockup is the
stronger mark and about 30% narrower.

- **Fit:** `WORDMARK_FIT` in `@nowry/core/tokens/brandMark.js`, applied by each client's
  `BrandWordmark`. A 0.72 em coil box with `pad: 0`, bearings −0.01 em, baseline drop 0.105 em, head
  at −100°. Never re-derive these per client, and never nudge them per screen.
- **Why the head turns.** The mark's own −55° points the head down and right, straight into the `w`.
  At −100° the coil's opening sits where an `o` closes.
- **Colour:** both lockups follow the mark's rule — one colour, the foreground of the ground.

### The face on each client

| Client | Headings (h1–h4, display-*) | Everything else |
|---|---|---|
| Web | Bricolage Grotesque, self-hosted, preloaded | Inter Variable |
| Phone | Bricolage Grotesque, two static weights bundled | the platform face — San Francisco / Roboto |

**The phone's body face is a decision, not an omission.** The platform faces cost no bundle bytes,
are what each OS tunes for, and already honour the text-size setting `Typography` works to respect.
The brand lives in the headings and the wordmark, so that is what is shipped. It is an explicit
exception to ADR-029's "the phone renders Nowry's own tokens", and the two clients therefore differ
in body text.

The phone's two files are **instanced from the same woff2 the web serves** (`fontTools`, `wght` at
600 and 700) — React Native needs ttf and fontsource ships woff2 only, and fetching a second copy
from elsewhere would let the clients drift onto different outlines of one face. Only two weights,
because between them the heading levels use only 600 and 700. A heading asking for less falls back
to the platform face rather than being drawn 100–200 too heavy; see `mobile/src/ui/displayFace.js`.

## What stays fixed across accents

A learner can choose any of eight presets or a custom colour. Whatever they choose, these do not move:
the mark and the icon, the neutrals, the status colours, gold, and the category family. See
`COLOR_SYSTEM.md`.

## The companion

Nowry, the companion every learner starts with, is the Spiral grown by stages (BRAND-007). It is
drawn, never illustrated: `@nowry/core/tokens/companionMark.js` → `companionMark({ stage, mood })`
builds it from the same coil as the mark, and each client draws the parts with its own SVG primitive
(`src/components/Agent/CompanionMark.js` on the web, `mobile/src/ui/patterns/CompanionMark.js` on
the phone).

- **Stages differ by turn count, not size.** The stage table (`domain/petStages.js`) carries `turns`:
  an egg with the first curl inside, then ¾ of a turn, one, one and a half, two, two and a half. The
  rings and motes a stage earns stay gold.
- **Mood is where the head points and how the eye is drawn.** Idle looks ahead; happy lifts its head
  with a closed, smiling eye; thinking glances up; tired lowers its head and the eye is a line;
  speaking opens a small mouth ahead of the eye. The face is always cut out, never painted.
- **Colour follows the system.** On the page the companion wears the learner's accent
  (`utils/petColor`); on an accent-coloured body it is drawn in whichever of paper or ink reads
  there. A rung not yet earned is the same shape in `text.tertiary`, flat and quiet.
- **It breathes.** The gait for `spiral` in `domain/petMotion.js` swells the coil slightly and
  turns the head a few degrees; mood sets the drift as for every species.
- **The guardrails above apply.** No slit pupil, fang, tongue or scale texture, on screen or in the
  avatar prompt's description of the species (`AVATAR_SPECIES_DESCRIPTORS` in the API).

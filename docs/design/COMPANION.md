# The companion standard

> ADR-052, built on ADR-051. The B2 line — Nowry, the companion every learner starts with — is the
> standard every companion follows, default or generated. **The line is the skeleton; personalisation
> is the skin.** A generated companion may change markings, accessories and texture. It may not change
> the body plan, the size order, the framing, the colour rule or what gold means.

## 1. Six forms, six body plans

Each form is a new body, not the last one bigger. Five changes are structural; one is earned.

| Stage | Name | Body plan | What is new |
|---|---|---|---|
| 1 | Wisp | An egg, cracked open, the newborn curled inside, looking out | — the shared start |
| 2 | Sprite | A hatchling: oversized head, round body, a short tail curl | It has hatched |
| 3 | Scout | A young coil: a low coil with the neck rising in an S, head up | It stands |
| 4 | Sage | A full coil, two turns, neck tall; the first adornment (fin, sprout) | It is adorned |
| 5 | Oracle | A heavy coil, the body at its widest, a gold ring around it | It has earned gold |
| 6 | Luminary | The final serpent: crowned, upright, gold at the crown | It is crowned |

- **Stage 1 is the same egg for everyone.** It is never generated (ADR-052 §3). A personalised
  companion first appears when it hatches at stage 2.
- **A snake at every stage.** Two eyes (the mark's one eye is a side view), a smooth tapering body,
  cream belly bands. No fangs, tongue, slit pupils or scale texture.
- **Mood is not drawn on the art.** It shows through the orb: colour, glow and drift (`petMotion`).

## 2. Size: every form stands bigger than the last

- The art is cropped to the creature and centred in a square with a transparent ground. A form that
  is not square is padded, never stretched.
- It is drawn **contained**, never covered, at `petStages.artFill` of its frame:
  0.66, 0.72, 0.79, 0.84, 0.88, 0.94. With the orb's own growth (56 → 80 px) the form goes from
  37 px to 75 px.
- Each form must be both **taller and heavier** (more painted area) than the one before it. Measure
  both: height alone let form 2 look heavier than form 3; area alone made form 4 shorter than 3
  (`Nowry-API/scripts/out/companion/b2_ladder.py`).

## 3. The orb

- The art stands on **paper** (`background.surface`) with a rim of the accent, never on the accent
  itself, where an accent-coloured body would vanish.
- The orb keeps the stage's aura rings and orbiting motes (gold). It draws **no** crest, halo or crown
  over the art: the art wears its own.
- From `NEAR_EVOLUTION` (0.8) of the way to the next form, the orb stirs and the chat panel names the
  next form beside its silhouette (EVO-004).

## 4. Colour

- **The body is painted in reference teal** (`#2a6971` family) and moved onto the learner's accent at
  runtime by `@nowry/core/tokens/recolorArt.js`: the body's hue band (140°–290°) is rotated as a band,
  its median chroma and lightness moved to the accent's. Changing the accent costs no new image.
- Cream belly bands, eyes and cheeks keep their paint; they sit outside the band.
- **Gold means earned** (ADR-034): the stage-5 ring and the stage-6 crown, the orb's motes. Nothing
  else on the creature is gold, and nothing earned is another colour.

## 5. Locked forms

A form not yet reached is its **silhouette** in `text.tertiary` (a CSS mask of the art), readable in
light and dark. Never greyscale, never a filter that only works on one ground.

## 6. The moments

- **An evolution is a full-screen reveal** (EVO-003): the old form, a flash of gold, the new form
  larger, its name. A level-up without a new form is the small toast.
- **The journey** shows all six forms in a row, each bigger than the last, reached ones in colour.

## 7. Checklist for a generated set

A generated set ships only if every line holds. Check it on the set, side by side, not per image.

- [ ] Stage 1 is the shared egg; nothing was generated for it
- [ ] Stages 2–6 follow the body plans in §1, in order, and read as **one** creature
- [ ] Each form is taller **and** heavier than the one before (§2)
- [ ] Transparent ground, cropped, squared; no backdrop, scene, shadow pool or text
- [ ] The body is in the reference teal band, so `recolorArt` moves it; belly cream, eyes dark
- [ ] Gold only on the stage-5 ring and the stage-6 crown
- [ ] A snake at every stage: two eyes, no fangs, tongue, slit pupils or scale texture
- [ ] At 56 px on the paper orb, each form is told from its neighbours by shape alone
- [ ] Recoloured to all eight presets, nothing escapes the band (the B2 form 2 band is the test case)

## 8. Where it lives

| Part | Where |
|---|---|
| The default art | `src/assets/companion/stage-{1..6}.webp` |
| Drawing it | `src/components/Agent/CompanionArt.js` (`CompanionArt`, `CompanionArtDisc`) |
| Size by stage, near-evolution | `packages/core/domain/petStages.js` (`artFill`, `NEAR_EVOLUTION`) |
| Colour | `packages/core/tokens/recolorArt.js` |
| Which portrait is worn | `packages/core/domain/petPortrait.js`; the API's `_companion_portrait` |
| The reveal | `src/components/Agent/EvolutionReveal.js` |
| Decisions | ADR-051, ADR-052; `docs/prd-companion-evolution.md` |

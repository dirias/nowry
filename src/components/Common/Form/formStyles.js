import { TOUCH_TARGET, LIST_ROW_HEIGHT, FONT_WEIGHT, MOTION } from '../../../theme/tokens'

/**
 * Shared `sx` fragments for every form surface in the app.
 *
 * These began life in `AnnualPlanning/goal/goalStyles.js`, which existed because
 * `focusRing` had been copy-pasted into four files and a focus ring that drifts
 * between surfaces is an accessibility bug that only shows up on the surface
 * nobody re-checked. Now that seven surfaces share one form system, the
 * definition lives here and `goalStyles.js` re-exports it — one definition,
 * pointing the right way round, with none of its thirteen importers touched
 * (UX-CONTRACT §7.4).
 */

// The house focus ring. Never rely on the browser default — Joy resets it.
export const focusRing = {
  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
}

// Clamp text to a single line and ellipsise. German and Spanish run roughly 30%
// longer than the English source; without this, one-line contracts (ladder
// rungs, milestone titles) wrap and shift everything below them by a row.
export const oneLine = {
  display: 'block',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
}

// Every form label in the system. The goal pass set `fontWeight: 600` inline at
// six call sites; a label weight repeated per-field is a constant wearing a
// prop. The field wrappers (§5.4) apply this so surfaces never restate it.
// Sourced from FONT_WEIGHT.lg (600) rather than the literal, now that
// tokens.js is the app's single source of truth for the weight scale — this
// file routes every other surface through it, so it should too.
export const formLabel = { fontWeight: FONT_WEIGHT.lg }

// The horizontal rhythm shared by a sheet's header, body, banner and footer.
// Declared once so the four regions cannot drift out of alignment — the defect
// is invisible until a banner appears and its left edge misses the body's.
export const sheetInlinePadding = { xs: 2, sm: 3, md: 4 }

// ≥44px at `xs` per WCAG 2.5.5; the number itself now comes from
// `TOUCH_TARGET` in theme/tokens.js so the minimum is stated once for the whole
// app rather than hand-typed here and at 26 other sites. The compact `sm`+ size
// is the pointer-device affordance and stays local — it is a layout choice, not
// an accessibility minimum. Shared by rail chips, tag chips and row controls so
// "touch target" means one number, not five.
export const touchTarget = { minHeight: { xs: TOUCH_TARGET, sm: 32 } }

// The two-dimensional version, for square controls — icon buttons, menu
// buttons, canvas handles. WCAG 2.5.5 is a 44x44 AREA, so a control that is
// 44px tall and 28px wide still fails it; `touchTarget` alone only ever fixed
// half the box. Use this wherever the control has no text to give it width.
export const touchTargetBox = {
  minWidth: { xs: TOUCH_TARGET, sm: 32 },
  minHeight: { xs: TOUCH_TARGET, sm: 32 }
}

// Fixed-width digits, for values that update in place: streaks, counters,
// review intervals, timers. Without it, a countdown re-lays out on every tick
// as digit widths change and the surrounding row twitches.
//
// The theme already applies this to h1–h4 and display-*, where headline numbers
// live. This fragment is the opt-in for everything below heading level, which
// is deliberately left proportional because proportional figures read better in
// prose.
export const tabularNums = { fontVariantNumeric: 'tabular-nums' }

// The reading serif's ONLY entry point. `fontFamily: 'reading'` resolves to
// FONT_FAMILY.reading (Literata) and `lineHeight: 'xl'` (1.66667) gives
// long-form prose the extra leading it wants.
//
// Apply this to long-form prose only — book pages, editor preview, card
// front/back — and never below 1rem, and never to UI chrome. A serif at 14px on
// a low-DPI Android reads worse than Inter, and that is the specific way this
// choice fails. The three surfaces that may use it are also the three that
// import the font (see Books/Page, Books/Editor, Cards/StudySession).
export const readingSurface = { fontFamily: 'reading', lineHeight: 'xl' }

/**
 * The container of a segmented control — two or more controls of the SAME class
 * fused into one object, split by a hairline (DESIGN_GUIDELINES §15.2).
 *
 * The rule it exists to serve: the eye reads *same shape ⇒ same class of
 * thing*, so filters over one list belong in one container rather than beside
 * each other as loose chips. Two chips assert no relationship; a container with
 * a divider says "these are the same kind of control" without a word of copy.
 *
 * Lives here rather than in either of its call sites because it now governs two
 * unrelated surfaces — the study session's Browse filters and the Public
 * Library's toolbar — and a grammar that drifts between surfaces is exactly the
 * defect `focusRing` moved here to prevent.
 */
export const segmentedGroup = {
  display: 'flex',
  alignItems: 'stretch',
  borderRadius: 'md',
  borderColor: 'divider',
  bgcolor: 'background.level1',
  overflow: 'hidden'
}

/**
 * One segment of a {@link segmentedGroup}.
 *
 * State is a GROUND, never a hue (§15.5): `background.level2` means engaged, so
 * hover moves the label and leaves the ground alone — a hover that borrowed the
 * ground would impersonate the state. The hover grounds are pinned through
 * Joy's own variant variables rather than an `&:hover` override, which loses to
 * Joy's specificity.
 *
 * `radius.xs` rather than a raw 0: the container clips with `overflow: hidden`,
 * so the segments only need to stop being pills, and a raw radius is forbidden
 * by lint.
 *
 * @param {boolean} active - whether this segment is engaged
 * @param {boolean} first - whether it is the first, and so needs no divider
 */
export const segment = (active, first) => ({
  borderRadius: 'xs',
  borderLeft: first ? 0 : '1px solid',
  borderColor: 'divider',
  minHeight: { xs: TOUCH_TARGET, sm: 36 },
  px: 1.5,
  fontSize: 'sm',
  fontWeight: 'md',
  whiteSpace: 'nowrap',
  bgcolor: active ? 'background.level2' : 'transparent',
  color: active ? 'text.primary' : 'text.secondary',
  // The key's edge turned inward (ADR-020, §15.9): an engaged segment carries
  // a 2px accent underline on top of its level2 ground. Carried here since
  // CAL-009, so no call site spreads `keySegment` any more.
  ...(active ? { boxShadow: 'inset 0 -2px 0 0 var(--joy-palette-primary-solidBg)' } : {}),
  '--variant-plainHoverBg': active ? 'var(--joy-palette-background-level2)' : 'transparent',
  '--variant-plainActiveBg': active ? 'var(--joy-palette-background-level2)' : 'transparent',
  '&:hover': { color: 'text.primary' },
  ...focusRing,
  // The ring is INSET here, and only here. The group clips with
  // `overflow: hidden`, so the shared +2 offset would be cropped away on every
  // segment — a focus indicator that exists in the stylesheet and not on the
  // screen. Same colour, same width; only the offset changes.
  '&:focus-visible': { ...focusRing['&:focus-visible'], outlineOffset: '-2px' }
})

/**
 * The house button: a key you press (ADR-020, "Boost").
 *
 * A 2px edge under the button in the tone's darker shade gives it mass; hover
 * lifts it 1px and deepens the edge; active pushes it 2px down and the edge
 * disappears — the button travels the distance the edge promised. Radius `md`,
 * the same as the segmented group beside it. Nothing here is a hue: the edge is
 * whichever accent the user chose, darkened, so every preset gets the same
 * signature in both schemes.
 *
 * The motion is `MOTION.duration.quick` (80ms) and 2px. Slower or further reads
 * as a toy; neither number is tuned per call site.
 *
 * Applied to the calendar first (CAL-008). Since CAL-009 the theme's
 * `JoyButton` override (`theme/components.js`) gives every button this edge
 * and motion, so nothing spreads this any more; it stays as the single pinned
 * definition of the edge that the theme test compares against.
 *
 * @param {'primary' | 'neutral'} tone - primary for the solid action, neutral
 *   for a level1 secondary
 */
export const keyButton = (tone = 'primary') => {
  const edge = tone === 'primary' ? 'var(--joy-palette-primary-solidActiveBg)' : 'var(--joy-palette-neutral-outlinedBorder)'
  return {
    borderRadius: 'md',
    transition: ['transform', 'box-shadow', 'background-color']
      .map((prop) => `${prop} ${MOTION.duration.quick}ms ${MOTION.easing.standard}`)
      .join(', '),
    boxShadow: `0 2px 0 0 ${edge}`,
    '&:hover': { transform: 'translateY(-1px)', boxShadow: `0 3px 0 0 ${edge}` },
    '&:active': { transform: 'translateY(2px)', boxShadow: 'none' },
    // The edge still appears and disappears, which carries the same information
    // without motion (BUTTONS.md §4).
    '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover, &:active': { transform: 'none' } }
  }
}

/**
 * The key's engaged segment: a 2px accent underline inside the segment, on top
 * of the level2 ground `segment()` already gives it. State stays a ground
 * (§15.5) — the underline is the same "edge" idea as {@link keyButton}, not a
 * tint.
 *
 * Since CAL-009 `segment()` carries the underline itself, so this is kept only
 * for the tests that pin the shape of the edge; spreading it after `segment()`
 * is harmless and unnecessary.
 */
export const keySegment = (active) => (active ? { boxShadow: 'inset 0 -2px 0 0 var(--joy-palette-primary-solidBg)' } : {})

// ---------------------------------------------------------------------------
// Rows, readouts and measures (DESIGN_GUIDELINES §15.11, ADR-021, DS-011)
// ---------------------------------------------------------------------------

/**
 * The tile that carries an item's identity colour (ADR-019, §15.8): 16px at
 * radius `sm`. A label, not a fill — the hue keeps its full strength on a small
 * area while the title beside it sits on the neutral surface, so every item
 * gets the same text contrast in both schemes.
 *
 * `color` is whatever the item's identity is: a semantic token
 * (`primary.solidBg` for a flashcard deck, `warning.solidBg` for a quiz) or
 * user data (a focus area's own hex). The fragment never chooses a colour, only
 * the area it may cover. `EventTypeTile` is this box with a glyph inside, and
 * must keep the same radius and `flexShrink`, or a column of tiles stops
 * lining up between the calendar and the study centre.
 *
 * @param {string} color - a semantic colour token or the item's own colour
 * @param {number} [size=16] - 16 in a row; 28 where a glyph sits on it
 */
export const identityTile = (color, size = 16) => ({
  width: size,
  height: size,
  borderRadius: 'sm',
  flexShrink: 0,
  bgcolor: color
})

/**
 * One row of a list — a deck, a session, a tag, a group, a card (§15.11). Five
 * parts in one order: tile · name with a meta line · measure · readout · action.
 * Every list on the study centre draws the same row, and the library's grid
 * tile is this row stacked; a view is an arrangement, not a new product
 * (§15.8).
 *
 * The row IS the target — `LIST_ROW_HEIGHT` is 56 at `xs` and 52 at `sm`+ —
 * and its 12px sides are pulled out by a matching negative margin, so the
 * hover ground reaches past the text while the text still starts on the
 * content's left rail (§15.4). Hover is a ground, `level1`, and nothing else:
 * no lift and no shadow, because a row is content and the only depth on the
 * page is the key's edge (ELEVATION.md §2). Rows are separated by the
 * hairline of a `Stack` divider, never by a border of their own.
 */
export const listRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  minHeight: { xs: LIST_ROW_HEIGHT.xs, sm: LIST_ROW_HEIGHT.sm },
  px: 1.5,
  mx: -1.5,
  borderRadius: 'md',
  transition: `background-color ${MOTION.duration.quick}ms ${MOTION.easing.standard}`,
  '&:hover': { bgcolor: 'background.level1' },
  ...focusRing
}

/**
 * A number beside its label (§15.7, §15.11): "Due now · 4 decks", "Decks 12",
 * "Tags · 2", "3 due · 5 new". `body-sm` on `text.tertiary` in tabular
 * figures, so a count that ticks does not move its neighbours. The one number
 * that asks something of the user — the due count — is lifted to
 * `text.primary` at the call site; the fragment stays quiet.
 *
 * Never a `Chip`: a chip is a control's shape, and a count is not a control.
 * Never a semantic colour: hue is spent on identity (the tile) or on a grade,
 * and "3 due" in danger red reads as an error the user made (§15.5, §15.8).
 */
export const readout = { fontSize: 'sm', color: 'text.tertiary', ...tabularNums }

/**
 * The row-sized measure (§15.4, §15.11): a 64×3 track at radius `full` — the
 * progress radius, the one place `full` is right (§15.3) — with its percentage
 * as a {@link readout} beside it. Progress belongs on an edge, not in the row:
 * a bar this thin reads as a rule, not as an object. The Today object's bottom
 * edge is the same anatomy at content width; only the width changes.
 */
export const measureTrack = {
  width: 64,
  height: 3,
  borderRadius: 'full',
  bgcolor: 'background.level2',
  overflow: 'hidden',
  flexShrink: 0
}

/**
 * The fill of a {@link measureTrack}. Clamped, so a stale `mastery` of 104 or
 * a `-1` sentinel cannot draw outside the track. An all-new deck passes 0 and
 * prints "New" as its readout — an empty track, not a full grey one, because a
 * full bar for "nothing learned yet" is a lie the eye reads before the label.
 *
 * @param {number} pct - 0–100
 * @param {string} [color='primary.solidBg'] - the identity colour of the item
 */
export const measureFill = (pct, color = 'primary.solidBg') => ({
  width: `${Math.min(100, Math.max(0, Number(pct) || 0))}%`,
  height: '100%',
  borderRadius: 'full',
  bgcolor: color
})

# Motion — the standard

> DS-001. Three durations, two easings, one rule for reduced motion. Tokens live in
> `src/theme/tokens.js` (`MOTION`) and reach CSS as `--nowry-motion-*` variables from the theme.

---

## 1. What motion is for

Motion in Nowry explains a change: something appeared, something moved, something is now pressed.
It never decorates. A transition that a user would not miss if it were gone should be gone.

Three things move: **state** (a hover, a press, a toggle), **position** (a sheet sliding in, a row
being reordered), and **presence** (a menu, a toast, a skeleton giving way to content). Each has
one duration.

## 2. The scale

| Token | ms | Use |
|---|---|---|
| `MOTION.duration.quick` | **80** | State: hover colour, the key's press, a segment engaging, a checkbox tick |
| `MOTION.duration.base` | **160** | Presence: a menu opening, a chip appearing, a row's optimistic update, a tab change |
| `MOTION.duration.slow` | **240** | Position: a sheet sliding up on a phone, a panel expanding, a card moving |

| Token | Curve | Use |
|---|---|---|
| `MOTION.easing.standard` | `cubic-bezier(0.2, 0, 0, 1)` | Everything that enters or changes — fast start, soft landing |
| `MOTION.easing.exit` | `cubic-bezier(0.4, 0, 1, 1)` | Only what leaves — a menu closing, a toast going |

- **Three steps, never a fourth.** A component that "needs" 120ms is on the wrong step, not on a
  missing one. Today's 100 / 120 / 150 / 180 / 200 / 300 / 600 all collapse onto these three.
- **Under 80ms is instant; over 240ms is waiting.** A 600ms reveal makes the user watch the UI
  instead of using it.
- **Transition properties by name.** `transform`, `opacity`, `background-color`, `box-shadow`,
  `color`. Never `all` — it animates layout and costs frames.

## 3. In CSS

The theme exposes the scale as variables, so a transition reads the token and never repeats the
number:

```js
sx={{ transition: 'background-color var(--nowry-motion-quick) var(--nowry-motion-standard)' }}
```

In a shared fragment, read `MOTION` directly (as `keyButton` does) so a test can pin the number.

## 4. Reduced motion

Under `prefers-reduced-motion: reduce`:

- **Position and presence motion is removed**, not slowed: the sheet is simply there; the menu is
  simply open. Opacity fades may stay at `quick` — a fade is not motion.
- **State still has to be legible without movement.** The key keeps its edge appearing and
  disappearing; a toggle keeps its ground; a press keeps its colour change. If the only signal of
  a state was a transform, the design was wrong before reduced motion was on.
- A fragment that moves things carries its own reduced-motion block (see `keyButton`); a component
  that animates position uses the shared `reducedMotion` helper in `formStyles`.

## 5. Do not

- Do not write a duration as a literal in a component. The lint rule warns on it; the token is a
  one-word fix.
- Do not animate `width`, `height`, `top` or `left`; move with `transform`.
- Do not stack motion: a sheet that slides while its contents fade while its button lifts is three
  stories at once. One moving thing per moment.
- Do not add a page-load animation. The first frame is the page.

## 6. References

- `DESIGN_GUIDELINES.md` §14.4 (parallax on book cards — the one place a longer, physical motion
  is allowed, and it is pointer-driven, not timed), §15.9 and `BUTTONS.md` §4 (the key's 80ms).
- `ELEVATION.md` — what moves in depth and what only moves in the plane.

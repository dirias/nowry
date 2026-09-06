# Elevation and layering — the standard

> DS-001. What a shadow means, which layer a thing sits on, and the one rule that keeps a menu
> above a sheet. Tokens: Joy's `shadow` scale (unchanged) and `Z_INDEX` in `src/theme/tokens.js`,
> exposed as `theme.zIndex` so `sx={{ zIndex: 'floating' }}` resolves by name.

---

## 1. Depth is spent, not applied

Nowry is flat by default (DESIGN_GUIDELINES §1, §5). A shadow says *this object is above the
page*; the material ladder (§15.1) already says *this is pressable* without one. So a shadow is
reserved for things that genuinely float — and the key's edge (`BUTTONS.md`) is the only depth a
button has.

## 2. Shadows — what each level means

| Token | Means | Where |
|---|---|---|
| none | On the page, or a control on its ground | Buttons, chips, segments, inputs, list rows, cards at rest |
| `shadow.xs` | Barely lifted | A row being dragged; a surface-card secondary in a form footer |
| `shadow.sm` | Lifted on interaction | A card on hover (§5: "elevate only on hover"); the shipped calendar pill hover |
| `shadow.md` | A layer over the page | Menus, popovers, the Focus chip, tooltips' container |
| `shadow.lg` | A floating object | The Pomodoro widget, the Study Buddy, the sheet on desktop, a toast |
| `shadow.xl` | Reserved | Not used today; a full-screen takeover if one ever exists |

- **Never at rest on content.** A card, a row or a tile has no shadow until the pointer is on it.
  46 `sm`, 37 `md` and 28 `lg` uses exist; the ones on resting content are debt.
- **Never a hand-rolled shadow.** The three literal `rgba(...)` shadows in the codebase go; Joy's
  scale already carries `shadowRing` / `shadowChannel` so the same token reads correctly in dark.
- **Dark mode dims shadows into borders.** A design that needs a shadow to be seen in dark is
  relying on the wrong signal; give the object a `divider` border too when it floats.

## 3. Layers — the scale

| Name | Value | What sits here |
|---|---|---|
| `badge` | 1 | A count on an icon; anything that only needs to beat its own siblings |
| `table` | 10 | Sticky headers and toolbars inside a scrolling surface |
| `floating` | **100** | The app's addition: widgets that live over the page — Pomodoro timer, Study Buddy, Focus chip |
| `popup` | 1000 | Menus, selects' listboxes, popovers, the "+2 more" popover |
| `modal` | 1300 | Sheets and dialogs, with their backdrop |
| `snackbar` | 1400 | Toasts — above a sheet, since a save can succeed from one |
| `tooltip` | 1500 | Tooltips — above everything, they follow the pointer |

- **By name, never by number.** `sx={{ zIndex: 'floating' }}`. The lint rule warns on a numeric
  literal; 1, 2, 10, 20, 200, 1000, 9999 and 10000 all map onto a name above.
- **Joy's components already sit on this scale.** Menu, Modal, Snackbar and Tooltip read
  `theme.zIndex`; the app's job is only to put its own floating things on `floating` and its
  sticky chrome on `table`.
- **A stacking context is a promise.** Anything with `position: fixed/sticky`, `transform` or
  `opacity < 1` starts a new context; a `popup` inside a `floating` widget is still inside it.
  Menus that must escape a widget render in a portal (Joy's do).
- **Two floating objects never share a corner** (§15.6). Layer order does not resolve a collision;
  placement does.

## 4. In code

```js
// a widget over the page
sx={{ position: 'fixed', bottom: 24, left: 24, zIndex: 'floating', boxShadow: 'lg' }}

// a sticky toolbar inside a scrolling list
sx={{ position: 'sticky', top: 0, zIndex: 'table', bgcolor: 'background.surface' }}
```

## 5. Do not

- Do not write `zIndex: 9999` to "win". If something is under something it should be above, one
  of them is on the wrong named layer; fix the layer.
- Do not put a shadow on a button, a chip or a segment. The key has an edge; that is its depth.
- Do not lift a whole list of cards. One object may float; a page of floating objects is a page
  with no ground.

## 6. References

- `MOTION.md` — shadows may change with `quick`; a shadow that animates slower than the object it
  belongs to reads as lag.
- `DESIGN_GUIDELINES.md` §5, §15.1, §15.6; `BUTTONS.md` §1 and §9.

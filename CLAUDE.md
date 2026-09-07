# Nowry Frontend — Claude Code Configuration

> **Parent context:** See `/Nowry/CLAUDE.md` for full project overview and architecture.

## This Repository

Nowry's **frontend clients** and the logic they share. It is an npm workspace root
(ADR-032), not a single app.

| Path | What it is |
|---|---|
| `src/`, `public/` | the web client — React 18 + Joy UI, Create React App |
| `packages/core/` | `@nowry/core` — platform-free logic shared by both clients |
| `mobile/` | the Expo + React Native client (empty until MOB-005) |

```bash
npm install        # at the repository root — links every workspace
npm start          # web dev server — http://localhost:3000
npm run build      # web production build
npx jest --config packages/core/jest.config.js   # the shared package's tests
```

### Before touching `packages/core`

Read `packages/core/README.md`. Two rules govern every file there and both are
load-bearing:

1. **No JSX** (ADR-031). `react-scripts` transpiles JSX only under `src/`, and webpack
   resolves the workspace symlink to a path outside it. Write providers with
   `React.createElement`.
2. **No browser globals** (ADR-026). No `window`, `document`, `localStorage`,
   `sessionStorage`, `navigator`, `react-dom` or `@mui/*`. The environment arrives
   through the platform port.

A module there never returns a React component. Return an icon *key* and let each
client map it.

## Stack

- **React 18** + React Router v6
- **Joy UI** (@mui/joy) — the only component library used
- **i18next** — all user-facing strings must use `t('key')`
- **Firebase** — Authentication (client-side)
- **MongoDB** via API — never accessed directly

## Design System

**Always read before editing UI:** `docs/design/DESIGN_GUIDELINES.md`
**Buttons and segmented controls:** `docs/design/BUTTONS.md` — the house button standard (ADR-020)
**Motion:** `docs/design/MOTION.md` — three durations, two easings, reduced motion (DS-001)
**Elevation and layering:** `docs/design/ELEVATION.md` — what a shadow means; layers by name, never by number (DS-001)
**The index of all standards:** `docs/design/DESIGN_GUIDELINES.md` §16

### Non-negotiables
1. Use **Joy UI `sx` props** only — no `style={{}}`, no raw CSS
2. Use **semantic color tokens** — never hardcode hex or numeric shade tokens
3. Every string user sees → `t('translation.key')` — NO exceptions
4. All components must work in **Light AND Dark mode**
5. **Skeleton** for async data — no full-page loading spinners

## Folder Structure

```
src/
├── api/services/    # All HTTP calls (cards, decks, books, etc.)
├── components/      # Feature components (Cards/, Books/, Study/, etc.)
│   ├── Cards/
│   │   ├── CardHome.js        # Content Library root
│   │   ├── ManageContent.js   # Deck/Card list with tabs + filters
│   │   └── StudySession.js    # Active study session
│   └── Study/
│       └── StudyCenter.js     # Main /study page (Dashboard + Content Library tabs)
├── context/         # AuthContext, PomodoroContext, NotificationContext
├── hooks/           # useCardData, useDeckData, useStatistics, useVoiceSettings
├── locales/         # i18n translation files
└── theme/           # Joy UI theme customisation
```

## Key Rules to Remember

- After a study session completes → navigate to `/study`, NEVER `/cards`
- Filter chips should be `size='sm'`, search inputs `size='md'`
- Use `background.level1` for subtle containers, `background.surface` for cards
- Use `text.secondary` / `text.tertiary` for secondary/caption text — not `neutral.600`

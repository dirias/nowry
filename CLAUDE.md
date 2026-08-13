# Nowry Frontend — Claude Code Configuration

> **Parent context:** See `/Nowry/CLAUDE.md` for full project overview and architecture.

## This Package

React 18 frontend using Joy UI component library.

```bash
npm start          # dev server — http://localhost:3000
npm run build      # production build
```

## Stack

- **React 18** + React Router v6
- **Joy UI** (@mui/joy) — the only component library used
- **i18next** — all user-facing strings must use `t('key')`
- **Firebase** — Authentication (client-side)
- **MongoDB** via API — never accessed directly

## Design System

**Always read before editing UI:** `docs/design/DESIGN_GUIDELINES.md`

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

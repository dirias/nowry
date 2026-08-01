# Nowry Mobile Migration Matrix

Status: working document for `agent/mobile-migration-prep`

## Goals

- Keep `dev` production behavior unchanged while preparing a React Native client.
- Reuse business logic and API contracts where doing so reduces risk.
- Rebuild platform UI where browser-specific libraries would create fragile abstractions.
- Prefer production-safe, incremental extraction over a broad rewrite.

## Classification

- **Shared core**: logic/API/state that should be portable with minimal platform adapters.
- **Mobile MVP**: should ship in the first useful mobile release.
- **Mobile later**: valuable on mobile, but not required to prove the architecture.
- **Web-first / redesign**: keep on web initially or redesign natively before porting.

## Feature matrix

| Feature | Classification | Reuse estimate | Main blockers / notes |
| --- | --- | ---: | --- |
| API services | Shared core | 85–100% | Browser storage, notification and redirect behavior are being extracted behind platform boundaries. |
| Firebase email/password auth | Shared core + Mobile MVP | 80–90% | Firebase session model is portable; browser redirects and Web Storage are not. |
| Google auth | Mobile MVP | 40–60% | Current `signInWithPopup` is web-only. Native flow must use a mobile OAuth integration and then exchange/use the same Firebase identity. |
| Auth state / current user | Shared core + Mobile MVP | 70–85% | `onAuthStateChanged` is portable; navigation and storage side effects need adapters. |
| i18n | Shared core + Mobile MVP | 90% | Language detection must not rely directly on `navigator`. |
| Home dashboard | Mobile MVP | 30% code / 85–95% product design | Current MUI/Joy UI must be rebuilt with React Native primitives/components. Existing mobile-first layout is a strong design reference. |
| Onboarding | Mobile MVP | 45–60% | Current logic is reusable; MUI, router, `navigator.language` and `sessionStorage` are platform-specific. |
| Nowry AI companion state | Shared core + Mobile MVP | 85–95% | `AgentContext` and API interactions are well separated from rendering. |
| Nowry AI companion UI | Mobile MVP | 10–25% code / 90% concept | Current portal, `document.body`, Framer Motion and DOM drag behavior should become native overlay/bottom-sheet/Reanimated UI. |
| Study center | Mobile MVP | 55–70% | Data hooks and intervention logic are reusable. Current MUI/router/touch-event handling is web-specific. Direct `localStorage` remains and should be moved behind platform storage. |
| Study session / flashcards | Mobile MVP | 50–70% | Core study state and API logic likely portable; gestures, animations, fullscreen and companion overlay need native implementation. |
| Study history/statistics | Mobile MVP or early Phase 2 | 65–80% | Mostly data presentation; charts/components need native equivalents. |
| Profile/settings | Mobile MVP | 55–75% | Preference logic/API reusable; MUI controls and browser-specific settings must be replaced. |
| Pomodoro | Mobile later | 55–70% | Timer logic should be reusable; widget positioning, click-away and audio/notification behavior need native APIs. Background timer semantics need explicit design. |
| Calendar | Mobile later | 35–50% | `@fullcalendar/react` is web-only. Services/filter logic are reusable, but UI should use a native calendar implementation. |
| Books list / reading | Mobile later | 50–70% | API/domain logic can be shared. Reading experience can be native. |
| Lexical book editor | Web-first / redesign | 15–35% | Current editor depends on Lexical React, DOM measurements, `window`, `document`, browser scrolling and web toolbar behavior. Do not attempt a thin compatibility layer. |
| Sheets | Web-first / redesign | 25–45% | `react-spreadsheet` is web-only. API and autosave concepts are reusable, but a production-quality mobile spreadsheet requires a dedicated UX/component strategy. |
| Annual planning | Mobile later | 50–70% | Data/service logic should port well; drag/drop/complex planning views need native UX review. |
| Public browse / marketing / legal | Web-first | 20–40% | Marketing pages stay web-first. Legal content can later be rendered natively or in a secure web view. |
| Subscription management | Mobile later, platform review required | 30–60% | Mobile store billing rules differ from web billing. Must design App Store / Play Store compliant purchase flows before porting. |
| Bug dashboard / dev tooling | Web-first | 10–30% | Internal/admin functionality should not block mobile launch. |

## Browser-only dependencies identified so far

### Cross-cutting

- `react-router-dom`
- `@mui/joy`, `@mui/material`, `@mui/icons-material`
- `framer-motion`
- browser `window` / `document`
- `localStorage` / `sessionStorage`
- DOM custom events
- `navigator` language detection
- CSS files and browser viewport assumptions

### Feature-specific

- Lexical React editor stack
- `@fullcalendar/react` and plugins
- `react-spreadsheet`
- ReactDOM portals used by the AI companion
- DOM resize/scroll listeners in the book editor
- web touch event objects (`targetTouches`)
- click-away behavior and fixed-position widget UI in Pomodoro

## Recommended first mobile vertical slice

The first mobile release should prove the full production path rather than maximize feature count:

1. App bootstrap, environment configuration and observability.
2. Firebase email/password authentication.
3. Google native authentication.
4. Session restoration and authenticated API client.
5. Onboarding.
6. Home shell.
7. Nowry AI companion chat.
8. Study center + one complete study session flow.
9. Profile/settings required by the above features.

This slice exercises authentication, navigation, storage, API networking, AI, user preferences, state management, gestures and production error handling without taking on the highest-risk web-only editors.

## Architecture rules

1. **No direct browser globals in shared/business layers.** Platform code owns navigation, persistent storage, event transport, device APIs and platform-specific UI.
2. **Do not create fake universal components around complex web libraries.** FullCalendar, Lexical and react-spreadsheet should have intentionally different native UIs.
3. **Backend remains the system of record.** Web and mobile must use the same Nowry API contracts wherever practical.
4. **Firebase remains the identity source.** Do not create a second mobile-only authentication model.
5. **Secrets are not persisted in generic storage.** Native secrets/tokens that truly require persistence use an OS-backed secure mechanism; Firebase-managed credentials should remain Firebase-managed.
6. **Incremental migration only.** Every web refactor must preserve existing production behavior and have focused tests where side effects are extracted.
7. **Observability is part of the MVP.** Mobile must have crash/error reporting, release/environment metadata and network diagnostics before public release.
8. **Accessibility is not optional.** Native screen-reader labels, dynamic type/text scaling, touch target sizes and reduced-motion behavior must be designed from the start.

## Next engineering tasks

- Remove remaining direct Web Storage usage from mobile-MVP features (`StudyCenter`, onboarding and any shared contexts/hooks).
- Introduce a platform locale/device-information boundary so business components do not read `navigator` directly.
- Inventory remaining browser globals in auth, study, agent, profile and common hooks.
- Define the mobile navigation map and deep-link strategy.
- Define shared API error taxonomy independent of UI notification rendering.
- Validate `agent/mobile-migration-prep` with unit tests, lint and a production web build before opening any PR toward `dev`.

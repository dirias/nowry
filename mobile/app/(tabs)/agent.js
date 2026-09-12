/**
 * `/agent` — the companion's chat (MOB-085).
 *
 * Routes stay thin; the screen lives in `src/screens` with the others. It sits
 * inside the tab group so the app bar stays above it and the tab bar below,
 * and it has no button of its own: the way in is the companion's panel on Home.
 */
export { default } from '../../src/screens/AgentChat'

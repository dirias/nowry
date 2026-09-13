/**
 * Settings, at `/settings` — top level, exactly as the web serves it.
 *
 * Inside the tab group with no tab of its own, the way Profile is: pushed over
 * the tabs rather than being one, which is what the web does and what keeps the
 * bar at four. It used to sit outside the group, which meant it had no app bar
 * at all — no name, no account, and nothing to go back with except the system
 * gesture (MOB-053).
 */
export { default } from '../../../src/screens/Settings'

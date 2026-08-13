/**
 * The onboarding journey's screen vocabulary (ONB-008).
 *
 * FR-001 fixes the journey at exactly three screens in one order. That order is
 * a fact about the product, not about React, so it lives in a module of its own
 * rather than inside `OnboardingRoute`: the route imports the screens, and a
 * screen that needs to name a position would otherwise have to import the route
 * back and close an import cycle.
 *
 * The identifiers are deliberately the *wire* values the API already uses for
 * `resume_screen` and `last_meaningful_point` (`welcome | personalization |
 * first_deck`), so nothing in the client has to translate between a server
 * screen name and a client one — a mapping table is exactly where a resume
 * silently lands on the wrong screen.
 */

/** @type {{WELCOME: 'welcome', PERSONALIZATION: 'personalization', FIRST_DECK: 'first_deck'}} */
export const ONBOARDING_SCREEN = {
  WELCOME: 'welcome',
  PERSONALIZATION: 'personalization',
  FIRST_DECK: 'first_deck'
}

/** The three screens, in the only order FR-001 permits. */
export const ONBOARDING_SCREEN_ORDER = [ONBOARDING_SCREEN.WELCOME, ONBOARDING_SCREEN.PERSONALIZATION, ONBOARDING_SCREEN.FIRST_DECK]

export const TOTAL_ONBOARDING_SCREENS = ONBOARDING_SCREEN_ORDER.length

/**
 * Zero-based position, or `-1` for anything that is not a screen.
 *
 * @param {string|null|undefined} screen
 * @returns {number}
 */
export const screenIndex = (screen) => ONBOARDING_SCREEN_ORDER.indexOf(screen)

/**
 * One-based position for display, or `null` when there is nothing to display.
 * `null` rather than `0` so a caller cannot accidentally render "Step 0 of 3"
 * through a falsy check that treats the two the same.
 *
 * @param {string|null|undefined} screen
 * @returns {number|null}
 */
export const screenStep = (screen) => {
  const index = screenIndex(screen)
  return index === -1 ? null : index + 1
}

/**
 * Normalize the server's `resume_screen` into a screen we can render.
 *
 * The API already normalizes this field — legacy users get `welcome`, activated
 * users get `null` — so this is a guard against an unknown future value, not a
 * second source of resume logic. It must never be used to *derive* a resume
 * point from anything other than the server's own answer (ADR-006).
 *
 * @param {string|null|undefined} resumeScreen - Server `resume_screen`
 * @returns {'welcome'|'personalization'|'first_deck'}
 */
export const normalizeResumeScreen = (resumeScreen) => (screenIndex(resumeScreen) === -1 ? ONBOARDING_SCREEN.WELCOME : resumeScreen)

/**
 * The screen after this one, or `null` at the end of the journey.
 *
 * @param {string|null|undefined} screen
 * @returns {string|null}
 */
export const nextScreen = (screen) => ONBOARDING_SCREEN_ORDER[screenIndex(screen) + 1] ?? null

/**
 * The screen before this one, or `null` at the start of the journey.
 *
 * @param {string|null|undefined} screen
 * @returns {string|null}
 */
export const previousScreen = (screen) => {
  const index = screenIndex(screen)
  return index <= 0 ? null : ONBOARDING_SCREEN_ORDER[index - 1]
}

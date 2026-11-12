/**
 * Where the web lives, for the client that is not it (docs/prd-public-site.md D-M6).
 *
 * The phone has no legal routes; Terms and Privacy open the web's pages. One
 * constant, so a domain change is one line.
 */
export const SITE_URL = 'https://nowry.app'

/** The web's route for a legal page: 'terms' or 'privacy'. */
export const legalUrl = (kind) => `${SITE_URL}/${kind === 'privacy' ? 'privacy' : kind === 'copyright' ? 'copyright' : 'terms'}`

/** When each legal text last changed (ISO date). Move these when the text moves, never on deploy. */
/**
 * The legal pages live at one path each, in every language: each page renders
 * in the reader's language, so a translated slug added nothing but a link the
 * router did not know (GTM-008). The slugs the sign-up and sign-in screens used
 * to link still lead somewhere, in case one was shared.
 */
export const LEGAL_PATHS = Object.freeze({ terms: '/terms', privacy: '/privacy', copyright: '/copyright' })
export const LEGAL_PATH_ALIASES = Object.freeze({
  '/terminos': '/terms',
  '/privacidad': '/privacy',
  '/conditions': '/terms',
  '/confidentialite': '/privacy',
  '/nutzungsbedingungen': '/terms',
  '/datenschutz': '/privacy',
  '/規約': '/terms',
  '/プライバシー': '/privacy'
})

/** The public page Google Play's account deletion link points at (ADR-081, FR-029). Works signed out. */
export const DELETE_ACCOUNT_PATH = '/delete-account'

/**
 * How long other services keep what they hold, as the delete-account page states it.
 * Sentry: fixed by its plan (30 days on Developer, 90 on paid), so 90 is true on either.
 * Langfuse: the project's data retention setting; change both together.
 */
export const SENTRY_RETENTION_DAYS = 90
export const LANGFUSE_RETENTION_DAYS = 30

export const LEGAL_TERMS_UPDATED = '2026-10-03'
export const LEGAL_PRIVACY_UPDATED = '2026-11-13'

/** The address copyright notices reach. The registered agent's postal address joins it once registered. */
export const COPYRIGHT_AGENT_EMAIL = 'copyright@nowry.app'

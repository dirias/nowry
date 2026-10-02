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
export const LEGAL_TERMS_UPDATED = '2026-10-03'
export const LEGAL_PRIVACY_UPDATED = '2026-10-03'

/** The address copyright notices reach. The registered agent's postal address joins it once registered. */
export const COPYRIGHT_AGENT_EMAIL = 'copyright@nowry.app'

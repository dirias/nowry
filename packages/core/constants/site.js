/**
 * Where the web lives, for the client that is not it (docs/prd-public-site.md D-M6).
 *
 * The phone has no legal routes; Terms and Privacy open the web's pages. One
 * constant, so a domain change is one line.
 */
export const SITE_URL = 'https://nowry.app'

/** The web's route for a legal page: 'terms' or 'privacy'. */
export const legalUrl = (kind) => `${SITE_URL}/${kind === 'privacy' ? 'privacy' : 'terms'}`

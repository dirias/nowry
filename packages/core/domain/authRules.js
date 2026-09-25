/**
 * The account contract both clients enforce (docs/prd-public-site.md D-M3).
 *
 * The web asked for 8 characters and the phone for 6, each as a literal at its
 * own screen, so the same account had two rules. One number here, read by both,
 * and `auth.errors.passwordLength` names it.
 */
export const MIN_PASSWORD_LENGTH = 8

/** True when a password clears the floor. Whitespace counts; it is the user's. */
export const passwordLongEnough = (password) => typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH

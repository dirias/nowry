/**
 * The one line under a field.
 *
 * Pure, and apart from the component, so the rule can be tested without a
 * device runtime — which matters more than usual here, because rendering React
 * Native components in Jest is blocked upstream (see `jest.config.js`).
 *
 * The rule itself is the web's, unchanged: an error REPLACES the helper. Two
 * lines under one field is a field arguing with itself, and the one that
 * matters is always the error.
 *
 * Both are translation KEYS, never rendered strings. The state core that
 * produces them has no `t()` and must not: a core that formats text is a core
 * that has to know the language.
 */
export const messageFor = (errorKey = null, helperKey = null) => ({
  key: errorKey || helperKey || null,
  invalid: Boolean(errorKey)
})

export default messageFor

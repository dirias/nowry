/**
 * The companion's preferences: their keys, their options, their defaults
 * (MOB-091).
 *
 * Every one of these is a field on `PUT /users/preferences/general` and the web
 * spells each of them out at its own control — `save('agent_tone', val)`,
 * `prefs.agent_conciseness || 'balanced'`, a five-line literal for the
 * intervention switches. That is twelve chances to misspell a key and no way to
 * find out except by changing a setting and watching it not stick. A second
 * client copying those literals doubles it.
 *
 * So the keys are here, once, with the options each accepts and the default the
 * server implies by omitting the field. Nothing here knows about React or about
 * a request; `interventionPolicy` owns the four intervention settings' MEANING
 * and this owns their spelling.
 *
 * **What is deliberately absent**: the custom personality, the portrait, the
 * animation and the quiz question count. The first three are paid features and
 * no mobile screen may name one (ADR-030); the fourth belongs to a quiz this
 * client does not have.
 */

/** How long an answer should be. */
export const CONCISENESS = ['concise', 'balanced', 'detailed']

/** How it should sound. */
export const TONE = ['friendly', 'professional', 'socratic', 'strict']

/** How often it may speak unasked. `interventionPolicy` holds what each means. */
export const FREQUENCY = ['conservative', 'balanced', 'frequent']

/** The five kinds of proactive message, in the order the settings list them. */
export const INTERVENTION_TYPES = ['wrong_answer', 'session_summary', 'pre_session', 're_engagement', 'streak_milestone']

/** The server's name for one intervention type's switch. */
export const interventionKey = (type) => `agent_intervention_${type}`

/**
 * Every preference this client reads, as `name → {key, fallback}`.
 *
 * `key` is the server's spelling and `fallback` is what the server means by
 * leaving the field out. Two of them default ON and the rest OFF, which is not
 * a pattern to guess at: the proactive messages are on because the companion is
 * meant to speak, and knowledge access is off because it is the one that reads
 * the learner's own library.
 */
export const AGENT_PREFS = {
  conciseness: { key: 'agent_conciseness', fallback: 'balanced' },
  tone: { key: 'agent_tone', fallback: 'friendly' },
  knowledgeAccess: { key: 'agent_knowledge_access', fallback: false },
  proactiveNudging: { key: 'agent_proactive_nudging', fallback: false },
  interventionFrequency: { key: 'agent_intervention_frequency', fallback: 'balanced' },
  focusMode: { key: 'agent_focus_mode', fallback: false }
}

/**
 * Read one preference out of the general-preferences document.
 *
 * @param {object|null} preferences
 * @param {string} name - a key of `AGENT_PREFS`
 */
export function agentPref(preferences, name) {
  const field = AGENT_PREFS[name]
  if (!field) return null
  const value = preferences?.[field.key]
  return value === undefined || value === null ? field.fallback : value
}

/**
 * Whether one kind of proactive message is switched on. Absent means on, the
 * same default `interventionPolicy` applies when it gates them.
 */
export const interventionEnabled = (preferences, type) => preferences?.[interventionKey(type)] ?? true

/**
 * Turning knowledge access off turns the nudges off with it.
 *
 * The nudge is the companion noticing something in your library and saying so,
 * so it cannot be on while the thing it notices is unreadable. The web enforces
 * this at the control; writing it here means the phone cannot forget to — and
 * the returned patch is what BOTH switches send, so one write covers both.
 *
 * @param {boolean} value
 * @returns {object} the patch to send
 */
export const knowledgeAccessPatch = (value) =>
  value
    ? { [AGENT_PREFS.knowledgeAccess.key]: true }
    : { [AGENT_PREFS.knowledgeAccess.key]: false, [AGENT_PREFS.proactiveNudging.key]: false }

export default AGENT_PREFS

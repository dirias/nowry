/**
 * Choosing a voice, on a device that has never met the one you picked.
 *
 * A deck stores a voice by name, and a name is a local fact: "Google 日本語"
 * exists on one Android build and on nothing else. So the deck also stores the
 * language code, and the language is what actually travels — a Japanese deck
 * configured on a laptop should speak Japanese on a phone, in whatever voice
 * that phone has.
 *
 * Hence the order below, which is the web's and is not obvious: **language
 * first, name second.** Matching the name first looks more faithful and is
 * worse, because the one device where the name matches is the device you
 * already configured.
 *
 * Voices arrive here as `{name, lang}`. The browser's `SpeechSynthesisVoice`
 * has both; Expo's `Speech.Voice` calls them `name` and `language`, and the
 * phone's platform layer renames them before they get here. Nothing in this
 * file touches a speech engine.
 */

/** Android writes `ja_JP`; everything else writes `ja-JP`. */
export const languageBase = (lang) =>
  String(lang ?? '')
    .replace(/_/g, '-')
    .split('-')[0]
    .toLowerCase()

/**
 * The engine's own words for "this is the good one". No better signal exists:
 * the Web Speech API exposes no quality field, and Android's `quality` is
 * absent on most voices.
 */
const PREFERRED = /Google|Enhanced|Premium/

/** Of several voices for one language, the one to use. */
export const bestOf = (voices) => voices.find((voice) => PREFERRED.test(voice?.name ?? '')) || voices[0] || null

/**
 * The voice to speak with, or `null` when the device has nothing suitable.
 *
 * @param {Array<{name: string, lang: string}>} voices — what this device has.
 * @param {{targetLang?: string, targetName?: string}} wanted — what the deck saved.
 * @param {Array<{name: string, lang: string}>} [allVoices] — every system voice,
 *   when `voices` is a narrowed list. Used only to learn what language a saved
 *   name was, so a name from another device still selects the right language.
 */
export function resolveVoice(voices = [], { targetLang = null, targetName = null } = {}, allVoices = null) {
  const forLanguage = (lang) => {
    const base = languageBase(lang)
    if (!base) return null
    return bestOf(voices.filter((voice) => languageBase(voice?.lang) === base))
  }

  // 1. The language the deck saved. This is the case that travels.
  const byLanguage = targetLang ? forLanguage(targetLang) : null
  if (byLanguage) return byLanguage

  if (!targetName) return null

  // 2. The exact voice, which means this is the device it was chosen on.
  const exact = voices.find((voice) => voice?.name === targetName)
  if (exact) return exact

  // 3. A name and no language: a deck configured before languages were saved.
  //    Look the name up among every voice to learn what it spoke, then serve
  //    that language from what this device has.
  const original = (allVoices ?? voices).find((voice) => voice?.name === targetName)
  return original ? forLanguage(original.lang) : null
}

/**
 * The languages a device can speak, one entry each, alphabetical by code.
 *
 * `label` is deliberately the bare code: naming a language is a locale
 * question, `Intl.DisplayNames` is not on every runtime this package serves,
 * and a display name belongs to whoever is drawing the list.
 */
export function languageOptions(voices = []) {
  const seen = new Map()

  voices.forEach((voice) => {
    const base = languageBase(voice?.lang)
    if (!base) return
    const entry = seen.get(base)
    if (!entry) return seen.set(base, { langBase: base, langCode: String(voice.lang).replace(/_/g, '-'), bestVoice: voice })
    if (PREFERRED.test(voice.name ?? '') && !PREFERRED.test(entry.bestVoice.name ?? '')) entry.bestVoice = voice
  })

  return Array.from(seen.values()).sort((a, b) => a.langBase.localeCompare(b.langBase))
}

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
 * The script each language the segmenter can name is written in. Script is
 * the one thing about a segment that is never a guess: the server reads it
 * off the characters, while telling Spanish from Portuguese is a classifier's
 * opinion, and on two words ("Feliz") a wrong one.
 */
const SCRIPT_OF = {
  ja: 'japanese',
  zh: 'han',
  ko: 'hangul',
  ru: 'cyrillic',
  uk: 'cyrillic',
  bg: 'cyrillic',
  ar: 'arabic',
  fa: 'arabic',
  hi: 'devanagari',
  mr: 'devanagari'
}
const NON_LATIN = ['th', 'el', 'he', 'ka', 'hy', 'ta', 'te', 'bn', 'km', 'my']
const scriptOf = (lang) => {
  const base = languageBase(lang)
  if (!base) return null
  return SCRIPT_OF[base] || (NON_LATIN.includes(base) ? base : 'latin')
}

/**
 * Whether a voice for `voiceLang` can read a segment the server labelled
 * `segmentLang` (ADR-050): same script, or a Japanese voice reading kanji —
 * kanji-only text with nothing else to go on is labelled Chinese.
 */
export function readsScriptOf(voiceLang, segmentLang) {
  const voice = scriptOf(voiceLang)
  const segment = scriptOf(segmentLang)
  if (!voice || !segment) return false
  return voice === segment || (voice === 'japanese' && segment === 'han')
}

/**
 * The voice for one segment of mixed-language text (ADR-050).
 *
 * The voice the learner selected, whenever it reads the segment's script — a
 * Spanish voice reads every Latin segment, so a detector that calls "Feliz"
 * English cannot hand it to an English voice. A segment in another script
 * gets the device's best voice for its language: kana on a Spanish side is
 * read by a Japanese voice. Otherwise the selected voice, because some voice
 * beats silence.
 *
 * @param {Array<{name: string, lang: string}>} voices — what this device has.
 * @param {{name: string, lang: string} | null} selected — the deck's voice here.
 * @param {string | null} lang — the segment's language code.
 */
export function voiceForSegment(voices = [], selected = null, lang = null) {
  if (!lang) return selected
  if (selected && readsScriptOf(selected.lang, lang)) return selected
  return resolveVoice(voices, { targetLang: lang }) || selected
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

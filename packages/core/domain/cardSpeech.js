/**
 * What a card sounds like.
 *
 * The web computed this inline, in the middle of a 1945-line render: a quiz
 * reads its question and then its options, and everything else reads the face
 * that is showing. Three field names deep, in a ternary, inside a prop.
 *
 * It moves here because the phone needs the same rule and the two clients
 * disagree about field names. The web's session holds `title`/`content`; the
 * phone's holds whatever the list endpoint sent, which for older cards is
 * `question`/`answer` and for imported ones `front`/`back`. A reader that
 * knows all three is the only way one rule can serve both.
 *
 * **A quiz reads the same on both faces.** Its back is a verdict, not a text —
 * "correct, because…" is the explanation, and reading the options again after
 * the answer is what makes an audio quiz usable at all.
 */

import { languageBase } from './voiceMatch'

/** The three spellings the question has worn, newest first. */
export const frontText = (card) => card?.title || card?.question || card?.front || ''

/** And the answer's. */
export const backText = (card) => card?.content || card?.answer || card?.back || ''

/**
 * The text to speak for a card, or `''` when there is nothing to say.
 *
 * @param {object} card
 * @param {{flipped?: boolean}} [options] — whether the answer is showing.
 */
export function speechTextFor(card, { flipped = false } = {}) {
  if (!card) return ''

  if (card.card_type === 'quiz') {
    const options = Array.isArray(card.options) ? card.options.filter(Boolean) : []
    const question = frontText(card)
    if (!question) return ''
    return options.length > 0 ? `${question}. ${options.join(', ')}` : question
  }

  return flipped ? backText(card) : frontText(card)
}

/** Hiragana, katakana and their phonetic extensions: only Japanese writes them. */
const KANA = /[\u3040-\u30ff\u31f0-\u31ff]/

/** The two languages that write Han, and so the only hints worth sending. */
const HAN_LANGUAGES = ['ja', 'zh']

const savedHanLanguage = (side) => {
  const base = languageBase(side?.voiceLang ?? side?.voice_lang)
  return HAN_LANGUAGES.includes(base) ? base : null
}

/**
 * Which language a card's kanji are, or `null` when the card does not say.
 *
 * 学生 is the same three strokes in Japanese and Chinese, so the segmenter
 * cannot tell them apart and reads kanji-only text as Chinese (ADR-050). The
 * card can: a language the learner saved for either face, or kana anywhere on
 * it — a reading on the back is the usual case.
 *
 * @param {object} card
 * @param {{front?: object, back?: object}} [voiceSettings] — the deck's two sides.
 * @param {{flipped?: boolean}} [options] — whether the answer is showing.
 * @returns {'ja' | 'zh' | null}
 */
export function speechHintFor(card, voiceSettings = null, { flipped = false } = {}) {
  const showing = flipped ? voiceSettings?.back : voiceSettings?.front
  const other = flipped ? voiceSettings?.front : voiceSettings?.back
  const saved = savedHanLanguage(showing) || savedHanLanguage(other)
  if (saved) return saved

  if (!card) return null
  const options = Array.isArray(card.options) ? card.options : []
  return [frontText(card), backText(card), ...options].some((text) => KANA.test(String(text ?? ''))) ? 'ja' : null
}

/**
 * The language a card is IN, for the companion (CHAT-003, ADR-055).
 *
 * The prompt never said the deck was Japanese, so a model reading 効果 alone
 * answered in Chinese. The kanji rule above decides first; otherwise the
 * front's saved voice language, which is the side a language deck studies.
 *
 * @returns {string | null} a base code such as 'ja', 'es', or null.
 */
export function subjectLanguage(card, voiceSettings = null) {
  const han = speechHintFor(card, voiceSettings)
  if (han) return han
  const front = voiceSettings?.front
  return languageBase(front?.voiceLang ?? front?.voice_lang) || null
}

export default speechTextFor

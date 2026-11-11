/**
 * How many words a text has, in any script (ADR-064).
 *
 * The same rule as the API's `app/utils/word_count.py`, with the same test
 * vectors, so the count beside a document is the count the server enforces:
 *
 * - a token of a spaced script (Latin, Cyrillic, Arabic, Hangul …) is one word;
 * - a run of Han, Hiragana or Katakana is one word per two characters, rounded up;
 * - a run of Thai, Lao, Khmer or Myanmar letters is one word per four letters,
 *   rounded up, combining marks not counted;
 * - CJK and full-width punctuation separate words, as spaces do.
 *
 * Ranges are spelled out rather than written as `\p{Script=…}` so the phone's
 * engine and the browser read the same expression.
 */
export const CJK_CHARS_PER_WORD = 2
export const SEA_LETTERS_PER_WORD = 4

const CJK =
  '\\u3041-\\u3096\\u309d-\\u309f' + // Hiragana
  '\\u30a1-\\u30fa\\u30fc-\\u30ff' + // Katakana (not the middle dot U+30FB)
  '\\u31f0-\\u31ff' +
  '\\u3400-\\u4dbf\\u4e00-\\u9fff' + // CJK Unified Ideographs and Extension A
  '\\uf900-\\ufaff' +
  '\\uff66-\\uff9f' + // half-width Katakana
  '\\u{20000}-\\u{2ffff}' // Extensions B and beyond
const SEA = '\\u0e00-\\u0e7f\\u0e80-\\u0eff\\u1000-\\u109f\\u1780-\\u17ff'
const SEA_MARKS =
  '\\u0e31\\u0e34-\\u0e3a\\u0e47-\\u0e4e' +
  '\\u0eb1\\u0eb4-\\u0ebc\\u0ec8-\\u0ece' +
  '\\u102b-\\u103e\\u1056-\\u1059\\u105e-\\u1060\\u1062-\\u1064\\u1067-\\u106d\\u1071-\\u1074\\u1082-\\u108d\\u108f\\u109a-\\u109d' +
  '\\u17b4-\\u17d3\\u17dd'
const SEPARATORS =
  '\\u3000-\\u303f\\u30fb\\uff00-\\uff0f\\uff1a-\\uff20\\uff3b-\\uff40\\uff5b-\\uff65\\u0e2f\\u0e5a\\u0e5b\\u104a\\u104b\\u17d4-\\u17da'

const SEPARATOR = new RegExp(`[${SEPARATORS}]`, 'gu')
const UNSPACED = new RegExp(`[${CJK}${SEA}]`, 'u')
const RUN = new RegExp(`([${CJK}]+)|([${SEA}]+)|([^${CJK}${SEA}]+)`, 'gu')
const SEA_MARK = new RegExp(`[${SEA_MARKS}]`, 'gu')
// A letter or a digit of any script: what makes a run beside kana a word of its own.
const WORD_CHAR = /[\p{L}\p{N}]/u

const codePoints = (text) => Array.from(text).length

const mixedTokenWords = (token) => {
  let words = 0
  for (const match of token.matchAll(RUN)) {
    const [, cjk, sea, other] = match
    if (cjk) words += Math.ceil(codePoints(cjk) / CJK_CHARS_PER_WORD)
    else if (sea) words += Math.ceil(codePoints(sea.replace(SEA_MARK, '')) / SEA_LETTERS_PER_WORD)
    else if (other && WORD_CHAR.test(other)) words += 1
  }
  return words
}

/**
 * The number of words in `text`: exact for spaced scripts, an estimate for unspaced ones.
 * @param {string} text
 * @returns {number}
 */
export function countWords(text) {
  if (!text) return 0
  let total = 0
  for (const token of String(text).replace(SEPARATOR, ' ').split(/\s+/)) {
    if (!token) continue
    total += UNSPACED.test(token) ? mixedTokenWords(token) : 1
  }
  return total
}

/** Minutes to read `words` at the house pace, at least one for anything at all. */
export const WORDS_PER_MINUTE = 200
export const readingMinutes = (words) => (words > 0 ? Math.ceil(words / WORDS_PER_MINUTE) : 0)

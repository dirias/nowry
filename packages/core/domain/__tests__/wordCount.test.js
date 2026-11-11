import { countWords, readingMinutes } from '../text/wordCount'

// The contract shared with the API's tests/test_word_count.py. Change both.
const VECTORS = [
  ['', 0],
  ['  \n\t ', 0],
  ['The cell is the basic unit of life.', 8],
  ['word — word', 3],
  ['Tema 3: La célula', 4],
  ['세포는 생명의 기본 단위입니다.', 4],
  ['الخلية هي الوحدة الأساسية للحياة', 5],
  ['细胞是生命的基本单位。', 5],
  ['細胞は生命の基本単位です。ミトコンドリアはATPを産生します。', 14],
  ['DNAを含む', 3],
  ['・核:DNAを含む', 4],
  ['カタカナ ひらがな', 4],
  ['a　b', 2],
  ['เซลล์เป็นหน่วยพื้นฐานของชีวิต', 6],
  ['ສະບາຍດີ', 2],
  ['𠀋𠀋𠀋', 2],
  ['。、！？', 0]
]

describe('countWords (ADR-064)', () => {
  it.each(VECTORS)('%j → %i', (text, words) => {
    expect(countWords(text)).toBe(words)
  })

  it('counts spaced text exactly as splitting on spaces did', () => {
    const text = 'Año, niño — pingüino; 3.14 (x) ¿qué? e-mail  \n\n fin.'
    expect(countWords(text)).toBe(text.trim().split(/\s+/).length)
  })

  it('gives 600,000 Japanese characters a reading time in hours, not minutes', () => {
    const words = countWords('細胞は生命の基本単位です。'.repeat(46154))
    expect(words).toBeGreaterThan(250000)
    expect(readingMinutes(words)).toBeGreaterThan(1000)
    expect(readingMinutes(0)).toBe(0)
    expect(readingMinutes(1)).toBe(1)
  })

  it('takes null and undefined as nothing', () => {
    expect(countWords(null)).toBe(0)
    expect(countWords(undefined)).toBe(0)
  })
})

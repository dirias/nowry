import { backText, frontText, speechHintFor, speechTextFor } from '../cardSpeech'

describe('field names', () => {
  it('reads the web session, which holds title and content', () => {
    const card = { title: 'いぬ', content: 'dog' }
    expect(frontText(card)).toBe('いぬ')
    expect(backText(card)).toBe('dog')
  })

  it('reads the phone, whose list endpoint sends question and answer', () => {
    const card = { question: 'いぬ', answer: 'dog' }
    expect(frontText(card)).toBe('いぬ')
    expect(backText(card)).toBe('dog')
  })

  it('reads an imported card, which spells them front and back', () => {
    expect(frontText({ front: 'いぬ' })).toBe('いぬ')
    expect(backText({ back: 'dog' })).toBe('dog')
  })
})

describe('speechTextFor', () => {
  it('speaks the question face up and the answer face down', () => {
    const card = { title: 'いぬ', content: 'dog' }
    expect(speechTextFor(card)).toBe('いぬ')
    expect(speechTextFor(card, { flipped: true })).toBe('dog')
  })

  it('reads a quiz question with its options', () => {
    const card = { card_type: 'quiz', title: 'Which is a dog?', options: ['いぬ', 'ねこ'] }
    expect(speechTextFor(card)).toBe('Which is a dog?. いぬ, ねこ')
  })

  it('reads a quiz the same way once it is answered', () => {
    const card = { card_type: 'quiz', title: 'Which is a dog?', options: ['いぬ', 'ねこ'], content: 'いぬ' }
    expect(speechTextFor(card, { flipped: true })).toBe(speechTextFor(card))
  })

  it('drops the empty options a half-written quiz carries', () => {
    const card = { card_type: 'quiz', title: 'Which?', options: ['いぬ', '', null] }
    expect(speechTextFor(card)).toBe('Which?. いぬ')
  })

  it('says nothing for a quiz with no question', () => {
    expect(speechTextFor({ card_type: 'quiz', options: ['a', 'b'] })).toBe('')
  })

  it('says nothing for no card', () => {
    expect(speechTextFor(null)).toBe('')
    expect(speechTextFor(undefined, { flipped: true })).toBe('')
  })
})

describe('speechHintFor (ADR-050)', () => {
  const kanjiOnly = { title: '学生', content: 'student' }

  it('says nothing when the card and the deck say nothing', () => {
    expect(speechHintFor(kanjiOnly)).toBeNull()
    expect(speechHintFor(kanjiOnly, { front: { voiceLang: null }, back: { voiceLang: 'es-ES' } })).toBeNull()
  })

  it('takes the showing side first, then the other side', () => {
    const sides = { front: { voiceLang: 'zh-CN' }, back: { voiceLang: 'ja-JP' } }
    expect(speechHintFor(kanjiOnly, sides)).toBe('zh')
    expect(speechHintFor(kanjiOnly, sides, { flipped: true })).toBe('ja')
    expect(speechHintFor(kanjiOnly, { front: { voiceLang: 'ja-JP' }, back: { voiceLang: 'es-ES' } }, { flipped: true })).toBe('ja')
  })

  it('reads the backend spelling and Android underscores', () => {
    expect(speechHintFor(kanjiOnly, { front: { voice_lang: 'ja_JP' } })).toBe('ja')
  })

  it('falls back to kana anywhere on the card', () => {
    expect(speechHintFor({ title: '学生', content: 'がくせい' })).toBe('ja')
    expect(speechHintFor({ question: '学生', answer: 'student' })).toBeNull()
    expect(speechHintFor({ card_type: 'quiz', title: '学生?', options: ['がくせい', 'student'] })).toBe('ja')
  })

  it('lets a saved language outrank the card, so a Chinese deck stays Chinese', () => {
    expect(speechHintFor({ title: '学生', content: 'がくせい' }, { front: { voiceLang: 'zh-TW' } })).toBe('zh')
  })

  it('survives no card', () => {
    expect(speechHintFor(null)).toBeNull()
  })
})

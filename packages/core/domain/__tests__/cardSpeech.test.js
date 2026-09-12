import { backText, frontText, speechTextFor } from '../cardSpeech'

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

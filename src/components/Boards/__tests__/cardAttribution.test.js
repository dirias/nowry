/**
 * BOARD-006 — a generated card is given to the note it shares most words with.
 */
import { attributeCard, wordsOf } from '../cardAttribution'

const NOTES = [
  { id: 'light', text: 'Light reactions\nIn the thylakoids; make ATP and NADPH' },
  { id: 'calvin', text: 'Calvin cycle\nIn the stroma; fixes CO2 into sugar' },
  { id: 'stomata', text: 'Stomata\nPores that let CO2 in and water out' }
]

describe('wordsOf', () => {
  it('lower-cases, folds accents and keeps words of three letters or more', () => {
    expect([...wordsOf('Él FIXES the CO2, café!')]).toEqual(['fixes', 'the', 'co2', 'cafe'])
  })
})

describe('attributeCard', () => {
  it('gives a card to the note it shares most words with', () => {
    expect(attributeCard('Where do the light reactions happen? In the thylakoids.', NOTES)).toBe('light')
    expect(attributeCard('What does the Calvin cycle fix? Carbon dioxide into sugar, in the stroma.', NOTES)).toBe('calvin')
    expect(attributeCard('What are stomata? Pores that let water out.', NOTES)).toBe('stomata')
  })

  it('a tie, or no shared word, goes to the first note', () => {
    expect(attributeCard('Something else entirely', NOTES)).toBe('light')
    // "co2" is in both the Calvin and the stomata notes: the earlier one wins.
    expect(attributeCard('co2', NOTES)).toBe('calvin')
  })

  it('no notes, no source', () => {
    expect(attributeCard('anything', [])).toBeNull()
  })
})

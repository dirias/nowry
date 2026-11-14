/**
 * The orb draws the companion's real forms, everywhere (EVO-018).
 *
 * Every place the phone shows the companion goes through `PetOrb`: the
 * reveal, the level-up row, the chat, its settings, the bubble and the
 * session note. So the form is drawn there, once, and the companion can never
 * evolve into a form and then appear as a disc somewhere else. A portrait,
 * where there is one, still wins. Components are not rendered in this
 * project (jest.config.js), so the source is read.
 */
const fs = require('fs')
const path = require('path')

const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
const read = (...parts) => stripComments(fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8'))
const SRC = path.join(__dirname, '..', '..', '..')

const orb = read('PetOrb.js')
const reveal = read('EvolutionReveal.js')

describe('the orb wears Nowry as the real form', () => {
  it('draws the form where it used to draw the Spiral glyph', () => {
    expect(orb).toMatch(/<CompanionForm\b/)
    expect(orb).not.toMatch(/<CompanionMark\b/)
  })

  it("draws it in the stage's colour, from the accent", () => {
    expect(orb).toMatch(/<CompanionForm[^>]*stage=\{portrait\.stage\}[^>]*accent=\{accent\}/)
  })

  it('still lets a portrait win', () => {
    expect(orb).toMatch(/source \?/)
  })

  it('stands the form on paper, not on the accent it already wears', () => {
    expect(orb).toMatch(/wearsNowry \? resolveColor\(theme, 'background\.surface'\)/)
  })
})

describe('the reveal draws the form bare, as the approved artifact', () => {
  it('asks the orb for the form alone, with no disc or rings', () => {
    const orbs = reveal.match(/<PetOrb\b[^>]*>/g) ?? []
    expect(orbs.length).toBeGreaterThan(0)
    for (const tag of orbs) expect(tag).toMatch(/\bbare\b/)
  })
})

describe('nothing on the phone draws the companion except through the orb', () => {
  it('uses CompanionForm only inside the orb', () => {
    const users = []
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '__tests__' || entry.name === 'node_modules') continue
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (entry.name.endsWith('.js') && /<CompanionForm\b/.test(fs.readFileSync(full, 'utf8'))) users.push(path.basename(full))
      }
    }
    walk(SRC)
    expect(users).toEqual(['PetOrb.js'])
  })
})

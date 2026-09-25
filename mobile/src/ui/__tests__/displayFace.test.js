/**
 * The display face's boundary on the phone (DS-007B).
 *
 * The web gets this free: Joy resolves h1–h4 and display-* against the display
 * token and everything else against body. React Native has no such step, so
 * the same boundary is restated in `displayFace.js` — and a restated rule is
 * one that can drift, which is what these assert against.
 */
const fs = require('fs')
const path = require('path')

const { displayFamily, DISPLAY_FAMILIES } = require('../displayFace')
const { TYPE_LEVELS, FONT_WEIGHTS } = require('../typeLevels')

/** What a level renders at with no caller override. */
const own = (level) => Number(TYPE_LEVELS[level].fontWeight)

describe('which levels wear the display face', () => {
  it.each(['display-lg', 'display-md', 'h1', 'h2', 'h3', 'h4'])('%s does', (level) => {
    expect(displayFamily(level, own(level))).not.toBeNull()
  })

  it.each(['title-lg', 'title-md', 'title-sm', 'body-lg', 'body-md', 'body-sm', 'body-xs'])('%s does not', (level) => {
    expect(displayFamily(level, own(level))).toBeNull()
  })

  it('matches the web, where Joy draws the line at h4/title-lg', () => {
    // Stated as the pair either side of the boundary, so a change to one client
    // without the other fails here rather than in someone's eyes.
    expect(displayFamily('h4', own('h4'))).toBe('BricolageGrotesque-SemiBold')
    expect(displayFamily('title-lg', own('title-lg'))).toBeNull()
  })
})

describe('which file each weight resolves to', () => {
  it('sends 700 and above to Bold, and 600 to SemiBold', () => {
    expect(displayFamily('h1', 700)).toBe('BricolageGrotesque-Bold')
    expect(displayFamily('h1', 800)).toBe('BricolageGrotesque-Bold')
    expect(displayFamily('h3', 600)).toBe('BricolageGrotesque-SemiBold')
  })

  it('falls back to the platform face below 600 rather than drawing a heading too heavy', () => {
    // Only two weights ship. A heading asked to be 400 would otherwise come out
    // 200 heavier than requested, and nobody would trace that back to here.
    expect(displayFamily('h1', FONT_WEIGHTS.sm)).toBeNull()
    expect(displayFamily('h2', FONT_WEIGHTS.md)).toBeNull()
  })

  it('hands out exactly the families it declares, and no more', () => {
    const handedOut = new Set(['display-lg', 'display-md', 'h1', 'h2', 'h3', 'h4'].map((level) => displayFamily(level, own(level))))
    expect([...handedOut].sort()).toEqual([...DISPLAY_FAMILIES].sort())
  })

  it('has a font file registered for each one', () => {
    // displayFonts.js require()s binaries, so it cannot be imported here — its
    // source is read instead, the way screenChrome.test.js reads its subjects.
    const loader = fs.readFileSync(path.resolve(__dirname, '../displayFonts.js'), 'utf8')
    for (const family of DISPLAY_FAMILIES) {
      expect(loader).toContain(`'${family}': require(`)
      expect(fs.existsSync(path.resolve(__dirname, `../../../assets/fonts/${family}.ttf`))).toBe(true)
    }
    // And nothing else, so a stale registration cannot linger. Counts the
    // registration shape rather than the word `require`, which the file's own
    // comment also contains.
    expect((loader.match(/': require\(/g) ?? []).length).toBe(DISPLAY_FAMILIES.length)
  })
})

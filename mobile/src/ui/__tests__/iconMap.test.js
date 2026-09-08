/**
 * Every mapped icon must actually exist in lucide.
 *
 * This is the test that matters here. A name I remembered wrongly does not fail
 * loudly at build time — it renders nothing, in one place, on a device, and gets
 * found weeks later. So the map is checked against lucide's own exported names,
 * read from the package rather than from memory.
 */
import fs from 'fs'
import path from 'path'
import { KEY_TO_LUCIDE, MATERIAL_TO_LUCIDE, NAV_ICONS, NEEDS_A_DECISION } from '../icons/iconMap'

/**
 * lucide-react-native cannot be imported here — it pulls in react-native-svg,
 * which needs a device runtime. Its type declarations list every export, which
 * is the same information without the runtime.
 */
const lucideNames = () => {
  const decl = path.join(__dirname, '../../../node_modules/lucide-react-native/dist/types/icons.d.ts')
  const src = fs.readFileSync(decl, 'utf8')
  return new Set([...src.matchAll(/declare const ([A-Za-z0-9_]+):/g)].map((m) => m[1]))
}

describe('the Material to lucide map', () => {
  const names = lucideNames()

  it('reads a real icon set, not an empty one', () => {
    // Guards the test itself: an empty set would make every assertion below pass.
    expect(names.size).toBeGreaterThan(1000)
  })

  it('maps every icon to a name lucide actually exports', () => {
    const missing = Object.entries(MATERIAL_TO_LUCIDE).filter(([, target]) => !names.has(target))
    expect(missing).toEqual([])
  })

  it('resolves every icon key the shared modules hand out', () => {
    // cardTypes and useNextSteps return keys, never components (MOB-003B).
    const missing = Object.entries(KEY_TO_LUCIDE).filter(([, target]) => !names.has(target))
    expect(missing).toEqual([])
    expect(Object.keys(KEY_TO_LUCIDE)).toEqual(expect.arrayContaining(['cards', 'quiz', 'image', 'study', 'book', 'plan']))
  })

  it('resolves every tab bar icon', () => {
    // The tab bar has no Material counterpart — the web navigates with a header
    // — so these are named directly and still have to exist.
    const missing = Object.entries(NAV_ICONS).filter(([, target]) => !names.has(target))
    expect(missing).toEqual([])
    expect(Object.keys(NAV_ICONS)).toEqual(['home', 'study', 'focus', 'profile'])
  })

  it('lists what it cannot map instead of guessing', () => {
    // A wrong icon teaches the wrong thing quietly, which is worse than none.
    expect(Object.keys(NEEDS_A_DECISION).length).toBeGreaterThan(0)
    Object.entries(NEEDS_A_DECISION).forEach(([material, why]) => {
      expect(MATERIAL_TO_LUCIDE[material]).toBeUndefined()
      // Each entry says what it is for and what the candidates are.
      expect(why.length).toBeGreaterThan(40)
    })
  })

  it('never maps two Material names to contradictory ideas', () => {
    // The Rounded and non-Rounded variants of one icon must agree.
    Object.keys(MATERIAL_TO_LUCIDE)
      .filter((n) => n.endsWith('Rounded'))
      .forEach((rounded) => {
        const plain = rounded.replace(/Rounded$/, '')
        if (MATERIAL_TO_LUCIDE[plain]) {
          expect(MATERIAL_TO_LUCIDE[plain]).toBe(MATERIAL_TO_LUCIDE[rounded])
        }
      })
  })
})

/**
 * The registry is generated from the map, and must stay that way.
 *
 * It cannot be imported here — every entry pulls in react-native-svg — so it is
 * read as source. That is enough to check the two agree, which is the only
 * property that matters: an icon in the map but not the registry throws at
 * runtime, and one in the registry but not the map is dead weight in the bundle.
 */
import fs from 'fs'
import path from 'path'
import { MATERIAL_TO_LUCIDE, KEY_TO_LUCIDE, NAV_ICONS } from '../icons/iconMap'

const registrySource = () => fs.readFileSync(path.join(__dirname, '../icons/iconRegistry.js'), 'utf8')

const registryNames = () => {
  const src = registrySource()
  const block = src.slice(src.indexOf('export const ICONS = {'), src.indexOf('export const ICON_NAMES'))
  return new Set(
    block
      .split('\n')
      .map((l) => l.trim().replace(/,$/, ''))
      .filter((l) => /^[A-Z][A-Za-z0-9]*$/.test(l))
  )
}

describe('the icon registry', () => {
  it('carries exactly what the map asks for, and nothing more', () => {
    const wanted = new Set([...Object.values(MATERIAL_TO_LUCIDE), ...Object.values(KEY_TO_LUCIDE), ...Object.values(NAV_ICONS)])
    const registered = registryNames()

    // In the map but not registered: throws on a device.
    expect([...wanted].filter((n) => !registered.has(n))).toEqual([])
    // Registered but unwanted: dead weight in the bundle.
    expect([...registered].filter((n) => !wanted.has(n))).toEqual([])
  })

  it('imports each icon from its own module, which is what keeps the bundle small', () => {
    // Only real import statements — the file's own comment explains why a
    // namespace import is wrong, and matching that would be matching the
    // explanation rather than the code.
    const imports = registrySource()
      .split('\n')
      .filter((line) => line.startsWith('import '))

    // A namespace import cost 2.1MB; the package root did not tree-shake either.
    expect(imports.filter((l) => l.includes('* as'))).toEqual([])
    expect(imports.filter((l) => l.endsWith("from 'lucide-react-native'"))).toEqual([])

    const perIcon = imports.filter((l) => /from 'lucide-react-native\/icons\/[a-z0-9-]+'$/.test(l))
    expect(perIcon.length).toBe(registryNames().size)
  })

  it('imports each icon as a DEFAULT, because that is all lucide exports', () => {
    /*
     * The bug this exists for: every per-icon module ends with
     * `export { House as default }` and exports no named binding. A named
     * import compiles, bundles, and yields undefined at runtime — every icon
     * silently missing until the first one renders. It shipped once.
     *
     * The package itself is the evidence, so this cannot drift with a version.
     */
    const fixture = path.join(__dirname, '../../../node_modules/lucide-react-native/dist/esm/icons/house.mjs')
    expect(fs.readFileSync(fixture, 'utf8')).toMatch(/export \{ \w+ as default \}/)

    const imports = registrySource()
      .split('\n')
      .filter((line) => line.startsWith('import '))
    // `import X from '…'`, never `import { X } from '…'`.
    expect(imports.filter((l) => /^import \{/.test(l))).toEqual([])
    expect(imports.every((l) => /^import [A-Z][A-Za-z0-9]* from /.test(l))).toBe(true)
  })

  it('is generated, and says so', () => {
    expect(registrySource()).toMatch(/do not hand-edit/i)
  })
})

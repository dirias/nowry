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
import { MATERIAL_TO_LUCIDE, KEY_TO_LUCIDE } from '../icons/iconMap'

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
    const wanted = new Set([...Object.values(MATERIAL_TO_LUCIDE), ...Object.values(KEY_TO_LUCIDE)])
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

  it('is generated, and says so', () => {
    expect(registrySource()).toMatch(/do not hand-edit/i)
  })
})

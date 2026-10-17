/**
 * BOARD-003/004 — every key the boards pages and the canvas resolve exists in
 * all five locales. A missing key does not throw: i18next renders the key
 * path, so a German user would read "boards.bar.saved" in the bar. Keys are
 * read from the source, so a key added to a component and forgotten in a
 * bundle fails here.
 */
import fs from 'fs'
import path from 'path'
import de from '@nowry/core/locales/de/translation.json'
import en from '@nowry/core/locales/en/translation.json'
import es from '@nowry/core/locales/es/translation.json'
import fr from '@nowry/core/locales/fr/translation.json'
import ja from '@nowry/core/locales/ja/translation.json'
import { KEY_GROUPS } from '../canvas/KeysSheet'
import { BOARD_NOTE_COLORS } from '../canvas/noteColors'

const LOCALES = { en, de, es, fr, ja }
const ROOT = path.resolve(__dirname, '..')

const sources = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sources(full)
    return entry.name.endsWith('.js') ? [fs.readFileSync(full, 'utf8')] : []
  })

/** Literal keys in `t('…')` and in `'boards.…'` strings handed to a component. */
const literalKeys = () => {
  const found = new Set()
  sources(ROOT).forEach((text) => {
    for (const match of text.matchAll(/'(boards\.[A-Za-z0-9_.]+)'/g)) found.add(match[1])
  })
  return [...found]
}

/** The keys built from data: tools, colours, sizes, sides, item kinds, the save states and the key list. */
const builtKeys = () => [
  ...['select', 'hand', 'note', 'text', 'frame', 'item'].map((id) => `boards.tools.${id}`),
  ...BOARD_NOTE_COLORS.map((color) => `boards.selection.colors.${color}`),
  ...['md', 'lg', 'xl'].map((size) => `boards.selection.size.${size}`),
  ...['top', 'right', 'bottom', 'left'].map((side) => `boards.plus.${side}`),
  ...['task', 'milestone', 'goal'].map((kind) => `boards.item.kind.${kind}`),
  ...['task', 'milestone', 'goal'].map((kind) => `boards.picker.groups.${kind}`),
  ...['saving', 'saved', 'notSaved'].map((state) => `boards.bar.${state}`),
  ...KEY_GROUPS.map((group) => `boards.keys.groups.${group.id}`),
  ...KEY_GROUPS.flatMap((group) => group.rows.map(([row]) => `boards.keys.rows.${row}`)),
  ...['mod', 'space', 'tab', 'enter', 'esc', 'delete', 'drag', 'click', 'doubleClick', 'wheel', 'type'].map(
    (cap) => `boards.keys.cap.${cap}`
  ),
  'header.boards'
]

const resolve = (bundle, key) => key.split('.').reduce((node, part) => (node == null ? node : node[part]), bundle)

/** A counted key lives as its plural forms; Japanese has only `_other`. */
const has = (locale, key) => {
  const bundle = LOCALES[locale]
  if (typeof resolve(bundle, key) === 'string') return true
  const forms = locale === 'ja' ? ['_other'] : ['_one', '_other']
  return forms.every((suffix) => typeof resolve(bundle, `${key}${suffix}`) === 'string')
}

describe('boards locale keys', () => {
  const keys = [...new Set([...literalKeys(), ...builtKeys()])].sort()

  it('finds the keys it guards', () => {
    expect(keys.length).toBeGreaterThan(100)
  })

  it.each(Object.keys(LOCALES))('%s has every key the boards surfaces use', (locale) => {
    expect(keys.filter((key) => !has(locale, key))).toEqual([])
  })
})

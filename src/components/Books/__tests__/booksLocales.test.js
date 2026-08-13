import de from '../../../locales/de/translation.json'
import en from '../../../locales/en/translation.json'
import es from '../../../locales/es/translation.json'
import fr from '../../../locales/fr/translation.json'
import ja from '../../../locales/ja/translation.json'

/**
 * FE-B5 — the books form keys, guarded in all five locales.
 *
 * A missing key does not throw: i18next renders the key path, so a German user
 * reads "books.createAction" on the primary button. This is the only place that
 * is caught before a user finds it.
 *
 * Scoped to the keys the form surfaces consume rather than to the whole `books`
 * namespace. The namespace has substantial pre-existing gaps in de, fr and ja —
 * roughly thirty keys around the library, the dropzone and the delete
 * confirmation — which predate this phase and are logged rather than silently
 * widened here.
 */
const LOCALES = { en, de, es, fr, ja }
const NON_ENGLISH = ['de', 'es', 'fr', 'ja']

/** Every key BookCreateSheet, BookEditSheet and the cover field resolve. */
const FORM_KEYS = [
  'untitled',
  'createTitle',
  'createAction',
  'setAuthor',
  'authorLabel',
  'authorPlaceholder',
  'createFailed',
  'editTitle',
  'titleLabel',
  'titleRequired',
  'changeCover',
  'addTags',
  'addSummary',
  'coverColorLabel',
  'coverImageLabel',
  'coverImagePlaceholder',
  'coverImageAlt',
  'coverImageError',
  'customColor',
  'summaryLabel',
  'saveFailed',
  'publishFailed',
  'unpublishFailed'
]

/** Keys the library surface resolves, added or repaired by this phase. */
const LIBRARY_KEYS = [
  'importSuccessTitle',
  'openBook',
  'continueToLibrary',
  'clearFilters',
  'errorFetch',
  'errorImport',
  'unknownAuthor',
  'pageCount_one',
  'pageCount_other'
]

const COLOR_KEYS = ['blue', 'red', 'green', 'orange', 'purple', 'pink', 'black', 'grey']

const ALL = [...FORM_KEYS, ...LIBRARY_KEYS]

describe('the books form namespace', () => {
  it('resolves every key the surfaces ask for, in every locale', () => {
    Object.entries(LOCALES).forEach(([name, bundle]) => {
      const missing = ALL.filter((key) => typeof bundle.books?.[key] !== 'string' || !bundle.books[key].trim())
      expect({ locale: name, missing }).toEqual({ locale: name, missing: [] })
    })
  })

  it('names all eight cover colours, since a swatch has no other signal', () => {
    Object.entries(LOCALES).forEach(([name, bundle]) => {
      const missing = COLOR_KEYS.filter((key) => !bundle.books?.coverColors?.[key]?.trim())
      expect({ locale: name, missing }).toEqual({ locale: name, missing: [] })
    })
  })

  it('carries the editor placeholders the edit sheet reuses', () => {
    Object.entries(LOCALES).forEach(([name, bundle]) => {
      expect({ locale: name, title: Boolean(bundle.books?.editor?.titlePlaceholder) }).toEqual({ locale: name, title: true })
      expect({ locale: name, summary: Boolean(bundle.books?.editor?.summaryPlaceholder) }).toEqual({ locale: name, summary: true })
    })
  })

  it('is actually translated — no locale simply copies the English string', () => {
    // A URL example is the same everywhere by design, and French happens to
    // write "{{count}} page(s)" with the same two words English does.
    const legitimatelyShared = { coverImagePlaceholder: NON_ENGLISH, pageCount_one: ['fr'], pageCount_other: ['fr'] }
    NON_ENGLISH.forEach((name) => {
      const copied = ALL.filter((key) => !legitimatelyShared[key]?.includes(name) && LOCALES[name].books[key] === en.books[key])
      expect({ locale: name, copied }).toEqual({ locale: name, copied: [] })
    })
  })

  it('uses i18next v4 plural suffixes for the page count', () => {
    Object.entries(LOCALES).forEach(([name, bundle]) => {
      expect({ locale: name, one: bundle.books.pageCount_one, other: bundle.books.pageCount_other }).toEqual({
        locale: name,
        one: expect.stringContaining('{{count}}'),
        other: expect.stringContaining('{{count}}')
      })
    })
  })

  it('keeps `untitled` a single key — the placeholder cannot drift from the saved value', () => {
    // BookCreateSheet uses `books.untitled` for both. A second placeholder key
    // could diverge in one locale and then lie about what Enter produces.
    Object.values(LOCALES).forEach((bundle) => {
      expect(bundle.books.untitledPlaceholder).toBeUndefined()
    })
  })

  it('writes no database value through the locale files', () => {
    // isbn and author are data, not copy. If a key for either ever appears,
    // someone has started translating a column value.
    Object.values(LOCALES).forEach((bundle) => {
      expect(bundle.books.isbn).toBeUndefined()
      expect(bundle.books.isbnUnknown).toBeUndefined()
      expect(bundle.books.authorUnknown).toBeUndefined()
    })
  })
})

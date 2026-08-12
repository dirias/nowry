import de from '../../../../locales/de/translation.json'
import en from '../../../../locales/en/translation.json'
import es from '../../../../locales/es/translation.json'
import fr from '../../../../locales/fr/translation.json'
import ja from '../../../../locales/ja/translation.json'

/**
 * FE-C6 — the card-authoring namespaces, guarded in all five locales.
 *
 * Twenty-five user-facing strings were shipping as English literals inside the
 * three card modals, so four of five locales rendered an English form. A
 * missing key does not throw — i18next renders the key path — which means the
 * only place that is caught before a user sees "cards.quiz.addOption" on a
 * button is here.
 */
const LOCALES = { en, de, es, fr, ja }
const NON_ENGLISH = ['de', 'es', 'fr', 'ja']
const GROUPS = ['flashcard', 'quiz', 'visual', 'common']

/**
 * Keys a given locale legitimately writes exactly as English: Mermaid source,
 * loanwords, and words French and English happen to share.
 */
const SHARED_WITH_ENGLISH = {
  'visual.codePlaceholder': ['de', 'es', 'fr', 'ja'],
  'visual.tabCode': ['de', 'fr'],
  'visual.descriptionLabel': ['fr'],
  'quiz.questionLabel': ['fr'],
  'common.typeQuiz': ['de', 'fr'],
  'common.typeVisual': ['es']
}

/** Only the keys this ticket added — the surrounding namespace predates it. */
const ADDED = {
  flashcard: ['createTitle', 'editTitle', 'frontLabel', 'backLabel', 'frontRequired', 'backRequired'],
  quiz: [
    'createTitle',
    'editTitle',
    'questionLabel',
    'optionsLabel',
    'optionsAria',
    'addOption',
    'correctAria',
    'removeOptionAria',
    'questionRequired',
    'needTwoOptions',
    'needCorrectAnswer',
    'optionRemoved',
    'undoRemove',
    'addExplanation',
    'explanationLabel'
  ],
  visual: [
    'createTitle',
    'editTitle',
    'titleLabel',
    'titlePlaceholder',
    'titleRequired',
    'codeLabel',
    'codeRequired',
    'codePlaceholder',
    'syntaxError',
    'previewEmpty',
    'tabCode',
    'tabPreview',
    'previewOkAria',
    'previewErrorAria',
    'mermaidLink',
    'addDescription',
    'descriptionLabel'
  ],
  common: ['addTags', 'chooseDeck', 'typeFlashcard', 'typeQuiz', 'typeVisual', 'typeSelectorAria', 'switchTypeWarning', 'switchTypeConfirm']
}

const eachAddedKey = (visit) => {
  GROUPS.forEach((group) => ADDED[group].forEach((key) => visit(group, key)))
}

describe('cards.* card-authoring keys', () => {
  it('exists in every locale', () => {
    Object.entries(LOCALES).forEach(([name, bundle]) => {
      GROUPS.forEach((group) => {
        expect({ name, group, type: typeof bundle.cards[group] }).toEqual({ name, group, type: 'object' })
      })
    })
  })

  it('carries every added key in every locale, with no empty value', () => {
    const missing = []
    Object.keys(LOCALES).forEach((name) => {
      eachAddedKey((group, key) => {
        const value = LOCALES[name].cards[group][key]
        if (typeof value !== 'string' || value.trim() === '') missing.push(`${name}.${group}.${key}`)
      })
    })
    expect(missing).toEqual([])
  })

  it('leaves no key the English bundle carries and a translation does not, apart from the ones §11.3 retires', () => {
    // The retired set still ships in the three modals this ticket has not yet
    // deleted; the group-set equality assertion lands with their removal.
    const retiring = new Set(['tagsPlaceholder', 'deckPlaceholder', 'saveChanges', 'createButton', 'chipLabel', 'diagramTitleLabel'])
    GROUPS.forEach((group) => {
      const expected = Object.keys(en.cards[group])
        .filter((key) => !retiring.has(key))
        .sort()
      NON_ENGLISH.forEach((name) => {
        const actual = Object.keys(LOCALES[name].cards[group])
          .filter((key) => !retiring.has(key))
          .sort()
        expect({ name, group, keys: actual }).toEqual({ name, group, keys: expected })
      })
    })
  })

  it('is actually translated — no locale silently ships the English string', () => {
    NON_ENGLISH.forEach((name) => {
      const copied = []
      eachAddedKey((group, key) => {
        const allowed = SHARED_WITH_ENGLISH[`${group}.${key}`] || []
        if (allowed.includes(name)) return
        if (LOCALES[name].cards[group][key] === en.cards[group][key]) copied.push(`${group}.${key}`)
      })
      expect({ name, copied }).toEqual({ name, copied: [] })
    })
  })

  it('keeps every interpolation placeholder intact across locales', () => {
    const placeholders = (value) => (String(value).match(/{{\s*\w+\s*}}/g) || []).sort()
    eachAddedKey((group, key) => {
      NON_ENGLISH.forEach((name) => {
        expect({ name, key, at: placeholders(LOCALES[name].cards[group][key]) }).toEqual({
          name,
          key,
          at: placeholders(en.cards[group][key])
        })
      })
    })
  })

  it('uses i18next v4 plural suffixes, never the deprecated _plural', () => {
    Object.values(LOCALES).forEach((bundle) => {
      GROUPS.forEach((group) => {
        expect(Object.keys(bundle.cards[group]).filter((key) => key.endsWith('_plural'))).toEqual([])
      })
    })
  })

  it('reuses the shared strings rather than minting card-local duplicates', () => {
    // §13 rules out a second Cancel/Save/Close, and the tag and deck copy the
    // primitives own already ships in form.*.
    Object.values(LOCALES).forEach((bundle) => {
      expect(bundle.cards.common.cancel).toBeUndefined()
      expect(bundle.cards.common.save).toBeUndefined()
      expect(bundle.cards.common.tagPlaceholder).toBeUndefined()
      expect(bundle.common.cancel).toBeTruthy()
      expect(bundle.form.tagPlaceholder).toBeTruthy()
    })
  })
})

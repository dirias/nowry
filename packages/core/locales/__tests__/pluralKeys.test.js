/**
 * A string whose `{{count}}` governs a noun is a plural key.
 *
 * Spanish read "1 mazos", "1 repasadas" and "1 pendiente" for twenty; French
 * read "1 nouveau" for twenty; and two strings had been worked around inside
 * the translation itself — "Racha de {{count}} día(s)", "{{count}} revisada(s)
 * hoy". Every one of those is a single string with a `{{count}}` in it, which
 * i18next renders identically whatever the number is (MOB-064).
 *
 * **The rule is not "every `{{count}}` is a plural key".** Sixty-six strings
 * carry one and most of them are fine: a control's label does not agree with a
 * badge on it ("Tags · 2"), an abbreviation does not inflect ("3d ago"), and a
 * count beside a fixed heading governs nothing ("Decks (4)"). What decides it
 * is whether a word IN THE SAME CLAUSE has to agree with the number.
 *
 * So this suite forces the judgement to be made once and written down. Every
 * `en` string containing `{{count}}` must either carry `_one`/`_other` forms or
 * appear below with a reason. A new one does neither, and fails here rather
 * than shipping "1 mazos" to a user.
 */
import en from '../en/translation.json'

const flatten = (node, prefix = '') =>
  Object.entries(node).reduce((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return value && typeof value === 'object' ? { ...acc, ...flatten(value, path) } : { ...acc, [path]: value }
  }, {})

const FLAT = flatten(en)

/**
 * Strings where `{{count}}` governs nothing, grouped by why.
 *
 * Each of these was read against its Spanish, French and German values before
 * it was listed; none of them inflects in any of the three.
 */
const GOVERNS_NOTHING = {
  /*
   * A control's own name, with a count appended as its readout. "Tags" is what
   * the control IS; the 2 beside it does not make it plural, and at one tag it
   * still reads "Tags · 1" on every surface and in every language.
   */
  'a label with its readout': [
    'groups.study',
    'study.today.study',
    'study.today.quick',
    'filters.typeReadout',
    'filters.tagsReadout',
    'books.lib.tagsReadout',
    'cards.session.filters.tagsSelected',
    'calendarPage.filters.typesSelected',
    'calendarPage.filters.areasSelected',
    'cards.studyDue',
    'cards.studyTotal',
    'cards.manage_content.tabs.decks',
    'cards.manage_content.tabs.cards',
    'cards.session.markFilter.label',
    'annualPlanning.priority.filterAll',
    'annualPlanning.priority.showAll',
    'annualPlanning.priority.showInactive',
    'annualPlanning.quarterReport.booksFinished',
    'annualPlanning.reports.snapshots',
    'comments.unanchoredGroupTitle',
    'settings.productivity.recommendedMinutes',
    'sessions.totalCount'
  ],

  /*
   * An abbreviation or a unit. "3d", "5 min", "12 XP" — the short form does not
   * inflect in any of the four, which is the same reason `study.dates.minutes`
   * is recorded as identical by design in Spanish and French.
   */
  'an abbreviation or a unit': [
    'study.dates.daysAgo',
    'study.dates.weeksAgo',
    'comments.time.minutesAgo',
    'comments.time.hoursAgo',
    'comments.time.daysAgo',
    'agent.settings.xpToNextLevel'
  ],

  /*
   * "more", "total", "of {{total}}" — the number stands alone and the words
   * around it are invariant.
   */
  'a bare quantity': ['groups.showMore', 'study.sections.showAll', 'comments.moreNotes', 'sessions.loadMore', 'public.showingOf'],

  /*
   * The noun agrees with a DIFFERENT number in the same string — the limit, the
   * total, the three. i18next selects on `count` alone, so a plural form here
   * would inflect on the wrong axis and be wrong more often than the single
   * string is. Recorded rather than half-fixed.
   */
  'the noun agrees with another number': [
    'books.lib.limitReadout',
    'aiMagic.streaming.progress',
    'pomodoro.cycleProgress',
    'pomodoro.status.breakQueued',
    'bugs.modal.screenshotsHint'
  ]
}

const EXEMPT = new Set(Object.values(GOVERNS_NOTHING).flat())

const COUNTED = Object.keys(FLAT).filter(
  (key) => !key.endsWith('_one') && !key.endsWith('_other') && typeof FLAT[key] === 'string' && FLAT[key].includes('{{count}}')
)

describe('every counted string is a plural key or is exempt with a reason', () => {
  it.each(COUNTED.sort())('%s', (key) => {
    const pluralised = `${key}_one` in FLAT && `${key}_other` in FLAT
    const verdict = pluralised || EXEMPT.has(key)
    expect(
      verdict ? key : `${key} — "${FLAT[key]}" carries {{count}}. Give it _one/_other forms, or list it in GOVERNS_NOTHING with why.`
    ).toBe(key)
  })

  it('exempts nothing it cannot point at', () => {
    expect([...EXEMPT].filter((key) => !(key in FLAT)).sort()).toEqual([])
  })

  it('exempts nothing that is already pluralised', () => {
    expect([...EXEMPT].filter((key) => `${key}_one` in FLAT).sort()).toEqual([])
  })

  it('was actually reading the bundle', () => {
    expect(COUNTED.length + Object.keys(FLAT).filter((key) => key.endsWith('_one')).length).toBeGreaterThan(20)
  })
})

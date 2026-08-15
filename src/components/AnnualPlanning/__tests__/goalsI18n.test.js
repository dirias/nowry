/**
 * FE-6 — i18n parity for the Goals redesign (UX-CONTRACT §9).
 *
 * Guards the property that actually breaks in production: a key that exists in
 * `en` and silently falls back to English everywhere else. Every key the
 * redesigned surfaces touch must resolve in all five locales, with no English
 * left behind in the non-`en` files.
 */
const LOCALES = ['en', 'de', 'es', 'fr', 'ja']

const translations = LOCALES.reduce((acc, locale) => {
  acc[locale] = require(`../../../locales/${locale}/translation.json`)
  return acc
}, {})

const get = (tree, dotted) => dotted.split('.').reduce((node, key) => (node == null ? node : node[key]), tree)

/**
 * A locale only owes the plural forms its own CLDR rules can select. Japanese
 * has a single `other` category, so `_one` is not a gap there — it is a key
 * i18next can never reach. ONB-015 dropped those from the `ja` bundle; the rule
 * itself lives in `src/locales/__tests__/localeCoverage.test.js`.
 */
const PLURAL_CATEGORIES = LOCALES.reduce((acc, locale) => {
  acc[locale] = new Set(new Intl.PluralRules(locale).resolvedOptions().pluralCategories)
  return acc
}, {})

const owes = (locale, key) => {
  const suffix = /_(zero|one|two|few|many|other)$/.exec(key)
  return !suffix || PLURAL_CATEGORIES[locale].has(suffix[1])
}

/** Every key the redesigned goal surfaces resolve at runtime. */
const REQUIRED_KEYS = [
  // §9.1 — new
  'annualPlanning.goal.healthStatus.notStarted',
  'annualPlanning.goal.next.completed',
  'annualPlanning.goal.next.label',
  'annualPlanning.goal.next.overdue',
  'annualPlanning.goal.next.readyToComplete',
  'annualPlanning.goal.next.addMilestone',
  'annualPlanning.goal.next.toggleAria',
  'annualPlanning.goal.milestoneCount_one',
  'annualPlanning.goal.milestoneCount_other',
  'annualPlanning.goal.daysLeftShort_one',
  'annualPlanning.goal.daysLeftShort_other',
  'annualPlanning.goal.moreActions',
  'annualPlanning.goal.openDetail',
  'annualPlanning.goal.markComplete',
  'annualPlanning.goal.reopen',
  'annualPlanning.goal.lockedAction',
  'annualPlanning.goal.detail.milestones',
  'annualPlanning.goal.detail.lifecycleLabel',
  'annualPlanning.goal.detail.noDescription',
  'annualPlanning.goal.statusUpdateError',
  'annualPlanning.goal.milestoneUpdateError',
  'annualPlanning.goals.loadingAria',
  'dashboard.annualGoals.loadingAria',
  // §9.2 — reused, and therefore equally load-bearing
  'annualPlanning.goal.healthStatus.onTrack',
  'annualPlanning.goal.healthStatus.atRisk',
  'annualPlanning.goal.healthStatus.behind',
  'annualPlanning.goal.healthStatus.completed',
  'annualPlanning.goal.status.notStarted',
  'annualPlanning.goal.status.inProgress',
  'annualPlanning.goal.status.completed',
  'annualPlanning.goal.percentComplete',
  'annualPlanning.goal.progress',
  'annualPlanning.goal.edit',
  'annualPlanning.goal.delete',
  'annualPlanning.goal.description',
  'annualPlanning.goal.activities',
  'annualPlanning.goal.activitiesError',
  'annualPlanning.goal.noMilestones',
  'annualPlanning.goal.deleteConfirm.title',
  'annualPlanning.goal.deleteConfirm.description',
  'annualPlanning.goal.completionBlockedTitle',
  'annualPlanning.goal.completionBlockedBody',
  'annualPlanning.milestone.locked',
  'annualPlanning.activity.frequencies.daily',
  'annualPlanning.activity.frequencies.weekly',
  'annualPlanning.activity.frequencies.custom',
  'annualPlanning.goals.quarterEmptyTitle',
  'annualPlanning.goals.quarterEmptyBody',
  'annualPlanning.goals.quarterEmptyCta',
  'annualPlanning.tabs.goalsEmptyTitle',
  'annualPlanning.tabs.goalsEmptyBody',
  'annualPlanning.tabs.gridView',
  'annualPlanning.tabs.listView',
  'dashboard.annualGoals.title',
  'dashboard.annualGoals.noGoals',
  'dashboard.annualGoals.createGoal',
  'dashboard.annualGoals.viewFullPlan',
  'common.close',
  'common.retry',
  // goal-form-redesign §13.1 — the title-first form
  'annualPlanning.goal.titleRequired',
  'annualPlanning.goal.detailRailAria',
  'annualPlanning.goal.addMilestones',
  'annualPlanning.goal.addDescription',
  'annualPlanning.goal.addTargetDate',
  'annualPlanning.goal.addImage',
  'annualPlanning.goal.changeTimeframe',
  'annualPlanning.goal.keyResultsHelper',
  'annualPlanning.goal.addMilestoneButton',
  'annualPlanning.goal.milestoneToggleAria',
  'annualPlanning.goal.milestoneTitleAria',
  'annualPlanning.goal.milestoneDueDateAria',
  'annualPlanning.goal.milestoneClearDateAria',
  'annualPlanning.goal.milestoneDeleteAria',
  'annualPlanning.goal.milestoneNoDate',
  'annualPlanning.goal.milestoneNumber',
  'annualPlanning.goal.milestonePlaceholder',
  'annualPlanning.goal.imageHelper',
  'annualPlanning.goal.imageUrlPlaceholder',
  'annualPlanning.goal.imagePreviewAlt',
  'annualPlanning.goal.imagePreviewError',
  'annualPlanning.goal.scopeQuarterly',
  'annualPlanning.goal.scopeYearly',
  'annualPlanning.goal.parentFallback',
  'annualPlanning.goal.parentPlaceholder',
  'annualPlanning.goal.timeframeYearly',
  'annualPlanning.goal.timeframeQ1',
  'annualPlanning.goal.timeframeQ2',
  'annualPlanning.goal.timeframeQ3',
  'annualPlanning.goal.timeframeQ4',
  'annualPlanning.goal.saveError',
  // Pre-existing form keys that were missing from de/es/fr and silently fell
  // back to English inside the redesigned dialog. Guarded so they cannot lapse.
  'annualPlanning.goal.titlePlaceholder',
  'annualPlanning.goal.descriptionPlaceholder',
  'annualPlanning.goal.editSubtitle',
  'annualPlanning.goal.keyResultsTitle',
  'annualPlanning.goal.linkToObjective',
  'annualPlanning.goal.timeframeQuestion',
  'annualPlanning.goal.saveGoal',
  'annualPlanning.goal.updateGoal',
  'annualPlanning.goal.targetDate',
  'annualPlanning.goal.imageUrl',
  'annualPlanning.goal.title',
  'annualPlanning.goal.add',
  'common.cancel'
]

/** §9.4 — keys whose UI no longer exists. */
const RETIRED_KEYS = [
  'annualPlanning.milestone.label',
  'annualPlanning.goal.noActivities',
  // goal-form-redesign §13.3 — habit authoring left the goal form
  'annualPlanning.goal.habits',
  'annualPlanning.goal.habitPlaceholder'
]

describe.each(LOCALES)('%s locale', (locale) => {
  it('resolves every key the goal surfaces use', () => {
    const missing = REQUIRED_KEYS.filter((key) => owes(locale, key) && get(translations[locale], key) === undefined)
    expect(missing).toEqual([])
  })

  it('has no empty string standing in for a translation', () => {
    const blank = REQUIRED_KEYS.filter((key) => owes(locale, key) && String(get(translations[locale], key) ?? '').trim() === '')
    expect(blank).toEqual([])
  })

  it('no longer carries the retired keys', () => {
    const surviving = RETIRED_KEYS.filter((key) => get(translations[locale], key) !== undefined)
    expect(surviving).toEqual([])
  })

  it('preserves every interpolation placeholder the code passes', () => {
    const placeholders = {
      'annualPlanning.goal.next.label': ['{{title}}'],
      'annualPlanning.goal.next.overdue': ['{{title}}'],
      'annualPlanning.goal.next.toggleAria': ['{{title}}'],
      'annualPlanning.goal.moreActions': ['{{title}}'],
      'annualPlanning.goal.openDetail': ['{{title}}'],
      'annualPlanning.goal.milestoneCount_one': ['{{completed}}', '{{total}}'],
      'annualPlanning.goal.milestoneCount_other': ['{{completed}}', '{{total}}'],
      'annualPlanning.goal.daysLeftShort_one': ['{{count}}'],
      'annualPlanning.goal.daysLeftShort_other': ['{{count}}'],
      'annualPlanning.goal.percentComplete': ['{{percent}}'],
      'annualPlanning.goal.milestoneToggleAria': ['{{title}}'],
      'annualPlanning.goal.milestoneTitleAria': ['{{index}}'],
      'annualPlanning.goal.milestoneDueDateAria': ['{{title}}'],
      'annualPlanning.goal.milestoneClearDateAria': ['{{title}}'],
      'annualPlanning.goal.milestoneDeleteAria': ['{{title}}'],
      'annualPlanning.goal.milestoneNumber': ['{{index}}'],
      'annualPlanning.goal.scopeQuarterly': ['{{quarter}}']
    }
    Object.entries(placeholders)
      .filter(([key]) => owes(locale, key))
      .forEach(([key, tokens]) => {
        const value = get(translations[locale], key)
        tokens.forEach((token) => expect(`${locale} ${key}: ${value}`).toContain(token))
      })
  })
})

describe('no English left behind in the translated locales', () => {
  // Keys whose English is genuinely distinctive — a non-en locale repeating the
  // English string verbatim means the translation was never supplied.
  const MUST_DIFFER = [
    'annualPlanning.goal.healthStatus.notStarted',
    'annualPlanning.goal.next.readyToComplete',
    'annualPlanning.goal.next.addMilestone',
    'annualPlanning.goal.next.toggleAria',
    'annualPlanning.goal.moreActions',
    'annualPlanning.goal.markComplete',
    'annualPlanning.goal.reopen',
    'annualPlanning.goal.lockedAction',
    'annualPlanning.goal.detail.noDescription',
    'annualPlanning.goal.statusUpdateError',
    'annualPlanning.goal.milestoneUpdateError',
    'annualPlanning.goals.loadingAria',
    'dashboard.annualGoals.noGoals',
    'dashboard.annualGoals.viewFullPlan',
    'annualPlanning.goal.titleRequired',
    'annualPlanning.goal.detailRailAria',
    'annualPlanning.goal.addMilestones',
    'annualPlanning.goal.addDescription',
    'annualPlanning.goal.addTargetDate',
    'annualPlanning.goal.addImage',
    'annualPlanning.goal.changeTimeframe',
    'annualPlanning.goal.keyResultsHelper',
    'annualPlanning.goal.imageHelper',
    'annualPlanning.goal.imagePreviewAlt',
    'annualPlanning.goal.imagePreviewError',
    'annualPlanning.goal.parentFallback',
    'annualPlanning.goal.parentPlaceholder',
    'annualPlanning.goal.noMilestones',
    'annualPlanning.goal.milestonePlaceholder',
    'annualPlanning.goal.titlePlaceholder',
    'annualPlanning.goal.descriptionPlaceholder',
    'annualPlanning.goal.editSubtitle',
    'annualPlanning.goal.keyResultsTitle',
    'annualPlanning.goal.linkToObjective',
    'annualPlanning.goal.timeframeQuestion',
    'annualPlanning.goal.saveGoal',
    'annualPlanning.goal.updateGoal'
  ]

  it.each(['de', 'es', 'fr', 'ja'])('%s translates them rather than echoing en', (locale) => {
    const echoed = MUST_DIFFER.filter((key) => get(translations[locale], key) === get(translations.en, key))
    expect(echoed).toEqual([])
  })
})

describe('§9.3 copy fix — percentComplete is sentence case', () => {
  it('en no longer Title Cases "Complete"', () => {
    expect(get(translations.en, 'annualPlanning.goal.percentComplete')).toBe('{{percent}}% complete')
  })

  it.each(LOCALES)('%s carries the fixed string', (locale) => {
    expect(get(translations[locale], 'annualPlanning.goal.percentComplete')).not.toMatch(/% Complete/)
  })
})

/**
 * ADR-004 §6 — habit authoring left the goal form and nowhere else. These keys
 * belong to surfaces the cut must not reach: the CAL-03 Calendar filter chip and
 * the goal detail drawer's activities section. A future cleanup pass that greps
 * for "habit" and deletes matches would break both.
 */
describe('the habits cut stayed inside the goal form', () => {
  it.each(LOCALES)('%s keeps the drawer activity keys', (locale) => {
    expect(get(translations[locale], 'annualPlanning.goal.activities')).toBeDefined()
    expect(get(translations[locale], 'annualPlanning.goal.activitiesError')).toBeDefined()
  })

  it('keeps the CAL-03 Calendar habits filter chip label', () => {
    expect(get(translations.en, 'calendarModal.filters.habits')).toBeDefined()
  })

  it('drops the emoji from the timeframe options (§13.4 wins over §8.5)', () => {
    LOCALES.forEach((locale) => {
      const yearly = get(translations[locale], 'annualPlanning.goal.timeframeYearly')
      expect(`${locale}: ${yearly}`).not.toMatch(/\p{Extended_Pictographic}/u)
    })
  })
})

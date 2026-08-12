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
  'common.retry'
]

/** §9.4 — keys whose UI no longer exists. */
const RETIRED_KEYS = ['annualPlanning.milestone.label', 'annualPlanning.goal.noActivities']

describe.each(LOCALES)('%s locale', (locale) => {
  it('resolves every key the goal surfaces use', () => {
    const missing = REQUIRED_KEYS.filter((key) => get(translations[locale], key) === undefined)
    expect(missing).toEqual([])
  })

  it('has no empty string standing in for a translation', () => {
    const blank = REQUIRED_KEYS.filter((key) => String(get(translations[locale], key) ?? '').trim() === '')
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
      'annualPlanning.goal.percentComplete': ['{{percent}}']
    }
    Object.entries(placeholders).forEach(([key, tokens]) => {
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
    'dashboard.annualGoals.viewFullPlan'
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

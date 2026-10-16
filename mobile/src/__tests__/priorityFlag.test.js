/**
 * Priority is a flag, not an object (ADR-046 §5, PLAN-013).
 *
 * A priority used to be a document the learner created, edited, reordered and
 * chose four of for Home. It is now `is_priority` on a task or a milestone, and
 * the lists read the flag. The shared package already dropped the writers; what
 * this reads is that the PHONE stopped calling them, and that the three places
 * a priority row is acted on go through the two writes a flag allows — done,
 * and the flag off — addressed at the item the flag sits on.
 *
 * There is no rendered-component project here (see `jest.config.js`), so the
 * screens are read as source, the way the rule suites beside this one read them.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'node_modules' || entry.name === '__tests__' ? [] : walk(full)
    return entry.name.endsWith('.js') ? [full] : []
  })

/** Prose in a comment may name the old world; code may not. */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const source = (relative) => code(fs.readFileSync(path.join(ROOT, relative), 'utf8'))

const clientFiles = [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'src'))].map((file) => path.relative(ROOT, file))

/** The writers and the chosen list that went with the Priority object. */
const RETIRED = ['updatePriority', 'createPriority', 'deletePriority', 'reorderPriorities', 'preferredPriorityIds', 'homepage_priority_ids']

describe('nothing on the phone still writes a Priority object', () => {
  it.each(clientFiles)('%s', (relative) => {
    const text = source(relative)
    expect(RETIRED.filter((name) => text.includes(name))).toEqual([])
  })
})

describe("Home's band", () => {
  const home = source('app/(tabs)/index.js')

  it('watches the flagged items by their own rule, with no chosen list', () => {
    expect(home).toMatch(/watchedPriorities\(plan\.priorities,\s*plan\.goals\)/)
  })

  it('says to flag an item when there is nothing to watch, and offers no key to create one', () => {
    expect(home).toContain("t('focusBar.flagHint')")
    expect(home).not.toContain('focusBar.createPriority')
    expect(home).not.toContain('focusBar.noPrioritiesYet')
  })
})

describe("Planning's Priorities list", () => {
  const planning = source('src/screens/AnnualPlanning.js')

  it('ticks a row through the item the flag sits on', () => {
    expect(planning).toMatch(/annualPlanningService\.completePriority\(priority,\s*done\)/)
  })

  it('offers to take the flag off, and nothing to add', () => {
    expect(planning).toMatch(/annualPlanningService\.unflagPriority\(priority\)/)
    expect(planning).toContain("t('annualPlanning.priority.unflag')")
    expect(planning).not.toContain('annualPlanning.priority.addPriority')
    expect(planning).not.toContain('annualPlanning.priority.emptyCta')
  })

  it('reads the kind of item each row is, and says to flag one when the list is empty', () => {
    expect(planning).toContain("'annualPlanning.priority.kind.milestone'")
    expect(planning).toContain("'annualPlanning.priority.kind.task'")
    expect(planning).toContain("t('annualPlanning.priority.flagHint')")
  })
})

describe("the calendar's priority tick", () => {
  it('addresses the task or the milestone the event stands for', () => {
    const calendar = source('src/screens/Calendar.js')
    const call = calendar.match(/completePriority\(\s*\{([^}]*)\}\s*,\s*done\s*\)/)
    expect(call).not.toBeNull()
    expect(call[1]).toMatch(/_id:\s*id/)
    expect(call[1]).toMatch(/linked_entity_type:\s*event\.linkedType/)
    expect(call[1]).toMatch(/linked_entity_id:\s*event\.linkedId/)
  })
})

describe('the event form', () => {
  it('is gone: the item sheet has no kind to choose (PLAN-012)', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/screens/EventForm.js'))).toBe(false)
    expect(fs.existsSync(path.join(ROOT, 'src/screens/BlockSheet.js'))).toBe(false)
  })
})

/**
 * PLAN-020 — the phone's day panel is one object (ADR-021 amendment
 * 2026-10-17, PRD-items D11–D12). Read as source, as the rule suites beside
 * this one are (no rendered-component project here; see `jest.config.js`).
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const source = (relative) => code(fs.readFileSync(path.join(ROOT, relative), 'utf8'))

const home = source('app/(tabs)/index.js')
const taskRow = source('src/ui/patterns/TaskRow.js')
const blockRow = source('src/ui/patterns/BlockRow.js')

describe('the Tasks tab draws the Now tab’s row', () => {
  it('lists tasks as TaskRow, never a checkbox at the start or an Overdue readout at the end', () => {
    expect(home).toContain('<TaskRow')
    expect(home).not.toMatch(/<Checkbox\b/)
    expect(home).not.toContain('focusBar.overdue')
  })

  it('puts the tick last and the tile second, the way BlockRow does', () => {
    for (const row of [taskRow, blockRow]) {
      const body = row.slice(row.indexOf('<Pressable'))
      expect(body.indexOf('SourceTile')).toBeGreaterThan(-1)
      expect(body.indexOf('<Tick')).toBeGreaterThan(body.indexOf('SourceTile'))
    }
  })

  it('never puts a check in a task’s tile', () => {
    expect(blockRow).toMatch(/task:\s*'ClipboardList'/)
    expect(taskRow).toMatch(/glyph=\{task\.is_priority \? 'Flag' : null\}/)
  })

  it('counts the rows it shows, and keeps what is not today one tap down', () => {
    expect(home).toContain('count: taskDay.open.length')
    expect(home).toContain("t('tasks.day.upcoming')")
    expect(home).toContain("t('tasks.filter.completed')")
  })

  it('opens the item sheet from a task’s title', () => {
    expect(home).toContain('onOpenTask={(task) => setSheet({ source: { task } })}')
    expect(home).toContain('<ItemSheet')
  })
})

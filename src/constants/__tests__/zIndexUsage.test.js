/**
 * Phase 28 Plan 04 — source-level guard: nav consumers import Z_NAV from the
 * centralized constants module instead of hardcoding the nav z-index value
 * (PET-02, D-10). Dependency-free: reads source files via fs, no RTL render,
 * no component/context mocks — a pure source-string assertion mirroring the
 * Phase 12 test_all_call_sites-style grep idiom.
 *
 * Scope note: this guard covers only the two NAV consumers owned by this plan
 * (PomodoroChip.js, Header.js). StudyPet.js and StudySession.js self-verify
 * their own zIndex imports inside their own test files (28-02, 28-03) — this
 * file intentionally makes no assertions about those files.
 */
const fs = require('fs')
const path = require('path')

const POMODORO_CHIP_PATH = path.join(__dirname, '../../components/Pomodoro/PomodoroChip.js')
const HEADER_PATH = path.join(__dirname, '../../components/HomePage/Header.js')

describe('zIndexUsage — nav consumers import from centralized module', () => {
  it('PomodoroChip.js imports Z_NAV from the centralized constants module and holds no residual zIndex: 1100', () => {
    const source = fs.readFileSync(POMODORO_CHIP_PATH, 'utf8')
    expect(source).toMatch(/from '\.\.\/\.\.\/constants\/zIndex'/)
    expect(source).toContain('Z_NAV')
    expect(source).not.toMatch(/zIndex:\s*1100/)
  })

  it('Header.js imports Z_NAV from the centralized constants module and holds no residual zIndex: 1100', () => {
    const source = fs.readFileSync(HEADER_PATH, 'utf8')
    expect(source).toMatch(/from '\.\.\/\.\.\/constants\/zIndex'/)
    expect(source).toContain('Z_NAV')
    expect(source).not.toMatch(/zIndex:\s*1100/)
  })
})

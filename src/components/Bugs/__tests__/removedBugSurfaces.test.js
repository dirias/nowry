/**
 * BUG-001, ADMIN-007b (FR-007, FR-011): the old ways to report and triage are
 * gone — the floating button, the footer button, the header's unused form,
 * `/report-bug`, `/bugs/dashboard` and BugDashboard.js — and the one way left is
 * the account menu's "Report a problem".
 */
const fs = require('fs')
const path = require('path')

const SRC = path.resolve(__dirname, '../../..')
const read = (file) => fs.readFileSync(path.join(SRC, file), 'utf8')
const exists = (file) => fs.existsSync(path.join(SRC, file))

it('deletes the dashboard, the floating button and the old modal', () => {
  expect(exists('components/Bugs/BugDashboard.js')).toBe(false)
  expect(exists('components/Dev/DevBugReportButton.js')).toBe(false)
  expect(exists('components/Bugs/BugReportModal.js')).toBe(false)
})

it('routes neither /report-bug nor /bugs/dashboard, and routes /admin/bugs', () => {
  const app = read('App.js')
  expect(app).not.toMatch(/report-bug/)
  expect(app).not.toMatch(/bugs\/dashboard/)
  expect(app).not.toMatch(/DevBugReportButton|BugDashboard/)
  expect(app).toMatch(/path='bugs' element={<BugsTab \/>}/)
})

it('leaves no report form in the footer, and only the new one in the header', () => {
  expect(read('components/HomePage/Footer.js')).not.toMatch(/Bug|bugsService/)
  const header = read('components/HomePage/Header.js')
  expect(header).not.toMatch(/BugReportModal|bugsService/)
  expect(header).toMatch(/ReportProblemDialog/)
})

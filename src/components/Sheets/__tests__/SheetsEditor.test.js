/**
 * Phase 8 — SheetsEditor tests.
 * Stubs written in Wave 0; implementations follow in 08-05-PLAN.
 * All suites use describe.skip.
 */

// Mock react-spreadsheet (not yet installed in Wave 0)
jest.mock('react-spreadsheet', () => ({
  __esModule: true,
  default: () => null,
}), { virtual: true })

describe.skip('SheetsEditor — SHEET-02: Formula storage', () => {
  it('cells with value starting with = are stored as-is in sheet data', () => {})
  it('onChange fires with updated Matrix when cell is edited', () => {})
})

describe.skip('SheetsEditor — SHEET-03: Finance templates', () => {
  it('Budget Tracker template data has 6 rows with Category/Budgeted/Actual/Difference columns', () => {})
  it('Budget Tracker TOTAL row contains =SUM(B1:B5) formula value', () => {})
  it('Expense Log template data has Date/Description/Category/Amount/Running Total columns', () => {})
})

describe.skip('SheetsEditor — SHEET-04: Client-side row filter', () => {
  it('filter input matching "Rent" shows only rows where at least one cell value includes "Rent"', () => {})
  it('empty filter string shows all rows', () => {})
  it('stored data is unchanged by filtering — only display is filtered', () => {})
})

describe.skip('SheetsEditor — Autosave behavior', () => {
  it('onChange triggers PUT /sheets/{id} after 1000ms debounce', () => {})
  it('saving indicator shows "Saving..." during debounce and "Saved" on success', () => {})
})

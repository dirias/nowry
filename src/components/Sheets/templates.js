/**
 * Finance templates for Micro Sheets.
 * Applied at sheet creation — no backend storage needed.
 * react-spreadsheet CellBase format: { value: string|number }
 * Formulas start with '=' and are evaluated client-side by react-spreadsheet.
 */

export const TEMPLATES = {
  budget_tracker: {
    name: 'Budget Tracker',
    columnLabels: ['Category', 'Budgeted', 'Actual', 'Difference'],
    data: [
      [{ value: 'Rent' }, { value: 0 }, { value: 0 }, { value: '=B1-C1' }],
      [{ value: 'Food' }, { value: 0 }, { value: 0 }, { value: '=B2-C2' }],
      [{ value: 'Transport' }, { value: 0 }, { value: 0 }, { value: '=B3-C3' }],
      [{ value: 'Entertainment' }, { value: 0 }, { value: 0 }, { value: '=B4-C4' }],
      [{ value: 'Savings' }, { value: 0 }, { value: 0 }, { value: '=B5-C5' }],
      [
        { value: 'TOTAL' },
        { value: '=SUM(B1:B5)' },
        { value: '=SUM(C1:C5)' },
        { value: '=SUM(D1:D5)' }
      ]
    ]
  },
  expense_log: {
    name: 'Expense Log',
    columnLabels: ['Date', 'Description', 'Category', 'Amount', 'Running Total'],
    data: [
      [{ value: '' }, { value: '' }, { value: '' }, { value: 0 }, { value: '=D1' }],
      [{ value: '' }, { value: '' }, { value: '' }, { value: 0 }, { value: '=E1+D2' }],
      [{ value: '' }, { value: '' }, { value: '' }, { value: 0 }, { value: '=E2+D3' }],
      [{ value: '' }, { value: '' }, { value: '' }, { value: 0 }, { value: '=E3+D4' }],
      [{ value: '' }, { value: '' }, { value: '' }, { value: 0 }, { value: '=E4+D5' }]
    ]
  }
}

export const TEMPLATE_OPTIONS = [
  { id: 'blank', label: 'sheets.templates.blank' },
  { id: 'budget_tracker', label: 'sheets.templates.budgetTracker' },
  { id: 'expense_log', label: 'sheets.templates.expenseLog' }
]

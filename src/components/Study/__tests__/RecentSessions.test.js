/**
 * RecentSessions — the dashboard's history rail after STUDY-004 (PRD D11, §11).
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k), i18n: { language: 'en' } })
}))
const mockList = jest.fn()
jest.mock('../../../api/services/studySessions.service', () => ({ studySessionsService: { list: (...args) => mockList(...args) } }))

const RecentSessions = require('../RecentSessions').default

const session = (id, pct, type = 'srs_review') => ({
  id,
  session_type: type,
  deck_name: `Deck ${id}`,
  total_cards: 18,
  duration_seconds: 360,
  score_percentage: pct,
  completed_at: new Date().toISOString(),
  cards: [{ card_title: 'x', grade: 'again' }]
})

beforeEach(() => {
  mockNavigate.mockReset()
  mockList.mockReset()
})

it('shows up to five rows with the score as text and a bar, and no per-row expansion', async () => {
  mockList.mockResolvedValue({ sessions: [session('a', 92), session('b', 58), session('c', 40)], total: 38 })
  render(<RecentSessions />)

  const rows = await screen.findAllByTestId('session-row')
  expect(rows).toHaveLength(3)
  expect(rows[0]).toHaveTextContent('92%')
  expect(rows[0]).toHaveTextContent('sessions.srsReview')
  expect(screen.queryByRole('button', { name: /sessions\.expandAria/ })).not.toBeInTheDocument()
  expect(mockList).toHaveBeenCalledWith(5)
  expect(screen.getByText('sessions.ofTotal:{"shown":3,"total":38}')).toBeInTheDocument()
})

it('offers History as navigation text on the right rail', async () => {
  mockList.mockResolvedValue({ sessions: [session('a', 92)], total: 1 })
  render(<RecentSessions />)
  fireEvent.click(await screen.findByText('sessions.history'))
  expect(mockNavigate).toHaveBeenCalledWith('/study/history')
})

it('shows one quiet line when there is nothing yet', async () => {
  mockList.mockResolvedValue({ sessions: [], total: 0 })
  render(<RecentSessions />)
  expect(await screen.findByText('sessions.emptyHint')).toBeInTheDocument()
  expect(screen.queryByText('sessions.history')).not.toBeInTheDocument()
})

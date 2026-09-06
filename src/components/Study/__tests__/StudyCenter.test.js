/**
 * StudyCenter — the page shell after STUDY-003 (docs/prd-study-center.md).
 *
 * Harness idiom: multi-mock, require-after-mock, mirrors StudySession.test.js.
 * The component takes no props — all data arrives via hooks, mocked below.
 * The `t` mock serialises options as JSON so a key with a count is assertable.
 */
import React, { Profiler } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockNavigate = jest.fn()
let mockSearch = new URLSearchParams()
// CRA's jest config resets every mock's implementation before each test, so
// implementations are (re)installed in beforeEach, not here.
const mockSetSearchParams = jest.fn()
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearch, mockSetSearchParams]
}))

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k), i18n: { language: 'en' } })
}))

const FIXTURE_DECKS = [
  {
    _id: 'd1',
    name: 'Due Deck',
    deck_type: 'flashcard',
    due_cards: 5,
    new_cards: 2,
    mastery: 40,
    total_cards: 20,
    last_studied: '2026-07-20T00:00:00.000Z'
  },
  {
    _id: 'd2',
    name: 'Mastered Deck',
    deck_type: 'flashcard',
    due_cards: 0,
    new_cards: 0,
    mastery: 90,
    total_cards: 15,
    last_studied: '2026-07-01T00:00:00.000Z'
  }
]

let mockDecks = FIXTURE_DECKS
const BASE_STATISTICS = {
  summary: { current_streak: 3 },
  weekly_progress: [
    { date: '2026-08-31', day: 'Mon', cards: 14 },
    { date: '2026-09-01', day: 'Tue', cards: 22 },
    { date: '2026-09-02', day: 'Wed', cards: 0 },
    { date: '2026-09-03', day: 'Thu', cards: 9 },
    { date: '2026-09-04', day: 'Fri', cards: 17 },
    { date: '2026-09-05', day: 'Sat', cards: 0 },
    { date: '2026-09-06', day: 'Sun', cards: 4 }
  ]
}
let mockStatistics = BASE_STATISTICS
const mockForecast = {
  days: [
    { date: '2026-09-07', due: 18 },
    { date: '2026-09-08', due: 9 }
  ],
  total: 27
}

jest.mock('../../../hooks/useStatistics', () => ({
  useStatistics: () => ({ statistics: mockStatistics, loading: false, error: null, reload: jest.fn() })
}))
jest.mock('../../../hooks/useDeckData', () => ({
  useDeckData: () => ({ decks: mockDecks, loading: false, error: null, reload: jest.fn() })
}))
jest.mock('../../../hooks/useForecast', () => ({
  useForecast: () => ({ forecast: mockForecast, loading: false, error: null, reload: jest.fn() })
}))
const mockPostIntervention = jest.fn()
jest.mock('../../../api/services/agent.service', () => ({ agentService: { postIntervention: (...args) => mockPostIntervention(...args) } }))
jest.mock('../../../context/AgentContext', () => ({ usePet: () => ({ queuePreSessionIntervention: jest.fn() }) }))
jest.mock('../../Cards/CardHome', () => ({ __esModule: true, default: () => <div data-testid='card-home' /> }))
jest.mock('../RecentSessions', () => ({ __esModule: true, default: () => null }))

const StudyCenter = require('../StudyCenter').default

beforeEach(() => {
  mockNavigate.mockReset()
  mockSetSearchParams.mockReset().mockImplementation((next) => {
    mockSearch = new URLSearchParams(next)
  })
  mockPostIntervention.mockReset().mockResolvedValue({})
  mockSearch = new URLSearchParams()
  mockDecks = FIXTURE_DECKS
  mockStatistics = BASE_STATISTICS
})

describe('the title row and the view segment (PRD D2)', () => {
  it('names the page on the left rail and offers Dashboard | Library as one segmented object', async () => {
    render(<StudyCenter />)
    expect(await screen.findByRole('heading', { level: 2, name: 'study.title' })).toBeInTheDocument()
    const segment = screen.getByTestId('study-view')
    const [dashboard, library] = segment.querySelectorAll('button')
    expect(dashboard).toHaveAttribute('aria-pressed', 'true')
    expect(library).toHaveAttribute('aria-pressed', 'false')
  })

  it('puts the view in the URL and mounts the library there', async () => {
    const first = render(<StudyCenter />)
    fireEvent.click(screen.getByText('study.views.library'))
    expect(mockSetSearchParams).toHaveBeenCalled()
    expect(mockSearch.get('view')).toBe('library')
    first.unmount()

    mockSearch = new URLSearchParams('view=library')
    render(<StudyCenter />)
    expect(await screen.findByTestId('card-home')).toBeInTheDocument()
  })
})

describe('the Today object (PRD D1, D9, D10)', () => {
  it('reads due · new · reviewed · streak in one line and offers the one solid "Study · N"', async () => {
    render(<StudyCenter />)
    const today = await screen.findByTestId('today-object')
    expect(today).toHaveTextContent('study.dueCount:{"count":5}')
    expect(today).toHaveTextContent('study.deck.newCount:{"count":2}')
    expect(today).toHaveTextContent('study.today.reviewed:{"count":4}')
    expect(today).toHaveTextContent('study.empty.streakLabel:{"count":3}')
    expect(today).not.toHaveTextContent('study.today.beforeMidnight')
    fireEvent.click(screen.getByText('study.today.study:{"count":7}'))
    expect(mockNavigate).toHaveBeenCalledWith('/study/daily-review')
  })

  it('warns "study before midnight" while the streak is alive and nothing has been reviewed today', async () => {
    mockStatistics = {
      ...mockStatistics,
      weekly_progress: mockStatistics.weekly_progress.map((d, i, arr) => (i === arr.length - 1 ? { ...d, cards: 0 } : d))
    }
    render(<StudyCenter />)
    expect(await screen.findByTestId('today-object')).toHaveTextContent('study.today.beforeMidnight')
  })

  it('says "Start your streak today" at zero, using the string that existed unused', async () => {
    mockStatistics = { ...mockStatistics, summary: { current_streak: 0 } }
    render(<StudyCenter />)
    expect(await screen.findByTestId('today-object')).toHaveTextContent('study.empty.streakZeroLabel')
  })

  it('offers Quick 10 only when more than ten cards are asked, and caps the session', async () => {
    mockDecks = [{ ...FIXTURE_DECKS[0], due_cards: 12, new_cards: 3 }]
    const first = render(<StudyCenter />)
    fireEvent.click(await screen.findByText('study.today.quick:{"count":10}'))
    expect(mockNavigate).toHaveBeenCalledWith('/study/daily-review?limit=10')
    first.unmount()

    mockDecks = FIXTURE_DECKS
    render(<StudyCenter />)
    await screen.findByText('study.today.study:{"count":7}')
    expect(screen.queryByText('study.today.quick:{"count":10}')).not.toBeInTheDocument()
  })

  it('closes the day as "All done" with a Browse secondary when nothing is due', async () => {
    mockDecks = [FIXTURE_DECKS[1]]
    render(<StudyCenter />)
    const today = await screen.findByTestId('today-object')
    expect(today).toHaveTextContent('study.today.allDone')
    expect(screen.queryByText(/study\.today\.study:/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('study.today.browse'))
    expect(mockSearch.get('view')).toBe('library')
  })

  it('is the same object with nothing in it for a new learner: one sentence, three ways in, no counters', async () => {
    mockDecks = []
    render(<StudyCenter />)
    const today = await screen.findByTestId('today-object')
    expect(today).toHaveTextContent('study.today.emptySentence')
    expect(today).not.toHaveTextContent('study.dueCount')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('study.today.createDeck'))
    expect(mockNavigate).toHaveBeenCalledWith('/study?view=library&new=deck')
  })

  it('draws the timeline with a text alternative and the progress edge with a value', async () => {
    render(<StudyCenter />)
    expect(await screen.findByRole('img', { name: /study\.today\.timelineAria/ })).toBeInTheDocument()
    const bar = screen.getByRole('progressbar')
    await waitFor(() => expect(bar).toHaveAttribute('aria-valuenow', '4'))
    expect(bar).toHaveAttribute('aria-valuemax', '11')
  })
})

describe('deck rows (PRD D3, D4, US-002)', () => {
  it('lists due decks under "Due now" as rows whose Study opens the session directly, with no modal in between', async () => {
    render(<StudyCenter />)
    const row = (await screen.findByText('Due Deck')).closest('[data-testid="deck-row"]')
    expect(row).toHaveTextContent('study.types.flashcards')
    expect(row).toHaveTextContent('study.dueCount:{"count":5}')
    expect(row).toHaveTextContent('study.deck.newCount:{"count":2}')
    fireEvent.click(row.querySelector('button'))
    expect(mockNavigate).toHaveBeenCalledWith('/study/d1?mode=study')
  })

  it('lists the rest under "Up to date" with Browse, and never a red chip or a raw type key', async () => {
    mockDecks = [FIXTURE_DECKS[1], { ...FIXTURE_DECKS[1], _id: 'q1', name: 'Quiz Deck', deck_type: 'quiz' }]
    render(<StudyCenter />)
    const row = (await screen.findByText('Quiz Deck')).closest('[data-testid="deck-row"]')
    expect(row).toHaveTextContent('study.types.quizzes')
    expect(row).not.toHaveTextContent('study.types.quizs')
    expect(row).toHaveTextContent('study.deck.upToDate')
    fireEvent.click(row.querySelector('button'))
    expect(mockNavigate).toHaveBeenCalledWith('/study/q1?mode=browse')
    expect(document.querySelector('.MuiChip-root')).toBeNull()
  })

  it('draws an empty measure and "New" for a deck with nothing learned yet', async () => {
    mockDecks = [{ ...FIXTURE_DECKS[0], _id: 'n1', name: 'Fresh Deck', due_cards: 0, new_cards: 20, total_cards: 20, mastery: 0 }]
    render(<StudyCenter />)
    const row = (await screen.findByText('Fresh Deck')).closest('[data-testid="deck-row"]')
    expect(row).toHaveTextContent('study.deckPill.new')
  })

  it('shows three up-to-date decks and a "Show all N" secondary that expands the rest', async () => {
    mockDecks = [1, 2, 3, 4, 5].map((i) => ({ ...FIXTURE_DECKS[1], _id: `u${i}`, name: `Up ${i}` }))
    render(<StudyCenter />)
    await screen.findByText('Up 1')
    expect(screen.getAllByTestId('deck-row')).toHaveLength(3)
    fireEvent.click(screen.getByText('study.sections.showAll:{"count":5}'))
    expect(screen.getAllByTestId('deck-row')).toHaveLength(5)
  })
})

describe('StudyCenter Profiler render-counter harness (D-03)', () => {
  it('captures a commit-count + duration baseline for a representative dashboard interaction', async () => {
    const commits = []
    render(
      <Profiler id='StudyCenter' onRender={(id, phase, actualDuration) => commits.push({ phase, actualDuration })}>
        <StudyCenter />
      </Profiler>
    )
    fireEvent.click(await screen.findByText('Due Deck'))
    const totalDuration = commits.reduce((sum, c) => sum + c.actualDuration, 0)
    console.log(`[StudyCenter Profiler D-03] commit count: ${commits.length}, total actualDuration: ${totalDuration.toFixed(4)}ms`)
    expect(commits.length).toBeGreaterThan(0)
  })
})

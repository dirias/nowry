/**
 * Phase 33 Plan 02 — StudyCenter.js render-behavior + Profiler render-counter
 * harness (PERF-01).
 *
 * Harness idiom: multi-mock, require-after-mock, mirrors StudySession.test.js
 * (nowry/src/components/Cards/__tests__/StudySession.test.js). StudyCenter takes
 * no props — all data arrives via hooks, mocked below.
 *
 * D-03 evidence: the second describe block below wraps StudyCenter in a
 * <Profiler> and records a commit-count + total actualDuration baseline for a
 * representative dashboard interaction (clicking a due-deck card, which flips
 * modePickerState and forces a re-render). This test is run once against the
 * pre-fix StudyCenter.js (Task 1, BEFORE) and again unchanged against the
 * post-fix StudyCenter.js (Task 2, AFTER) — see 33-02-SUMMARY.md for the
 * captured numbers. Commit count is expected to be equal before/after (the
 * click still produces exactly one state update / one commit either way);
 * the optimization removes per-render computation work, not the render itself.
 */
import React, { Profiler } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn()
}))

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k) })
}))

/** Two decks: one due (renders in "needing review"), one non-due (renders in "your decks"). */
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

// Module-level stable refs ('mock' prefix is Jest's documented exception to the
// out-of-scope-variable rule for jest.mock() factories). A fresh object literal
// per call would give `statisticsData`/`hookDecks` a new identity on every
// render, which StudyCenter's fetchData useCallback([hookDecks, statisticsData])
// picks up as a changed dependency -> infinite re-render loop.
const mockStatistics = {}
const mockReloadStatistics = jest.fn()
const mockReloadDecks = jest.fn()

jest.mock('../../../hooks/useStatistics', () => ({
  useStatistics: () => ({ statistics: mockStatistics, loading: false, error: null, reload: mockReloadStatistics })
}))

jest.mock('../../../hooks/useDeckData', () => ({
  useDeckData: () => ({ decks: FIXTURE_DECKS, loading: false, error: null, reload: mockReloadDecks })
}))

jest.mock('../../../api/services/agent.service', () => ({
  agentService: {
    postIntervention: jest.fn().mockResolvedValue({})
  }
}))

jest.mock('../../../context/AgentContext', () => ({
  usePet: () => ({
    queuePreSessionIntervention: jest.fn()
  })
}))

jest.mock('../../Cards/CardHome', () => ({ __esModule: true, default: () => null }))
jest.mock('../DeckSettingsModal', () => ({ __esModule: true, default: () => null }))
jest.mock('../StudyModePickerModal', () => ({ __esModule: true, default: () => null }))
jest.mock('../RecentSessions', () => ({ __esModule: true, default: () => null }))

// require-after-mock: the component under test is imported only after every
// jest.mock() call above has registered, per the GoalCardGrid.test.js /
// StudySession.test.js idiom.
const StudyCenter = require('../StudyCenter').default

/**
 * Wraps `ui` in a <Profiler>, returning the rendered element plus a live
 * `commits` array that accumulates `{ phase, actualDuration }` on every
 * React commit (D-03 evidence harness).
 */
function withRenderCounter(ui) {
  const commits = []
  const onRender = (id, phase, actualDuration) => {
    commits.push({ phase, actualDuration })
  }
  return {
    element: (
      <Profiler id='StudyCenter' onRender={onRender}>
        {ui}
      </Profiler>
    ),
    commits
  }
}

describe('StudyCenter dashboard smoke test (behavior-unchanged guard)', () => {
  it("renders each fixture deck name and the due deck's due count", async () => {
    render(<StudyCenter />)

    expect(await screen.findByText('Due Deck')).toBeInTheDocument()
    expect(screen.getByText('Mastered Deck')).toBeInTheDocument()
    // t mock serializes options as JSON — study.dueCount rendered with { count: 5 }
    expect(screen.getByText(/study\.dueCount:\{"count":5\}/)).toBeInTheDocument()
  })
})

describe('StudyCenter Profiler render-counter harness (D-03)', () => {
  it('captures a commit-count + duration baseline for a representative dashboard interaction', async () => {
    const { element, commits } = withRenderCounter(<StudyCenter />)
    render(element)

    const dueDeckName = await screen.findByText('Due Deck')
    // Click bubbles up to the ancestor Card's onClick (setModePickerState),
    // producing one additional commit — the representative interaction.
    fireEvent.click(dueDeckName)

    const totalDuration = commits.reduce((sum, c) => sum + c.actualDuration, 0)
    // eslint-disable-next-line no-console
    console.log(`[StudyCenter Profiler D-03] commit count: ${commits.length}, total actualDuration: ${totalDuration.toFixed(4)}ms`)

    expect(commits.length).toBeGreaterThan(0)
  })
})

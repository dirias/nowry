/**
 * PomodoroWidget / PomodoroChip — the redesigned surfaces (POMO-002, ADR-013).
 *
 * Drives the components through a mocked usePomodoro() so each state can be
 * pinned without running a clock. Mirrors StudyModePickerModal.test.js's
 * react-i18next mock: `t` echoes the key, with options appended as JSON.
 */
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k) }),
  initReactI18next: { type: '3rdParty', init: () => {} }
}))
// The real context module is loaded for MODES / durationFor / nextModeAfter; cut its
// import chain off before it reaches Firebase and the API client.
jest.mock('../../../hooks/useUserProfile', () => ({ useUserProfile: () => ({ profile: null }) }))
jest.mock('../../../utils/pomodoroSound', () => ({
  playPomodoroNotification: jest.fn(),
  showBrowserNotification: jest.fn(),
  requestNotificationPermission: jest.fn(() => Promise.resolve(false))
}))

let mockPomodoro
let mockPet = { isActive: false, isInStudySession: false }
let mockIsMobile = false
jest.mock('../../../context/AgentContext', () => ({ usePet: () => mockPet }))
jest.mock('../../../hooks/useIsMobile', () => ({ useIsMobile: () => mockIsMobile }))
jest.mock('../../../context/PomodoroContext', () => {
  const actual = jest.requireActual('../../../context/PomodoroContext')
  return { ...actual, usePomodoro: () => mockPomodoro }
})

const PomodoroWidget = require('../PomodoroWidget').default
const PomodoroChip = require('../PomodoroChip').default
const { cycleProgress } = require('../PomodoroWidget')

const base = () => ({
  timeLeft: 25 * 60,
  totalSeconds: 25 * 60,
  progress: 0,
  isActive: false,
  isPaused: false,
  mode: 'work',
  completedSessions: 0,
  sessionsBeforeLongBreak: 4,
  showWidget: true,
  setShowWidget: jest.fn(),
  toggleTimer: jest.fn(),
  resetTimer: jest.fn(),
  skipSession: jest.fn(),
  changeMode: jest.fn(),
  settings: { work: 25, shortBreak: 5, longBreak: 15, autoStart: false, enabled: true }
})

beforeEach(() => {
  mockPomodoro = base()
  mockPet = { isActive: false, isInStudySession: false }
  mockIsMobile = false
})

describe('PomodoroWidget', () => {
  it('renders nothing when the timer is disabled or closed', () => {
    mockPomodoro.settings.enabled = false
    const { container, rerender } = render(<PomodoroWidget />)
    expect(container).toBeEmptyDOMElement()
    mockPomodoro = { ...base(), showWidget: false }
    rerender(<PomodoroWidget />)
    expect(container).toBeEmptyDOMElement()
  })

  it('idle focus: label, clock, what comes next, and a Start action', () => {
    render(<PomodoroWidget />)
    expect(screen.getByText('pomodoro.modes.work')).toBeInTheDocument()
    expect(screen.getByText('25:00')).toBeInTheDocument()
    expect(screen.getByText('pomodoro.status.next:{"mode":"pomodoro.modes.shortBreak","minutes":5}')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pomodoro\.start$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'pomodoro.reset' })).toBeInTheDocument()
  })

  it('the mode switch is one group with the current mode pressed', () => {
    render(<PomodoroWidget />)
    const group = screen.getByRole('group', { name: 'pomodoro.modes.label' })
    const buttons = group.querySelectorAll('button')
    expect(buttons).toHaveLength(3)
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(buttons[2])
    expect(mockPomodoro.changeMode).toHaveBeenCalledWith('longBreak')
  })

  it('running: Pause action and a progress bar that reports its value', () => {
    mockPomodoro = { ...base(), isActive: true, timeLeft: 18 * 60 + 42, progress: 0.25, completedSessions: 1 }
    render(<PomodoroWidget />)
    expect(screen.getByText('18:42')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pomodoro\.pause$/ })).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25')
    fireEvent.click(screen.getByRole('button', { name: /pomodoro\.pause$/ }))
    expect(mockPomodoro.toggleTimer).toHaveBeenCalled()
  })

  it('paused: Resume action and how far in the user is', () => {
    mockPomodoro = { ...base(), isPaused: true, timeLeft: 19 * 60, progress: 0.24 }
    render(<PomodoroWidget />)
    expect(screen.getByRole('button', { name: /pomodoro\.resume$/ })).toBeInTheDocument()
    expect(screen.getByText('pomodoro.status.paused:{"minutes":6}')).toBeInTheDocument()
  })

  it('a queued break offers Start break and Skip instead of Reset', () => {
    mockPomodoro = { ...base(), mode: 'shortBreak', timeLeft: 300, totalSeconds: 300, completedSessions: 2 }
    render(<PomodoroWidget />)
    expect(screen.getByRole('button', { name: /pomodoro\.startBreak$/ })).toBeInTheDocument()
    expect(screen.getByText('pomodoro.status.breakQueued:{"count":2,"total":4}')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'pomodoro.skip' }))
    expect(mockPomodoro.skipSession).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'pomodoro.reset' })).not.toBeInTheDocument()
  })

  it('a long break shows all four dots earned', () => {
    mockPomodoro = { ...base(), mode: 'longBreak', timeLeft: 900, totalSeconds: 900, completedSessions: 4 }
    render(<PomodoroWidget />)
    expect(screen.getByRole('img', { name: 'pomodoro.cycleProgress:{"count":4,"total":4}' })).toBeInTheDocument()
    expect(screen.getByText('pomodoro.status.longBreakEarned:{"total":4}')).toBeInTheDocument()
  })

  it('close hands the corner back to the chip', () => {
    render(<PomodoroWidget />)
    fireEvent.click(screen.getByRole('button', { name: 'pomodoro.close' }))
    expect(mockPomodoro.setShowWidget).toHaveBeenCalledWith(false)
  })

  it('a click outside minimises it, and the click reaches what was under it', async () => {
    const outside = document.createElement('button')
    const onOutside = jest.fn()
    outside.addEventListener('click', onOutside)
    document.body.appendChild(outside)
    render(<PomodoroWidget />)
    // The listener ignores the click that opened the widget; it arms on the next tick.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    fireEvent.click(screen.getByText('25:00'))
    expect(mockPomodoro.setShowWidget).not.toHaveBeenCalled()

    fireEvent.click(outside)
    expect(mockPomodoro.setShowWidget).toHaveBeenCalledWith(false)
    expect(onOutside).toHaveBeenCalledTimes(1)
    outside.remove()
  })

  it('Escape minimises it; other keys do not', () => {
    render(<PomodoroWidget />)
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(mockPomodoro.setShowWidget).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(mockPomodoro.setShowWidget).toHaveBeenCalledWith(false)
  })
})

describe('the corner the Study Buddy is not in', () => {
  const widgetStyle = () => window.getComputedStyle(screen.getByRole('region', { name: 'common.pomodoro' }))
  const chipStyle = () => window.getComputedStyle(screen.getByRole('button', { name: 'pomodoro.open' }))

  it('sits bottom-right when there is no pet', () => {
    render(<PomodoroWidget />)
    expect(widgetStyle().right).toBe('24px')
    expect(widgetStyle().left).toBe('')
  })

  it('moves bottom-left while the pet rests bottom-right, and back right during a study session', () => {
    mockPet = { isActive: true, isInStudySession: false }
    const { rerender } = render(<PomodoroWidget />)
    expect(widgetStyle().left).toBe('24px')
    mockPet = { isActive: true, isInStudySession: true }
    rerender(<PomodoroWidget />)
    expect(widgetStyle().right).toBe('24px')
  })

  it('the chip follows the same rule', () => {
    mockPomodoro = { ...base(), showWidget: false }
    mockPet = { isActive: true, isInStudySession: false }
    render(<PomodoroChip />)
    expect(chipStyle().left).toBe('24px')
  })

  it('on mobile the open widget is a full-width sheet raised above the pet; the chip stays in the corner', () => {
    mockIsMobile = true
    mockPet = { isActive: true, isInStudySession: false }
    render(<PomodoroWidget />)
    expect(widgetStyle().left).toBe('16px')
    expect(widgetStyle().right).toBe('16px')
    expect(widgetStyle().bottom).toBe('136px')

    mockPomodoro = { ...base(), showWidget: false }
    render(<PomodoroChip />)
    expect(chipStyle().left).toBe('24px')
    expect(chipStyle().bottom).toBe('24px')
  })
})

describe('cycleProgress', () => {
  it('counts focus sessions within the current cycle, and shows a full cycle on the long break', () => {
    expect(cycleProgress(0, 'work', 4)).toBe(0)
    expect(cycleProgress(3, 'work', 4)).toBe(3)
    expect(cycleProgress(4, 'longBreak', 4)).toBe(4)
    expect(cycleProgress(4, 'work', 4)).toBe(0)
    expect(cycleProgress(5, 'shortBreak', 4)).toBe(1)
  })
})

describe('PomodoroChip', () => {
  it('is hidden while the widget is open or the timer is disabled', () => {
    const { container, rerender } = render(<PomodoroChip />)
    expect(container).toBeEmptyDOMElement()
    mockPomodoro = { ...base(), showWidget: false, settings: { ...base().settings, enabled: false } }
    rerender(<PomodoroChip />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the mode when idle and the clock when running, and opens the widget', () => {
    mockPomodoro = { ...base(), showWidget: false }
    const { rerender } = render(<PomodoroChip />)
    expect(screen.getByText('pomodoro.modes.work')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'pomodoro.open' }))
    expect(mockPomodoro.setShowWidget).toHaveBeenCalledWith(true)

    mockPomodoro = { ...base(), showWidget: false, isActive: true, timeLeft: 61, progress: 0.9 }
    rerender(<PomodoroChip />)
    expect(screen.getByText('01:01')).toBeInTheDocument()
  })
})

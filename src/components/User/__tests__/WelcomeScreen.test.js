/**
 * ONB-009 — WelcomeScreen.
 *
 * The screen has three claims that are easy to make and easy to get wrong, so
 * they are what the tests are about:
 *
 *   1. choosing a language or accent changes the *screen* at once, without
 *      waiting for — or depending on — the save;
 *   2. nothing is ever labelled saved that the server has not acknowledged;
 *   3. postpone reaches Home only after its PATCH resolves, because the grace
 *      period is computed from the timestamp that write creates.
 *
 * Plus one absence worth guarding: no light/dark question anywhere (FR-014).
 */
const mockChangeLanguage = jest.fn()

jest.mock('react-i18next', () => {
  const bundle = require('../../../locales/en/translation.json')
  const resolve = (key) => key.split('.').reduce((node, segment) => (node == null ? undefined : node[segment]), bundle)
  return {
    useTranslation: () => ({
      t: (key, options) => {
        const raw = resolve(key)
        if (typeof raw !== 'string') return key
        return raw.replace(/{{(\w+)}}/g, (_, name) => String(options?.[name] ?? `{{${name}}}`))
      },
      i18n: { language: 'en', changeLanguage: mockChangeLanguage }
    })
  }
})

// Mocked for its constants only: importing the real module drags in the API
// client and every service behind it, for two frozen objects.
jest.mock('../../../hooks/useProgressivePreferences', () => ({
  __esModule: true,
  ACTION_PHASE: { IDLE: 'idle', PENDING: 'pending', SUCCEEDED: 'succeeded', ERROR: 'error' },
  PREFERENCE_FIELD: { LANGUAGE: 'language', ACCENT_COLOR: 'theme_color', INTERESTS: 'interests', STUDY_GOAL: 'study_goal' },
  default: jest.fn()
}))

const mockSetThemeColor = jest.fn()
jest.mock('../../../theme/DynamicThemeProvider', () => ({
  __esModule: true,
  useThemePreferences: () => ({ themeColor: '#2a6971', setThemeColor: mockSetThemeColor })
}))

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import WelcomeScreen from '../WelcomeScreen'
import { getColorPresets } from '../../../theme/colorSchemeGenerator'
import en from '../../../locales/en/translation.json'

const welcome = en.onboarding.welcome
const save = en.onboarding.save
const PRESETS = getColorPresets()

const idleField = (overrides = {}) => ({
  phase: 'idle',
  error: null,
  isSaving: false,
  isConfirmed: true,
  justSaved: false,
  canRetry: false,
  ...overrides
})

let journey
let preferences
let onNext
let onExit

const buildJourney = (overrides = {}) => ({
  postpone: jest.fn().mockResolvedValue({ ok: true }),
  postponeState: { phase: 'idle', error: null },
  ...overrides
})

const buildPreferences = (overrides = {}) => ({
  phase: 'ready',
  values: { language: null, theme_color: null, interests: [], study_goal: null },
  fields: { language: idleField(), theme_color: idleField() },
  setPreference: jest.fn(),
  retryField: jest.fn(),
  reload: jest.fn(),
  ...overrides
})

const renderScreen = () =>
  render(
    <WelcomeScreen
      shell={{ screenKey: 'welcome', stepNumber: 1, totalSteps: 3, onBack: null }}
      journey={journey}
      preferences={preferences}
      onNext={onNext}
      onExit={onExit}
    />
  )

beforeEach(() => {
  mockChangeLanguage.mockClear()
  mockSetThemeColor.mockClear()
  onNext = jest.fn()
  onExit = jest.fn()
  journey = buildJourney()
  preferences = buildPreferences()
})

describe('what the screen asks for (FR-002, FR-008, FR-009, FR-014)', () => {
  it('asks no question and offers exactly begin and postpone', () => {
    renderScreen()

    expect(screen.getByRole('button', { name: welcome.begin })).toBeEnabled()
    expect(screen.getByRole('button', { name: welcome.postpone })).toBeEnabled()
    // Nothing on the screen is a required input: the only controls are the two
    // optional preferences, neither of which gates the primary action.
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(document.querySelector('[required]')).toBeNull()
  })

  it('states the outcome — personalization and a first deck — in two lines, not a benefits list', () => {
    renderScreen()

    expect(screen.getByText(welcome.lead)).toBeInTheDocument()
    expect(screen.getByText(welcome.support)).toBeInTheDocument()
    // The superseded wizard's triad must not have come along for the ride.
    expect(screen.queryByText(/Quick & Easy|Tailored for You|Always Changeable/)).toBeNull()
  })

  it('renders no light/dark control at all — the operating system owns that', () => {
    renderScreen()

    expect(screen.queryByRole('radio', { name: en.onboarding.theme.light })).toBeNull()
    expect(screen.queryByRole('radio', { name: en.onboarding.theme.dark })).toBeNull()
    expect(screen.queryByRole('button', { name: /light|dark/i })).toBeNull()
    // It is stated as a fact instead, so the user knows without being asked.
    expect(screen.getByText(welcome.accent.hint)).toBeInTheDocument()
  })
})

describe('language (FR-010, FR-011, FR-036, NFR-011)', () => {
  it('starts on the detected language when nothing has been saved yet', () => {
    renderScreen()

    expect(screen.getByRole('combobox', { name: welcome.language.label })).toHaveTextContent('English')
    expect(mockChangeLanguage).not.toHaveBeenCalled()
  })

  it('shows the saved language over the detected one', () => {
    preferences.values.language = 'ja'
    renderScreen()

    expect(screen.getByRole('combobox', { name: welcome.language.label })).toHaveTextContent('日本語')
    expect(mockChangeLanguage).toHaveBeenCalledWith('ja')
  })

  it('applies a chosen locale immediately and persists it through the preference endpoint', () => {
    renderScreen()

    fireEvent.click(screen.getByRole('combobox', { name: welcome.language.label }))
    fireEvent.click(screen.getByRole('option', { name: 'Español' }))

    expect(mockChangeLanguage).toHaveBeenCalledWith('es')
    expect(preferences.setPreference).toHaveBeenCalledWith('language', 'es')
  })

  it('offers all five supported locales and no others', () => {
    renderScreen()
    fireEvent.click(screen.getByRole('combobox', { name: welcome.language.label }))

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'English',
      'Español',
      'Français',
      'Deutsch',
      '日本語'
    ])
  })
})

describe('accent (FR-012, FR-013)', () => {
  it('applies the accent on selection and saves it immediately', () => {
    renderScreen()

    fireEvent.click(screen.getByRole('radio', { name: welcome.accent.names.royalPurple }))

    expect(mockSetThemeColor).toHaveBeenCalledWith('#9c27b0')
    expect(preferences.setPreference).toHaveBeenCalledWith('theme_color', '#9c27b0')
  })

  it('names the current accent in words, so selection does not depend on color', () => {
    preferences.values.theme_color = '#4caf50'
    renderScreen()

    expect(screen.getByText(`Accent: ${welcome.accent.names.forestGreen}`)).toBeInTheDocument()
  })

  it('draws the selected check from the preset contrast, never a hardcoded white', () => {
    const orange = PRESETS.find((preset) => preset.color === '#ff9800')
    preferences.values.theme_color = orange.color
    const { container } = renderScreen()

    // `468cf7f` derives this from luminance; on Sunset Orange the readable
    // answer is black, which is exactly the case a literal 'white' broke.
    expect(orange.contrastText).toBe('#000000')
    const check = container.querySelector('svg[data-testid="CheckRoundedIcon"]')
    expect(check).not.toBeNull()
    expect(getComputedStyle(check).color).toBe('rgb(0, 0, 0)')
  })

  it('falls back to a readable name when the saved accent is not a shipped preset', () => {
    preferences.values.theme_color = '#123456'
    renderScreen()

    expect(screen.getByText(`Accent: ${welcome.accent.custom}`)).toBeInTheDocument()
  })
})

describe('honest save state (FR-039, FR-040)', () => {
  it('says nothing about persistence while a write is in flight', () => {
    preferences.fields.theme_color = idleField({ phase: 'pending', isSaving: true, isConfirmed: false })
    renderScreen()

    expect(screen.getByText(save.saving)).toBeInTheDocument()
    expect(screen.queryByText(save.saved)).toBeNull()
  })

  it('names the field that did not save, keeps the visible choice, and offers a retry', () => {
    preferences.values.theme_color = '#e91e63'
    preferences.fields.theme_color = idleField({
      phase: 'error',
      isConfirmed: false,
      canRetry: true,
      error: { code: 'network_error', recoverable: true }
    })
    renderScreen()

    expect(screen.getByText(save.unsaved)).toBeInTheDocument()
    expect(screen.getByText(en.onboarding.failure.network)).toBeInTheDocument()
    expect(screen.queryByText(save.saved)).toBeNull()
    // The choice is still on screen — a failed save must not roll the UI back.
    expect(screen.getByRole('radio', { name: welcome.accent.names.rosePink })).toBeChecked()

    fireEvent.click(screen.getAllByRole('button', { name: save.retry })[0])
    expect(preferences.retryField).toHaveBeenCalledWith('theme_color')
  })

  it('claims saved only once the server has echoed the value back', () => {
    preferences.fields.language = idleField({ phase: 'succeeded', justSaved: true })
    renderScreen()

    expect(screen.getByText(save.saved)).toBeInTheDocument()
  })

  it('reports a failed confirmed read without blocking the screen (FR-046)', () => {
    preferences.phase = 'error'
    renderScreen()

    expect(screen.getByText(welcome.loadError)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: welcome.begin })).toBeEnabled()
    expect(screen.getByRole('combobox', { name: welcome.language.label })).toBeEnabled()
  })
})

describe('acknowledged postponement (FR-041, FR-047, FR-049)', () => {
  it('reaches Home only after the PATCH resolves', async () => {
    let resolvePostpone
    journey.postpone = jest.fn(
      () =>
        new Promise((resolve) => {
          resolvePostpone = resolve
        })
    )
    renderScreen()

    fireEvent.click(screen.getByRole('button', { name: welcome.postpone }))

    expect(journey.postpone).toHaveBeenCalled()
    expect(onExit).not.toHaveBeenCalled()

    resolvePostpone({ ok: true })
    await waitFor(() => expect(onExit).toHaveBeenCalled())
  })

  it('keeps the user in place when the PATCH fails, and never claims the timestamp was saved', async () => {
    journey.postpone = jest.fn().mockResolvedValue({ ok: false, error: { code: 'network_error', recoverable: true } })
    journey.postponeState = { phase: 'error', error: { code: 'network_error', recoverable: true } }
    renderScreen()

    fireEvent.click(screen.getByRole('button', { name: welcome.postpone }))
    await waitFor(() => expect(journey.postpone).toHaveBeenCalled())

    expect(onExit).not.toHaveBeenCalled()

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(welcome.postponeError.title)
    expect(alert).toHaveTextContent(welcome.postponeError.body)
    expect(alert).toHaveTextContent(en.onboarding.failure.network)
  })

  it('offers a retry for a recoverable failure and none for a terminal one', () => {
    journey.postponeState = { phase: 'error', error: { code: 'unknown_error', recoverable: true } }
    const { rerender } = renderScreen()
    expect(screen.getByRole('alert')).toHaveTextContent(save.retry)

    journey = buildJourney({ postponeState: { phase: 'error', error: { code: 'invalid_action', recoverable: false } } })
    rerender(
      <WelcomeScreen
        shell={{ screenKey: 'welcome', stepNumber: 1, totalSteps: 3, onBack: null }}
        journey={journey}
        preferences={preferences}
        onNext={onNext}
        onExit={onExit}
      />
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent(save.retry)
  })

  it('disables only what a pending postponement makes incompatible', () => {
    journey.postponeState = { phase: 'pending', error: null }
    renderScreen()

    // Advancing under a postponement still being recorded is incompatible.
    expect(screen.getByRole('button', { name: welcome.begin })).toBeDisabled()
    // The optional preferences are not: their writes are independent.
    expect(screen.getByRole('combobox', { name: welcome.language.label })).toBeEnabled()
    screen.getAllByRole('radio').forEach((radio) => expect(radio).toBeEnabled())
  })

  it('does not fire a second PATCH while the first is still running', () => {
    journey.postpone = jest.fn(() => new Promise(() => {}))
    journey.postponeState = { phase: 'pending', error: null }
    renderScreen()

    const postponeButton = screen.getByRole('button', { name: welcome.postpone })
    fireEvent.click(postponeButton)
    fireEvent.click(postponeButton)

    expect(journey.postpone).not.toHaveBeenCalled()
  })
})

describe('beginning the journey', () => {
  it('advances without saving anything of its own', () => {
    renderScreen()

    fireEvent.click(screen.getByRole('button', { name: welcome.begin }))

    expect(onNext).toHaveBeenCalledTimes(1)
    expect(journey.postpone).not.toHaveBeenCalled()
    expect(preferences.setPreference).not.toHaveBeenCalled()
  })
})

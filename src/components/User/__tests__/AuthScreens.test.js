/**
 * QA-009 — the first two screens a new user meets: Login and Register.
 *
 * What is pinned is what goes wrong in front of a stranger: a refusal must
 * read as a sentence in their language, never as Firebase's English; the
 * invite gate must stop before a Firebase account exists (ADR-038); and each
 * success must land where it says it will.
 */
import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } })
}))

const mockAuthService = { login: jest.fn(), loginWithGoogle: jest.fn(), logout: jest.fn(), register: jest.fn() }
jest.mock('@nowry/core/api/services/auth.service', () => ({ authService: mockAuthService }))

const mockCheckInvite = jest.fn()
jest.mock('@nowry/core/api/services/beta.service', () => ({ betaService: { checkInvite: (...args) => mockCheckInvite(...args) } }))

let mockBeta = { invite_required: false }
jest.mock('@nowry/core/context/BetaContext', () => ({ useBeta: () => ({ config: mockBeta }) }))
jest.mock('@nowry/core/context/AuthContext', () => ({ useAuth: () => ({ login: jest.fn() }) }))
jest.mock('../../Public/WaitlistForm', () => () => null)

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => mockNavigate }))

const Login = require('../Login').default
const Register = require('../Register').default

const firebaseError = (code) => Object.assign(new Error(`Firebase: Error (${code}).`), { code })

let location
beforeEach(() => {
  mockBeta = { invite_required: false }
  location = { href: '' }
  delete window.location
  window.location = location
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => console.error.mockRestore())

const renderIn = (screenElement) => render(<MemoryRouter>{screenElement}</MemoryRouter>)

// ── Login ────────────────────────────────────────────────────────────────────

const signIn = (email = 'me@example.com', password = 'correct horse') => {
  const { container } = renderIn(<Login />)
  fireEvent.change(container.querySelector('input[type="email"]'), { target: { value: email } })
  fireEvent.change(container.querySelector('input[type="password"]'), { target: { value: password } })
  fireEvent.submit(container.querySelector('form'))
}

describe('Login', () => {
  it('signs in with email and goes home', async () => {
    mockAuthService.login.mockResolvedValue({})
    signIn()
    await waitFor(() => expect(location.href).toBe('/'))
    expect(mockAuthService.login).toHaveBeenCalledWith('me@example.com', 'correct horse')
  })

  it.each([
    ['auth/wrong-password', 'auth.errors.invalidCredentials'],
    ['auth/too-many-requests', 'auth.errors.tooManyAttempts'],
    ['auth/network-request-failed', 'auth.errors.networkError']
  ])('%s reads as %s, not as Firebase English', async (code, key) => {
    mockAuthService.login.mockRejectedValue(firebaseError(code))
    signIn()
    expect(await screen.findByText(key)).toBeInTheDocument()
    expect(screen.queryByText(/Firebase: Error/)).toBeNull()
    expect(location.href).toBe('')
  })

  it('sends a first Google sign-in to onboarding', async () => {
    mockAuthService.loginWithGoogle.mockResolvedValueOnce({ backendUser: { wizard_completed: false } })
    renderIn(<Login />)
    fireEvent.click(screen.getByText('auth.signInGoogle'))
    await waitFor(() => expect(location.href).toBe('/onboarding'))
  })

  it('signs a Google identity without an invite back out and says why (ADR-038)', async () => {
    mockAuthService.loginWithGoogle.mockRejectedValue({ response: { status: 403, data: { detail: { code: 'beta_invite_required' } } } })
    mockAuthService.logout.mockResolvedValue()
    renderIn(<Login />)
    fireEvent.click(screen.getByText('auth.signInGoogle'))
    expect(await screen.findByText('beta.inviteRequired')).toBeInTheDocument()
    expect(mockAuthService.logout).toHaveBeenCalled()
    expect(location.href).toBe('')
  })
})

// ── Register ─────────────────────────────────────────────────────────────────

const fill = (container, values) => {
  for (const [name, value] of Object.entries(values)) {
    fireEvent.change(container.querySelector(`input[name="${name}"]`), { target: { name, value } })
  }
}

const VALID = { username: 'new_learner', email: 'new@example.com', password: 'Str0ng-enough!', passwordConfirmation: 'Str0ng-enough!' }

const register = (values = VALID, { acceptTerms = true } = {}) => {
  const { container } = renderIn(<Register />)
  if (mockBeta.invite_required && values.inviteCode !== undefined) fill(container, { inviteCode: values.inviteCode })
  const { inviteCode, ...fields } = values
  fill(container, fields)
  if (acceptTerms) fireEvent.click(container.querySelector('input[type="checkbox"]'))
  fireEvent.submit(container.querySelector('form'))
  return container
}

describe('Register', () => {
  it('creates the account and heads for onboarding', async () => {
    mockAuthService.register.mockResolvedValue({})
    register()
    await waitFor(() => expect(mockAuthService.register).toHaveBeenCalledWith('new@example.com', 'Str0ng-enough!', 'new_learner', ''))
    expect(mockNavigate).toHaveBeenCalledWith('/register?returnUrl=%2Fonboarding', { replace: true })
  })

  it('names every missing or wrong field and creates nothing', async () => {
    register({ ...VALID, passwordConfirmation: 'different' }, { acceptTerms: false })
    expect(await screen.findByText('auth.errors.passwordMismatch')).toBeInTheDocument()
    expect(screen.getByText('auth.errors.termsRequired')).toBeInTheDocument()
    expect(mockAuthService.register).not.toHaveBeenCalled()
  })

  it('reads an address already in use as a sentence, not as Firebase English', async () => {
    mockAuthService.register.mockRejectedValue(firebaseError('auth/email-already-in-use'))
    register()
    expect(await screen.findByText('auth.errors.accountExistsDifferent')).toBeInTheDocument()
    expect(screen.queryByText(/Firebase: Error/)).toBeNull()
  })

  it('falls back to its own sentence for an error with no code', async () => {
    mockAuthService.register.mockRejectedValue(new Error('socket hang up'))
    register()
    expect(await screen.findByText('auth.errors.serverError')).toBeInTheDocument()
    expect(screen.queryByText('socket hang up')).toBeNull()
  })

  it("puts the server's username refusal on the field", async () => {
    mockAuthService.register.mockRejectedValue({ response: { status: 422, data: { detail: [{ loc: ['body', 'username'] }] } } })
    register()
    expect(await screen.findByText('settings.account.usernameInvalid')).toBeInTheDocument()
  })

  describe('while invites are required (ADR-038)', () => {
    beforeEach(() => {
      mockBeta = { invite_required: true }
    })

    it('checks the code before any Firebase account exists, and stops on a wrong one', async () => {
      mockCheckInvite.mockResolvedValue({ valid: false })
      register({ ...VALID, inviteCode: 'nope' })
      expect(await screen.findByText('beta.inviteInvalid')).toBeInTheDocument()
      expect(mockCheckInvite).toHaveBeenCalledWith('nope')
      expect(mockAuthService.register).not.toHaveBeenCalled()
    })

    it('passes a good code through to the account', async () => {
      mockCheckInvite.mockResolvedValue({ valid: true, cohort: 'friends' })
      mockAuthService.register.mockResolvedValue({})
      register({ ...VALID, inviteCode: ' FRIENDS-1 ' })
      await waitFor(() =>
        expect(mockAuthService.register).toHaveBeenCalledWith('new@example.com', 'Str0ng-enough!', 'new_learner', 'FRIENDS-1')
      )
    })

    it('refuses an empty code without asking the server', async () => {
      register({ ...VALID, inviteCode: '' })
      expect(await screen.findByText('beta.inviteInvalid')).toBeInTheDocument()
      expect(mockCheckInvite).not.toHaveBeenCalled()
    })
  })
})

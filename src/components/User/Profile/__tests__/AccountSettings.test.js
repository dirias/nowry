/**
 * QA-020 — the account settings page's destructive actions.
 *
 * The page was 0 % covered. What is pinned is what must not go wrong in front
 * of a signed-in user: the account cannot be deleted until the typed email
 * matches, one match calls the service exactly once, the API's refusal is
 * shown rather than swallowed, and the password form refuses a mismatch or a
 * short password before Firebase is asked to re-authenticate.
 */
import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ADR-076: the verification line has its own test; here it is absent.
jest.mock('@nowry/core/hooks/useEmailVerification', () => ({ useEmailVerification: () => ({ needed: false }) }))
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'en', changeLanguage: jest.fn() } })
}))

const mockUserService = {
  getProfile: jest.fn(),
  deleteAccount: jest.fn(),
  exportData: jest.fn(),
  patchProfile: jest.fn(),
  updateNotifications: jest.fn(),
  updateGeneralPreferences: jest.fn(),
  changePassword: jest.fn(),
  setPassword: jest.fn()
}
jest.mock('@nowry/core/api/services', () => ({ userService: mockUserService }))
// The deletion dialog's hook reads these two directly (ADR-089).
jest.mock('@nowry/core/api/services/user.service', () => ({ userService: mockUserService }))
const mockAuthService = {
  signInTime: jest.fn(),
  signInProviders: () => ['password'],
  reauthenticate: jest.fn(),
  signInAgainWithPassword: jest.fn(),
  reloadProviders: jest.fn()
}
jest.mock('@nowry/core/api/services/auth.service', () => ({ authService: mockAuthService }))
jest.mock('@nowry/core/api/services/agent.service', () => ({ agentService: { updatePrefs: jest.fn() } }))
jest.mock('@nowry/core/platform', () => ({ alerts: { toast: jest.fn(), confirm: jest.fn() } }))
jest.mock('@nowry/core/context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'ana@example.com' }, subscriptionTier: 'free', updateUser: jest.fn() })
}))
jest.mock('@nowry/core/context/AgentContext', () => ({
  usePet: () => ({ knowledgeAccessEnabled: false, proactiveNudgingEnabled: false, updateAgentPrefs: jest.fn() })
}))
jest.mock('@nowry/core/hooks/useBlockReminders', () => ({
  useBlockReminderSetting: () => ({ enabled: false, setEnabled: jest.fn(), supported: false })
}))
jest.mock('../../../../theme/DynamicThemeProvider', () => ({
  useThemePreferences: () => ({ themeColor: '#2a6971', setThemeColor: jest.fn() })
}))
jest.mock('../../../../config/firebase.config', () => ({ auth: { currentUser: { email: 'ana@example.com' } } }))
const mockReauth = jest.fn()
jest.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: jest.fn() },
  reauthenticateWithCredential: (...args) => mockReauth(...args),
  updatePassword: jest.fn()
}))
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }))
jest.mock('@mui/joy/styles', () => ({
  ...jest.requireActual('@mui/joy/styles'),
  useColorScheme: () => ({ mode: 'light', setMode: jest.fn() })
}))
jest.mock('../LearningPreferencesSection', () => () => null)

const AccountSettings = require('../AccountSettings').default

const renderPage = async () => {
  mockUserService.getProfile.mockResolvedValue({
    username: 'ana',
    notification_preferences: { email_digest: true },
    preferences: { general: {}, pomodoro: {}, agent: {} }
  })
  render(
    <MemoryRouter>
      <AccountSettings />
    </MemoryRouter>
  )
  await waitFor(() => expect(mockUserService.getProfile).toHaveBeenCalled())
  // The sections draw skeletons until the profile has loaded.
  await screen.findByRole('button', { name: 'settings.security.changePasswordCta' })
}

const openDeleteModal = () => fireEvent.click(screen.getByRole('button', { name: 'settings.dangerZone.deleteButton' }))
const confirmButton = (name = 'settings.deleteAccount.confirmDisabled') => screen.getByRole('button', { name })
const freshSignIn = () => mockAuthService.signInTime.mockResolvedValue(Math.floor(Date.now() / 1000) - 30)
const emailField = () => screen.getByPlaceholderText('settings.deleteAccount.emailPlaceholder')

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  delete window.location
  window.location = { href: '/settings' }
})
afterEach(() => console.error.mockRestore())

describe('deleting the account', () => {
  it('stays disabled until the typed email matches', async () => {
    await renderPage()
    openDeleteModal()
    expect(confirmButton()).toBeDisabled()
    fireEvent.change(emailField(), { target: { value: 'someone@else.com' } })
    expect(confirmButton()).toBeDisabled()
    expect(screen.getByText('settings.deleteAccount.emailMismatch')).toBeInTheDocument()
    expect(mockUserService.deleteAccount).not.toHaveBeenCalled()
  })

  it('calls the service once in the reader language, clears storage and leaves for the landing page', async () => {
    freshSignIn()
    mockUserService.deleteAccount.mockResolvedValue({})
    localStorage.setItem('nowry.something', '1')
    await renderPage()
    openDeleteModal()
    fireEvent.change(emailField(), { target: { value: 'ana@example.com' } })
    expect(confirmButton('settings.deleteAccount.confirmEnabled')).toBeEnabled()
    fireEvent.click(confirmButton('settings.deleteAccount.confirmEnabled'))
    await waitFor(() => expect(mockUserService.deleteAccount).toHaveBeenCalledTimes(1))
    expect(mockUserService.deleteAccount).toHaveBeenCalledWith('en')
    await waitFor(() => expect(window.location.href).toBe('/'))
    expect(localStorage.getItem('nowry.something')).toBeNull()
  })

  it('asks for the password again when the sign-in is old, then deletes (ADR-089)', async () => {
    mockAuthService.signInTime.mockResolvedValue(Math.floor(Date.now() / 1000) - 3600)
    mockAuthService.reauthenticate.mockResolvedValue()
    mockUserService.deleteAccount.mockResolvedValue({})
    await renderPage()
    openDeleteModal()
    fireEvent.change(emailField(), { target: { value: 'ana@example.com' } })
    fireEvent.click(confirmButton('settings.deleteAccount.confirmEnabled'))
    expect(await screen.findByText('settings.deleteAccount.reauth.body')).toBeInTheDocument()
    expect(mockUserService.deleteAccount).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('settings.deleteAccount.reauth.passwordLabel', { exact: false }), {
      target: { value: 'Str0ng-enough!' }
    })
    fireEvent.click(confirmButton('settings.deleteAccount.reauth.confirm'))
    await waitFor(() => expect(mockUserService.deleteAccount).toHaveBeenCalledTimes(1))
    expect(mockAuthService.reauthenticate).toHaveBeenCalledWith({ method: 'password', password: 'Str0ng-enough!' })
  })

  it("shows the API's refusal and keeps the account", async () => {
    freshSignIn()
    mockUserService.deleteAccount.mockRejectedValue({ response: { data: { detail: 'You have 1 public deck(s). Unpublish first.' } } })
    await renderPage()
    openDeleteModal()
    fireEvent.change(emailField(), { target: { value: 'ana@example.com' } })
    fireEvent.click(confirmButton('settings.deleteAccount.confirmEnabled'))
    expect(await screen.findByText('You have 1 public deck(s). Unpublish first.')).toBeInTheDocument()
    expect(window.location.href).toBe('/settings')
  })
})

describe('changing the password (ADR-092)', () => {
  const openForm = () => fireEvent.click(screen.getByRole('button', { name: 'settings.security.changePasswordCta' }))
  const fill = (current, next, confirmation) => {
    const form = screen.getByTestId('password-section')
    fireEvent.change(form.querySelector('input[name="current-password"]'), { target: { value: current } })
    fireEvent.change(form.querySelector('input[name="new-password"]'), { target: { value: next } })
    fireEvent.change(form.querySelector('input[name="confirm-password"]'), { target: { value: confirmation } })
    fireEvent.click(screen.getByRole('button', { name: 'settings.security.save' }))
  }

  it('asks for the current password with the new one and refuses a mismatch before asking the API', async () => {
    await renderPage()
    openForm()
    fill('Old-password-1', 'long-enough-1', 'long-enough-2')
    expect(await screen.findByText('settings.security.passwordMismatch')).toBeInTheDocument()
    expect(mockUserService.changePassword).not.toHaveBeenCalled()
  })

  it('refuses a short password', async () => {
    await renderPage()
    openForm()
    fill('Old-password-1', 'short', 'short')
    expect(await screen.findByText('settings.security.passwordTooShort')).toBeInTheDocument()
    expect(mockUserService.changePassword).not.toHaveBeenCalled()
  })

  it('a wrong current password is said plainly and changes nothing', async () => {
    mockUserService.changePassword.mockRejectedValue({ response: { status: 400, data: { detail: { code: 'wrong_password' } } } })
    await renderPage()
    openForm()
    fill('nope-nope', 'long-enough-1', 'long-enough-1')
    expect(await screen.findByText('settings.security.wrongPassword')).toBeInTheDocument()
    expect(mockAuthService.signInAgainWithPassword).not.toHaveBeenCalled()
  })

  it('the right one changes it through the API, signs in again with the new one and says other devices were signed out', async () => {
    mockUserService.changePassword.mockResolvedValue({ status: 'changed' })
    mockAuthService.signInAgainWithPassword.mockResolvedValue()
    await renderPage()
    openForm()
    fill('Old-password-1', 'long-enough-1', 'long-enough-1')
    expect(await screen.findByText('settings.security.passwordChanged')).toBeInTheDocument()
    expect(mockUserService.changePassword).toHaveBeenCalledWith('Old-password-1', 'long-enough-1', 'en')
    expect(mockAuthService.signInAgainWithPassword).toHaveBeenCalledWith('long-enough-1')
  })
})

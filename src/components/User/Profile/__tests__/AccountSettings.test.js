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

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'en', changeLanguage: jest.fn() } })
}))

const mockUserService = {
  getProfile: jest.fn(),
  deleteAccount: jest.fn(),
  exportData: jest.fn(),
  patchProfile: jest.fn(),
  updateNotifications: jest.fn(),
  updateGeneralPreferences: jest.fn()
}
jest.mock('@nowry/core/api/services', () => ({ userService: mockUserService }))
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
const confirmButton = () => screen.getByRole('button', { name: 'settings.deleteAccount.title' })
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

  it('calls the service once, clears storage and leaves for the landing page', async () => {
    mockUserService.deleteAccount.mockResolvedValue({})
    localStorage.setItem('nowry.something', '1')
    await renderPage()
    openDeleteModal()
    fireEvent.change(emailField(), { target: { value: 'ana@example.com' } })
    expect(confirmButton()).toBeEnabled()
    fireEvent.click(confirmButton())
    await waitFor(() => expect(mockUserService.deleteAccount).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(window.location.href).toBe('/'))
    expect(localStorage.getItem('nowry.something')).toBeNull()
  })

  it("shows the API's refusal and keeps the account", async () => {
    mockUserService.deleteAccount.mockRejectedValue({ response: { data: { detail: 'You have 1 public deck(s). Unpublish first.' } } })
    await renderPage()
    openDeleteModal()
    fireEvent.change(emailField(), { target: { value: 'ana@example.com' } })
    fireEvent.click(confirmButton())
    expect(await screen.findByText('You have 1 public deck(s). Unpublish first.')).toBeInTheDocument()
    expect(window.location.href).toBe('/settings')
  })
})

describe('changing the password', () => {
  const openForm = () => fireEvent.click(screen.getByRole('button', { name: 'settings.security.changePasswordCta' }))
  const typePasswords = (first, second) => {
    fireEvent.change(screen.getByPlaceholderText('settings.security.newPassword'), { target: { value: first } })
    fireEvent.change(screen.getByPlaceholderText('settings.security.confirmPassword'), { target: { value: second } })
    fireEvent.click(screen.getByRole('button', { name: 'settings.security.save' }))
  }

  it('refuses a mismatch before asking Firebase to re-authenticate', async () => {
    await renderPage()
    openForm()
    typePasswords('long-enough-1', 'long-enough-2')
    expect(screen.getByText('settings.security.passwordMismatch')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('settings.security.currentPassword')).not.toBeInTheDocument()
    expect(mockReauth).not.toHaveBeenCalled()
  })

  it('refuses a short password', async () => {
    await renderPage()
    openForm()
    typePasswords('short', 'short')
    expect(screen.getByText('settings.security.passwordTooShort')).toBeInTheDocument()
    expect(mockReauth).not.toHaveBeenCalled()
  })

  it('asks for the current password once the new one is valid', async () => {
    await renderPage()
    openForm()
    typePasswords('long-enough-1', 'long-enough-1')
    expect(screen.getByPlaceholderText('settings.security.currentPassword')).toBeInTheDocument()
  })
})

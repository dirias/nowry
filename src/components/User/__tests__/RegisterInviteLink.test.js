/**
 * INVITE-005 — Register arrives from an invite link and waits for the email
 * (ADR-077, FR-019; Design C on the Waitlist page).
 */
import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, values) => (values?.email ? `${key} ${values.email}` : key), i18n: { language: 'es' } })
}))

const mockAuthService = {
  register: jest.fn(),
  loginWithGoogle: jest.fn(),
  logout: jest.fn(),
  heldSignUp: jest.fn(),
  holdInviteForCurrentUser: jest.fn(),
  finishHeldSignUp: jest.fn(),
  abandonHeldSignUp: jest.fn(),
  sendVerification: jest.fn()
}
jest.mock('@nowry/core/api/services/auth.service', () => ({ authService: mockAuthService }))

const mockCheckInvite = jest.fn()
jest.mock('@nowry/core/api/services/beta.service', () => ({ betaService: { checkInvite: (...args) => mockCheckInvite(...args) } }))
jest.mock('@nowry/core/context/BetaContext', () => ({ useBeta: () => ({ config: { invite_required: true } }) }))
const mockCheckUser = jest.fn()
jest.mock('@nowry/core/context/AuthContext', () => ({ useAuth: () => ({ checkUser: mockCheckUser }) }))
jest.mock('../../Public/WaitlistForm', () => {
  const WaitlistFormStub = () => <div data-testid='waitlist' />
  return WaitlistFormStub
})

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => mockNavigate }))

const Register = require('../Register').default

const TOKEN = 'nwi_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG'
const refusal = (code) => ({ response: { status: 403, data: { detail: { code } } } })

beforeEach(() => {
  Object.values(mockAuthService).forEach((fn) => fn.mockReset())
  mockAuthService.heldSignUp.mockReturnValue(null)
  mockAuthService.holdInviteForCurrentUser.mockReturnValue(false)
  mockCheckInvite.mockReset().mockResolvedValue({ valid: true, cohort: null })
  mockCheckUser.mockReset().mockResolvedValue(undefined)
  mockNavigate.mockReset()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => console.error.mockRestore())

const open = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Register />
    </MemoryRouter>
  )
const inviteField = (container) => container.querySelector('input[name="inviteCode"]')

const submit = (container) => {
  const set = (name, value) => fireEvent.change(container.querySelector(`input[name="${name}"]`), { target: { name, value } })
  set('username', 'ana_typed')
  set('email', 'ana@example.com')
  set('password', 'Str0ng-enough!')
  set('passwordConfirmation', 'Str0ng-enough!')
  fireEvent.click(container.querySelector('input[type="checkbox"]'))
  fireEvent.submit(container.querySelector('form'))
}

describe('arriving from an invite link', () => {
  it('fills and locks the field, says the invite is applied, and hides the waitlist', async () => {
    const { container } = open(`/register?invite=${TOKEN}`)
    expect(inviteField(container)).toHaveValue(TOKEN)
    expect(inviteField(container)).toHaveAttribute('readonly')
    expect(screen.getByRole('status')).toHaveTextContent('beta.personal.applied')
    expect(screen.queryByTestId('waitlist')).toBeNull()
    await waitFor(() => expect(mockCheckInvite).toHaveBeenCalledWith(TOKEN))
  })

  it('takes the token out of the address bar', () => {
    open(`/register?invite=${TOKEN}`)
    expect(mockNavigate).toHaveBeenCalledWith('/register', { replace: true })
  })

  it('says so before anything is typed when the link can no longer be used, and offers the waitlist', async () => {
    mockCheckInvite.mockResolvedValue({ valid: false, cohort: null })
    const { container } = open(`/register?invite=${TOKEN}`)
    expect(await screen.findByText('beta.inviteInvalid')).toBeInTheDocument()
    expect(inviteField(container)).not.toHaveAttribute('readonly')
    expect(screen.queryByText('beta.personal.applied')).toBeNull()
    expect(screen.getByTestId('waitlist')).toBeInTheDocument()
  })

  it('leaves the form alone when the check cannot be reached', async () => {
    mockCheckInvite.mockRejectedValue(new Error('offline'))
    const { container } = open(`/register?invite=${TOKEN}`)
    await waitFor(() => expect(mockCheckInvite).toHaveBeenCalled())
    expect(inviteField(container)).toHaveAttribute('readonly')
    expect(screen.queryByText('beta.inviteInvalid')).toBeNull()
  })

  it('without a link the field is empty and editable, and the waitlist is offered', () => {
    const { container } = open('/register')
    expect(inviteField(container)).toHaveValue('')
    expect(inviteField(container)).not.toHaveAttribute('readonly')
    expect(screen.getByTestId('waitlist')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(mockCheckInvite).not.toHaveBeenCalled()
  })

  it('ignores an email in the link', () => {
    const { container } = open('/register?email=ana@example.com')
    expect(container.querySelector('input[name="email"]')).toHaveValue('')
  })
})

describe('the confirm-your-email step', () => {
  const reachConfirm = async () => {
    mockAuthService.register.mockRejectedValue(refusal('invite_verify_email'))
    const view = open(`/register?invite=${TOKEN}`)
    submit(view.container)
    await screen.findByText('beta.personal.confirmBody ana@example.com')
    return view
  }

  it('replaces the form when the server waits for the email, sending the token with the sign-up', async () => {
    const { container } = await reachConfirm()
    expect(mockAuthService.register).toHaveBeenCalledWith('ana@example.com', 'Str0ng-enough!', 'ana_typed', TOKEN, 'es')
    expect(container.querySelector('form')).toBeNull()
    expect(screen.getByRole('heading', { name: 'auth.verify.title' })).toBeInTheDocument()
  })

  it('says "not yet" while the link is unopened', async () => {
    await reachConfirm()
    mockAuthService.finishHeldSignUp.mockResolvedValue({ status: 'unverified' })
    fireEvent.click(screen.getByRole('button', { name: 'auth.verify.check' }))
    expect(await screen.findByText('auth.verify.notYet')).toBeInTheDocument()
    expect(mockCheckUser).not.toHaveBeenCalled()
  })

  it('finishes, loads the account and heads for onboarding once confirmed', async () => {
    await reachConfirm()
    mockNavigate.mockClear()
    mockAuthService.finishHeldSignUp.mockResolvedValue({ status: 'done', backendUser: { wizard_completed: false } })
    fireEvent.click(screen.getByRole('button', { name: 'auth.verify.check' }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/onboarding', { replace: true }))
    expect(mockCheckUser).toHaveBeenCalled()
  })

  /*
   * The sequence that failed on dev, 12 November 2026: an invite for one
   * address, a sign-up with another, that other address confirmed, then
   * "I've confirmed". The server refuses. The person must see the refusal and
   * the way out, and must not be taken to onboarding or anywhere else.
   */
  it('another address, confirmed, sees the refusal and the way out, and goes nowhere', async () => {
    const { container } = await reachConfirm()
    mockNavigate.mockClear()
    mockAuthService.finishHeldSignUp.mockRejectedValue(refusal('beta_invite_required'))

    fireEvent.click(screen.getByRole('button', { name: 'auth.verify.check' }))

    expect(await screen.findByText('beta.personal.notUsable')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'beta.personal.useAnother' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'auth.verify.title' })).toBeInTheDocument()
    expect(container.querySelector('form')).toBeNull()
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(mockCheckUser).not.toHaveBeenCalled()

    // Pressing again changes nothing: still refused, still here.
    fireEvent.click(screen.getByRole('button', { name: 'auth.verify.check' }))
    await waitFor(() => expect(mockAuthService.finishHeldSignUp).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('beta.personal.notUsable')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('a server fault on that press says so and goes nowhere', async () => {
    await reachConfirm()
    mockNavigate.mockClear()
    mockAuthService.finishHeldSignUp.mockRejectedValue({ response: { status: 500 } })
    fireEvent.click(screen.getByRole('button', { name: 'auth.verify.check' }))
    expect(await screen.findByText('auth.verify.failed')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('sends the link again in the page language, and says when that fails', async () => {
    await reachConfirm()
    mockAuthService.sendVerification.mockResolvedValueOnce(true)
    fireEvent.click(screen.getByRole('button', { name: 'auth.verify.resend' }))
    expect(await screen.findByText('auth.verify.sent')).toBeInTheDocument()
    expect(mockAuthService.sendVerification).toHaveBeenCalledWith('es')

    mockAuthService.sendVerification.mockRejectedValueOnce(new Error('quota'))
    fireEvent.click(screen.getByRole('button', { name: 'auth.verify.resend' }))
    expect(await screen.findByText('auth.verify.failed')).toBeInTheDocument()
  })

  it('"use a different email" signs the identity out and returns to the form', async () => {
    const { container } = await reachConfirm()
    mockAuthService.abandonHeldSignUp.mockResolvedValue(undefined)
    fireEvent.click(screen.getByRole('button', { name: 'beta.personal.useAnother' }))
    await waitFor(() => expect(container.querySelector('form')).not.toBeNull())
    expect(mockAuthService.abandonHeldSignUp).toHaveBeenCalled()
  })

  it('opens directly for a sign-up that was left waiting', async () => {
    mockAuthService.heldSignUp.mockReturnValue({ inviteCode: TOKEN, username: 'ana_typed', email: 'ana@example.com' })
    const { container } = open('/register')
    expect(await screen.findByText('beta.personal.confirmBody ana@example.com')).toBeInTheDocument()
    expect(container.querySelector('form')).toBeNull()
  })

  it('holds a link opened by an identity that has no account, and opens the step', async () => {
    mockAuthService.holdInviteForCurrentUser.mockReturnValue(true)
    mockAuthService.heldSignUp.mockReturnValue({ inviteCode: TOKEN, username: '', email: 'ana@example.com' })
    open(`/register?invite=${TOKEN}`)
    expect(mockAuthService.holdInviteForCurrentUser).toHaveBeenCalledWith(TOKEN)
    expect(await screen.findByText('beta.personal.confirmBody ana@example.com')).toBeInTheDocument()
  })

  it('any other refusal stays on the form', async () => {
    mockAuthService.register.mockRejectedValue(refusal('beta_invite_required'))
    const { container } = open(`/register?invite=${TOKEN}`)
    submit(container)
    expect(await screen.findByText('beta.inviteInvalid')).toBeInTheDocument()
    expect(container.querySelector('form')).not.toBeNull()
  })
})

/**
 * MAIL-005 — where a link in a Nowry email lands (ADR-078 point 5, FR-022).
 */
import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, values) => (values?.email ? `${key} ${values.email}` : key), i18n: { language: 'es' } })
}))

const mockAuthService = {
  whenReady: jest.fn(),
  applyEmailCode: jest.fn(),
  confirmVerification: jest.fn(),
  heldSignUp: jest.fn(),
  checkResetCode: jest.fn(),
  confirmReset: jest.fn(),
  login: jest.fn()
}
jest.mock('@nowry/core/api/services/auth.service', () => ({
  get authService() {
    return mockAuthService
  }
}))
jest.mock('../../Common/Brand/BrandMark', () => ({ BrandWordmark: () => null }))

import EmailAction from '../EmailAction'

const Where = () => {
  const location = useLocation()
  return <span data-testid='where'>{location.pathname + location.search}</span>
}

let nextCode = 0
const open = (query) =>
  render(
    <MemoryRouter initialEntries={[`/auth/action${query}`]}>
      <Routes>
        <Route path='/auth/action' element={<EmailAction />} />
        <Route path='*' element={null} />
      </Routes>
      <Where />
    </MemoryRouter>
  )
const fresh = () => `CODE${(nextCode += 1)}`
const key = (name) => screen.getByRole('link', { name })
const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

beforeEach(() => {
  Object.values(mockAuthService).forEach((mock) => mock.mockReset())
  mockAuthService.heldSignUp.mockReturnValue(null)
  mockAuthService.whenReady.mockResolvedValue(null)
})

describe('a link that is not one of ours', () => {
  it.each(['', '?mode=verifyEmail', '?mode=recoverEmail&oobCode=X', '?oobCode=X'])('goes home: "%s"', (query) => {
    open(query)
    expect(screen.getByTestId('where').textContent).toBe('/')
  })
})

describe('a verification link', () => {
  it('confirms on load, takes the code out of the address bar, and sends a signed-out person to sign in', async () => {
    const code = fresh()
    mockAuthService.applyEmailCode.mockResolvedValue(undefined)
    open(`?mode=verifyEmail&oobCode=${code}`)
    expect(screen.getByRole('status').textContent).toBe('auth.action.working')
    expect(await screen.findByRole('heading', { name: 'auth.action.verifiedTitle' })).toBeTruthy()
    expect(mockAuthService.applyEmailCode).toHaveBeenCalledTimes(1)
    expect(mockAuthService.applyEmailCode).toHaveBeenCalledWith(code)
    expect(screen.getByTestId('where').textContent).toBe('/auth/action')
    expect(key('auth.action.signIn').getAttribute('href')).toBe('/login')
  })

  it('opens Nowry for a signed-in person, and finishes a sign-up that was waiting on it', async () => {
    mockAuthService.whenReady.mockResolvedValue({ uid: 'u1' })
    mockAuthService.applyEmailCode.mockResolvedValue(undefined)
    const first = open(`?mode=verifyEmail&oobCode=${fresh()}`)
    await waitFor(() => expect(key('auth.action.open').getAttribute('href')).toBe('/'))
    first.unmount()
    mockAuthService.heldSignUp.mockReturnValue({ inviteCode: 'nwi_x', username: 'ana', email: 'ana@x.io' })
    open(`?mode=verifyEmail&oobCode=${fresh()}`)
    await waitFor(() => expect(key('auth.action.finish').getAttribute('href')).toBe('/register?finish=1'))
  })

  it('reads a spent code as confirmed when the address already is', async () => {
    mockAuthService.whenReady.mockResolvedValue({ uid: 'u1' })
    mockAuthService.applyEmailCode.mockRejectedValue(new Error('auth/invalid-action-code'))
    mockAuthService.confirmVerification.mockResolvedValue(true)
    open(`?mode=verifyEmail&oobCode=${fresh()}`)
    expect(await screen.findByRole('heading', { name: 'auth.action.verifiedTitle' })).toBeTruthy()
  })

  it('says a spent or expired link no longer works, and where to get another', async () => {
    mockAuthService.applyEmailCode.mockRejectedValue(new Error('auth/expired-action-code'))
    open(`?mode=verifyEmail&oobCode=${fresh()}`)
    expect(await screen.findByRole('heading', { name: 'auth.action.usedTitle' })).toBeTruthy()
    expect(screen.getByText('auth.action.usedBody auth.action.verifyAgain')).toBeTruthy()
    expect(key('auth.action.signIn').getAttribute('href')).toBe('/login')
    expect(mockAuthService.confirmVerification).not.toHaveBeenCalled()
  })
})

describe('a reset link', () => {
  const openForm = async () => {
    mockAuthService.checkResetCode.mockResolvedValue('ana@x.io')
    open(`?mode=resetPassword&oobCode=${fresh()}`)
    await screen.findByRole('heading', { name: 'auth.action.resetTitle' })
  }

  it('changes nothing by being opened: it shows whose password and a form', async () => {
    await openForm()
    expect(screen.getByText('auth.action.resetFor ana@x.io')).toBeTruthy()
    expect(mockAuthService.confirmReset).not.toHaveBeenCalled()
  })

  it('holds the app rules before asking Firebase', async () => {
    await openForm()
    type('auth.resetPassword.newPasswordLabel', 'short')
    type('auth.resetPassword.confirmNewPasswordLabel', 'other')
    fireEvent.click(screen.getByRole('button', { name: 'auth.action.resetSubmit' }))
    expect(await screen.findByText('auth.errors.passwordLength')).toBeTruthy()
    expect(screen.getByText('auth.errors.passwordMismatch')).toBeTruthy()
    expect(mockAuthService.confirmReset).not.toHaveBeenCalled()
  })

  it('saves the new password, signs the person in and goes home', async () => {
    mockAuthService.confirmReset.mockResolvedValue(undefined)
    mockAuthService.login.mockResolvedValue({})
    await openForm()
    type('auth.resetPassword.newPasswordLabel', 'long-enough-1')
    type('auth.resetPassword.confirmNewPasswordLabel', 'long-enough-1')
    fireEvent.click(screen.getByRole('button', { name: 'auth.action.resetSubmit' }))
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/'))
    expect(mockAuthService.confirmReset.mock.calls[0][1]).toBe('long-enough-1')
    expect(mockAuthService.login).toHaveBeenCalledWith('ana@x.io', 'long-enough-1')
  })

  it('says the password is changed and offers the sign-in page when signing in does not work', async () => {
    mockAuthService.confirmReset.mockResolvedValue(undefined)
    mockAuthService.login.mockRejectedValue(new Error('gate'))
    await openForm()
    type('auth.resetPassword.newPasswordLabel', 'long-enough-1')
    type('auth.resetPassword.confirmNewPasswordLabel', 'long-enough-1')
    fireEvent.click(screen.getByRole('button', { name: 'auth.action.resetSubmit' }))
    expect(await screen.findByRole('heading', { name: 'auth.action.resetDoneTitle' })).toBeTruthy()
    expect(key('auth.action.signIn').getAttribute('href')).toBe('/login')
  })

  it('stays on the form and says so when Firebase refuses', async () => {
    mockAuthService.confirmReset.mockRejectedValue(new Error('network'))
    await openForm()
    type('auth.resetPassword.newPasswordLabel', 'long-enough-1')
    type('auth.resetPassword.confirmNewPasswordLabel', 'long-enough-1')
    fireEvent.click(screen.getByRole('button', { name: 'auth.action.resetSubmit' }))
    expect(await screen.findByText('auth.action.resetFailed')).toBeTruthy()
    expect(mockAuthService.login).not.toHaveBeenCalled()
  })

  it('offers a new link when the code is spent or expired', async () => {
    mockAuthService.checkResetCode.mockRejectedValue(new Error('auth/expired-action-code'))
    open(`?mode=resetPassword&oobCode=${fresh()}`)
    expect(await screen.findByRole('heading', { name: 'auth.action.usedTitle' })).toBeTruthy()
    expect(key('auth.action.resetAgain').getAttribute('href')).toBe('/resetPassword')
  })
})

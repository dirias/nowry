/**
 * The public delete-account page (ACCOUNT-006, FR-029, ADR-081): the steps use
 * the screens' own words, the periods are filled in, and every language has it.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18next from 'i18next'

import en from '@nowry/core/locales/en/translation.json'
import es from '@nowry/core/locales/es/translation.json'
import fr from '@nowry/core/locales/fr/translation.json'
import de from '@nowry/core/locales/de/translation.json'
import ja from '@nowry/core/locales/ja/translation.json'
import { SENTRY_RETENTION_DAYS } from '@nowry/core/constants/site'
import DeleteAccountInfo from '../DeleteAccountInfo'

const BUNDLES = { en, es, fr, de, ja }
const i18n = i18next.createInstance()

jest.mock('react-i18next', () => ({ useTranslation: jest.fn() }))

const show = async (lng) => {
  await i18n.init({
    lng,
    resources: Object.fromEntries(Object.entries(BUNDLES).map(([l, b]) => [l, { translation: b }])),
    interpolation: { escapeValue: false }
  })
  require('react-i18next').useTranslation.mockReturnValue({ t: i18n.t.bind(i18n), i18n })
  return render(
    <MemoryRouter>
      <DeleteAccountInfo />
    </MemoryRouter>
  )
}

it.each(Object.keys(BUNDLES))('reads whole in %s, with nothing left to fill', async (lng) => {
  const { container, unmount } = await show(lng)
  const text = container.textContent
  expect(text).not.toMatch(/\{\{|\}\}|legal\.deleteAccount/)
  expect(text).toContain('support@nowry.app')
  expect(text).toContain(String(SENTRY_RETENTION_DAYS))
  expect(text).not.toContain('Langfuse')
  expect(screen.getAllByRole('heading').length).toBeGreaterThanOrEqual(7)
  unmount()
})

it('names no Langfuse records while no deployed API sends it anything (ACCOUNT-008)', async () => {
  const { container } = await show('en')
  const text = container.textContent
  expect(text).not.toContain('Langfuse')
  expect(text).toContain('Kept for up to 30 days')
  expect(text).toContain('within 7 days of your reply')
})

it('names the screens and the key as the app does', async () => {
  await show('en')
  const steps = screen.getAllByRole('listitem').map((item) => item.textContent)
  expect(steps).toContain(
    `In ${en.settings.dangerZone.title}, type your email address to confirm, then press ${en.settings.dangerZone.deleteButton}. If you signed in more than 5 minutes ago, sign in again when asked.`
  )
  expect(steps.some((step) => step.includes(en.settings.title))).toBe(true)
})

it('says what goes at once, after 30 days, and that nothing comes back on its own', async () => {
  const { container } = await show('en')
  expect(container.textContent).toContain('Erased for good after 30 days')
  expect(container.textContent).toContain('Nothing comes back on its own.')
  expect(container.textContent).toContain('you can sign up again with the same address, and the new account starts empty')
})

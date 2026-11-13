/**
 * The privacy policy says what the code does (GTM-017, FR-028): the waitlist,
 * its two emails and how to leave, where data is kept, and every service that
 * handles it. Read from the real English text, so a removed sentence fails here.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import en from '@nowry/core/locales/en/translation.json'
import PrivacyPolicy from '../PrivacyPolicy'

const read = (key) => key.split('.').reduce((node, part) => node?.[part], en)

jest.mock('react-i18next', () => ({ useTranslation: jest.fn() }))

const SERVICES = [
  'Firebase Authentication',
  'MongoDB Atlas',
  'Railway',
  'Gemini',
  'Groq',
  'Text-to-Speech',
  'fal.ai',
  'Cloudinary',
  'Stripe',
  'Resend',
  'Sentry',
  'Expo'
]

beforeEach(() => {
  // CRA resets mocks before each test, so the stand-in for `t` is given its words here.
  require('react-i18next').useTranslation.mockReturnValue({
    t: (key, options) => (options?.returnObjects ? read(key) : String(read(key) ?? key)),
    i18n: { language: 'en' }
  })
  render(
    <MemoryRouter>
      <PrivacyPolicy />
    </MemoryRouter>
  )
})

it('numbers its nine sections in order', () => {
  const titles = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
  expect(titles.map((title) => title.split('.')[0])).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9'])
})

it('says what the waitlist stores, the two emails, how to leave, and how long rows are kept', () => {
  const page = document.body.textContent
  expect(page).toContain('Waitlist Data:')
  expect(page).toContain('one email to confirm, and one more when early access opens')
  expect(page).toContain('a link to leave the list')
  expect(page).toContain('To have it deleted, write to support@nowry.app')
  expect(page).toContain('until 12 months after early access opens to everyone')
  expect(page).toContain('no tracking images and no tracked links')
  expect(page).not.toContain('other products and services')
})

it('says sign-in is Firebase and the data is in MongoDB', () => {
  const page = document.body.textContent
  expect(page).toContain('Signing in is handled by Firebase Authentication')
  expect(page).toContain('stored in a MongoDB Atlas database')
  expect(page).not.toContain('for authentication and data storage')
})

it('names every service that handles data', () => {
  const items = screen.getAllByRole('listitem').map((item) => item.textContent)
  for (const service of SERVICES) expect(items.some((item) => item.includes(service))).toBe(true)
  expect(read('legal.privacy.services.items')).toHaveLength(11)
  // No deployed API sends Langfuse anything; it is named again when it is turned on (ACCOUNT-008).
  expect(document.body.textContent).not.toContain('Langfuse')
  expect(items.some((item) => item.includes('all text, everything typed and all images are hidden'))).toBe(true)
})

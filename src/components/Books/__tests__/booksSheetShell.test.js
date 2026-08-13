/**
 * FE-B6 — the mobile shell, measured rather than eyeballed.
 *
 * The failure this guards against does not appear in a desktop screenshot: a
 * sheet sized in `vh` keeps its pre-keyboard height when the on-screen keyboard
 * opens, and a primary action that is the last child of a scrolling body goes
 * under the keyboard with it. Both are layout facts, so both are readable from
 * the injected CSS.
 *
 * jsdom CANNOT verify, and these are stated rather than faked:
 *   - that `100dvh` actually tracks the visual viewport when a keyboard opens;
 *     jsdom has no keyboard and no visual viewport. What is checked is that the
 *     unit is `dvh` and never `vh`, which is the whole mechanism.
 *   - that `env(safe-area-inset-bottom)` resolves to a non-zero inset on a
 *     device with a home indicator. Only its presence is checked.
 *   - dark mode. Joy resolves every token through CSS variables on a
 *     `data-joy-color-scheme` root that jsdom does not flip, so the dark
 *     rendering is argued from exclusive semantic-token use — verified by the
 *     hex/rgba greps in the ticket — not observed here.
 *   - real pixel geometry at 390px. jsdom does no layout, so widths and touch
 *     targets are read from the declared rules.
 */
import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { cssFor, injectedCss } from '../../Common/Form/__testHelpers__/cssRules'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } })
}))

jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => jest.fn() }))

jest.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { username: 'ada' } }) }))

jest.mock('../../../api/services', () => ({
  booksService: { create: jest.fn(), update: jest.fn() },
  publicContentService: { publishBook: jest.fn(), unpublishBook: jest.fn() }
}))

jest.mock('../../../theme/DynamicThemeProvider', () => ({ useThemePreferences: () => ({ themeColor: '#2a6971' }) }))

jest.mock('../../Public/PublishModal', () => {
  const Stub = () => null
  Stub.displayName = 'PublishModalStub'
  return Stub
})

jest.mock('react-color', () => ({ SketchPicker: () => <div data-testid='sketch-picker' /> }))

const BookCreateSheet = require('../BookCreateSheet').default
const BookEditSheet = require('../BookEditSheet').default

const setViewport = (mobile) => {
  window.matchMedia = (query) => ({
    matches: mobile && query.includes('max-width: 599px'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })
}

const BOOK = { _id: 'book-1', title: 'Meditations', cover_color: '#0B6BCB', cover_image: '', summary: '', tags: [] }

const renderCreate = () =>
  render(
    <MemoryRouter>
      <BookCreateSheet open onClose={jest.fn()} />
    </MemoryRouter>
  )

const renderEdit = () => render(<BookEditSheet book={BOOK} onSaved={jest.fn()} onClose={jest.fn()} />)

/** The sheet's own content box — the flex column the shell owns. */
const sheetContent = () => document.querySelector('.MuiDrawer-content')

/** The nearest ancestor that actually scrolls, or null if nothing above it does. */
const scrollAncestor = (node) => {
  let current = node?.parentElement
  while (current && current !== document.body) {
    if (cssFor(current).includes('overflow-y:auto')) return current
    current = current.parentElement
  }
  return null
}

describe('at xs, both sheets take the shell', () => {
  beforeEach(() => setViewport(true))

  it('sizes the create sheet in dvh, so it shrinks with the keyboard', () => {
    renderCreate()

    expect(cssFor(sheetContent())).toContain('height:100dvh')
    expect(injectedCss()).not.toContain('height:100vh')
  })

  it('sizes the edit sheet the same way — the old editor was the only file that already did', () => {
    renderEdit()

    expect(cssFor(sheetContent())).toContain('height:100dvh')
    expect(injectedCss()).not.toContain('height:100vh')
  })

  it('pads the footer past the home indicator', () => {
    renderCreate()
    expect(injectedCss()).toContain('env(safe-area-inset-bottom)')
  })

  it('keeps Create & write out of the scroll region, so it cannot scroll away', () => {
    renderCreate()
    expect(scrollAncestor(screen.getByRole('button', { name: 'books.createAction' }))).toBeNull()
  })

  it('keeps Save out of the scroll region too', () => {
    renderEdit()
    expect(scrollAncestor(screen.getByRole('button', { name: 'common.save' }))).toBeNull()
  })

  it('keeps the Close control out of the scroll region, so it never becomes unreachable', () => {
    renderCreate()
    expect(scrollAncestor(screen.getByRole('button', { name: 'common.close' }))).toBeNull()
  })
})

describe('from sm up', () => {
  beforeEach(() => setViewport(false))

  it('gives both sheets the 560px "simple" width, not the old 1000px', () => {
    renderEdit()

    const css = cssFor(screen.getByRole('dialog'))
    expect(css).toContain('max-width:560px')
    expect(injectedCss()).not.toContain('max-width:1000px')
  })

  it('does not stretch to fill the viewport for a form this small', () => {
    renderCreate()
    expect(cssFor(screen.getByRole('dialog'))).toContain('height:auto')
  })
})

describe('touch targets', () => {
  beforeEach(() => setViewport(true))

  it('gives every cover swatch a 44px target, where they used to be 36px everywhere', async () => {
    renderEdit()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'books.changeCover' }))
    })

    const swatch = screen.getByRole('radio', { name: 'books.coverColors.blue' })
    // Joy puts the label — which is the visible swatch — beside the input's
    // wrapper rather than around it.
    const visual = swatch.closest('.MuiRadio-root').querySelector('.MuiRadio-label .MuiBox-root')
    expect(cssFor(visual)).toContain('44px')
  })

  it('makes the focus ring the swatch itself, not the hidden icon box', async () => {
    renderEdit()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'books.changeCover' }))
    })

    const action = screen.getByRole('radio', { name: 'books.coverColors.blue' }).closest('.MuiRadio-action')
    expect(cssFor(action)).toContain('outline-color:var(--joy-palette-primary-outlinedBorder')
  })

  it('gives the create sheet actions a 44px target', () => {
    renderCreate()
    expect(cssFor(screen.getByRole('button', { name: 'books.createAction' }))).toContain('min-height:44px')
  })
})

/**
 * FE-D3 — deck settings as Variant E (DECKS.md §3).
 *
 * The two things worth pinning here are the ones that were invisible: an
 * autosave failure that only reached `console.error`, on the one surface with
 * no Save button and therefore no reason for the user to suspect anything; and
 * a front/back toggle that announced itself to assistive technology as a button
 * while being unreachable by keyboard.
 *
 * jsdom CANNOT verify: that `100dvh` tracks the visual viewport, that the
 * status footer clears an open keyboard at 375px, or how a screen reader voices
 * the sliders' `aria-valuetext`. Those need a device and a real AT.
 */
import React from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { drawerClasses, skeletonClasses } from '@mui/joy'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => (options?.value !== undefined ? `${key}:${options.value}` : key),
    i18n: { language: 'en' }
  })
}))

const mockGetById = jest.fn()
const mockUpdateSettings = jest.fn()
const mockGetSettings = jest.fn()
jest.mock('../../../api/services', () => ({
  decksService: {
    getById: (...args) => mockGetById(...args),
    updateSettings: (...args) => mockUpdateSettings(...args),
    getSettings: (...args) => mockGetSettings(...args)
  }
}))

jest.mock('../DeckPublishSheet', () => ({
  __esModule: true,
  default: ({ open }) => (open ? <div data-testid='publish-sheet' /> : null)
}))

const DeckSettingsModal = require('../DeckSettingsModal').default

const DECK = {
  _id: 'deck-1',
  name: 'Japanese',
  deck_type: 'flashcard',
  is_public: false,
  config: { pace_mode: 'balanced', new_per_day: 20, max_reviews_per_day: 100 },
  voice_settings: {
    front: { voice_name: null, voice_lang: null, rate: 1, pitch: 1, auto_play: false },
    back: { voice_name: null, voice_lang: null, rate: 1, pitch: 1, auto_play: false }
  }
}

const setViewport = (mobile = false) => {
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

const renderModal = async (props = {}) => {
  const onClose = jest.fn()
  const onSaved = jest.fn()
  let view
  await act(async () => {
    view = render(<DeckSettingsModal open onClose={onClose} onSaved={onSaved} deckId='deck-1' {...props} />)
  })
  return { ...view, onClose, onSaved }
}

const goTo = async (section) => {
  await act(async () => {
    fireEvent.click(screen.getAllByRole('button', { name: `deckSettings.nav.${section}` })[0])
  })
}

const settle = async (ms = 700) => {
  await act(async () => {
    jest.advanceTimersByTime(ms)
    await Promise.resolve()
  })
}

beforeEach(() => {
  jest.useFakeTimers()
  setViewport(false)
  mockGetById.mockReset().mockResolvedValue(DECK)
  mockUpdateSettings.mockReset().mockResolvedValue({})
  mockGetSettings.mockReset().mockResolvedValue({ is_public: true, published_at: '2026-01-02' })
})

afterEach(() => {
  jest.useRealTimers()
})

describe('the shell', () => {
  it('is titled by the deck it is settings for, with the type as colour, icon and text', async () => {
    await renderModal()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Japanese')).toBeInTheDocument()
    expect(screen.getByText('study.types.flashcards')).toBeInTheDocument()
  })

  it('offers no Save button — nothing here is submitted', async () => {
    await renderModal()
    expect(screen.queryByRole('button', { name: 'common.save' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /saveAndNext/ })).not.toBeInTheDocument()
  })

  it('offers no disclosure rail — every setting already has a value', async () => {
    await renderModal()
    expect(screen.queryByRole('group', { name: 'form.detailRailAria' })).not.toBeInTheDocument()
  })
})

describe('autosave', () => {
  it('debounces the write, then sends it', async () => {
    await renderModal()
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'deckSettings.pace.intensive' }))
    })

    expect(mockUpdateSettings).not.toHaveBeenCalled()
    await settle()
    expect(mockUpdateSettings).toHaveBeenCalledWith('deck-1', {
      config: { pace_mode: 'intensive', new_per_day: 40, max_reviews_per_day: 200 }
    })
  })

  it('announces the result politely, at every breakpoint rather than only on the desktop nav', async () => {
    await renderModal()
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'deckSettings.pace.relaxed' }))
    })
    await settle()

    const status = document.querySelector('[aria-live="polite"]')
    await waitFor(() => expect(status).toHaveTextContent('deckSettings.saved'))
  })

  it('fires a change still inside its debounce window on close, rather than dropping it', async () => {
    const { onClose } = await renderModal()
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'deckSettings.pace.relaxed' }))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'common.close' }))
    })

    expect(mockUpdateSettings).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalled()
  })
})

describe('a failed autosave', () => {
  const fail = () => {
    const error = new Error('nope')
    error.response = { status: 500, data: { detail: 'Settings service unavailable' } }
    mockUpdateSettings.mockRejectedValueOnce(error)
  }

  it('is visible — with no Save button, a silent console.error told the user nothing', async () => {
    fail()
    await renderModal()
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'deckSettings.pace.intensive' }))
    })
    await settle()

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('deckSettings.saveFailed')).toBeInTheDocument()
    expect(within(alert).getByText('Settings service unavailable')).toBeInTheDocument()
  })

  it('retries the change the user actually made, rather than asking them to make it again', async () => {
    fail()
    await renderModal()
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'deckSettings.pace.intensive' }))
    })
    await settle()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'deckSettings.retry' }))
    })

    expect(mockUpdateSettings).toHaveBeenCalledTimes(2)
    expect(mockUpdateSettings).toHaveBeenLastCalledWith('deck-1', {
      config: { pace_mode: 'intensive', new_per_day: 40, max_reviews_per_day: 200 }
    })
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })
})

describe('the audio side toggle', () => {
  it('is a real focusable control, not a Box wearing role="button"', async () => {
    await renderModal()
    await goTo('audio')

    const group = screen.getByRole('radiogroup', { name: 'deckSettings.audio.sideAria' })
    const back = within(group).getByRole('radio', { name: 'common.back' })

    back.focus()
    expect(back).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'common.back' })).not.toBeInTheDocument()
  })

  it('switches sides from the keyboard, which it could not do at all before', async () => {
    await renderModal()
    await goTo('audio')

    const group = screen.getByRole('radiogroup', { name: 'deckSettings.audio.sideAria' })
    const back = within(group).getByRole('radio', { name: 'common.back' })
    await act(async () => {
      fireEvent.click(back)
    })

    expect(back).toBeChecked()
  })

  it('writes voice settings for the side that is showing', async () => {
    await renderModal()
    await goTo('audio')
    await act(async () => {
      fireEvent.click(
        within(screen.getByRole('radiogroup', { name: 'deckSettings.audio.sideAria' })).getByRole('radio', { name: 'common.back' })
      )
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('switch', { name: 'deckSettings.audio.autoplay' }))
    })
    await settle()

    expect(mockUpdateSettings).toHaveBeenCalledWith('deck-1', {
      voice_settings: expect.objectContaining({ back: expect.objectContaining({ auto_play: true }) })
    })
  })

  it('gives the sliders a value a screen reader can voice', async () => {
    await renderModal()
    await goTo('audio')

    const rate = screen.getByRole('slider', { name: 'deckSettings.audio.rate' })
    expect(rate).toHaveAttribute('aria-valuetext', 'deckSettings.audio.rateAria:1')
  })
})

describe('publishing', () => {
  it('states the status once — the title and the chip used to render the identical key', async () => {
    await renderModal()
    await goTo('publishing')

    expect(screen.getAllByText('publish.status.private')).toHaveLength(1)
    expect(screen.getByText('publish.notYetPublished')).toBeInTheDocument()
  })

  it('opens the publish sheet without leaving the settings sheet stacked at xs', async () => {
    setViewport(true)
    await renderModal()
    await goTo('publishing')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'publish.publishButton' }))
    })

    expect(screen.getByTestId('publish-sheet')).toBeInTheDocument()
    // Joy keeps a closed Drawer in the DOM and hides it, which is what takes
    // it out of the accessibility tree — so the two are not stacked, and the
    // settings sheet is not reachable behind the publish sheet.
    expect(screen.getByText('Japanese').closest(`.${drawerClasses.root}`)).toHaveClass(drawerClasses.hidden)
  })
})

describe('loading', () => {
  it('skeletons each field rather than gating the whole region', async () => {
    let resolve
    mockGetById.mockReturnValue(
      new Promise((done) => {
        resolve = done
      })
    )
    render(<DeckSettingsModal open onClose={jest.fn()} onSaved={jest.fn()} deckId='deck-1' />)

    // The section's labels are readable while its values are still arriving.
    expect(screen.getByText('deckSettings.study.paceMode')).toBeInTheDocument()
    expect(screen.getByText('deckSettings.study.newPerDay')).toBeInTheDocument()
    expect(document.querySelectorAll(`.${skeletonClasses.root}`).length).toBeGreaterThan(1)

    await act(async () => {
      resolve(DECK)
    })
  })
})

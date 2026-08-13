/**
 * FE-C4 — Variant D, the visual body (CARDS.md §3.3, §4.3, §4.8, §7.4).
 *
 * Three properties are pinned: the preview occupies nothing until there is
 * code, a syntax error stays in the pane and never reaches the sheet's error
 * banner, and a successful render never moves the user off the Code tab.
 *
 * jsdom CANNOT verify that Mermaid actually parses anything (it is mocked
 * here), that the tabbed layout beats the stacked one at 375px, or that the
 * status dot is distinguishable in both themes.
 */
import React from 'react'
import { act, render, screen } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } })
}))

const mockRender = jest.fn()
jest.mock('mermaid', () => ({ initialize: jest.fn(), render: (...args) => mockRender(...args) }))

const mockSanitize = jest.fn((html) => `sanitized:${html}`)
jest.mock('dompurify', () => ({ sanitize: (...args) => mockSanitize(...args) }))

const VisualCardFields = require('../VisualCardFields').default
const { emptyCardValues } = require('../cardTypes')

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

const renderBody = (props = {}) =>
  render(
    <VisualCardFields
      values={emptyCardValues()}
      setField={jest.fn()}
      errors={{}}
      revealed={new Set()}
      availableChips={['description', 'tags', 'deck']}
      onReveal={jest.fn()}
      decks={[]}
      refFor={() => () => {}}
      tagInputRef={{ current: null }}
      {...props}
    />
  )

/** Walks the debounce and lets the mocked render's promise settle. */
const settlePreview = async () => {
  await act(async () => {
    jest.advanceTimersByTime(400)
    await Promise.resolve()
    await Promise.resolve()
  })
}

const withCode = (code) => ({ values: { ...emptyCardValues(), diagramCode: code } })

describe('VisualCardFields', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    setViewport(false)
    mockRender.mockReset()
    mockSanitize.mockClear()
    mockRender.mockResolvedValue({ svg: '<svg id="diagram" />' })
  })

  afterEach(() => jest.useRealTimers())

  describe('the preview pane', () => {
    it('renders nothing and occupies nothing until there is code', () => {
      const { container } = renderBody()
      expect(screen.queryByText('cards.visual.previewEmpty')).not.toBeInTheDocument()
      expect(container.textContent).not.toMatch(/svg/)
    })

    it('declares no fixed minHeight anywhere — the 300px reserved slot is gone', () => {
      const { container } = renderBody()
      const reserved = Array.from(container.querySelectorAll('*')).filter((node) => node.style?.minHeight === '300px')
      expect(reserved).toEqual([])
    })

    it('sanitizes the renderer output on the path that reaches the DOM', async () => {
      renderBody(withCode('graph TD'))
      await settlePreview()
      expect(mockSanitize).toHaveBeenCalledWith('<svg id="diagram" />')
    })

    it('reports a syntax error in the pane, with the renderer message', async () => {
      mockRender.mockRejectedValue(new Error('Parse error on line 1'))
      renderBody(withCode('not a diagram'))
      await settlePreview()

      expect(screen.getByText('cards.visual.syntaxError')).toBeInTheDocument()
      expect(screen.getByText('Parse error on line 1')).toBeInTheDocument()
    })

    it('debounces, so a keystroke does not fire a render per character', () => {
      renderBody(withCode('graph TD'))
      expect(mockRender).not.toHaveBeenCalled()
    })
  })

  describe('the code field', () => {
    it('labels the source field and keeps the syntax reference as a link', () => {
      renderBody()
      expect(screen.getByRole('textbox', { name: /cards.visual.codeLabel/ })).toBeInTheDocument()
      const link = screen.getByRole('link', { name: 'cards.visual.mermaidLink' })
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
      expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
    })

    it('translates the code placeholder rather than inlining a literal', () => {
      renderBody()
      expect(screen.getByRole('textbox', { name: /codeLabel/ })).toHaveAttribute('placeholder', 'cards.visual.codePlaceholder')
    })

    it('marks the code field invalid and explains why, without disabling anything', () => {
      renderBody({ errors: { diagramCode: 'cards.visual.codeRequired' } })
      const field = screen.getByRole('textbox', { name: /codeLabel/ })
      expect(field).toHaveAttribute('aria-invalid', 'true')
      expect(document.getElementById(field.getAttribute('aria-describedby'))).toHaveTextContent('cards.visual.codeRequired')
    })
  })

  describe('at sm and up', () => {
    it('shows both panes at once, with no tabs', () => {
      renderBody(withCode('graph TD'))
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /codeLabel/ })).toBeInTheDocument()
    })
  })

  describe('at xs', () => {
    beforeEach(() => setViewport(true))

    it('splits the two panes into tabs rather than stacking 620px of content', () => {
      renderBody()
      expect(screen.getByRole('tablist')).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'cards.visual.tabCode' })).toBeInTheDocument()
    })

    it('opens on the code tab', () => {
      renderBody()
      expect(screen.getByRole('tab', { name: 'cards.visual.tabCode' })).toHaveAttribute('aria-selected', 'true')
    })

    it('says in words, not only in colour, that the diagram renders', async () => {
      renderBody(withCode('graph TD'))
      await settlePreview()
      expect(screen.getByRole('tab', { name: 'cards.visual.previewOkAria' })).toBeInTheDocument()
    })

    it('says in words, not only in colour, that the diagram does not render', async () => {
      mockRender.mockRejectedValue(new Error('nope'))
      renderBody(withCode('bad'))
      await settlePreview()
      expect(screen.getByRole('tab', { name: 'cards.visual.previewErrorAria' })).toBeInTheDocument()
    })

    it('never moves the user off the code tab when a render succeeds', async () => {
      renderBody(withCode('graph TD'))
      await settlePreview()
      expect(screen.getByRole('tab', { name: 'cards.visual.tabCode' })).toHaveAttribute('aria-selected', 'true')
    })

    it('names the preview tab plainly while there is nothing to preview', () => {
      renderBody()
      expect(screen.getByRole('tab', { name: 'cards.visual.tabPreview' })).toBeInTheDocument()
    })
  })

  describe('disclosure', () => {
    it('keeps the description behind a chip, and the preview out of the rail', () => {
      renderBody()
      const chips = screen.getAllByRole('button').map((button) => button.textContent)
      expect(chips).toEqual(['cards.visual.addDescription', 'cards.common.addTags', 'cards.common.chooseDeck'])
    })

    it('renders the description once its chip is used', () => {
      renderBody({ revealed: new Set(['description']), availableChips: ['tags', 'deck'] })
      expect(screen.getByRole('textbox', { name: /cards.visual.descriptionLabel/ })).toBeInTheDocument()
    })
  })
})

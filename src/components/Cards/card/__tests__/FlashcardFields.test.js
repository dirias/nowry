/**
 * FE-C2 — Variant B, the flashcard body (CARDS.md §4.1, §5, §7.1).
 *
 * What is pinned here is the shape the redesign promises: two required fields
 * at rest and nothing else but the rail, each half naming which half is
 * missing when it is, and the twelve-element original's chrome gone — the type
 * chip, the two uppercase pseudo-labels, the emoji buttons.
 *
 * jsdom CANNOT verify that both fields plus the rail actually fit above an
 * open keyboard at 375px; that is a real-device check.
 */
import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } })
}))

const FlashcardFields = require('../FlashcardFields').default
const { emptyCardValues } = require('../cardTypes')

const renderBody = (props = {}) => {
  const setField = jest.fn()
  const onReveal = jest.fn()
  const view = render(
    <FlashcardFields
      values={emptyCardValues()}
      setField={setField}
      errors={{}}
      revealed={new Set()}
      availableChips={['tags', 'deck']}
      onReveal={onReveal}
      decks={[]}
      refFor={() => () => {}}
      tagInputRef={{ current: null }}
      {...props}
    />
  )
  return { ...view, setField, onReveal }
}

describe('FlashcardFields', () => {
  describe('at rest', () => {
    it('shows both required fields and nothing else that takes input', () => {
      renderBody()
      const fields = screen.getAllByRole('textbox')
      expect(fields).toHaveLength(2)
      expect(screen.getByRole('textbox', { name: /cards.flashcard.frontLabel/ })).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /cards.flashcard.backLabel/ })).toBeInTheDocument()
    })

    it('offers exactly the two chips this variant owns — tags and deck', () => {
      renderBody()
      const rail = screen.getByRole('group', { name: 'form.detailRailAria' })
      const chips = within(rail).getAllByRole('button')
      expect(chips.map((chip) => chip.textContent)).toEqual(['cards.common.addTags', 'cards.common.chooseDeck'])
    })

    it('translates both placeholders rather than shipping English literals', () => {
      renderBody()
      expect(screen.getByRole('textbox', { name: /frontLabel/ })).toHaveAttribute('placeholder', 'cards.flashcard.frontPlaceholder')
      expect(screen.getByRole('textbox', { name: /backLabel/ })).toHaveAttribute('placeholder', 'cards.flashcard.backPlaceholder')
    })

    it('carries no emoji and no uppercase pseudo-label', () => {
      const { container } = renderBody()
      expect(container.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u)
      const shouted = Array.from(container.querySelectorAll('*')).filter((node) => node.style?.textTransform === 'uppercase')
      expect(shouted).toEqual([])
    })
  })

  describe('validation', () => {
    it('names which half is missing, and marks only that field invalid', () => {
      renderBody({ values: { ...emptyCardValues(), title: 'Capital of France' }, errors: { content: 'cards.flashcard.backRequired' } })
      const back = screen.getByRole('textbox', { name: /backLabel/ })
      const front = screen.getByRole('textbox', { name: /frontLabel/ })

      expect(back).toHaveAttribute('aria-invalid', 'true')
      expect(front).not.toHaveAttribute('aria-invalid')
      expect(screen.getByText('cards.flashcard.backRequired')).toBeInTheDocument()
    })

    it('points aria-describedby at the message it renders, so the reason is announced', () => {
      renderBody({ errors: { title: 'cards.flashcard.frontRequired' } })
      const front = screen.getByRole('textbox', { name: /frontLabel/ })
      expect(document.getElementById(front.getAttribute('aria-describedby'))).toHaveTextContent('cards.flashcard.frontRequired')
    })
  })

  describe('disclosure', () => {
    it('renders the tag input once its group is revealed, and drops its chip', () => {
      renderBody({ revealed: new Set(['tags']), availableChips: ['deck'] })
      expect(screen.getByRole('textbox', { name: 'form.tagAddAria' })).toBeInTheDocument()
      const rail = screen.getByRole('group', { name: 'form.detailRailAria' })
      expect(
        within(rail)
          .getAllByRole('button')
          .map((chip) => chip.textContent)
      ).toEqual(['cards.common.chooseDeck'])
    })

    it('renders the deck select once its group is revealed', () => {
      renderBody({ revealed: new Set(['deck']), availableChips: ['tags'], decks: [{ _id: 'd1', name: 'Japanese' }] })
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('renders no rail at all once every group is revealed — no empty container', () => {
      renderBody({ revealed: new Set(['tags', 'deck']), availableChips: [] })
      expect(screen.queryByRole('group', { name: 'form.detailRailAria' })).not.toBeInTheDocument()
    })
  })

  describe('editing', () => {
    it('reports each field change under its own name', () => {
      const { setField } = renderBody()
      fireEvent.change(screen.getByRole('textbox', { name: /frontLabel/ }), { target: { value: 'Q' } })
      fireEvent.change(screen.getByRole('textbox', { name: /backLabel/ }), { target: { value: 'A' } })
      expect(setField.mock.calls).toEqual([
        ['title', 'Q'],
        ['content', 'A']
      ])
    })
  })
})

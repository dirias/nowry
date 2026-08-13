/**
 * FE-C3 — Variant C, the quiz body (CARDS.md §4.2, §4.5, §7.1, §7.3, §8.3).
 *
 * The defect this file exists to keep fixed is the correctness binding:
 * `<Radio value={option}>` tied the designation to the option's *text*, so
 * editing a chosen option silently unset it and two identically-worded options
 * both appeared selected. The radio now carries the row's index.
 *
 * jsdom CANNOT verify that the 44px targets are actually 44 CSS pixels, that
 * the option rows fit above an open keyboard at 375px, or that the undo line
 * is noticed before it expires.
 */
import React from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => (options?.number === undefined ? key : `${key}:${options.number}`),
    i18n: { language: 'en' }
  })
}))

const QuizCardFields = require('../QuizCardFields').default
const { emptyCardValues } = require('../cardTypes')

/** Mirrors the parent: one values object, updated field by field. */
const Harness = ({ initial, errors = {}, revealed = new Set(), availableChips = ['explanation', 'tags', 'deck'], onValues }) => {
  const [values, setValues] = React.useState(initial || emptyCardValues())
  const setField = (field, value) => {
    setValues((previous) => {
      const next = { ...previous, [field]: value }
      onValues?.(next)
      return next
    })
  }
  return (
    <QuizCardFields
      values={values}
      setField={setField}
      errors={errors}
      revealed={revealed}
      availableChips={availableChips}
      onReveal={jest.fn()}
      decks={[]}
      refFor={() => () => {}}
      tagInputRef={{ current: null }}
    />
  )
}

const renderQuiz = (props = {}) => {
  const onValues = jest.fn()
  const view = render(<Harness onValues={onValues} {...props} />)
  return { ...view, onValues, latest: () => onValues.mock.calls[onValues.mock.calls.length - 1]?.[0] }
}

const optionInputs = () => screen.getAllByPlaceholderText(/cards.quiz.optionPlaceholder/)
const radios = () => screen.getAllByRole('radio')

describe('QuizCardFields', () => {
  describe('at rest', () => {
    it('opens on two option rows, not the four the old modal seeded', () => {
      renderQuiz()
      expect(optionInputs()).toHaveLength(2)
    })

    it('offers no delete control while the list is at its floor', () => {
      renderQuiz()
      expect(screen.queryByRole('button', { name: /removeOptionAria/ })).not.toBeInTheDocument()
    })

    it('names the option group so the designation is announced as a set', () => {
      renderQuiz()
      expect(screen.getByRole('radiogroup', { name: 'cards.quiz.optionsAria' })).toBeInTheDocument()
    })

    it('leaves the explanation behind a chip, and the required region in front of it', () => {
      renderQuiz()
      const rail = screen.getByRole('group', { name: 'form.detailRailAria' })
      expect(
        within(rail)
          .getAllByRole('button')
          .map((chip) => chip.textContent)
      ).toEqual(['cards.quiz.addExplanation', 'cards.common.addTags', 'cards.common.chooseDeck'])
    })
  })

  describe('the correctness binding', () => {
    it('names each radio distinctly, on the input that carries the role', () => {
      renderQuiz()
      // Joy puts a top-level aria-label on the root span, leaving the input
      // unnamed; the name has to reach the element with role=radio.
      expect(radios().map((radio) => radio.getAttribute('aria-label'))).toEqual(['cards.quiz.correctAria:1', 'cards.quiz.correctAria:2'])
    })

    it('records the designation as a position, not as the option text', () => {
      const { latest } = renderQuiz({ initial: { ...emptyCardValues(), options: ['Paris', 'Lyon'] } })
      fireEvent.click(radios()[1])
      expect(latest().correctIndex).toBe(1)
    })

    it('keeps the designation when the chosen option is retyped', () => {
      const { latest } = renderQuiz({ initial: { ...emptyCardValues(), options: ['Paris', 'Lyon'] } })
      fireEvent.click(radios()[1])
      fireEvent.change(optionInputs()[1], { target: { value: 'Lyons' } })

      expect(latest().correctIndex).toBe(1)
      expect(radios()[1]).toBeChecked()
      expect(radios()[0]).not.toBeChecked()
    })

    it('checks one radio only when two options happen to read the same', () => {
      renderQuiz({ initial: { ...emptyCardValues(), options: ['Paris', 'Paris'], correctIndex: 0 } })
      expect(radios()[0]).toBeChecked()
      expect(radios()[1]).not.toBeChecked()
    })

    it('lets an empty row be designated first and typed into after', () => {
      const { latest } = renderQuiz()
      expect(radios()[0]).not.toBeDisabled()
      fireEvent.click(radios()[0])
      fireEvent.change(optionInputs()[0], { target: { value: 'Paris' } })
      expect(latest().correctIndex).toBe(0)
      expect(latest().options[0]).toBe('Paris')
    })
  })

  describe('adding and removing rows', () => {
    it('appends a row from the group header', () => {
      renderQuiz()
      fireEvent.click(screen.getByRole('button', { name: 'cards.quiz.addOption' }))
      expect(optionInputs()).toHaveLength(3)
    })

    it('appends a row on Enter rather than submitting anything', () => {
      renderQuiz()
      fireEvent.keyDown(optionInputs()[1], { key: 'Enter' })
      expect(optionInputs()).toHaveLength(3)
    })

    it('shows delete on every row once the list is above its floor', () => {
      renderQuiz()
      fireEvent.click(screen.getByRole('button', { name: 'cards.quiz.addOption' }))
      expect(screen.getAllByRole('button', { name: /removeOptionAria/ })).toHaveLength(3)
    })

    it('shifts a designation that sat below a removed row', () => {
      const { latest } = renderQuiz({ initial: { ...emptyCardValues(), options: ['a', 'b', 'c'], correctIndex: 2 } })
      fireEvent.click(screen.getAllByRole('button', { name: /removeOptionAria/ })[0])
      expect(latest().options).toEqual(['b', 'c'])
      expect(latest().correctIndex).toBe(1)
    })

    it('clears the designation when the designated row is the one removed', () => {
      const { latest } = renderQuiz({ initial: { ...emptyCardValues(), options: ['a', 'b', 'c'], correctIndex: 1 } })
      fireEvent.click(screen.getAllByRole('button', { name: /removeOptionAria/ })[1])
      expect(latest().correctIndex).toBeNull()
    })
  })

  describe('undo', () => {
    it('offers undo after removing a row with text in it', () => {
      renderQuiz({ initial: { ...emptyCardValues(), options: ['a', 'b', 'c'] } })
      fireEvent.click(screen.getAllByRole('button', { name: /removeOptionAria/ })[2])
      expect(screen.getByRole('button', { name: 'cards.quiz.undoRemove' })).toBeInTheDocument()
      expect(screen.getByText('cards.quiz.optionRemoved')).toBeInTheDocument()
    })

    it('offers nothing after removing an empty row — there is nothing to lose', () => {
      renderQuiz({ initial: { ...emptyCardValues(), options: ['a', 'b', ''] } })
      fireEvent.click(screen.getAllByRole('button', { name: /removeOptionAria/ })[2])
      expect(screen.queryByRole('button', { name: 'cards.quiz.undoRemove' })).not.toBeInTheDocument()
    })

    it('puts the row back where it was, with its designation', () => {
      const { latest } = renderQuiz({ initial: { ...emptyCardValues(), options: ['a', 'b', 'c'], correctIndex: 1 } })
      fireEvent.click(screen.getAllByRole('button', { name: /removeOptionAria/ })[1])
      fireEvent.click(screen.getByRole('button', { name: 'cards.quiz.undoRemove' }))

      expect(latest().options).toEqual(['a', 'b', 'c'])
      expect(latest().correctIndex).toBe(1)
    })

    it('withdraws the offer after five seconds', () => {
      jest.useFakeTimers()
      try {
        renderQuiz({ initial: { ...emptyCardValues(), options: ['a', 'b', 'c'] } })
        fireEvent.click(screen.getAllByRole('button', { name: /removeOptionAria/ })[2])
        act(() => jest.advanceTimersByTime(5000))
        expect(screen.queryByRole('button', { name: 'cards.quiz.undoRemove' })).not.toBeInTheDocument()
      } finally {
        jest.useRealTimers()
      }
    })
  })

  describe('the relational error', () => {
    it('renders one message under the group, never one per row', () => {
      renderQuiz({ errors: { options: 'cards.quiz.needTwoOptions' } })
      expect(screen.getAllByText('cards.quiz.needTwoOptions')).toHaveLength(1)
    })

    it('points the group at the message so a screen reader reads the reason', () => {
      renderQuiz({ errors: { correctIndex: 'cards.quiz.needCorrectAnswer' } })
      const group = screen.getByRole('radiogroup')
      expect(document.getElementById(group.getAttribute('aria-describedby'))).toHaveTextContent('cards.quiz.needCorrectAnswer')
    })

    it('makes the group itself a focus target, since no single field is to blame', () => {
      renderQuiz({ errors: { correctIndex: 'cards.quiz.needCorrectAnswer' } })
      expect(screen.getByRole('radiogroup')).toHaveAttribute('tabindex', '-1')
    })

    it('describes nothing when there is no error', () => {
      renderQuiz()
      expect(screen.getByRole('radiogroup')).not.toHaveAttribute('aria-describedby')
    })
  })

  describe('disclosure', () => {
    it('renders the explanation once its chip is used', () => {
      renderQuiz({ revealed: new Set(['explanation']), availableChips: ['tags', 'deck'] })
      expect(screen.getByRole('textbox', { name: /cards.quiz.explanationLabel/ })).toBeInTheDocument()
    })
  })
})

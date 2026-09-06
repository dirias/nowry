/**
 * TagMenu — the bar's Tag ▾ (PRD D16, US-009): a new-tag field and tri-state rows.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Dropdown, MenuButton } from '@mui/joy'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k) })
}))

const { default: TagMenu, tagState } = require('../TagMenu')

const TAGS = [
  { tag: 'verbs', count: 4 },
  { tag: 'asia', count: 9 }
]
const CARDS = [
  { _id: 'c1', tags: ['verbs'] },
  { _id: 'c2', tags: ['verbs', 'asia'] }
]

const renderMenu = (props = {}) => {
  const onAdd = jest.fn()
  const onRemove = jest.fn()
  render(
    <Dropdown open>
      <MenuButton>Tag</MenuButton>
      <TagMenu selectedCards={CARDS} availableTags={TAGS} onAdd={onAdd} onRemove={onRemove} {...props} />
    </Dropdown>
  )
  return { onAdd, onRemove }
}

describe('tagState', () => {
  it('is every, some or none', () => {
    expect(tagState(CARDS, 'verbs')).toBe('every')
    expect(tagState(CARDS, 'asia')).toBe('some')
    expect(tagState(CARDS, 'kanji')).toBe('none')
  })
})

describe('the rows', () => {
  it('take a full check off the selection and put anything else on', () => {
    const { onAdd, onRemove } = renderMenu()
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /verbs/ }))
    expect(onRemove).toHaveBeenCalledWith('verbs')
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /asia/ }))
    expect(onAdd).toHaveBeenCalledWith('asia')
    expect(screen.getByRole('menuitemcheckbox', { name: /verbs/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('menuitemcheckbox', { name: /asia/ })).toHaveAttribute('aria-checked', 'mixed')
  })

  it('show their counts as readouts, never as chips', () => {
    renderMenu()
    const row = screen.getByRole('menuitemcheckbox', { name: /asia/ })
    expect(row).toHaveTextContent('9')
    expect(row.querySelector('.MuiChip-root')).toBeNull()
  })
})

describe('the new-tag field', () => {
  it('adds the trimmed tag on Enter and clears itself; an empty draft adds nothing', () => {
    const { onAdd } = renderMenu()
    const field = screen.getByRole('textbox', { name: 'cards.select.newTag' })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(onAdd).not.toHaveBeenCalled()
    fireEvent.change(field, { target: { value: '  kanji ' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(onAdd).toHaveBeenCalledWith('kanji')
    expect(field).toHaveValue('')
  })
})

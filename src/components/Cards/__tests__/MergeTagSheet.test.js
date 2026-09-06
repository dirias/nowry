/**
 * MergeTagSheet — merge a tag into another (PRD D17, US-010, MGMT-005).
 */
import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k) })
}))

const MergeTagSheet = require('../MergeTagSheet').default

const TAGS = [
  { tag: 'verbs', cards: 46 },
  { tag: 'asia', cards: 140 },
  { tag: 'kanji', cards: 12 }
]

const renderSheet = (props = {}) => {
  const onMerge = jest.fn()
  const onClose = jest.fn()
  render(<MergeTagSheet open tag='verbs' count={46} tags={TAGS} onMerge={onMerge} onClose={onClose} {...props} />)
  return { onMerge, onClose }
}

describe('the sheet', () => {
  it('names the tag and its count, lists the other tags as rows with their counts, and offers no target by default', () => {
    renderSheet()
    const sheet = screen.getByRole('dialog')
    expect(sheet).toHaveTextContent('groups.merge.title:{"tag":"verbs"}')
    expect(sheet).toHaveTextContent('groups.merge.subtitle:{"count":46}')
    const rows = within(sheet).getAllByTestId('merge-target')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('asia')
    expect(rows[0]).toHaveTextContent('cards.manage_content.cardCount:{"count":140}')
    expect(rows[0]).toHaveAttribute('aria-pressed', 'false')
    expect(within(sheet).queryByText('verbs', { selector: '[data-testid="merge-target"] *' })).toBeNull()
    expect(within(sheet).getByRole('button', { name: 'groups.merge.confirm:{"count":46}' })).toBeDisabled()
  })

  it('picks a target by click or keyboard and merges into it', () => {
    const { onMerge } = renderSheet()
    fireEvent.keyDown(screen.getByRole('button', { name: 'groups.merge.targetAria:{"tag":"kanji"}' }), { key: 'Enter' })
    expect(screen.getByRole('button', { name: 'groups.merge.targetAria:{"tag":"kanji"}' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'groups.merge.targetAria:{"tag":"asia"}' }))
    const confirm = screen.getByRole('button', { name: 'groups.merge.confirm:{"count":46}' })
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)
    expect(onMerge).toHaveBeenCalledWith('asia')
  })

  it('arrives already picked when an inline rename landed on an existing tag', () => {
    const { onMerge } = renderSheet({ initialTarget: 'asia' })
    expect(screen.getByRole('button', { name: 'groups.merge.targetAria:{"tag":"asia"}' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'groups.merge.confirm:{"count":46}' }))
    expect(onMerge).toHaveBeenCalledWith('asia')
  })

  it('searches the other tags and says when nothing matches, or when there is nothing to merge into', () => {
    const first = renderSheet()
    const search = screen.getByRole('textbox', { name: 'groups.merge.searchAria' })
    fireEvent.change(search, { target: { value: 'kan' } })
    expect(screen.getAllByTestId('merge-target')).toHaveLength(1)
    fireEvent.change(search, { target: { value: 'zzz' } })
    expect(screen.queryByTestId('merge-target')).toBeNull()
    expect(screen.getByText('groups.merge.noMatch')).toBeInTheDocument()
    first.onClose()

    render(<MergeTagSheet open tag='verbs' count={46} tags={[TAGS[0]]} onMerge={jest.fn()} onClose={jest.fn()} />)
    expect(screen.getByText('groups.merge.empty')).toBeInTheDocument()
  })
})

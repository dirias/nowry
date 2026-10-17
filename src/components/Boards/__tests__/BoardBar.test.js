/**
 * BOARD-003 / BOARD-007 — the board bar: saving you can see (PRD D4), the
 * name renamed in place, and who the board is shared with.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
import BoardBar, { SAVING_DELAY } from '../BoardBar'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => (options?.count !== undefined ? `${key}:${options.count}` : options?.name ? `${key}:${options.name}` : key)
  })
}))

const renderBar = (props = {}) =>
  render(
    <MemoryRouter>
      <BoardBar
        name='Photosynthesis'
        status='idle'
        hasPending={false}
        canShare
        canDelete
        onRename={jest.fn()}
        onShare={jest.fn()}
        onDuplicate={jest.fn()}
        onDelete={jest.fn()}
        onShowKeys={jest.fn()}
        {...props}
      />
    </MemoryRouter>
  )

const status = () => screen.getByTestId('board-save-status')

describe('the save readout (PRD D4)', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('reads Saved at rest and is announced politely', () => {
    renderBar()
    expect(status()).toHaveTextContent('boards.bar.saved')
    expect(status()).toHaveAttribute('aria-live', 'polite')
  })

  it('reads Saving… only once a save has lasted, so a quick one never flickers', () => {
    const { rerender } = renderBar({ status: 'saving', hasPending: true })
    expect(status()).toHaveAttribute('data-state', 'saved')
    act(() => jest.advanceTimersByTime(SAVING_DELAY))
    expect(status()).toHaveTextContent('boards.bar.saving')
    rerender(
      <MemoryRouter>
        <BoardBar name='Photosynthesis' status='saved' hasPending={false} />
      </MemoryRouter>
    )
    expect(status()).toHaveTextContent('boards.bar.saved')
  })

  it('a quick save that lands inside the delay never shows Saving…', () => {
    const { rerender } = renderBar({ status: 'saving', hasPending: true })
    act(() => jest.advanceTimersByTime(SAVING_DELAY - 100))
    rerender(
      <MemoryRouter>
        <BoardBar name='Photosynthesis' status='saved' hasPending={false} />
      </MemoryRouter>
    )
    act(() => jest.advanceTimersByTime(SAVING_DELAY))
    expect(status()).toHaveAttribute('data-state', 'saved')
  })

  it('reads Not saved · retrying when a save failed', () => {
    renderBar({ status: 'error', hasPending: true })
    expect(status()).toHaveTextContent('boards.bar.notSaved')
    expect(status()).toHaveAttribute('data-state', 'notSaved')
  })
})

describe('the name', () => {
  it('click to edit, Enter keeps the new name', () => {
    const onRename = jest.fn()
    renderBar({ onRename })
    fireEvent.click(screen.getByRole('button', { name: 'boards.bar.renameAria:Photosynthesis' }))
    const field = screen.getByRole('textbox', { name: 'boards.rename.label' })
    fireEvent.change(field, { target: { value: '  Light reactions ' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(onRename).toHaveBeenCalledWith('Light reactions')
    expect(screen.getByTestId('board-name')).toBeInTheDocument()
  })

  it('Esc leaves the name as it was', () => {
    const onRename = jest.fn()
    renderBar({ onRename })
    fireEvent.click(screen.getByRole('button', { name: 'boards.bar.renameAria:Photosynthesis' }))
    const field = screen.getByRole('textbox', { name: 'boards.rename.label' })
    fireEvent.change(field, { target: { value: 'Something else' } })
    fireEvent.keyDown(field, { key: 'Escape' })
    fireEvent.blur(field)
    expect(onRename).not.toHaveBeenCalled()
    expect(screen.getByTestId('board-name')).toHaveTextContent('Photosynthesis')
  })

  it('a click away keeps it; an empty name is not a name', () => {
    const onRename = jest.fn()
    renderBar({ onRename })
    fireEvent.click(screen.getByRole('button', { name: 'boards.bar.renameAria:Photosynthesis' }))
    const field = screen.getByRole('textbox', { name: 'boards.rename.label' })
    fireEvent.change(field, { target: { value: '   ' } })
    fireEvent.blur(field)
    expect(onRename).not.toHaveBeenCalled()
  })
})

describe('sharing and the menu', () => {
  it('Share is a secondary key for the owner, and absent for a collaborator', () => {
    const onShare = jest.fn()
    const { unmount } = renderBar({ onShare })
    fireEvent.click(screen.getByRole('button', { name: 'boards.bar.share' }))
    expect(onShare).toHaveBeenCalled()
    unmount()
    renderBar({ canShare: false, canDelete: false })
    expect(screen.queryByRole('button', { name: 'boards.bar.share' })).toBeNull()
  })

  it('shows who the board is shared with', () => {
    renderBar({ collaborators: 2 })
    expect(screen.getByRole('img', { name: 'boards.bar.collaborators:2' })).toBeInTheDocument()
  })

  it('the menu duplicates, lists the keys and deletes', () => {
    const onDuplicate = jest.fn()
    const onShowKeys = jest.fn()
    const onDelete = jest.fn()
    renderBar({ onDuplicate, onShowKeys, onDelete })
    fireEvent.click(screen.getByRole('button', { name: 'boards.bar.more' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'boards.menu.duplicate' }))
    fireEvent.click(screen.getByRole('button', { name: 'boards.bar.more' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'boards.menu.keys' }))
    fireEvent.click(screen.getByRole('button', { name: 'boards.bar.more' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'boards.menu.delete' }))
    expect(onDuplicate).toHaveBeenCalled()
    expect(onShowKeys).toHaveBeenCalled()
    expect(onDelete).toHaveBeenCalled()
  })

  it('the back link goes to the boards page', () => {
    renderBar()
    expect(screen.getByRole('link', { name: 'boards.bar.back' })).toHaveAttribute('href', '/boards')
  })
})

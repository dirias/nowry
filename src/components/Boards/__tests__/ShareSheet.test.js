/**
 * BOARD-007 — the share sheet on the shared sheet shell: invite by email,
 * the API's refusals in words, and no disabled key.
 */
import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ShareSheet from '../ShareSheet'
import { blackboardService } from '@nowry/core/api/services/blackboard.service'

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }))
jest.mock('@nowry/core/api/services/blackboard.service', () => ({ blackboardService: { inviteCollaborator: jest.fn() } }))

const renderSheet = (props = {}) => render(<ShareSheet open boardId='b1' onClose={jest.fn()} {...props} />)
const field = () => screen.getByRole('textbox', { name: 'boards.share.inviteLabel' })
const send = () => fireEvent.click(screen.getByRole('button', { name: 'boards.share.send' }))

describe('ShareSheet', () => {
  it('invites by email and lists who was invited', async () => {
    blackboardService.inviteCollaborator.mockResolvedValue({ ok: true })
    const onInvited = jest.fn()
    renderSheet({ onInvited })
    fireEvent.change(field(), { target: { value: ' ana@example.com ' } })
    send()
    await waitFor(() => expect(blackboardService.inviteCollaborator).toHaveBeenCalledWith('b1', 'ana@example.com'))
    expect(await screen.findByText('ana@example.com')).toBeInTheDocument()
    expect(screen.getByText('boards.share.sent')).toBeInTheDocument()
    expect(onInvited).toHaveBeenCalled()
  })

  it('an empty address says so instead of greying the key', () => {
    renderSheet()
    expect(screen.getByRole('button', { name: 'boards.share.send' })).not.toBeDisabled()
    send()
    expect(screen.getByRole('alert')).toHaveTextContent('boards.share.error.empty')
    expect(blackboardService.inviteCollaborator).not.toHaveBeenCalled()
  })

  it.each([
    [{ response: { status: 404, data: { detail: 'user_not_found' } } }, 'boards.share.error.notFound'],
    [{ response: { status: 403, data: { detail: 'only_owner_can_invite' } } }, 'boards.share.error.notOwner'],
    [{ response: { status: 500 } }, 'boards.share.error.failed']
  ])('a refusal is said in words (%o)', async (err, message) => {
    blackboardService.inviteCollaborator.mockRejectedValue(err)
    renderSheet()
    fireEvent.change(field(), { target: { value: 'x@example.com' } })
    send()
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })
})

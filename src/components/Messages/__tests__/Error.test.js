/** The error window draws whatever it is handed without taking the page down (ADR-068). */
import React from 'react'
import { render, screen } from '@testing-library/react'

import ErrorWindow, { renderableMessage } from '../Error'

describe('ErrorWindow', () => {
  it('draws a sentence, a node and a list of nodes as they are', () => {
    expect(renderableMessage('plain')).toBe('plain')
    const node = <span>node</span>
    expect(renderableMessage(node)).toBe(node)
    const list = [<span key='a'>a</span>]
    expect(renderableMessage(list)).toBe(list)
    expect(renderableMessage(null)).toBeNull()
  })

  it('reads an object for its own words instead of crashing on it', () => {
    expect(renderableMessage({ code: 'import_empty' })).toBe('import_empty')
    expect(renderableMessage({ message: 'Too long', code: 'x' })).toBe('Too long')
    expect(renderableMessage({ limit: 3 })).toBe('')
    render(<ErrorWindow title='Error' error_msg={{ code: 'document_too_long', limit: 200000 }} onClose={() => {}} />)
    expect(screen.getByText('document_too_long')).toBeInTheDocument()
  })
})

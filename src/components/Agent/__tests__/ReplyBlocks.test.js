import React from 'react'
import { render, screen } from '@testing-library/react'
import ReplyBlocks from '../ReplyBlocks'

jest.mock(
  '../../TTS/TTSControls',
  () =>
    function TTSControls({ text, langHint }) {
      return <span data-testid='listen'>{`${text}|${langHint}`}</span>
    }
)
jest.mock(
  '../PetMarkdown',
  () =>
    function PetMarkdown({ content }) {
      return <p>{content}</p>
    }
)

describe('ReplyBlocks (CHAT-004)', () => {
  it('draws example tags as rows with Listen in the card language', () => {
    render(
      <ReplyBlocks
        content={'効果: effect.\n[[EX|この薬はよく効果がある。|Kono kusuri wa yoku kōka ga aru.|This medicine works well.]]'}
        hint='ja'
      />
    )
    expect(screen.getByText('効果: effect.')).toBeInTheDocument()
    expect(screen.getByText('この薬はよく効果がある。')).toBeInTheDocument()
    expect(screen.getByText('Kono kusuri wa yoku kōka ga aru.')).toBeInTheDocument()
    expect(screen.getByText('This medicine works well.')).toBeInTheDocument()
    expect(screen.getByTestId('listen')).toHaveTextContent('この薬はよく効果がある。|ja')
    expect(screen.queryByText(/\[\[EX/)).not.toBeInTheDocument()
  })

  it('leaves a plain reply as prose', () => {
    render(<ReplyBlocks content='Just an answer.' />)
    expect(screen.getByText('Just an answer.')).toBeInTheDocument()
    expect(screen.queryByTestId('listen')).not.toBeInTheDocument()
  })
})

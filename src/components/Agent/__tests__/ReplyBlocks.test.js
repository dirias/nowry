import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
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

  it('keeps the translation behind Show meaning while the answer is hidden (CHAT-013)', () => {
    render(
      <ReplyBlocks
        content={'[[EX|会議に資料を持参する。|Kaigi ni shiryō o jisan suru.|Bring the documents to the meeting.]]'}
        meaningHidden
      />
    )
    expect(screen.getByText('Kaigi ni shiryō o jisan suru.')).toBeInTheDocument()
    expect(screen.queryByText('Bring the documents to the meeting.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /showMeaningAria|meaning/i }))
    expect(screen.getByText('Bring the documents to the meeting.')).toBeInTheDocument()
  })
})

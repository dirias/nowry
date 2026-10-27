/**
 * The selection toolbar does not come back over the dialog it opened (QA-016).
 *
 * "Card" on a selection opens the Add to Deck dialog. The toolbar hid, but the
 * selection is still live (TextMenu keeps it on purpose, so actions can read
 * it), and the next selection event re-showed the toolbar on top of the dialog.
 * A selection an action was taken on stays without a toolbar until it changes.
 */
import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical'
import { CssVarsProvider } from '@mui/joy/styles'
import { buildDynamicTheme } from '../../../../theme/DynamicThemeProvider'
import FloatingToolbarPlugin from '../FloatingToolbarPlugin'

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }))
jest.mock('react-router-dom', () => ({ useNavigate: () => () => {} }))
jest.mock('@nowry/core/hooks/useSubscription', () => ({ useSubscription: () => ({ tier: 'free' }) }))
jest.mock('../../../../context/SubscriptionContext', () => ({ useSubscriptionContext: () => ({ openUpgradeModal: () => {} }) }))
jest.mock('@nowry/core/context/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }))
jest.mock('@nowry/core/api/services/tts.ai.service', () => ({ ttsService: { generate: () => Promise.resolve('') } }))

const TEXT = 'Mitochondria are the powerhouse of the cell. Ribosomes build proteins.'

const initialConfig = {
  namespace: 'qa-016',
  editable: false,
  onError: (error) => {
    throw error
  },
  editorState: () => {
    $getRoot().append($createParagraphNode().append($createTextNode(TEXT)))
  }
}

let onOptionClick
const renderReader = () =>
  render(
    <CssVarsProvider theme={buildDynamicTheme()}>
      <LexicalComposer initialConfig={initialConfig}>
        <RichTextPlugin contentEditable={<ContentEditable data-testid='doc' />} ErrorBoundary={LexicalErrorBoundary} />
        <FloatingToolbarPlugin mode='read-owner' onOptionClick={(...args) => onOptionClick(...args)} />
      </LexicalComposer>
    </CssVarsProvider>
  )

/** Select [start, end) of the document's text and let the debounced reader run. */
const select = async (start, end) => {
  const textNode = screen.getByTestId('doc').querySelector('span').firstChild
  const range = document.createRange()
  range.setStart(textNode, start)
  range.setEnd(textNode, end)
  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(range)
  await act(async () => {
    document.dispatchEvent(new Event('selectionchange'))
    jest.advanceTimersByTime(200)
  })
}

const cardButton = () => screen.queryByRole('button', { name: 'editor.ai.card' })

beforeAll(() => {
  // jsdom has no layout; the toolbar only needs a rect to place itself.
  Range.prototype.getBoundingClientRect = () => ({ top: 100, left: 100, width: 50, height: 16, right: 150, bottom: 116 })
})

beforeEach(() => {
  jest.useFakeTimers()
  onOptionClick = jest.fn()
})

afterEach(() => {
  jest.useRealTimers()
  window.getSelection().removeAllRanges()
})

it('stays hidden over the dialog its action opened, and returns for a new selection', async () => {
  renderReader()
  await select(0, 12)
  expect(cardButton()).toBeInTheDocument()

  fireEvent.click(cardButton())
  expect(onOptionClick).toHaveBeenCalledWith('create_study_card', 'Mitochondria')
  expect(cardButton()).not.toBeInTheDocument()

  // The same selection fires again (focus moving into the dialog, a re-render).
  await select(0, 12)
  expect(cardButton()).not.toBeInTheDocument()

  // A different selection is a new request for the toolbar.
  await select(46, 55)
  expect(cardButton()).toBeInTheDocument()
})

it('sits on the popup layer, below dialogs', async () => {
  renderReader()
  await select(0, 12)
  const toolbar = screen.getByRole('toolbar')
  // The app theme resolves `zIndex: 'popup'` by name (ELEVATION.md §3), under
  // `modal`. It was 9999, above every dialog.
  const { zIndex } = buildDynamicTheme()
  expect(window.getComputedStyle(toolbar).zIndex).toBe('var(--joy-zIndex-popup)')
  expect(zIndex.popup).toBeLessThan(zIndex.modal)
})

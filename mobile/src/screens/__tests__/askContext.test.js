import { clearAskContext, setAskContext, takeAskContext } from '../askContext'

beforeEach(() => clearAskContext())

it('hands the context from the screen that has it to the screen that needs it', () => {
  setAskContext({ page: 'study_session', cardIndex: 4 }, '/study/deck-1')
  expect(takeAskContext()).toEqual({ context: { page: 'study_session', cardIndex: 4 }, from: '/study/deck-1', prompt: null })
})

it('is taken exactly once, so a later ungrounded open inherits nothing', () => {
  setAskContext({ page: 'study_session' }, '/study/deck-1')
  takeAskContext()
  expect(takeAskContext()).toEqual({ context: null, from: null, prompt: null })
})

it('is nothing when nothing was set', () => {
  expect(takeAskContext()).toEqual({ context: null, from: null, prompt: null })
})

it('carries a way back without a card, for an opener that has no card', () => {
  setAskContext(null, '/')
  expect(takeAskContext()).toEqual({ context: null, from: '/', prompt: null })
})

it('treats an absent context as none rather than as undefined', () => {
  setAskContext(undefined)
  expect(takeAskContext()).toEqual({ context: null, from: null, prompt: null })
})

it('carries a first turn for the chat to send, and clears it with the rest (SR-004)', () => {
  setAskContext({ page: 'study_session' }, '/study/deck-1', 'Explain this again')
  expect(takeAskContext()).toEqual({ context: { page: 'study_session' }, from: '/study/deck-1', prompt: 'Explain this again' })
  expect(takeAskContext()).toEqual({ context: null, from: null, prompt: null })
})

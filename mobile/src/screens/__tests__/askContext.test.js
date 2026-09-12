import { clearAskContext, setAskContext, takeAskContext } from '../askContext'

beforeEach(() => clearAskContext())

it('hands the context from the screen that has it to the screen that needs it', () => {
  setAskContext({ page: 'study_session', cardIndex: 4 })
  expect(takeAskContext()).toEqual({ page: 'study_session', cardIndex: 4 })
})

it('is taken exactly once, so a later ungrounded open inherits nothing', () => {
  setAskContext({ page: 'study_session' })
  takeAskContext()
  expect(takeAskContext()).toBeNull()
})

it('is nothing when nothing was set', () => {
  expect(takeAskContext()).toBeNull()
})

it('treats an absent context as none rather than as undefined', () => {
  setAskContext(undefined)
  expect(takeAskContext()).toBeNull()
})

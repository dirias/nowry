import React from 'react'
import { render } from '@testing-library/react'
import App from './App'

// Original CRA boilerplate asserted a "learn react" link that never existed
// in this app — replaced with a smoke test that catches render-time crashes
// (routing setup, provider nesting, lazy-load wiring) across the whole tree.
test('renders without crashing', () => {
  render(<App />)
})

/**
 * "Send again" rests before it may be pressed again (ADR-078 point 8, FR-023).
 */
import React from 'react'
import { render, act } from '@testing-library/react'
import { useCountdown } from './useCountdown'

let hook
const Probe = () => {
  hook = useCountdown()
  return null
}

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

it('counts down by the second to zero and stops there', () => {
  render(React.createElement(Probe))
  expect(hook.left).toBe(0)
  act(() => hook.start(3))
  expect(hook.left).toBe(3)
  act(() => jest.advanceTimersByTime(1000))
  expect(hook.left).toBe(2)
  act(() => jest.advanceTimersByTime(1000))
  act(() => jest.advanceTimersByTime(1000))
  expect(hook.left).toBe(0)
  act(() => jest.advanceTimersByTime(5000))
  expect(hook.left).toBe(0)
})

it('rounds a part of a second up and reads nonsense as no wait', () => {
  render(React.createElement(Probe))
  act(() => hook.start(1.2))
  expect(hook.left).toBe(2)
  act(() => hook.start(undefined))
  expect(hook.left).toBe(0)
  act(() => hook.start(-4))
  expect(hook.left).toBe(0)
})

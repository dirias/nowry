/**
 * The library keeps a new node hidden until it has measured it, and a hidden
 * field refuses focus without a word: a new note took no keystrokes. The hook
 * keeps trying each frame until focus lands.
 */
import React, { useRef } from 'react'
import { render, screen, act } from '@testing-library/react'
import { useFocusOnMount } from '../useFocusOnMount'

function Field() {
  const ref = useRef(null)
  useFocusOnMount(ref)
  return <textarea ref={ref} aria-label='field' defaultValue='Light' />
}

describe('useFocusOnMount', () => {
  let frames
  beforeEach(() => {
    frames = []
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb))
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  })
  afterEach(() => jest.restoreAllMocks())

  it('keeps trying until the field can take focus, then puts the caret at the end', () => {
    const realFocus = HTMLTextAreaElement.prototype.focus
    let refusals = 2
    jest.spyOn(HTMLTextAreaElement.prototype, 'focus').mockImplementation(function focus(...args) {
      if (refusals-- > 0) return undefined // hidden: the browser says nothing and does nothing
      return realFocus.apply(this, args)
    })
    render(<Field />)
    const field = screen.getByLabelText('field')
    expect(document.activeElement).not.toBe(field)
    act(() => frames.shift()())
    expect(document.activeElement).not.toBe(field)
    act(() => frames.shift()())
    expect(document.activeElement).toBe(field)
    expect(field.selectionStart).toBe(5)
    // It holds a few frames, then lets go.
    while (frames.length) act(() => frames.shift()())
    expect(document.activeElement).toBe(field)
  })

  it('takes focus back when a modal’s trap moves it to the dialog, and waits for a field that is not there yet', () => {
    function Late() {
      const ref = useRef(null)
      const [shown, setShown] = React.useState(false)
      useFocusOnMount(ref)
      React.useEffect(() => {
        frames.push(() => setShown(true)) // the portal renders the field a frame later
      }, [])
      return (
        <div>
          <button type='button'>dialog</button>
          {shown && <input ref={ref} aria-label='late' />}
        </div>
      )
    }
    render(<Late />)
    act(() => frames.shift()()) // hook: no field yet, waits
    act(() => frames.shift()()) // the field appears
    act(() => frames.shift()()) // hook: focuses it
    const field = screen.getByLabelText('late')
    expect(document.activeElement).toBe(field)
    act(() => screen.getByText('dialog').focus()) // the trap moves focus away
    act(() => frames.shift()())
    expect(document.activeElement).toBe(field)
  })
})

import React from 'react'
import { act, render } from '@testing-library/react'
import { CssVarsProvider } from '@mui/joy/styles'
import { buildDynamicTheme } from '../../../theme/DynamicThemeProvider'
import { CompanionArt, companionArtFor } from '../CompanionArt'

// jsdom never loads an image and has no 2D canvas, so both are stood in for:
// an Image whose load the test fires, and a context that records the pass.
let images = []
let context = null

beforeEach(() => {
  images = []
  context = {
    drawImage: jest.fn(),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: jest.fn()
  }
  global.Image = class {
    constructor() {
      images.push(this)
      this.naturalWidth = 2
      this.naturalHeight = 2
    }
  }
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context)
  jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => 'data:image/png;base64,RECOLOURED')
})

const src = (container) => container.querySelector('img').getAttribute('src')
const load = () => act(() => images.forEach((image) => image.onload()))

describe('CompanionArt (ADR-051)', () => {
  it('shows the painted form at once, then the form in the learner’s accent', () => {
    const { container } = render(<CompanionArt stage={4} accent='#825080' />)
    expect(src(container)).toBe(companionArtFor(4))
    load()
    expect(context.drawImage).toHaveBeenCalled()
    expect(src(container)).toBe('data:image/png;base64,RECOLOURED')
  })

  it('recolours a stage and accent once, then reuses it', () => {
    render(<CompanionArt stage={5} accent='#346898' />)
    load()
    images = []
    const { container } = render(<CompanionArt stage={5} accent='#346898' />)
    expect(images).toHaveLength(0)
    expect(src(container)).toBe('data:image/png;base64,RECOLOURED')
  })

  it('keeps the painted form when there is no canvas to recolour it in', () => {
    context = null
    const { container } = render(<CompanionArt stage={2} accent='#924968' />)
    load()
    expect(src(container)).toBe(companionArtFor(2))
  })

  it('draws a locked rung as the form’s silhouette in a theme token, with no recolour', () => {
    const { container } = render(
      <CssVarsProvider theme={buildDynamicTheme()}>
        <CompanionArt stage={6} accent='#2a6971' locked />
      </CssVarsProvider>
    )
    expect(container.querySelector('img')).toBeNull()
    expect(images).toHaveLength(0)
    const silhouette = container.querySelector('[data-companion-locked] > div')
    // jsdom's style parser drops a var() background, so read the rule emotion wrote for its class.
    const rules = Array.from(document.styleSheets).flatMap((sheet) => Array.from(sheet.cssRules).map((rule) => rule.cssText))
    const own = rules.filter((text) => silhouette.className.split(' ').some((name) => name && text.includes(`.${name}`)))
    expect(own.join(' ')).toContain('background-color: var(--joy-palette-text-tertiary)')
    expect(own.join(' ')).toContain('stage-6')
  })

  it('reads an unknown stage as the egg', () => {
    expect(companionArtFor(9)).toBe(companionArtFor(1))
  })
})

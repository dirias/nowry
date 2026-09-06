import scrollToHeadingText from '../scrollToHeadingText'

describe('scrollToHeadingText (BOOK-004)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="editor-scroll-container"><div class="editor-content"><h1>Grammar</h1><p>a</p><h2>Particles</h2></div></div>`
    document.querySelector('.editor-scroll-container').scrollTo = jest.fn()
  })

  it('scrolls the container to the heading with that text', () => {
    expect(scrollToHeadingText('Particles')).toBe(true)
    expect(document.querySelector('.editor-scroll-container').scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' })
    )
  })

  it('reports a heading that is not there, and touches nothing', () => {
    expect(scrollToHeadingText('Verbs')).toBe(false)
    expect(scrollToHeadingText('')).toBe(false)
    expect(document.querySelector('.editor-scroll-container').scrollTo).not.toHaveBeenCalled()
  })
})

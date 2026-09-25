import { spiralMark, wordmarkCoil, WORDMARK_FIT } from '../brandMark'

const numbers = (d) => d.match(/-?\d+(\.\d+)?/g).map(Number)

describe('spiralMark (ADR-034)', () => {
  it.each(['full', 'compact'])('draws a closed %s body inside the 100 × 100 box, with no NaN', (preset) => {
    const mark = spiralMark({ preset })
    expect(mark.viewBox).toBe('0 0 100 100')
    expect(mark.body.startsWith('M')).toBe(true)
    expect(mark.body.endsWith('Z')).toBe(true)
    for (const value of numbers(mark.body)) {
      expect(Number.isFinite(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(-0.5)
      expect(value).toBeLessThanOrEqual(100.5)
    }
  })

  it('puts the head at the outer end, larger than the tail, with the eye inside it', () => {
    const { head, tail, eye } = spiralMark()
    expect(head.r).toBeGreaterThan(tail.r * 2)
    const centreToHead = Math.hypot(head.cx - 50, head.cy - 50)
    const centreToTail = Math.hypot(tail.cx - 50, tail.cy - 50)
    expect(centreToHead).toBeGreaterThan(centreToTail)
    expect(Math.hypot(eye.cx - head.cx, eye.cy - head.cy) + eye.r).toBeLessThan(head.r)
  })

  it('points the head where it is asked to travel', () => {
    const up = spiralMark({ headDeg: -90 })
    const down = spiralMark({ headDeg: 90 })
    expect(up.eye.cy - up.head.cy).toBeLessThan(0)
    expect(down.eye.cy - down.head.cy).toBeGreaterThan(0)
  })
})

describe('wordmarkCoil — the display lockup (BRAND-009)', () => {
  it('refuses every size below the floor, so the 22px bullet cannot ship by accident', () => {
    for (const px of [16, 22, 24, 32, 39, 39.9]) {
      expect(wordmarkCoil(px)).toBeNull()
    }
    expect(wordmarkCoil(WORDMARK_FIT.MIN_PX)).not.toBeNull()
  })

  it.each([undefined, null, NaN, 0, -96, '96'])('treats %p as below the floor rather than drawing it', (bad) => {
    expect(wordmarkCoil(bad)).toBeNull()
  })

  it('scales every part of the fit with the font size', () => {
    const at40 = wordmarkCoil(40)
    const at96 = wordmarkCoil(96)
    expect(at40.size).toBe(Math.round(40 * WORDMARK_FIT.em))
    expect(at96.size).toBe(Math.round(96 * WORDMARK_FIT.em))
    expect(at96.drop).toBeGreaterThan(at40.drop)
    // Negative: an `o` is fitted tighter than the square box it is drawn in.
    expect(at96.side).toBeLessThan(0)
  })

  it('turns the head away from the `w`, unlike the standalone mark', () => {
    // −55 puts the head low and right, where the next letter is. The eye rides
    // with the head, so comparing its height is the cheapest proof they differ.
    expect(WORDMARK_FIT.headDeg).toBe(-100)
    expect(wordmarkCoil(96).mark.eye.cy).toBeLessThan(spiralMark().eye.cy)
  })

  it('draws the full preset with no padding, so the coil fills the letter slot', () => {
    expect(WORDMARK_FIT.pad).toBe(0)
    const { mark } = wordmarkCoil(96)
    expect(mark.body).toBe(spiralMark({ preset: 'full', headDeg: WORDMARK_FIT.headDeg, pad: 0 }).body)
  })
})

import { spiralMark } from '../brandMark'

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

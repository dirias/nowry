/**
 * Motion, checked rather than intended (MOTION.md, DS-001).
 *
 * The study card shipped with no motion at all: it changed from question to
 * answer between two frames, and nothing on screen acknowledged a swipe. Every
 * primitive around it animated correctly, which is exactly why it went unseen —
 * the standard was being followed everywhere it had been read, and the one
 * screen nobody re-read against it simply had no motion to get wrong.
 *
 * So the rules are read off the source instead:
 *
 *   1. A duration is a token, never a number. The scale has three steps and a
 *      component that "needs" 120ms is on the wrong step (MOTION.md §2).
 *   2. An easing is a token, never four control points written out.
 *   3. Anything that MOVES asks about reduced motion. Under the setting,
 *      position and presence motion is removed, not slowed (§4) — and a file
 *      that animates a transform without ever naming `reduceMotion` cannot be
 *      removing anything.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..')

/** Where motion may be written. `theme/` is where the tokens themselves live. */
const SOURCE = ['ui', 'screens', 'features']

const files = []
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (entry.name.endsWith('.js')) files.push(full)
  }
}
for (const dir of SOURCE) {
  const full = path.join(ROOT, dir)
  if (fs.existsSync(full)) walk(full)
}

/** Comments explain motion; they are not motion. */
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const read = (file) => stripComments(fs.readFileSync(file, 'utf8'))
const relative = (file) => path.relative(ROOT, file)

describe('motion is spent from the scale', () => {
  it('never writes a duration as a number', () => {
    const offenders = []
    for (const file of files) {
      const source = read(file)
      for (const [, value] of source.matchAll(/\bduration:\s*([^,\n}]+)/g)) {
        // `0` is the reduced-motion branch, which is the standard's own rule
        // rather than a duration; anything else has to name a token.
        const literal = value.trim()
        if (/^0$/.test(literal)) continue
        if (/\bduration\.(quick|base|slow)\b|\bDURATION\b/.test(literal)) continue
        offenders.push(`${relative(file)}: duration: ${literal}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('never writes an easing curve out by hand', () => {
    const offenders = []
    for (const file of files) {
      const source = read(file)
      for (const [call] of source.matchAll(/Easing\.bezier\(([^)]*)\)/g)) {
        if (!call.includes('...')) offenders.push(`${relative(file)}: ${call}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('asks about reduced motion wherever something moves', () => {
    const moves = /translateX|translateY|rotateY|rotateX|\brotate\b|scaleX|scaleY|\bscale\b/
    const offenders = []
    for (const file of files) {
      const source = read(file)
      if (!source.includes('Animated')) continue
      if (!moves.test(source)) continue
      if (/reduceMotion|useReduceMotion|reduce\b/.test(source)) continue
      offenders.push(relative(file))
    }
    expect(offenders).toEqual([])
  })
})

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

/**
 * Where a duration is deliberately not on the scale, and why.
 *
 * The three steps are for STATE CHANGES. The companion's idle loops are not
 * state changes: each period is a characteristic of the creature, written in
 * the shared motion table beside the keyframes it paces, and an owl's 0.85s
 * wingbeat has no more business being `base` than a heart rate does. Named
 * here so it stays one file rather than becoming a habit (MOB-090).
 */
const OFF_SCALE = ['ui/patterns/useOrbMotion.js']

describe('motion is spent from the scale', () => {
  it('never writes a duration as a number', () => {
    const offenders = []
    for (const file of files) {
      if (OFF_SCALE.includes(relative(file))) continue
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

  it('never sequences an animation with a clock', () => {
    // A `setTimeout` beside an animation is a second timeline that has to
    // agree with the first, and it cannot: the standard easing is most of the
    // way round at half the duration, so a swap timed at `duration / 2` lands
    // nowhere near halfway. It is also cancellable independently — a gesture
    // that cleared the timer left the card showing a face it had already
    // turned away from, and every later tap turned it to the same content.
    // Interpolate the value that is already running instead.
    const offenders = []
    for (const file of files) {
      const source = read(file)
      if (!source.includes('Animated.timing') && !source.includes('Animated.spring')) continue
      if (/setTimeout|setInterval/.test(source)) offenders.push(relative(file))
    }
    expect(offenders).toEqual([])
  })

  it('never leaves a turned face to backfaceVisibility', () => {
    // On Android the prop is not a rendering rule. It is an alpha computed
    // from the view's OWN rotation — `rotationY >= -90 && rotationY < 90` —
    // and the composed transform of its ancestors is never consulted. A face
    // held at 180 degrees so it reads upright once its card has turned is
    // therefore invisible for good, which is how the study card's answer
    // shipped as a blank white surface. Interpolate the visibility instead.
    const offenders = files.filter((file) => read(file).includes('backfaceVisibility')).map(relative)
    expect(offenders).toEqual([])
  })

  it('asks about reduced motion wherever something moves', () => {
    const moves = /translateX|translateY|rotateY|rotateX|\brotate\b|scaleX|scaleY|\bscale\b/
    const asks = /reduceMotion|useReduceMotion|reduce\b/

    /*
     * The question may be answered one module away, and often should be: the
     * companion's orb spreads transforms a hook built, and that hook is where
     * the setting is read. What is not allowed is nobody asking — so a file
     * that moves has to ask, or import something local that does.
     */
    const delegates = (file, source) => {
      for (const [, spec] of source.matchAll(/from '(\.[^']*)'/g)) {
        const target = path.resolve(path.dirname(file), spec)
        for (const candidate of [`${target}.js`, path.join(target, 'index.js')]) {
          if (fs.existsSync(candidate) && asks.test(read(candidate))) return true
        }
      }
      return false
    }

    const offenders = []
    for (const file of files) {
      const source = read(file)
      if (!source.includes('Animated')) continue
      if (!moves.test(source)) continue
      if (asks.test(source)) continue
      if (delegates(file, source)) continue
      offenders.push(relative(file))
    }
    expect(offenders).toEqual([])
  })
})

/**
 * The phone's evolution reveal swaps the form under the gold (ADR-075, EVO-016).
 *
 * On the emulator the old orb vanished in one frame when the flash began, the
 * gold was a dim blink, and the frame stood empty while the spiral opened. The
 * rule for what each layer does at each beat is the shared timeline's
 * (`evolutionLayer`, tested in core); this checks the phone draws from it
 * rather than from a rule of its own. Components are not rendered here (see
 * jest.config.js), so the source is read.
 */
const fs = require('fs')
const path = require('path')

const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
const source = stripComments(fs.readFileSync(path.join(__dirname, '..', 'EvolutionReveal.js'), 'utf8'))

describe('the phone reveal swaps the form under the gold', () => {
  it('takes every layer from the shared rule', () => {
    expect(source).toMatch(/import\s*\{[^}]*\bevolutionLayer\b[^}]*\}\s*from '@nowry\/core\/domain\/petEvolution'/)
    for (const layer of ['from', 'flash', 'to']) expect(source).toContain(`'${layer}')`)
  })

  it('runs every beat on one schedule from the reveal\'s start, so late renders do not add up', () => {
    expect(source).toMatch(/beatRemaining\(VARIANT, beat, Date\.now\(\) - startedAt\.current\)/)
  })

  it('lets the gold go in the shared fade, not across the whole reveal', () => {
    expect(source).toMatch(/flashFadeShare\(VARIANT\)/)
  })

  it('never removes the old form when the flash starts', () => {
    expect(source).not.toMatch(/beat === 'flash' \? null/)
  })

  it('does not hold the new form back until the sequence has ended', () => {
    // The new form's entrance used to be played only once the sequence was done.
    expect(source).not.toMatch(/if \(done\) \{\s*const settle = play\(arrive/)
  })
})

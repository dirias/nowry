/**
 * A level crossed by a card review is announced on the phone (EVO-020, PEND-001).
 *
 * Each review earns XP and its reply says whether that crossed a level; the
 * phone threw those replies away and announced only what the two end-of-session
 * grants said. A stage crossed by the reviews themselves was therefore silent:
 * the session grant that followed was not the one that crossed, so it said
 * "no level-up". The reviews' replies are now kept, waited for at the end
 * (the last one can answer after the session ends), and taken together with
 * the grants. Screens are not rendered here (jest.config.js), so the source
 * is read; the choice of the furthest level-up is core's, tested there.
 */
const fs = require('fs')
const path = require('path')
import { bestLevelUp, evolutionFrom } from '@nowry/core/domain/petLevelUp'

const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
const source = stripComments(fs.readFileSync(path.join(__dirname, '..', 'StudySession.js'), 'utf8'))

describe('the phone announces a level crossed by a review', () => {
  it('keeps what each graded review answers about XP', () => {
    expect(source).toMatch(/reviewReplies\.current\.push\(/)
  })

  it('waits for those replies at the end, with the grants, and takes the furthest of all', () => {
    expect(source).toMatch(/Promise\.all\(reviewReplies\.current\)/)
    expect(source).toMatch(/bestLevelUp\(\[\.\.\.reviewed, \.\.\.replies\]\)/)
  })

  it('so a review that crossed into a new form is a reveal, even when the session grant crossed nothing', () => {
    const reviewed = [
      { level_up: false, new_level: 2, new_stage: 1 },
      { level_up: true, new_level: 3, new_stage: 2 }
    ]
    const grants = [{ level_up: false, new_level: 3, new_stage: 2 }, null]
    expect(evolutionFrom(1, bestLevelUp([...reviewed, ...grants]))).toEqual({ fromStage: 1, toStage: 2, level: 3 })
    // The grants alone said nothing.
    expect(evolutionFrom(1, bestLevelUp(grants))).toBeNull()
  })
})

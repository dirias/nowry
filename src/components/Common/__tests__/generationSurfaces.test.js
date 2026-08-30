/**
 * GEN-005 — every AI generation wait reads the shared primitive.
 *
 * This is a source-level guard rather than a render test, because the thing worth
 * preventing is the pattern, not one instance of it: eight surfaces each grew
 * their own waiting state, and the ninth will too unless something says not to.
 * A file that shows a spinner where its generation result belongs has regressed,
 * and no per-component test would catch that as a class.
 */
import fs from 'fs'
import path from 'path'

const root = path.resolve(__dirname, '../../..')

const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')

/**
 * Surfaces whose entire waiting state is a generation. None of them has any
 * other use for a spinner, so importing one at all is the regression.
 */
const PANEL_SURFACES = [
  'components/Cards/VisualizerModal.js',
  'components/Cards/DeckAnalysisPanel.js',
  'components/Blackboard/ConvertToCardsModal.js',
  'components/AnnualPlanning/GoalAIPanel.js',
  'components/Books/DiagramPreviewPanel.js'
]

/**
 * Surfaces that also run a generation but keep a spinner for something else —
 * `EditorHome` puts one inside the toolbar button and its menu items, which are
 * button affordances rather than the waiting state. Those are checked only for
 * using the shared component.
 */
const MIXED_SURFACES = ['components/Books/EditorHome.js', 'components/Cards/GeneratedCards.js', 'components/Agent/CompanionTab.js']

describe('every generation surface uses the shared progress primitive', () => {
  it.each([...PANEL_SURFACES, ...MIXED_SURFACES])('%s renders GenerationProgress', (file) => {
    const source = read(file)

    expect(source).toMatch(/import GenerationProgress from/)
    expect(source).toMatch(/<GenerationProgress/)
  })

  it.each(PANEL_SURFACES)('%s no longer reaches for a spinner', (file) => {
    expect(read(file)).not.toMatch(/CircularProgress/)
  })

  /**
   * `GeneratedCards` is the deliberate exception. It is the only counted surface:
   * the cards themselves stream in and are the narration, and the wait is measured
   * in seconds, so stage copy would be describing work the user can already watch
   * happening. Every opaque surface has nothing to show and must say something.
   */
  const STAGED_SURFACES = [...PANEL_SURFACES, ...MIXED_SURFACES].filter((file) => !file.endsWith('GeneratedCards.js'))

  it.each(STAGED_SURFACES)('%s narrates its own work', (file) => {
    const source = read(file)

    // A5: the stages are per-surface. A file wiring the component without its own
    // stage copy has taken the frame and left out the part that carries meaning.
    expect(source).toMatch(/msgKey: '[a-zA-Z.]+\.(stages\.s\d|avatarStage\d|animStage\d)'/)
  })

  it('shows the cards themselves rather than narrating, where it can', () => {
    const source = read('components/Cards/GeneratedCards.js')

    expect(source).toMatch(/data-testid='pending-card'/)
  })
})

/**
 * A diagram's colours, from the ladder (ADR-034, ADR-074).
 *
 * Mermaid bakes colours into the SVG it draws and derives others from them, so
 * it needs values, not CSS variables. These are the same values the page wears:
 * the grounds and text of the mode, and the accent's soft tint and border for a
 * node. Platform-free: each client hands the result to its own renderer.
 */
import { NEUTRALS, accentTone } from './colorSystem'

export const diagramThemeVariables = (mode, accentHex) => {
  const { background, text } = NEUTRALS[mode]
  const accent = accentTone(accentHex, mode)
  return {
    primaryColor: accent.softBg,
    primaryTextColor: text.primary,
    primaryBorderColor: accent.outlinedBorder,
    lineColor: text.tertiary,
    secondaryColor: background.level1,
    tertiaryColor: background.level2,
    background: background.surface,
    mainBkg: accent.softBg,
    nodeBorder: accent.outlinedBorder,
    clusterBkg: background.level1,
    titleColor: text.primary,
    edgeLabelBackground: background.level1,
    nodeTextColor: text.primary,
    labelColor: text.primary,
    labelTextColor: text.primary
  }
}

/**
 * petColor.js — Pet orb color resolution utilities
 *
 * Resolves a user-chosen color slug + evolution stage into a concrete rgba()
 * string suitable for the PetOrb gradient and box-shadow.
 *
 * Also provides interest-based species/color suggestion logic used during
 * initial companion setup in AgentSettings.
 */

// ---------------------------------------------------------------------------
// Color map — slug → hex (source of truth for all pet colors)
// ---------------------------------------------------------------------------
export const PET_COLOR_MAP = {
  ocean: '#4facfe',
  violet: '#a855f7',
  mint: '#34d399',
  gold: '#fbbf24',
  rose: '#f472b6',
  coral: '#fb7185',
  sky: '#38bdf8',
  ember: '#f97316'
}

// ---------------------------------------------------------------------------
// Stage alpha — controls orb opacity as the pet evolves
// ---------------------------------------------------------------------------
const STAGE_ALPHA = { 1: 0.85, 2: 0.88, 3: 0.9, 4: 0.9, 5: 0.95, 6: 1.0 }

// ---------------------------------------------------------------------------
// Default dominant colors per stage — used when no custom color is set.
// These mirror the STAGE_CONFIG.dominantColor values in StudyPet.js.
// ---------------------------------------------------------------------------
const STAGE_DOMINANT = {
  1: 'rgba(100, 180, 255, 0.85)',
  2: 'rgba(120, 220, 170, 0.88)',
  3: 'rgba(164, 69, 255, 0.90)',
  4: 'rgba(255, 190, 60, 0.90)',
  5: 'rgba(220, 100, 255, 0.95)',
  6: 'rgba(255, 230, 80, 1.00)'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null
}

// ---------------------------------------------------------------------------
// resolveColor
// ---------------------------------------------------------------------------
/**
 * Resolve a color slug + evolution stage into a concrete rgba() string.
 *
 * @param {string|null} colorSlug - One of the PET_COLOR_MAP keys, or null for default.
 * @param {number} stage          - Evolution stage (1–6).
 * @returns {string}              - A valid CSS rgba() string.
 */
export function resolveColor(colorSlug, stage) {
  if (!colorSlug || !PET_COLOR_MAP[colorSlug]) {
    return STAGE_DOMINANT[stage] ?? STAGE_DOMINANT[1]
  }
  const hex = PET_COLOR_MAP[colorSlug]
  const alpha = STAGE_ALPHA[stage] ?? 0.85
  const rgb = hexToRgb(hex)
  if (!rgb) return STAGE_DOMINANT[stage] ?? STAGE_DOMINANT[1]
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

// ---------------------------------------------------------------------------
// Interest → species + color suggestion
// ---------------------------------------------------------------------------
const INTEREST_MAP = [
  { keywords: ['technology', 'computer', 'engineering', 'programming', 'software', 'math', 'mathematics'], species: 'robot', color: 'sky' },
  { keywords: ['music', 'audio', 'performance', 'sound', 'instrument'], species: 'music', color: 'violet' },
  { keywords: ['art', 'design', 'culture', 'writing', 'creative'], species: 'cat', color: 'rose' },
  { keywords: ['science', 'physics', 'astronomy', 'space'], species: 'star', color: 'ocean' },
  { keywords: ['medicine', 'biology', 'health', 'wellness', 'medical'], species: 'phoenix', color: 'mint' },
  { keywords: ['nature', 'ecology', 'agriculture', 'environment', 'environmental'], species: 'leaf', color: 'mint' },
  { keywords: ['chemistry', 'geology', 'materials'], species: 'crystal', color: 'ember' },
  { keywords: ['gaming', 'mythology', 'fantasy', 'game'], species: 'dragon', color: 'ember' },
  { keywords: ['humanities', 'literature', 'history', 'academic'], species: 'owl', color: 'gold' },
  { keywords: ['psychology', 'philosophy', 'social', 'sociology'], species: 'fox', color: 'coral' }
]

/**
 * Suggest a species and color based on user interests.
 *
 * @param {string[]} interests - Array of interest strings from user profile.
 * @returns {{ species: string, color: string }}
 */
export function suggestFromInterests(interests = []) {
  if (!interests || interests.length === 0) return { species: 'owl', color: 'violet' }
  const lower = interests.map((i) => i.toLowerCase())
  for (const rule of INTEREST_MAP) {
    if (rule.keywords.some((k) => lower.some((i) => i.includes(k)))) {
      return { species: rule.species, color: rule.color }
    }
  }
  return { species: 'owl', color: 'violet' }
}

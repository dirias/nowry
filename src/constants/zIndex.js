/**
 * Centralized stacking-order (z-index) constants for the application.
 *
 * Phase 28 (PET-02): single source of truth for the tiers Smart Pet and the
 * Study Center overlay system need to interoperate correctly. Order is locked
 * (D-05): Z_NAV < Z_PET_RESTING < Z_FULLSCREEN < Z_PET_FULLSCREEN < Z_CELEBRATION.
 * This module intentionally does NOT cover every z-index in the app — see
 * 28-CONTEXT.md D-09/D-11 for scope boundaries.
 */

// Global nav header + Pomodoro FAB. Currently hardcoded 1100 in
// Header.js:218 and PomodoroFAB.js:37 (byte-for-byte duplicate, D-10).
export const Z_NAV = 1100

// Smart Pet's resting/default tier outside of study-session fullscreen.
// Replaces StudyPet.js's ad-hoc petZIndex default of 9999 (D-08, D-13).
export const Z_PET_RESTING = 1200

// The opaque, full-viewport fullscreen study container. Currently
// hardcoded in StudySession.js:764 (`zIndex: isFullscreen ? 1300 : 1`).
export const Z_FULLSCREEN = 1300

// Smart Pet's tier while docked during an active fullscreen study session —
// must stay above Z_FULLSCREEN so Pet remains visible (D-07). New tier,
// no prior hardcoded value.
export const Z_PET_FULLSCREEN = 1400

// Level-up celebration overlay / toast ceiling. Documents the existing
// LevelUpCelebration.js:49 hardcoded value as the tier ceiling; intentionally
// NOT migrated to reference this constant in this phase (D-09).
export const Z_CELEBRATION = 9999

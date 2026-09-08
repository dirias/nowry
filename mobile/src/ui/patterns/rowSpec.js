/**
 * The row's numbers (ADR-021 §2), apart from the component so they can be
 * tested without a device runtime.
 *
 * The web has two heights, 56 at `xs` and 52 from `sm` up. A phone is always
 * `xs`, so there is one number here.
 */
import { LIST_ROW_HEIGHT as SHARED } from '@nowry/core/tokens/tokens'

export const LIST_ROW_HEIGHT = SHARED.xs

/** ADR-021 §4 — the measure is 64 × 3. */
export const MEASURE_WIDTH = 64
export const MEASURE_HEIGHT = 3

/** ADR-021 §2 — the identity tile is 16px. */
export const IDENTITY_TILE_SIZE = 16

/** ADR-021 §1 — the summary object's progress is its 3px bottom edge. */
export const SUMMARY_EDGE_HEIGHT = 3

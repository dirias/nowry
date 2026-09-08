/**
 * The ADR-021 composites: what a page's summary is, and what a list row is.
 *
 * These are not primitives. They are the two shapes the design system says a
 * screen is made of, built once so a deck, an event and a book are visibly the
 * same class of thing.
 */
export { IdentityTile } from './IdentityTile'
export { ListRow } from './ListRow'
export { Readout } from './Readout'
export { SummaryObject } from './SummaryObject'
export { IDENTITY_TILE_SIZE, LIST_ROW_HEIGHT, MEASURE_HEIGHT, MEASURE_WIDTH, SUMMARY_EDGE_HEIGHT } from './rowSpec'

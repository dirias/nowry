import { NEUTRALS, categoryDot } from '../tokens/colorSystem'

/**
 * The cover colours a document can wear (MOB-102).
 *
 * Eight presets, which lived in the web's `BookCoverField` — a component, so
 * nothing but that component could offer them. The phone gains a details sheet
 * for documents and needs the same eight, and a second copy of eight hex values
 * is how one client ends up offering a colour the other cannot show as chosen.
 *
 * Since ADR-034 they are the category family and the colour system's ink, the
 * same family focus areas and sticky notes draw from. A cover saved with an older
 * preset keeps its colour; it simply reads as a custom one.
 *
 * `nameKey` is the colour's accessible name. A swatch is a colour and nothing
 * else, so without a name a screen reader announces eight identical buttons.
 */
export const COVER_PRESETS = [
  { hex: categoryDot('lake'), nameKey: 'books.coverColors.blue' },
  { hex: categoryDot('clay'), nameKey: 'books.coverColors.red' },
  { hex: categoryDot('moss'), nameKey: 'books.coverColors.green' },
  { hex: categoryDot('amber'), nameKey: 'books.coverColors.orange' },
  { hex: categoryDot('iris'), nameKey: 'books.coverColors.purple' },
  { hex: categoryDot('orchid'), nameKey: 'books.coverColors.pink' },
  { hex: NEUTRALS.light.text.primary, nameKey: 'books.coverColors.black' },
  { hex: categoryDot('graphite'), nameKey: 'books.coverColors.grey' }
]

/**
 * Whether a stored colour is one of the presets, compared without regard to
 * case — the API stores whatever it was sent, and '#4493D0' is the blue swatch
 * whether or not a client upper-cased it.
 */
export const isPresetCover = (hex) => COVER_PRESETS.some((preset) => preset.hex.toLowerCase() === String(hex ?? '').toLowerCase())

export default COVER_PRESETS

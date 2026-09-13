/**
 * The cover colours a document can wear (MOB-102).
 *
 * Eight presets, which lived in the web's `BookCoverField` — a component, so
 * nothing but that component could offer them. The phone gains a details sheet
 * for documents and needs the same eight, and a second copy of eight hex values
 * is how one client ends up offering a colour the other cannot show as chosen.
 *
 * `nameKey` is the colour's accessible name. A swatch is a colour and nothing
 * else, so without a name a screen reader announces eight identical buttons.
 */
export const COVER_PRESETS = [
  { hex: '#0B6BCB', nameKey: 'books.coverColors.blue' },
  { hex: '#C41C1C', nameKey: 'books.coverColors.red' },
  { hex: '#1F7A1F', nameKey: 'books.coverColors.green' },
  { hex: '#9A5B13', nameKey: 'books.coverColors.orange' },
  { hex: '#6523cf', nameKey: 'books.coverColors.purple' },
  { hex: '#c41c88', nameKey: 'books.coverColors.pink' },
  { hex: '#000000', nameKey: 'books.coverColors.black' },
  { hex: '#555555', nameKey: 'books.coverColors.grey' }
]

/**
 * Whether a stored colour is one of the presets, compared without regard to
 * case — the API stores whatever it was sent, and '#0b6bcb' is the blue swatch
 * whether or not a client upper-cased it.
 */
export const isPresetCover = (hex) => COVER_PRESETS.some((preset) => preset.hex.toLowerCase() === String(hex ?? '').toLowerCase())

export default COVER_PRESETS

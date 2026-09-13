/**
 * A document's cover, on a phone (BOOK-010).
 *
 * The same cover the web draws, from the same `coverSpec`: a written document
 * is a PAGE — paper, a folded corner, the user's colour as a tab, ruled lines
 * once there is something written — and an import is a BOOK, with a solid
 * darker spine and a page edge beside it. Every proportion is a fraction of the
 * cover's own size in the shared module, so a 28-point row mark and a 62-point
 * tile cover are one drawing at two scales, and neither client can invent a
 * proportion the other does not have.
 *
 * It replaces two things that each said nothing: a landscape colour SLAB on the
 * library tile, which also broke D5's "no hero", and a generic book GLYPH on the
 * library row. Browse drew no cover at all.
 *
 * **D5's rules hold here as on the web.** No gradient: the spine is black at a
 * fixed opacity over the colour, and the fold is a flat triangle made from a
 * rotated square. No text on the colour. No motion. The colour is the user's.
 */
import { Image, View } from 'react-native'
import { BOOK, COVER_RATIO, PAGE, coverOf } from '@nowry/core/domain/books/coverSpec'
import { useTheme } from '../../theme'
import { resolveColor } from '../Typography'

/**
 * @param {string} [ground] - the token of whatever the cover sits ON. The fold
 *   is cut by laying a square of that ground over the corner, so a cover on a
 *   `Card` (level1) and one on the page (body) each need to say which they are
 *   on — a wrong ground shows as a coloured corner.
 */
export function CoverMark({ book, width = 28, ribbon = false, publicDoc = false, ground = 'background.body' }) {
  const theme = useTheme()
  const cover = coverOf(book, { ribbon, public: publicDoc })
  const height = Math.round(width * COVER_RATIO)
  const colour = cover.color || resolveColor(theme, 'primary.solidBg')

  return (
    <View importantForAccessibility='no' accessible={false} style={{ width, height }}>
      {cover.shape === 'book' ? (
        <BookShape cover={cover} colour={colour} width={width} height={height} theme={theme} />
      ) : (
        <PageShape cover={cover} colour={colour} width={width} height={height} theme={theme} ground={ground} />
      )}
      {cover.ribbon ? <Ribbon width={width} theme={theme} /> : null}
    </View>
  )
}

/** Paper, a colour tab, a folded corner, and the ruled lines. */
function PageShape({ cover, colour, width, height, theme, ground }) {
  const paper = resolveColor(theme, 'background.body')
  const edge = resolveColor(theme, 'divider')
  const fold = Math.round(width * PAGE.foldWidth)
  const tab = Math.round(height * PAGE.tabHeight)
  const rule = width >= 44 ? 2 : 1

  return (
    <View
      style={{
        width,
        height,
        backgroundColor: paper,
        borderWidth: 1,
        borderColor: edge,
        borderRadius: theme.radius.xs,
        overflow: 'hidden'
      }}
    >
      {cover.image ? (
        <Image source={{ uri: cover.image }} style={{ width: '100%', height: '100%' }} resizeMode='cover' accessible={false} />
      ) : (
        <>
          <View style={{ position: 'absolute', left: 0, top: 0, width: width - fold, height: tab, backgroundColor: colour }} />
          {Array.from({ length: cover.lines }, (_, index) => (
            <View
              key={index}
              style={{
                position: 'absolute',
                left: `${PAGE.lineInset * 100}%`,
                right: `${PAGE.lineInset * 100}%`,
                top: `${(PAGE.firstLine + PAGE.lineGap * index) * 100}%`,
                height: rule,
                borderRadius: rule,
                // Coverage made visible: sections that already have cards.
                // Never coloured for nothing (D8).
                backgroundColor: index < cover.filled ? colour : edge
              }}
            />
          ))}
        </>
      )}

      {/*
       * The folded corner, as two triangles that share a diagonal (BOOK-010).
       *
       * React Native has no clip-path. A first version cut the corner with a
       * rotated square of the ground and laid a second rotated square on it
       * for the flap; on a device the flap rendered as a DIAMOND standing half
       * outside the page, because a rotated child does not clip the way its
       * parent's bounds suggest. A zero-size View with two borders is a right
       * triangle with no rotation at all: the top-right half of the corner is
       * painted in the ground the cover sits on, which cuts it away, and the
       * bottom-left half is the flap. Two flat shapes, no ramp.
       */}
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: 0,
          height: 0,
          borderTopWidth: fold,
          borderLeftWidth: fold,
          borderTopColor: resolveColor(theme, ground),
          borderLeftColor: 'transparent'
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: 0,
          height: 0,
          borderBottomWidth: fold,
          borderRightWidth: fold,
          borderBottomColor: resolveColor(theme, 'background.level2'),
          borderRightColor: 'transparent'
        }}
      />
    </View>
  )
}

/** The colour, a solid spine, and a page edge beside the cover. */
function BookShape({ cover, colour, width, height, theme }) {
  return (
    <View style={{ width, height }}>
      <View
        style={{
          position: 'absolute',
          top: BOOK.edgeInset,
          bottom: BOOK.edgeInset,
          right: -BOOK.edgeWidth,
          width: BOOK.edgeWidth,
          backgroundColor: resolveColor(theme, 'background.body'),
          borderWidth: 1,
          borderLeftWidth: 0,
          borderColor: resolveColor(theme, 'divider'),
          borderTopRightRadius: theme.radius.xs,
          borderBottomRightRadius: theme.radius.xs
        }}
      />
      <View style={{ width, height, backgroundColor: colour, borderRadius: theme.radius.xs, overflow: 'hidden' }}>
        {cover.image ? (
          <Image source={{ uri: cover.image }} style={{ width: '100%', height: '100%' }} resizeMode='cover' accessible={false} />
        ) : null}
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: Math.round(width * BOOK.spineWidth),
            backgroundColor: '#000000',
            opacity: BOOK.spineShade
          }}
        />
      </View>
    </View>
  )
}

/**
 * The bookmark on the one document left open (hook 1).
 *
 * A pointed tip rather than the web's notch. The web cuts the notch with
 * `clip-path`; React Native has none, and cutting it with a square of the
 * ground behind would need to know that ground, which here is a colour tab on
 * one cover and paper on the next. A point is drawn from the ribbon's own
 * colour and reads as a bookmark at this size just the same.
 */
function Ribbon({ width, theme }) {
  const w = Math.max(6, Math.round(width * 0.15))
  const h = Math.max(12, Math.round(width * 0.42))
  const gold = resolveColor(theme, 'warning.solidBg')
  const tip = w / Math.SQRT2
  return (
    <View pointerEvents='none' style={{ position: 'absolute', top: -2, right: width * 0.18, width: w, height: h + tip / 2 }}>
      <View style={{ width: w, height: h - tip / 2, backgroundColor: gold }} />
      <View
        style={{
          position: 'absolute',
          left: (w - tip) / 2,
          top: h - tip,
          width: tip,
          height: tip,
          backgroundColor: gold,
          transform: [{ rotate: '45deg' }]
        }}
      />
    </View>
  )
}

export default CoverMark

import React from 'react'
import { Box } from '@mui/joy'
import { BOOK, COVER_RATIO, PAGE, coverOf } from '@nowry/core/domain/books/coverSpec'

/**
 * A document's cover (BOOK-010, docs/prd-books-library.md D5, §15.2, §15.8).
 *
 * It was a flat rectangle in the user's colour: a book's proportion with
 * nothing that made it a book, so it read as a colour label — the same object
 * a tag or a focus area uses. Reported as "just square boxes; it is not
 * intuitive that they are books or notes."
 *
 * **Kind carries shape.** A written document is a PAGE: paper, a folded corner,
 * the user's colour as a tab along the top, and ruled lines once there is
 * something written. An import is a BOOK: the colour, a solid darker spine, and
 * a page edge beside it. The decision and every proportion are
 * `coverSpec` in the shared package, so the phone draws the same cover rather
 * than a second opinion of it.
 *
 * **D5's rules all still hold.** No gradient — the spine is black laid over
 * the colour at a fixed opacity, and the fold is a flat triangle. No text on
 * the colour. No tilt, glare or glow. The colour is the user's, or their image.
 *
 * `ribbon` marks the one document the Continue object points at, and
 * `publicDoc` is a document someone else wrote: it shows its shape but none of
 * your progress, because the coverage on it is its owner's.
 */
export default function CoverMark({ book, width = 28, ribbon = false, publicDoc = false }) {
  const cover = coverOf(book, { ribbon, public: publicDoc })
  const height = Math.round(width * COVER_RATIO)
  const colour = cover.color || 'primary.solidBg'
  // Hairlines at a row's size, two points at a tile's, so a line stays a line.
  const rule = width >= 44 ? 2 : 1

  return (
    <Box aria-hidden='true' sx={{ position: 'relative', width, height, flexShrink: 0 }}>
      {cover.shape === 'book' ? <BookShape cover={cover} colour={colour} /> : <PageShape cover={cover} colour={colour} rule={rule} />}
      {cover.ribbon && <Ribbon width={width} />}
    </Box>
  )
}

/** Paper, a colour tab, a folded corner, and the ruled lines. */
function PageShape({ cover, colour, rule }) {
  const cut = `polygon(0 0, ${PAGE.tabWidth * 100}% 0, 100% ${PAGE.tabHeight * 100}%, 100% 100%, 0 100%)`
  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: 'background.body',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 'xs',
          overflow: 'hidden',
          clipPath: cut
        }}
      >
        {cover.image ? (
          <Box
            component='img'
            src={cover.image}
            alt=''
            loading='lazy'
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <>
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: `${PAGE.tabWidth * 100}%`,
                height: `${PAGE.tabHeight * 100}%`,
                bgcolor: colour
              }}
            />
            {Array.from({ length: cover.lines }, (_, index) => (
              <Box
                key={index}
                sx={{
                  position: 'absolute',
                  left: `${PAGE.lineInset * 100}%`,
                  right: `${PAGE.lineInset * 100}%`,
                  top: `${(PAGE.firstLine + PAGE.lineGap * index) * 100}%`,
                  height: rule,
                  borderRadius: rule,
                  // A filled line is coverage made visible: sections that
                  // already have cards. Never coloured for nothing (D8).
                  bgcolor: index < cover.filled ? colour : 'divider'
                }}
              />
            ))}
          </>
        )}
      </Box>
      {/* The fold: a flat triangle in the corner the cut leaves, not a ramp. */}
      <Box
        sx={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: `${PAGE.foldWidth * 100}%`,
          height: `${PAGE.tabHeight * 100}%`,
          bgcolor: 'background.level2',
          clipPath: 'polygon(0 0, 0 100%, 100% 100%)'
        }}
      />
    </>
  )
}

/** The colour, a solid spine, and a page edge beside the cover. */
function BookShape({ cover, colour }) {
  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          top: BOOK.edgeInset,
          bottom: BOOK.edgeInset,
          right: -BOOK.edgeWidth,
          width: BOOK.edgeWidth,
          bgcolor: 'background.body',
          border: '1px solid',
          borderColor: 'divider',
          borderLeft: 'none',
          // Only the outer corners round: the edge sits against the cover.
          borderTopRightRadius: 'xs',
          borderBottomRightRadius: 'xs'
        }}
      />
      <Box sx={{ position: 'absolute', inset: 0, bgcolor: colour, borderRadius: 'xs', overflow: 'hidden' }}>
        {cover.image && (
          <Box
            component='img'
            src={cover.image}
            alt=''
            loading='lazy'
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
        <Box
          sx={{
            position: 'absolute',
            inset: `0 auto 0 0`,
            width: `${BOOK.spineWidth * 100}%`,
            bgcolor: 'common.black',
            opacity: BOOK.spineShade
          }}
        />
      </Box>
    </>
  )
}

/** The bookmark on the one document left open (hook 1). */
function Ribbon({ width }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: -2,
        right: '18%',
        width: Math.max(6, Math.round(width * 0.15)),
        height: Math.max(12, Math.round(width * 0.42)),
        bgcolor: 'warning.solidBg',
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 76%, 0 100%)'
      }}
    />
  )
}

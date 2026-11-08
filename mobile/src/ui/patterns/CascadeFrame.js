/**
 * The cascade, drawn (MOB-129, ADR-061 as amended 2026-11-08, ADR-035 §1 on
 * the phone).
 *
 * The headline names three nouns — books, cards, year — and the phone's
 * Welcome has one frame above the fold to show them. This is that frame as
 * the canvas measured it (Phone Front Door, row 06): three EQUAL tiles, each
 * the top of a screen — a 24 pt accent bar and one object — on a staircase
 * that fills the frame exactly, so the only overlap is a tile's own bottom
 * padding and no word is ever covered. Between them, two quarter-turn
 * connectors in the free space the stair leaves, following its geometry
 * rather than decorating it.
 *
 * Fixed sample content, the web's own frames' (`landing.frames.*`). Type sits
 * on the system floor — `body-xs` and `title-sm` — so the bar is 24 rather
 * than the canvas's 28 and the card tile shows prompt and source without the
 * face's label. The staircase's horizontal step comes from the measured
 * width, so the stack fills a 411 pt phone as exactly as a 390 pt one; the
 * vertical step is fixed.
 *
 * `accessibilityElementsHidden`: the headline above carries the meaning; a
 * screen reader does not need to read three pictures of screens.
 */
import { useState } from 'react'
import { View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../theme'
import { Typography, resolveColor } from '../Typography'
import { BrandMark } from './BrandMark'

/** The measured anatomy (canvas row 06): the frame, the tile, the stair, the turn. */
const FRAME = { height: 300, paddingX: 14, paddingY: 12, fallbackWidth: 342 }
const TILE = { width: 200, height: 100, bar: 24, paddingX: 10, paddingY: 6 }
const STEP_Y = 88
const TURN = { out: 60, inset: 22, stroke: 1.5, chevron: 4.5 }
const MARK = 12
const AREA_PCT = 62

export function CascadeFrame({ style }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const [width, setWidth] = useState(FRAME.fallbackWidth)
  const stepX = Math.max(0, (width - 2 * FRAME.paddingX - TILE.width) / 2)
  const accent = resolveColor(theme, 'primary.solidBg')

  const source = t('cards.session.source.from', {
    document: t('landing.frames.section.document'),
    section: t('landing.frames.section.heading')
  })

  const tiles = [
    <Stacked key='book' theme={theme}>
      <Typography level='title-sm' numberOfLines={1}>
        {t('landing.frames.section.heading')}
      </Typography>
      <Typography level='body-xs' color='text.secondary' numberOfLines={2}>
        {t('landing.frames.section.paragraph1')}
      </Typography>
    </Stacked>,
    <Stacked key='card' theme={theme} centred>
      <Typography level='body-xs' weight='lg' numberOfLines={2} style={{ textAlign: 'center' }}>
        {t('landing.frames.card.prompt')}
      </Typography>
      <Typography level='body-xs' color='text.tertiary' numberOfLines={1} style={{ textAlign: 'center' }}>
        {source}
      </Typography>
    </Stacked>,
    <Stacked key='plan' theme={theme}>
      <Typography level='title-sm' numberOfLines={1}>
        {t('annualPlanning.myPlan')}
      </Typography>
      <View
        style={{
          borderWidth: 1,
          borderColor: resolveColor(theme, 'divider'),
          borderRadius: theme.radius.sm,
          paddingHorizontal: theme.spacing[1],
          paddingVertical: theme.spacing[0.5],
          gap: 3
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[1] }}>
          <Typography level='body-xs' style={{ flex: 1 }} numberOfLines={1}>
            {t('landing.frames.year.areas.bio')}
          </Typography>
          <Typography level='body-xs' color='text.tertiary' style={{ fontVariant: ['tabular-nums'] }}>
            {`${AREA_PCT}%`}
          </Typography>
        </View>
        <View style={{ height: 3, borderRadius: 2, backgroundColor: resolveColor(theme, 'divider'), overflow: 'hidden' }}>
          <View style={{ width: `${AREA_PCT}%`, height: 3, backgroundColor: accent }} />
        </View>
      </View>
    </Stacked>
  ]

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[
        {
          height: FRAME.height,
          borderRadius: theme.radius.xl,
          borderWidth: 1,
          borderColor: resolveColor(theme, 'neutral.outlinedBorder'),
          backgroundColor: resolveColor(theme, 'background.level1'),
          overflow: 'hidden'
        },
        style
      ]}
      accessibilityElementsHidden
      importantForAccessibility='no-hide-descendants'
    >
      {tiles.map((tile, index) => (
        <View key={tile.key} style={{ position: 'absolute', left: FRAME.paddingX + index * stepX, top: FRAME.paddingY + index * STEP_Y }}>
          {tile}
        </View>
      ))}
      <Svg
        pointerEvents='none'
        width={width}
        height={FRAME.height}
        style={{ position: 'absolute', left: 0, top: 0 }}
        fill='none'
        stroke={accent}
        strokeWidth={TURN.stroke}
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        {[0, 1].map((index) => (
          <Path key={index} d={turn(index, stepX)} />
        ))}
      </Svg>
    </View>
  )
}

/**
 * One connector: out of tile `index`'s right edge, 35 across and 28 down into
 * the next tile's top, then the chevron. A cubic whose handles keep the exit
 * horizontal and the entry vertical, as the canvas drew it.
 */
function turn(index, stepX) {
  const x0 = FRAME.paddingX + index * stepX + TILE.width
  const y0 = FRAME.paddingY + index * STEP_Y + TURN.out
  const x1 = FRAME.paddingX + (index + 1) * stepX + TILE.width - TURN.inset
  const y1 = FRAME.paddingY + (index + 1) * STEP_Y
  const c = TURN.chevron
  return (
    `M${x0} ${y0} C ${x0 + (x1 - x0) * 0.6} ${y0}, ${x1} ${y0 + (y1 - y0) * 0.35}, ${x1} ${y1 - 1} ` +
    `M${x1 - c} ${y1 - 6} L${x1} ${y1 - 1} L${x1 + c} ${y1 - 6}`
  )
}

/** A tile: the top of a screen — the bar with the lockup, then one object. */
function Stacked({ theme, centred = false, children }) {
  return (
    <View
      style={{
        width: TILE.width,
        height: TILE.height,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: resolveColor(theme, 'neutral.outlinedBorder'),
        backgroundColor: resolveColor(theme, 'background.body'),
        overflow: 'hidden',
        ...theme.elevation.sm
      }}
    >
      <View
        style={{
          height: TILE.bar,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[0.5],
          paddingHorizontal: TILE.paddingX,
          backgroundColor: resolveColor(theme, 'primary.solidBg')
        }}
      >
        <BrandMark size={MARK} color='primary.solidColor' />
        <Typography level='body-xs' weight='xl' color='primary.solidColor'>
          nowry
        </Typography>
      </View>
      <View
        style={{
          flex: 1,
          paddingHorizontal: TILE.paddingX,
          paddingVertical: TILE.paddingY,
          gap: 2,
          alignItems: centred ? 'center' : 'stretch'
        }}
      >
        {children}
      </View>
    </View>
  )
}

export default CascadeFrame

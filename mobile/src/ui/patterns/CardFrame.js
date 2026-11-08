/**
 * A study card, drawn (MOB-128, ADR-061 as amended 2026-11-08, ADR-035 §1 on
 * the phone).
 *
 * The phone's Welcome has room for one frame above the fold, so it carries the
 * one claim no competitor makes: a card made from a book that remembers where
 * it came from. Built element by element beside `screens/StudySession.js` as
 * the screen stands before the reveal: `CardFace` — the label in the accent,
 * the text centred, the source line under it — and the one Show answer key
 * below it, in the house button's lg size with its 2 pt edge.
 *
 * One face, not two. The first cut drew the question and the answer on one
 * card with the four grade keys under them; the phone never shows that (the
 * card flips, and the grades replace the key only once the back is up), and
 * two labelled halves on one surface read as a form. The answer is the
 * visitor's to imagine; the loop's third row names the four grades.
 *
 * Fixed sample content, the web frame's own: Mitochondria §3. It wears the
 * visitor's scheme, so it never shows the wrong colour to anyone.
 * `accessibilityElementsHidden`: the caption beside it carries the meaning; a
 * screen reader does not need to read a picture of a card.
 */
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../theme'
import { Box } from '../Box'
import { BUTTON_RADIUS, BUTTON_SIZES, BUTTON_VARIANTS, EDGE } from '../buttonSpec'
import { Card } from '../Sheet'
import { Stack } from '../Stack'
import { Typography, resolveColor } from '../Typography'

const KEY = BUTTON_SIZES.lg
const PRIMARY = BUTTON_VARIANTS.primary

export function CardFrame({ style }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const source = t('cards.session.source.from', {
    document: t('landing.frames.section.document'),
    section: t('landing.frames.section.heading')
  })

  return (
    <Box
      border='neutral.outlinedBorder'
      radius='lg'
      bg='background.body'
      style={[{ padding: theme.spacing[2], gap: theme.spacing[2] }, style]}
      accessibilityElementsHidden
      importantForAccessibility='no-hide-descendants'
    >
      {/* The front, as CardFace draws it: label, text, the source line. */}
      <Card padding={3} elevation='sm'>
        <Stack spacing={2} style={{ alignItems: 'center' }}>
          <Typography level='body-xs' color='primary.plainColor'>
            {t('cards.session.labels.question')}
          </Typography>
          <Typography level='title-lg' style={{ textAlign: 'center' }}>
            {t('landing.frames.card.prompt')}
          </Typography>
          <Typography level='body-xs' color='text.tertiary' style={{ textAlign: 'center' }}>
            {source}
          </Typography>
        </Stack>
      </Card>

      {/* The one key under the card before the reveal, drawn as the house button paints it. */}
      <View
        style={{
          height: KEY.height,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: KEY.paddingX,
          borderRadius: theme.radius[BUTTON_RADIUS],
          backgroundColor: resolveColor(theme, PRIMARY.ground),
          borderBottomWidth: EDGE,
          borderBottomColor: resolveColor(theme, PRIMARY.edge)
        }}
      >
        <Typography level={KEY.level} weight='lg' color={PRIMARY.label} numberOfLines={1}>
          {t('cards.session.showAnswer')}
        </Typography>
      </View>
    </Box>
  )
}

export default CardFrame

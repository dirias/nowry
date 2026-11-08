/**
 * A study card, drawn (MOB-128, ADR-061 as amended 2026-11-08, ADR-035 §1 on
 * the phone).
 *
 * The phone's Welcome has room for one frame above the fold, so it carries the
 * one claim no competitor makes: a card made from a book that remembers where
 * it came from. This is the web's `CardFrame` brought to the phone, built
 * element by element beside `screens/StudySession.js`: the counter the bar
 * carries, then `CardFace`'s anatomy — the label in the accent, the text
 * centred, the source line under it — the answer under its own label, and the
 * four grade keys in the four tones `buttonSpec.js` records (ground, label,
 * and the 2 pt edge the house button paints behind the face).
 *
 * Fixed sample content, the web frame's own: Mitochondria §3, card 12 of 30.
 * It wears the visitor's scheme, so it never shows the wrong colour to anyone.
 * `accessibilityElementsHidden`: the caption beside it carries the meaning; a
 * screen reader does not need to read a picture of a card.
 */
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../theme'
import { BUTTON_VARIANTS, GRADE_VARIANTS } from '../buttonSpec'
import { Divider } from '../Divider'
import { Card } from '../Sheet'
import { Stack } from '../Stack'
import { Typography, resolveColor } from '../Typography'

const COUNTER = { current: 12, total: 30 }
const GRADES = ['again', 'hard', 'good', 'easy']
const EDGE = 2

export function CardFrame({ style }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const source = t('cards.session.source.from', {
    document: t('landing.frames.section.document'),
    section: t('landing.frames.section.heading')
  })

  return (
    <Card
      padding={2}
      elevation='sm'
      style={[{ gap: theme.spacing[1.5] }, style]}
      accessibilityElementsHidden
      importantForAccessibility='no-hide-descendants'
    >
      <Typography level='body-xs' color='text.tertiary'>
        {t('cards.session.card', COUNTER)}
      </Typography>

      {/* The front, as CardFace draws it: label, text, the source line. */}
      <Stack spacing={1} style={{ alignItems: 'center' }}>
        <Typography level='body-xs' color='primary.plainColor'>
          {t('cards.session.labels.question')}
        </Typography>
        <Typography level='title-md' style={{ textAlign: 'center' }}>
          {t('landing.frames.card.prompt')}
        </Typography>
        <Typography level='body-xs' color='text.tertiary' style={{ textAlign: 'center' }}>
          {source}
        </Typography>
      </Stack>

      <Divider />

      {/* The back, revealed: its label is success, as on the real card. */}
      <Stack spacing={0.5} style={{ alignItems: 'center' }}>
        <Typography level='body-xs' color='success.plainColor'>
          {t('cards.session.labels.answer')}
        </Typography>
        <Typography level='body-sm' color='text.secondary' style={{ textAlign: 'center' }}>
          {t('landing.frames.card.answer')}
        </Typography>
      </Stack>

      {/* The grade row, at frame scale: four keys, four tones, one edge each. */}
      <View style={{ flexDirection: 'row', gap: theme.spacing[1] }}>
        {GRADES.map((grade) => {
          const tone = BUTTON_VARIANTS[GRADE_VARIANTS[grade]]
          return (
            <View
              key={grade}
              style={{
                flex: 1,
                minWidth: 0,
                alignItems: 'center',
                paddingVertical: theme.spacing[1],
                paddingHorizontal: theme.spacing[0.5],
                borderRadius: theme.radius.sm,
                backgroundColor: resolveColor(theme, tone.ground),
                borderBottomWidth: EDGE,
                borderBottomColor: resolveColor(theme, tone.edge)
              }}
            >
              <Typography level='body-xs' weight='lg' color={tone.label} numberOfLines={1}>
                {t(`cards.session.grading.${grade}`)}
              </Typography>
            </View>
          )
        })}
      </View>
    </Card>
  )
}

export default CardFrame

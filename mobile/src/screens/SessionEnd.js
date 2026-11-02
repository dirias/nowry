/**
 * The session's end as the summary object (ADR-060, Direction A, Board 4).
 *
 * A session ended on "Session complete! You've reviewed 2 cards. Great job!",
 * a companion box restating it, and one key that said Library and went to the
 * Study Center. This is the reading History shows, shown first: the head, the
 * score as the measure, the state line, the sentence, what slipped as families
 * with their marks, what held folded, the keys the reading earned, and the
 * companion's note under them when it has something the rows do not.
 *
 * **It ends where its content ends** (ADR-060 §3). The keys follow the last
 * row and the sheet is never stretched to the screen; a two-card drill makes a
 * short object and the page shows beneath it. Three families, then "Show all".
 */
import { useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { endKeyLabel, FAMILY_CAP, sessionEndTitle } from '@nowry/core/domain/sessionEnd'
import { useTheme } from '../theme'
import { Button, Progress, Readout, Sheet, Stack, Typography } from '../ui'
import { CardLine, Family } from './sessionReading'

/** Readouts as one line, the dots siblings so a line never begins with one. */
const Readouts = ({ items, t }) => (
  <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
    {items.flatMap((item, index) => {
      const readout = <Readout key={item.key}>{t(item.key, item.params)}</Readout>
      if (index === 0) return [readout]
      return [
        <Readout key={`dot-${index}`} importantForAccessibility='no'>
          ·
        </Readout>,
        readout
      ]
    })}
  </Stack>
)

/**
 * @param {Object} props
 * @param {ReturnType<typeof import('@nowry/core/domain/sessionEnd').sessionEnd>} props.end
 * @param {(key: Object) => void} props.onKey Opens what a key names.
 * @param {Array<string|null>} [props.lines] Lines about the session (outside the filter, syncing).
 * @param {import('react').ReactNode} [props.leech] The leech's offer, when the last card earned one.
 * @param {import('react').ReactNode} [props.note] The companion's note, already decided.
 */
export function SessionEnd({ end, onKey, lines = [], leech = null, note = null }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const [allFamilies, setAllFamilies] = useState(false)
  const [heldOpen, setHeldOpen] = useState(false)

  const families = allFamilies ? end.slipped : end.slipped.slice(0, FAMILY_CAP)
  const folded = end.slipped.length - families.length
  const scoreColor = `${end.scoreRole}.plainColor`
  const primaryLabel = endKeyLabel(t, end.keys.primary)
  const secondaryLabel = endKeyLabel(t, end.keys.secondary)

  return (
    <Sheet radius='lg' padding={2} elevation='none' accessibilityRole='summary' accessibilityLabel={t('sessions.end.summaryAria')}>
      <Stack spacing={1.5}>
        {/* Head: the name and, beside it, the cards and the minutes as one readout. */}
        <Stack direction='row' spacing={1.5} alignItems='baseline' flexWrap='wrap'>
          <Typography level='title-lg' color='text.primary'>
            {sessionEndTitle(t, end)}
          </Typography>
          {end.cards > 0 ? (
            <Readout>{`${t('sessions.cardCount', { count: end.cards })} · ${t('sessions.end.minutes', { count: end.minutes })}`}</Readout>
          ) : null}
        </Stack>

        {/* The score is the measure, in its own role: the one measure that is not the accent. */}
        {end.score != null ? (
          <Stack direction='row' spacing={1.5} alignItems='center'>
            <View style={{ flex: 1 }}>
              <Progress value={end.score} color={scoreColor} accessibilityLabel={t('sessions.scoreAria', { pct: end.score })} />
            </View>
            <Typography level='title-md' color={scoreColor} style={{ fontVariant: ['tabular-nums'] }}>
              {`${end.score}%`}
            </Typography>
          </Stack>
        ) : null}

        {/* State is a line of copy (§15.10): the streak and what was earned. */}
        {end.readouts.length > 0 ? <Readouts items={end.readouts} t={t} /> : null}

        {end.reading ? (
          <Typography level='body-md' color='text.primary'>
            {t(end.reading.key, end.reading.params)}
          </Typography>
        ) : null}
        {end.note ? (
          <Typography level='body-sm' color='text.tertiary'>
            {t(end.note.key)}
          </Typography>
        ) : null}
        {lines.filter(Boolean).map((line) => (
          <Typography key={line} level='body-sm' color='text.tertiary' accessibilityLiveRegion='polite'>
            {line}
          </Typography>
        ))}

        {end.slippedCount > 0 ? (
          <Stack spacing={1}>
            <Stack direction='row' spacing={1} alignItems='baseline'>
              <Typography level='title-sm'>{t('sessions.breakdown.slipped')}</Typography>
              <Readout>{t('sessions.cardCount', { count: end.slippedCount })}</Readout>
            </Stack>
            {families.map((family, index) => (
              <Family key={`${family.kind}-${family.label ?? index}`} family={family} t={t} theme={theme} />
            ))}
            {folded > 0 ? (
              <View style={{ alignSelf: 'flex-start' }}>
                <Button size='sm' variant='tertiary' onPress={() => setAllFamilies(true)}>
                  {t('sessions.end.showAll', { count: end.slipped.length })}
                </Button>
              </View>
            ) : null}
          </Stack>
        ) : null}

        {/* The fourth Again on the LAST card lands here (SR-004). */}
        {leech}

        {end.held.count > 0 ? (
          <Stack spacing={1}>
            <Stack direction='row' spacing={1} alignItems='center'>
              <Typography level='title-sm'>{t('sessions.breakdown.held')}</Typography>
              <Readout>{t('sessions.cardCount', { count: end.held.count })}</Readout>
              {end.held.fluent + end.held.fragile > 0 ? (
                <Readout>{t('sessions.breakdown.heldCounts', { fluent: end.held.fluent, fragile: end.held.fragile })}</Readout>
              ) : null}
              <View style={{ flex: 1 }} />
              <Button size='sm' variant='tertiary' onPress={() => setHeldOpen((open) => !open)}>
                {t(heldOpen ? 'sessions.breakdown.hide' : 'sessions.breakdown.show')}
              </Button>
            </Stack>
            {heldOpen ? end.held.cards.map((line, index) => <CardLine key={line.cardId ?? index} line={line} t={t} />) : null}
          </Stack>
        ) : null}

        {/* The keys the reading earned: solid above, the door onward below (Board 4). */}
        <Stack spacing={1}>
          <Button onPress={() => onKey(end.keys.primary)} accessibilityLabel={primaryLabel}>
            {primaryLabel}
          </Button>
          {secondaryLabel ? (
            <Button variant='secondary' onPress={() => onKey(end.keys.secondary)} accessibilityLabel={secondaryLabel}>
              {secondaryLabel}
            </Button>
          ) : null}
        </Stack>

        {/* The companion's word, inside the object and under the keys (ADR-022, ADR-060 §4). */}
        {note}

        {end.tomorrow ? (
          <Typography level='body-sm' color='text.tertiary'>
            {t(end.tomorrow.key, end.tomorrow.params)}
          </Typography>
        ) : null}
      </Stack>
    </Sheet>
  )
}

export default SessionEnd

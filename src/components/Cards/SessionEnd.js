/**
 * The session's end as the summary object (ADR-060, Direction A, Board 7).
 *
 * The web ended a session on a lifted card: an 80 px check, a stat block, a
 * cheer and one key. This is the reading History shows, shown first, in the
 * grammar of §15.10: content, not a card. Head, the score as the measure in
 * its own role, the state line, the sentence, what slipped as families with
 * their marks, what held folded, the keys the reading earned, the companion's
 * note under them, and tomorrow's line.
 *
 * **Two rails from 900 px, one column below.** The rails are decided by the
 * object's own width (a container query), so the same component stacks inside
 * a narrow layout and opens up in a wide one without a second markup. Nothing
 * exists here that the phone hides (ADR-060 §6).
 *
 * **It ends where its content ends** (§3): the keys follow the last row of
 * their rail and the surface is never stretched to the viewport.
 */
import React, { useState } from 'react'
import { Box, Button, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { END_KEY, endKeyLabel, sessionEndTitle } from '@nowry/core/domain/sessionEnd'
import { measureFill, measureTrack, readout, tabularNums } from '../Common/Form/formStyles'
import { CardLine, Family } from '../Study/SessionReading'

/** The object's width from which its two rails sit side by side. */
const FOLD = 900
/** The object's widest, centred in the session layout (Board 7). */
const MAX_WIDTH = 960

const Readouts = ({ items, t }) => (
  <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
    {items.flatMap((item, index) => {
      const line = (
        <Typography key={item.key} level='body-sm' sx={readout}>
          {t(item.key, item.params)}
        </Typography>
      )
      if (index === 0) return [line]
      return [
        <Typography key={`dot-${index}`} level='body-sm' aria-hidden sx={{ color: 'text.tertiary' }}>
          ·
        </Typography>,
        line
      ]
    })}
  </Stack>
)

/**
 * @param {Object} props
 * @param {ReturnType<typeof import('@nowry/core/domain/sessionEnd').sessionEnd>} props.end
 * @param {(key: Object) => void} props.onKey Opens what a key names.
 * @param {() => void} props.onBack The tertiary exit, when no key already leads to Study.
 * @param {Array<{ id?: string, text: string }|null>} [props.lines] Lines about the session.
 * @param {React.ReactNode} [props.leech] The leech's offer, when the last card earned one.
 * @param {React.ReactNode} [props.note] The companion's note, already decided.
 */
export default function SessionEnd({ end, onKey, onBack, lines = [], leech = null, note = null }) {
  const { t } = useTranslation()
  const [heldOpen, setHeldOpen] = useState(false)

  const color = `${end.scoreRole}.plainColor`
  const primaryLabel = endKeyLabel(t, end.keys.primary)
  const secondaryLabel = endKeyLabel(t, end.keys.secondary)
  const leadsToStudy = [end.keys.primary, end.keys.secondary].some((key) => key?.kind === END_KEY.study)

  return (
    <Box
      component='section'
      data-testid='session-end'
      data-state={end.state}
      aria-label={t('sessions.end.summaryAria')}
      sx={{
        containerType: 'inline-size',
        width: '100%',
        maxWidth: MAX_WIDTH,
        mx: 'auto',
        borderRadius: 'lg',
        bgcolor: 'background.surface',
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 2.5 },
        '& .end-body': { display: 'flex', flexDirection: 'column', gap: 2 },
        '& .end-left': { display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0, flex: 7 },
        '& .end-right': { display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0, flex: 5 },
        [`@container (min-width: ${FOLD}px)`]: {
          '& .end-body': { flexDirection: 'row', alignItems: 'flex-start', gap: 4.5 }
        }
      }}
    >
      <Box className='end-body'>
        <Box className='end-left'>
          {/* Head: the name and, beside it, the cards and the minutes as one readout. */}
          <Stack direction='row' spacing={1.5} alignItems='baseline' flexWrap='wrap' useFlexGap>
            <Typography level='title-lg'>{sessionEndTitle(t, end)}</Typography>
            {end.cards > 0 && (
              <Typography level='body-sm' data-testid='session-end-count' sx={readout}>
                {`${t('sessions.cardCount', { count: end.cards })} · ${t('sessions.end.minutes', { count: end.minutes })}`}
              </Typography>
            )}
          </Stack>

          {/* The score is the measure, in its own role: the one measure that is not the accent. */}
          {end.score != null && (
            <Stack direction='row' spacing={1.5} alignItems='center'>
              <Box
                role='progressbar'
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={end.score}
                aria-label={t('sessions.scoreAria', { pct: end.score })}
                sx={{ ...measureTrack, width: 'auto', flex: 1 }}
              >
                <Box sx={measureFill(end.score, color)} />
              </Box>
              <Typography level='title-md' sx={{ color, ...tabularNums }}>
                {`${end.score}%`}
              </Typography>
            </Stack>
          )}

          {end.readouts.length > 0 && <Readouts items={end.readouts} t={t} />}

          {end.reading && <Typography level='body-md'>{t(end.reading.key, end.reading.params)}</Typography>}
          {end.note && (
            <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
              {t(end.note.key)}
            </Typography>
          )}
          {lines.filter(Boolean).map((line) => (
            <Typography key={line.id ?? line.text} level='body-sm' data-testid={line.id} sx={{ color: 'text.tertiary' }}>
              {line.text}
            </Typography>
          ))}

          {end.slippedCount > 0 && (
            <Stack spacing={1}>
              <Stack direction='row' spacing={1} alignItems='baseline'>
                <Typography level='title-sm'>{t('sessions.breakdown.slipped')}</Typography>
                <Typography level='body-xs' sx={readout}>
                  {t('sessions.cardCount', { count: end.slippedCount })}
                </Typography>
              </Stack>
              {end.slipped.map((family, index) => (
                <Family key={`${family.kind}-${family.label ?? index}`} family={family} t={t} />
              ))}
            </Stack>
          )}

          {/* The fourth Again on the LAST card lands here (SR-004). */}
          {leech}

          {end.held.count > 0 && (
            <Stack spacing={1}>
              <Stack direction='row' spacing={1} alignItems='center'>
                <Typography level='title-sm'>{t('sessions.breakdown.held')}</Typography>
                <Typography level='body-xs' sx={readout}>
                  {t('sessions.cardCount', { count: end.held.count })}
                  {end.held.fluent + end.held.fragile > 0
                    ? ` · ${t('sessions.breakdown.heldCounts', { fluent: end.held.fluent, fragile: end.held.fragile })}`
                    : ''}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Button variant='plain' color='neutral' size='sm' onClick={() => setHeldOpen((open) => !open)}>
                  {t(heldOpen ? 'sessions.breakdown.hide' : 'sessions.breakdown.show')}
                </Button>
              </Stack>
              {heldOpen && end.held.cards.map((line, index) => <CardLine key={line.cardId ?? index} line={line} t={t} />)}
            </Stack>
          )}
        </Box>

        <Box className='end-right'>
          {/* The keys the reading earned: the solid, the door onward, and the quiet exit. */}
          <Stack spacing={1}>
            <Button size='lg' variant='solid' color='primary' onClick={() => onKey(end.keys.primary)} aria-label={primaryLabel}>
              {primaryLabel}
            </Button>
            {secondaryLabel && (
              <Button size='lg' variant='outlined' color='neutral' onClick={() => onKey(end.keys.secondary)} aria-label={secondaryLabel}>
                {secondaryLabel}
              </Button>
            )}
            {!leadsToStudy && (
              <Button variant='plain' color='neutral' onClick={onBack}>
                {t('sessions.end.study')}
              </Button>
            )}
          </Stack>

          {/* The companion's word, inside the object and under the keys (ADR-022, ADR-060 §4). */}
          {note}

          {end.tomorrow && (
            <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
              {t(end.tomorrow.key, end.tomorrow.params)}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  )
}

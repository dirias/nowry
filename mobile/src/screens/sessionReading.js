/**
 * The rows a finished session is read in, shared by History and the session's
 * end (ADR-060 §1: one object, two homes). A family of misses with its signal,
 * one attempt as a row, and the flat list for sessions logged before the
 * ledger existed.
 */
import { View } from 'react-native'
import { evaluationOf, sessionCardLine } from '@nowry/core/domain/sessionLog'
import { familySignal } from '@nowry/core/domain/attemptSignals'
import { Icon, Readout, Stack, Typography } from '../ui'

/** A family of misses: its label line, then its cards. Singles share one "on their own" head. */
export function Family({ family, t, theme }) {
  const signal = familySignal(family)
  const head =
    family.kind === 'character'
      ? t('sessions.breakdown.family', { label: family.label, count: family.cards.length })
      : family.kind === 'tag'
        ? t('sessions.breakdown.tagFamily', { label: family.label, count: family.cards.length })
        : t('sessions.breakdown.others')
  return (
    <View style={{ gap: theme.spacing[0.5] }}>
      <Stack direction='row' spacing={1} style={{ alignItems: 'center' }}>
        <Typography level='body-sm' color='text.primary'>
          {head}
        </Typography>
        {signal ? <Readout>{t(`sessions.signal.${signal}`)}</Readout> : null}
      </Stack>
      {family.cards.map((line, index) => (
        <CardLine key={line.cardId ?? index} line={line} t={t} />
      ))}
    </View>
  )
}

/** One attempt as a row: the judgement glyph, the card, its signals. */
export function CardLine({ line, t }) {
  const glyph = evaluationOf(line)
  const marks = [
    line.signals?.speed ? t(`sessions.signal.${line.signals.speed}`) : null,
    line.signals?.helped ? t('sessions.signal.asked') : null,
    line.signals?.lapse === 'lapse' || line.signals?.lapse === 'relearning' ? t(`sessions.signal.${line.signals.lapse}`) : null
  ].filter(Boolean)
  return (
    <Stack direction='row' spacing={1.5} style={{ alignItems: 'center', paddingLeft: 4 }}>
      <Icon name={glyph.iconKey} size='sm' color={glyph.color} />
      <Typography level='body-xs' color='text.primary' style={{ flexShrink: 1 }}>
        {line.title || t('sessions.cardRef', { id: String(line.cardId ?? '').slice(-6) })}
      </Typography>
      {marks.length > 0 ? <Readout>{marks.join(' · ')}</Readout> : null}
    </Stack>
  )
}

/** What one past session asked, card by card — the flat list, for sessions without ledger rows. */
export function Breakdown({ cards, t, theme }) {
  if (cards.length === 0) {
    return (
      <Typography level='body-xs' color='text.tertiary' style={{ paddingBottom: theme.spacing[1.5] }}>
        {t('sessions.noCardDetail')}
      </Typography>
    )
  }

  return (
    <Stack spacing={1} style={{ paddingBottom: theme.spacing[1.5] }}>
      {cards.map(sessionCardLine).map((line, index) => (
        <Stack key={index} direction='row' spacing={1.5} style={{ alignItems: 'flex-start' }}>
          {/* The judgement, as a glyph in its own colour — both named by
              `evaluationOf` so the two clients cannot disagree about what
              "partial" looks like. */}
          <View style={{ paddingTop: 2 }}>
            <Icon name={line.evaluation.iconKey} size='sm' color={line.evaluation.color} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            {line.question ? (
              <Typography level='body-xs' color='text.primary'>
                {line.question}
              </Typography>
            ) : null}
            {line.answer ? (
              <Typography level='body-xs' color='text.secondary'>
                {`→ ${line.answer}`}
              </Typography>
            ) : null}
            {line.title ? (
              <Stack direction='row' spacing={1} style={{ alignItems: 'center' }}>
                <Typography level='body-xs' color='text.primary' style={{ flexShrink: 1 }}>
                  {line.title}
                </Typography>
                {line.grade ? <Readout>{line.grade}</Readout> : null}
              </Stack>
            ) : null}
            {line.ref ? (
              <Typography level='body-xs' color='text.tertiary'>
                {t('sessions.cardRef', { id: line.ref })}
              </Typography>
            ) : null}
          </View>
        </Stack>
      ))}
    </Stack>
  )
}

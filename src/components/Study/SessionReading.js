/**
 * The rows a finished session is read in, shared by History and the session's
 * end (ADR-060 §1: one object, two homes). The evaluation glyph, the signal
 * marks, one attempt as a row, a family of misses with its signal, and the
 * flat list for sessions logged before the ledger existed.
 */
import React from 'react'
import { Box, Chip, Stack, Typography } from '@mui/joy'
import CheckRounded from '@mui/icons-material/CheckRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import RemoveRounded from '@mui/icons-material/RemoveRounded'
import { evaluationOf, sessionCardLine } from '@nowry/core/domain/sessionLog'
import { familySignal } from '@nowry/core/domain/attemptSignals'

/** The glyph for an evaluation. Which of the three it is, and its colour, are
    `evaluationOf`'s; the component that draws it is this client's. */
const EVAL_GLYPHS = { Check: CheckRounded, Minus: RemoveRounded, X: CloseRounded }

export const evalIcon = ({ iconKey, color }) => {
  const Glyph = EVAL_GLYPHS[iconKey] ?? CloseRounded
  return <Glyph sx={{ fontSize: 12, color }} />
}

export const FlatBreakdown = ({ session, t }) => (
  <Box sx={{ bgcolor: 'background.level1', borderRadius: 'sm', p: 2, mb: 1, ml: { xs: 0, sm: 6.5 } }}>
    <Stack spacing={1}>
      {session.cards.length === 0 && (
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t('sessions.noCardDetail')}
        </Typography>
      )}
      {/* Which of the payload's four shapes this card is, decided in
                `sessionCardLine` — the phone's history reads the same four
                (MOB-064). */}
      {session.cards.map(sessionCardLine).map((line, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Box sx={{ mt: 0.25, flexShrink: 0 }}>{evalIcon(line.evaluation)}</Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            {line.question && (
              <Typography level='body-xs' sx={{ color: 'text.primary' }}>
                {line.question}
              </Typography>
            )}
            {line.answer && (
              <Typography level='body-xs' sx={{ color: 'text.secondary', mt: 0.25 }}>
                → {line.answer}
              </Typography>
            )}
            {line.title && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography level='body-xs' sx={{ color: 'text.primary' }}>
                  {line.title}
                </Typography>
                {line.grade && (
                  <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                    {line.grade}
                  </Typography>
                )}
              </Box>
            )}
            {line.ref && (
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {t('sessions.cardRef', { id: line.ref })}
              </Typography>
            )}
          </Box>
        </Box>
      ))}
    </Stack>
  </Box>
)

export const SIGNAL_COLOR = { fluent: 'success', misconception: 'danger', fragile: 'warning', unlearned: 'neutral' }

export const Marks = ({ line, t }) => {
  const marks = [
    line.signals?.speed ? { key: line.signals.speed, color: SIGNAL_COLOR[line.signals.speed] ?? 'neutral' } : null,
    line.signals?.helped ? { key: 'asked', color: 'primary' } : null,
    line.signals?.lapse === 'lapse' || line.signals?.lapse === 'relearning' ? { key: line.signals.lapse, color: 'danger' } : null
  ].filter(Boolean)
  if (marks.length === 0) return null
  return (
    <Stack direction='row' spacing={0.5} sx={{ flexShrink: 0 }}>
      {marks.map((mark) => (
        <Chip key={mark.key} size='sm' variant='soft' color={mark.color}>
          {t(`sessions.signal.${mark.key}`)}
        </Chip>
      ))}
    </Stack>
  )
}

export const CardLine = ({ line, t }) => {
  const glyph = evaluationOf(line)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      <Box sx={{ flexShrink: 0, display: 'flex' }}>{evalIcon(glyph)}</Box>
      <Typography level='body-xs' noWrap sx={{ color: 'text.primary', flex: 1, minWidth: 0 }}>
        {line.title || t('sessions.cardRef', { id: String(line.cardId ?? '').slice(-6) })}
      </Typography>
      <Marks line={line} t={t} />
    </Box>
  )
}

export const Family = ({ family, t }) => {
  const signal = familySignal(family)
  const head =
    family.kind === 'character'
      ? t('sessions.breakdown.family', { label: family.label, count: family.cards.length })
      : family.kind === 'tag'
        ? t('sessions.breakdown.tagFamily', { label: family.label, count: family.cards.length })
        : t('sessions.breakdown.others')
  return (
    <Stack spacing={0.5}>
      <Stack direction='row' spacing={1} alignItems='center'>
        <Typography level='body-sm' fontWeight={600}>
          {head}
        </Typography>
        {signal ? (
          <Chip size='sm' variant='soft' color={SIGNAL_COLOR[signal] ?? 'neutral'}>
            {t(`sessions.signal.${signal}`)}
          </Chip>
        ) : null}
      </Stack>
      {family.cards.map((line, i) => (
        <CardLine key={line.cardId ?? i} line={line} t={t} />
      ))}
    </Stack>
  )
}

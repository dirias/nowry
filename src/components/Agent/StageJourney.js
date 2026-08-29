/**
 * StageJourney — the pet's full evolution arc, past and future.
 *
 * Two jobs, both of which the pet system previously had no surface for:
 *
 *  - **Memory.** The stage names (Wisp → Luminary) existed only inside a toast
 *    that auto-dismissed after 3.6 seconds and could never be viewed again.
 *    Here they are permanent, next to the form they belong to.
 *
 *  - **Anticipation.** An unlabelled progress ring says you are moving; it
 *    does not say *toward what*. Showing the next form — silhouetted, named,
 *    with the distance to it — is what turns progress into a goal.
 *
 * Each stage renders a real `PetOrb` in preview mode, so the silhouettes are
 * the genuine article (form, mark, rings, motes) rather than illustrations
 * that could drift from what the pet actually looks like.
 */
import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Box, Chip, Skeleton, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { agentService } from '../../api/services/agent.service'
import { resolveColor } from '../../utils/petColor'
import { PetOrb } from './StudyPet'

const STAGE_COUNT = 6

/** One rung of the ladder. */
const StageCard = ({ entry, isNext, petSpecies, petColor, t, locale }) => {
  const { stage, reached, reached_at: reachedAt, xp_remaining: xpRemaining, level_required: levelRequired } = entry

  const reachedDate = reachedAt ? new Date(reachedAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) : null

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        p: 2,
        borderRadius: 'lg',
        bgcolor: isNext ? 'primary.softBg' : 'background.level1',
        border: '1px solid',
        borderColor: isNext ? 'primary.outlinedBorder' : 'transparent',
        transition: 'background-color 0.2s ease'
      }}
    >
      <Box
        aria-hidden='true'
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 92,
          width: '100%',
          // Locked forms are shown, not hidden — that is the whole point — but
          // desaturated and dimmed so "not yet yours" reads instantly.
          filter: reached ? 'none' : 'grayscale(0.85)',
          opacity: reached ? 1 : 0.45
        }}
      >
        <PetOrb
          mood='idle'
          level={levelRequired}
          stage={stage}
          species={petSpecies}
          dominantColor={resolveColor(petColor, stage)}
          isCelebrating={false}
          preview
        />
      </Box>

      <Typography level='title-sm' sx={{ color: reached ? 'text.primary' : 'text.tertiary', textAlign: 'center' }}>
        {t(`pet.stage.${stage}.name`)}
      </Typography>

      {reached ? (
        <Typography level='body-xs' sx={{ color: 'text.tertiary', textAlign: 'center' }}>
          {reachedDate ? t('agent.companion.journeyReachedOn', { date: reachedDate }) : t('agent.companion.journeyReached')}
        </Typography>
      ) : (
        <Typography level='body-xs' sx={{ color: isNext ? 'primary.plainColor' : 'text.tertiary', textAlign: 'center' }}>
          {t('agent.companion.journeyLocked', { count: xpRemaining ?? 0 })}
        </Typography>
      )}

      {isNext && (
        <Chip size='sm' variant='soft' color='primary'>
          {t('agent.companion.journeyNext')}
        </Chip>
      )}
    </Box>
  )
}

const StageJourney = ({ petSpecies, petColor }) => {
  const { t, i18n } = useTranslation()
  const [journey, setJourney] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setJourney(await agentService.getJourney())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // The first unreached stage is the one worth pointing at.
  const nextStage = journey?.stages?.find((s) => !s.reached)?.stage ?? null

  return (
    <Box>
      <Typography level='title-md' fontWeight={700} mb={0.5}>
        {t('agent.companion.journeyTitle')}
      </Typography>
      <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 2 }}>
        {t('agent.companion.journeyDescription')}
      </Typography>

      {error && (
        <Alert variant='soft' color='neutral' size='sm'>
          {t('agent.companion.journeyError')}
        </Alert>
      )}

      {!error && (
        <Box
          sx={{
            display: 'grid',
            // Every stage keeps the same width regardless of how many land on
            // the final row; flex-wrap stretched a short row's cards wider.
            gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))',
            gap: 1.5
          }}
        >
          {loading
            ? Array.from({ length: STAGE_COUNT }).map((_, i) => (
                <Skeleton key={i} variant='rectangular' sx={{ borderRadius: 'lg', height: 196 }} />
              ))
            : (journey?.stages ?? []).map((entry) => (
                <StageCard
                  key={entry.stage}
                  entry={entry}
                  isNext={entry.stage === nextStage}
                  petSpecies={petSpecies}
                  petColor={petColor}
                  t={t}
                  locale={i18n.language}
                />
              ))}
        </Box>
      )}
    </Box>
  )
}

export default StageJourney

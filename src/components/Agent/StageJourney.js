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
import { usePet } from '../../context/AgentContext'
import { agentService } from '../../api/services/agent.service'
import { resolveColor } from '../../utils/petColor'
import { useThemePreferences } from '../../theme/DynamicThemeProvider'
import { PetOrb } from './StudyPet'
import { nowryArtFor, LOCKED_SILHOUETTE_FILTER } from './nowryArt'
import StagePortraits from './StagePortraits'

const STAGE_COUNT = 6

/** One rung of the ladder. */
const StageCard = ({ entry, isNext, accentColor, isDefaultCompanion, avatarUrl, currentStage, isOpen, onOpen, t, locale }) => {
  const { stage, reached, reached_at: reachedAt, xp_remaining: xpRemaining, level_required: levelRequired, art_url: artUrl } = entry

  // Art for THIS form, and only this form.
  //
  // The fallback used to be `reached ? avatarUrl : null`, which painted the
  // CURRENT portrait onto every earlier rung — so a user who generated at
  // Sprite saw the same picture on Wisp too, claiming their companion looked
  // like that before it existed. A form the user passed before they ever
  // generated has no portrait and never will; it shows the procedural shape
  // instead, which is the truth.
  //
  // The one legitimate fallback is the current stage: for accounts that
  // generated before per-stage storage existed, the worn portrait genuinely
  // IS this stage's form.
  const formArt = artUrl || (stage === currentStage ? avatarUrl : null)

  const reachedDate = reachedAt ? new Date(reachedAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) : null

  // Only worth opening when this form has more than one portrait to choose
  // between; otherwise the card is inert and should not pretend otherwise.
  const selectable = reached && (entry.portraits?.length ?? 0) > 1

  return (
    <Box
      onClick={selectable ? () => onOpen(stage) : undefined}
      onKeyDown={
        selectable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpen(stage)
              }
            }
          : undefined
      }
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-expanded={selectable ? isOpen : undefined}
      aria-label={selectable ? t('agent.companion.portraitsForStage', { stage: t(`pet.stage.${stage}.name`) }) : undefined}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        p: 2,
        borderRadius: 'lg',
        cursor: selectable ? 'pointer' : 'default',
        bgcolor: isNext ? 'primary.softBg' : 'background.level1',
        border: '1px solid',
        borderColor: isOpen ? 'primary.solidBg' : isNext ? 'primary.outlinedBorder' : 'transparent',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
        '&:hover': selectable ? { transform: 'translateY(-2px)' } : undefined,
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.solidBg', outlineOffset: 2 }
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
          // Locked forms are shown, not hidden — that is the whole point.
          // A flat silhouette rather than greyscale: greyscale on illustrated
          // art reads as "disabled", while a solid fill reads as "locked but
          // real" and preserves the outline, so Oracle's spread wing and
          // Luminary's crown still tell those rungs apart at a glance.
          // Reached forms are always full colour, portrait or not — they
          // happened. Only unreached forms are silhouetted.
          filter: reached ? 'none' : isDefaultCompanion || formArt ? LOCKED_SILHOUETTE_FILTER : 'grayscale(0.85)',
          opacity: reached || isDefaultCompanion || formArt ? 1 : 0.45
        }}
      >
        {isDefaultCompanion ? (
          <Box component='img' src={nowryArtFor(stage)} alt='' sx={{ width: 84, height: 84, objectFit: 'contain', display: 'block' }} />
        ) : (
          <PetOrb
            mood='idle'
            level={levelRequired}
            stage={stage}
            dominantColor={resolveColor(accentColor, stage)}
            isCelebrating={false}
            preview
            // A rung the user has reached shows their actual companion. This
            // was simply never passed, so a paying user with a generated
            // portrait saw an emoji everywhere in their own journey.
            avatarUrl={formArt}
            // Only faceless when there is genuinely no art for this form.
            blankFace={!formArt}
          />
        )}
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

const StageJourney = () => {
  const { t, i18n } = useTranslation()
  const { themeColor } = useThemePreferences()
  const { avatarUrl, generateNextStageArt, wearPortrait } = usePet()
  const [journey, setJourney] = useState(null)
  // Which form's portraits are on show. Defaults to the current one; any
  // reached form with more than one portrait can be inspected, so nothing the
  // user paid for is stored-but-unreachable.
  const [openStage, setOpenStage] = useState(null)
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

  // Re-fetches whenever the worn portrait changes, not only on mount. Both
  // generating a portrait and reaching a new stage change what every rung
  // should show, and without this the ladder stayed stale until a full page
  // reload — which is what made a freshly generated avatar seem to need one.
  useEffect(() => {
    load()
  }, [load, avatarUrl])

  // The first unreached stage is the one worth pointing at.
  const nextEntry = journey?.stages?.find((s) => !s.reached) ?? null
  const nextStage = nextEntry?.stage ?? null

  // If the form ahead has no art yet, quietly commission it — but only for a
  // personalised companion. Nowry's whole arc ships with the app, so asking a
  // model for it would be spending money on art we already have.
  useEffect(() => {
    if (!journey || journey.is_default_companion) return
    if (nextEntry && !nextEntry.art_url) {
      // Reload once it lands so the new form appears without a refresh. It
      // resolves to false when nothing was generated, so this cannot loop.
      generateNextStageArt().then((generated) => {
        if (generated) load()
      })
    }
  }, [journey, nextEntry, generateNextStageArt, load])

  // The form whose portraits are on show: the one the user opened, else the
  // current one.
  const shownStage = journey?.stages?.find((s) => s.stage === (openStage ?? journey?.current_stage)) ?? null

  const sinceDate = journey?.companion_since
    ? new Date(journey.companion_since).toLocaleDateString(i18n.language, { year: 'numeric', month: 'long' })
    : null

  return (
    <Box>
      <Typography level='title-md' fontWeight={700} mb={0.5}>
        {t('agent.companion.journeyTitle')}
      </Typography>
      <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 2 }}>
        {t('agent.companion.journeyDescription')}
      </Typography>

      {/* Shared history. A companion that can point at something you did
          together is a different object from a progress bar with a face. */}
      {!loading && !error && journey?.days_studied > 0 && (
        <Typography level='body-sm' sx={{ color: 'text.primary', mb: 2 }}>
          {t('agent.companion.journeyTogether', { count: journey.days_studied })}
          {sinceDate && (
            <Typography component='span' level='body-sm' sx={{ color: 'text.tertiary' }}>
              {' '}
              {t('agent.companion.journeySince', { date: sinceDate })}
            </Typography>
          )}
        </Typography>
      )}

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
                  accentColor={themeColor}
                  isDefaultCompanion={journey?.is_default_companion ?? true}
                  avatarUrl={avatarUrl}
                  currentStage={journey?.current_stage}
                  isOpen={(openStage ?? journey?.current_stage) === entry.stage}
                  onOpen={setOpenStage}
                  t={t}
                  locale={i18n.language}
                />
              ))}
        </Box>
      )}

      {/* Portraits for whichever reached form is open — the current one by
          default. Every form the user generated for is inspectable, so
          nothing they paid for is stored but unreachable.

          Choosing for a PAST form changes only how that rung is remembered;
          the companion's actual appearance always comes from its current
          form. Letting an earlier form be worn now would make the whole
          evolution arc cosmetic. */}
      {!loading && !error && !journey?.is_default_companion && shownStage && (
        <Box sx={{ mt: 3 }}>
          <StagePortraits
            stage={shownStage.stage}
            stageName={t(`pet.stage.${shownStage.stage}.name`)}
            portraits={shownStage.portraits}
            wornUrl={shownStage.art_url}
            onWear={async (stage, url) => {
              const ok = await wearPortrait(stage, url)
              if (ok) load()
            }}
          />
        </Box>
      )}
    </Box>
  )
}

export default StageJourney

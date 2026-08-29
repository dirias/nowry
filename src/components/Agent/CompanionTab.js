/**
 * CompanionTab — Pet customization form for AgentSettings.
 *
 * Provides:
 *   1. Name — free-text input (max 20 chars), saved on blur.
 *   2. Evolution journey — every form, earned and still ahead.
 *   3. AI portrait / animation generation (Plus and Pro).
 *
 * Species appears for paid tiers only, and only as an input to portrait
 * generation — it is not the pet's face. Free users are with Nowry, who is an
 * owl by definition, so the control would do nothing for them.
 *
 * All API calls are handled by the parent (AgentSettings) via callbacks.
 * This component is purely presentational.
 */
import React, { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  Input,
  LinearProgress,
  Stack,
  Typography
} from '@mui/joy'
import { useTranslation } from 'react-i18next'
import StageJourney from './StageJourney'

// ---------------------------------------------------------------------------
// Static catalog data
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Generation stage constants
// ---------------------------------------------------------------------------

const AVATAR_STAGES = [
  { after: 0, icon: '🎨', msgKey: 'agent.companion.avatarStage0' },
  { after: 8, icon: '✨', msgKey: 'agent.companion.avatarStage1' },
  { after: 25, icon: '🔍', msgKey: 'agent.companion.avatarStage2' },
  { after: 50, icon: '⏳', msgKey: 'agent.companion.avatarStage3' }
]

const ANIMATION_STAGES = [
  { after: 0, icon: '🎬', msgKey: 'agent.companion.animStage0' },
  { after: 20, icon: '🦋', msgKey: 'agent.companion.animStage1' },
  { after: 60, icon: '🔄', msgKey: 'agent.companion.animStage2' },
  { after: 120, icon: '🎞️', msgKey: 'agent.companion.animStage3' },
  { after: 240, icon: '✨', msgKey: 'agent.companion.animStage4' }
]

// ---------------------------------------------------------------------------
// useGenerationStatus hook
// ---------------------------------------------------------------------------

/**
 * Cycles through timed stage messages while isGenerating is true.
 * Returns { icon, msgKey, elapsedSeconds, progressPct }
 */
const useGenerationStatus = (isGenerating, stages, expectedTotalSeconds) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const startRef = useRef(null)

  useEffect(() => {
    if (!isGenerating) {
      setElapsedSeconds(0)
      startRef.current = null
      return
    }
    startRef.current = Date.now()
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [isGenerating])

  let stageIdx = 0
  for (let i = 0; i < stages.length; i++) {
    if (elapsedSeconds >= stages[i].after) stageIdx = i
  }

  const progressPct = Math.min(95, (elapsedSeconds / expectedTotalSeconds) * 100)

  return { ...stages[stageIdx], elapsedSeconds, progressPct }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SPECIES_SLUGS = ['owl', 'fox', 'cat', 'dragon', 'robot', 'star', 'phoenix', 'crystal', 'leaf', 'music']

const CompanionTab = ({
  petName,
  setPetName,
  petSpecies,
  onSpeciesSelect,
  suggestedSpecies,
  hasSuggestion,
  onNameBlur,
  error,
  tier,
  avatarUrl,
  avatarGenerating,
  avatarError,
  generationsRemaining,
  onGenerateAvatar,
  animationUrl,
  animationGenerating,
  animationError,
  onGenerateAnimation
}) => {
  const { t } = useTranslation()

  const avatarStatus = useGenerationStatus(avatarGenerating, AVATAR_STAGES, 70)
  const animStatus = useGenerationStatus(animationGenerating, ANIMATION_STAGES, 180)

  return (
    <Stack spacing={4}>
      {error && (
        <Alert variant='soft' color='danger' size='sm'>
          {t('agent.companion.saveError')}
        </Alert>
      )}

      {/* ── Section: Pet Name ──────────────────────────────────────────────── */}
      <Box>
        <Typography level='title-md' fontWeight={700} mb={0.5}>
          {t('agent.companion.nameTitle')}
        </Typography>
        <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 2 }}>
          {t('agent.companion.nameDescription')}
        </Typography>
        <FormControl>
          <FormLabel>{t('agent.companion.nameLabel')}</FormLabel>
          <Input
            id='pet-name-input'
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            onBlur={onNameBlur}
            placeholder={t('agent.companion.namePlaceholder')}
            aria-label={t('agent.companion.nameAriaLabel')}
            slotProps={{ input: { maxLength: 20 } }}
          />
          <FormHelperText>
            <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
              {(petName || '').length}/20
            </Typography>
          </FormHelperText>
        </FormControl>
      </Box>

      <Divider />

      {/* ── Section: Evolution journey ─────────────────────────────────────── */}
      <StageJourney />

      <Divider />

      {/* ── Section: Species (paid only — a generation input) ───────────────
          Species shapes the portrait the model draws; it is not the pet's
          face. Free users are with Nowry, who is an owl by definition, so
          the choice would do nothing for them and is hidden.

          Deliberately labels rather than emoji: the old emoji grid implied
          the glyph WAS the companion, which is exactly what the shipped
          artwork replaced. */}
      {tier !== 'free' && (
        <>
          <Box>
            <Typography level='title-md' fontWeight={700} mb={0.5}>
              {t('agent.companion.speciesTitle')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 1.5 }}>
              {t('agent.companion.speciesDescription')}
            </Typography>
            {hasSuggestion && petSpecies === suggestedSpecies && (
              <Alert variant='soft' color='neutral' size='sm' sx={{ mb: 1.5 }}>
                {t('agent.companion.suggestedLabel')}
              </Alert>
            )}
            <Grid container spacing={1.5}>
              {SPECIES_SLUGS.map((slug) => {
                const selected = petSpecies === slug
                return (
                  <Grid key={slug} xs={6} sm={4} md={3}>
                    <Card
                      variant={selected ? 'solid' : 'outlined'}
                      color={selected ? 'primary' : 'neutral'}
                      onClick={() => onSpeciesSelect(slug)}
                      role='radio'
                      aria-checked={selected}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onSpeciesSelect(slug)
                        }
                      }}
                      aria-label={t('agent.companion.species.' + slug)}
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        alignItems: 'center',
                        py: 1.25,
                        userSelect: 'none',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: 'md' }
                      }}
                    >
                      <Typography level='body-sm' fontWeight={selected ? 'lg' : 'md'}>
                        {t('agent.companion.species.' + slug)}
                      </Typography>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          </Box>

          <Divider />
        </>
      )}

      {/* ── Section: AI Portrait ───────────────────────────────────────────── */}
      <Box>
        <Typography level='title-md' fontWeight={700} mb={0.5}>
          {t('agent.companion.avatarTitle')}
        </Typography>

        {/* FREE TIER — locked */}
        {tier === 'free' && (
          <Card
            variant='outlined'
            sx={{
              p: 2.5,
              bgcolor: 'background.level1',
              borderStyle: 'dashed',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Blurred placeholder circle */}
            <Box sx={{ filter: 'blur(6px)', opacity: 0.4, mb: 1.5, display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: 'primary.softBg' }} />
            </Box>

            <Chip size='sm' color='warning' variant='solid' sx={{ position: 'absolute', top: 12, right: 12 }}>
              Plus
            </Chip>

            <Typography level='title-sm' textAlign='center' mb={0.5}>
              {t('agent.companion.avatarLockedTitle')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.secondary', textAlign: 'center', mb: 2 }}>
              {t('agent.companion.avatarLockedDescription')}
            </Typography>

            <Button
              variant='solid'
              color='primary'
              size='sm'
              fullWidth
              aria-label={t('agent.companion.upgradePlusAriaLabel')}
              component='a'
              href='/pricing'
            >
              {t('agent.companion.upgradePlus')}
            </Button>
          </Card>
        )}

        {/* PLUS/PRO — no avatar yet */}
        {tier !== 'free' && !avatarUrl && (
          <Stack spacing={2}>
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              {t('agent.companion.avatarDescription')}
            </Typography>

            {avatarGenerating ? (
              <Stack spacing={1.5} py={1}>
                <Stack direction='row' spacing={1.5} alignItems='center' justifyContent='center'>
                  <CircularProgress size='sm' />
                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                    {avatarStatus.icon} {t(avatarStatus.msgKey)}
                  </Typography>
                </Stack>
                <LinearProgress determinate value={avatarStatus.progressPct} sx={{ borderRadius: 'sm' }} />
                <Typography level='body-xs' sx={{ color: 'text.tertiary', textAlign: 'center' }}>
                  {t('agent.companion.elapsedSeconds', { seconds: avatarStatus.elapsedSeconds })}
                </Typography>
              </Stack>
            ) : (
              <Button
                variant='solid'
                color='primary'
                fullWidth
                onClick={() => onGenerateAvatar('manual')}
                aria-label={t('agent.companion.generateAvatarAriaLabel')}
                sx={{
                  // Justified brand gradient constant — semantic tokens don't map to this multi-stop gradient
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  '&:hover': { background: 'linear-gradient(135deg, #5a6fd6, #6a3d9a)' }
                }}
              >
                {t('agent.companion.generateAvatar')}
              </Button>
            )}

            {avatarError && (
              <Alert variant='soft' color='danger' size='sm'>
                {t(avatarError, { defaultValue: t('agent.avatar.generateError') })}
              </Alert>
            )}
          </Stack>
        )}

        {/* PLUS/PRO — avatar exists */}
        {tier !== 'free' && !!avatarUrl && (
          <Stack spacing={2} alignItems='center'>
            <Box
              sx={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid',
                borderColor: 'primary.outlinedBorder'
              }}
            >
              <img
                src={avatarUrl}
                alt={t('agent.avatar.portraitAlt')}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </Box>

            <Stack direction='row' spacing={1} alignItems='center'>
              <Button
                variant='outlined'
                color='neutral'
                size='sm'
                onClick={() => onGenerateAvatar('manual')}
                disabled={avatarGenerating || generationsRemaining === 0}
                aria-label={t('agent.companion.regenerateAriaLabel')}
              >
                {avatarGenerating ? t('agent.companion.regenerating') : t('agent.companion.regenerate')}
              </Button>
              {generationsRemaining !== null && (
                <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                  {t('agent.companion.generationsRemaining', { count: generationsRemaining })}
                </Typography>
              )}
            </Stack>

            {avatarGenerating && (
              <Stack spacing={1} sx={{ width: '100%' }}>
                <LinearProgress determinate value={avatarStatus.progressPct} sx={{ borderRadius: 'sm' }} />
                <Typography level='body-xs' sx={{ color: 'text.tertiary', textAlign: 'center' }}>
                  {avatarStatus.icon} {t(avatarStatus.msgKey)} ·{' '}
                  {t('agent.companion.elapsedSeconds', { seconds: avatarStatus.elapsedSeconds })}
                </Typography>
              </Stack>
            )}

            {avatarError && (
              <Alert variant='soft' color='danger' size='sm' sx={{ width: '100%' }}>
                {t(avatarError, { defaultValue: t('agent.avatar.generateError') })}
              </Alert>
            )}
          </Stack>
        )}
      </Box>

      <Divider />

      {/* ── Section: AI Animation ─────────────────────────────────────────── */}
      <Box>
        <Typography level='title-md' fontWeight={700} mb={0.5}>
          {t('agent.companion.animationTitle')}
        </Typography>

        {tier === 'free' && (
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('agent.companion.animationLockedDescription')}
          </Typography>
        )}

        {tier !== 'free' && !avatarUrl && (
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('agent.companion.animationRequiresAvatar')}
          </Typography>
        )}

        {tier !== 'free' && !!avatarUrl && (
          <Stack spacing={2}>
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              {t('agent.companion.animationDescription')}
            </Typography>

            {/* Legacy base64 portrait — must regenerate via Cloudinary first */}
            {avatarUrl?.startsWith('data:') && (
              <Alert variant='soft' color='warning' size='sm'>
                {t('agent.companion.animationRequiresNewPortrait')}
              </Alert>
            )}

            {!avatarUrl?.startsWith('data:') && !animationUrl && !animationGenerating && (
              <Button
                variant='outlined'
                color='neutral'
                fullWidth
                onClick={() => onGenerateAnimation('manual')}
                aria-label={t('agent.companion.generateAnimationAriaLabel')}
              >
                {t('agent.companion.generateAnimation')}
              </Button>
            )}

            {animationGenerating && (
              <Stack spacing={1.5} py={1}>
                <Stack direction='row' spacing={1.5} alignItems='center' justifyContent='center'>
                  <CircularProgress size='sm' />
                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                    {animStatus.icon} {t(animStatus.msgKey)}
                  </Typography>
                </Stack>
                <LinearProgress determinate value={animStatus.progressPct} sx={{ borderRadius: 'sm' }} />
                <Typography level='body-xs' sx={{ color: 'text.tertiary', textAlign: 'center' }}>
                  {t('agent.companion.elapsedSeconds', { seconds: animStatus.elapsedSeconds })}
                </Typography>
              </Stack>
            )}

            {!!animationUrl && !animationGenerating && !avatarUrl?.startsWith('data:') && (
              <Stack direction='row' spacing={1} alignItems='center'>
                <Typography level='body-sm' sx={{ color: 'success.plainColor' }}>
                  ✓ {t('agent.companion.animationReady')}
                </Typography>
                <Button
                  variant='outlined'
                  color='neutral'
                  size='sm'
                  onClick={() => onGenerateAnimation('manual')}
                  aria-label={t('agent.companion.regenerateAnimationAriaLabel')}
                >
                  {t('agent.companion.regenerateAnimation')}
                </Button>
              </Stack>
            )}

            {animationError && (
              <Alert variant='soft' color='danger' size='sm'>
                {t(animationError, { defaultValue: t('agent.avatar.generateError') })}
              </Alert>
            )}
          </Stack>
        )}
      </Box>
    </Stack>
  )
}

export default CompanionTab

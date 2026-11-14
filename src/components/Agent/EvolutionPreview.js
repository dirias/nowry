import React, { useEffect, useMemo, useState } from 'react'
import { Box, Button, Checkbox, Container, Stack, Typography } from '@mui/joy'
import { useColorScheme } from '@mui/joy/styles'
import { generateColorScheme, getColorPresets, contrastRatio } from '@nowry/core/tokens/colorSchemeGenerator'
import { EVOLUTION_KIND, spiralPath } from '@nowry/core/domain/petEvolution'
import { resolveColor } from '@nowry/core/utils/petColor'
import { CompanionArt } from './CompanionArt'
import EvolutionReveal, { FRAME_PX } from './EvolutionReveal'

/**
 * Every variant of the staged evolution, replayed without levelling up
 * (EVO-015, ADR-075). A development tool: the route exists only outside a
 * production build, and its labels are for whoever is looking, in English.
 *
 * Two things can be checked here that a test cannot show:
 *   - the sequence itself, per variant, stage pair and accent, in either mode;
 *   - the spiral's colour against the ground it is drawn on, for all eight
 *     accents in light and dark at once, with the measured ratio beside it.
 *
 * The reveal is a dialog in a portal, so the chosen accent is applied to the
 * document while this page is open and removed when it closes. Nothing is
 * saved, and no account is touched.
 */
const PRESETS = getColorPresets()
const MODES = ['light', 'dark']
const PRIMARY_KEYS = ['plainColor', 'solidBg', 'solidHoverBg', 'solidActiveBg', 'solidColor', 'outlinedBorder']
const TILE = 120
const NON_TEXT_CONTRAST = 3

/**
 * The level each stage after the first is reached at: the API's
 * STAGE_LEVEL_THRESHOLDS (app/routers/agent.py), which the app reads from
 * the server. Kept here so the replay says the level the app would say.
 */
const STAGE_LEVELS = [3, 6, 10, 14, 18]

const REPLAYS = [
  ...[1, 2, 3, 4, 5].map((from) => ({
    label: `Stage ${from} → ${from + 1}`,
    kind: EVOLUTION_KIND.stage,
    fromStage: from,
    toStage: from + 1,
    level: STAGE_LEVELS[from - 1]
  })),
  // A portrait's two sides belong to one stage, as in PortraitReveal.
  { label: 'New portrait · 2 left', kind: EVOLUTION_KIND.generated, fromStage: 2, toStage: 2, generationsRemaining: 2 },
  { label: 'New portrait · the last one', kind: EVOLUTION_KIND.generated, fromStage: 2, toStage: 2, generationsRemaining: 0 },
  { label: 'Worn portrait (short)', kind: EVOLUTION_KIND.worn, fromStage: 2, toStage: 2 }
]

/**
 * Two portraits to replay the portrait variants with, from `?portraits=<from>,<to>`
 * (already generated ones; this page never generates). Without them each side
 * is the stage's form, as PortraitReveal draws a side that has no portrait.
 */
const portraitsFromAddress = () => {
  const [from = null, to = null] = (new URLSearchParams(window.location.search).get('portraits') || '').split(',').filter(Boolean)
  return { from, to }
}

/** The spiral as the reveal draws it, still, on one accent and one mode's dialog ground. */
const ContrastTile = ({ preset, mode }) => {
  const palette = useMemo(() => generateColorScheme(preset.color)[mode], [preset.color, mode])
  const spiral = palette.primary.plainColor
  const ground = palette.background.surface
  const ratio = contrastRatio(spiral, ground)
  const passes = ratio >= NON_TEXT_CONTRAST
  return (
    <Stack
      spacing={0.5}
      alignItems='center'
      data-testid='spiral-contrast'
      data-accent={preset.key}
      data-mode={mode}
      data-ratio={ratio.toFixed(2)}
      data-passes={String(passes)}
    >
      {/* A literal ground and line from core: this tile shows a mode other than the page's own. */}
      <Box
        sx={{
          width: TILE,
          height: TILE,
          borderRadius: 'lg',
          border: '1px solid',
          borderColor: 'divider',
          display: 'grid',
          placeItems: 'center',
          bgcolor: ground
        }}
      >
        <svg width={TILE - 16} height={TILE - 16} viewBox={`0 0 ${FRAME_PX} ${FRAME_PX}`} fill='none' aria-hidden='true'>
          <path d={spiralPath({ size: FRAME_PX })} stroke={spiral} strokeWidth={5} strokeLinecap='round' />
        </svg>
      </Box>
      <Typography level='body-xs' sx={{ color: passes ? 'text.secondary' : 'danger.plainColor' }}>
        {`${preset.label} · ${mode} · ${ratio.toFixed(1)}:1`}
      </Typography>
    </Stack>
  )
}

const EvolutionPreview = () => {
  const { mode, systemMode, setMode } = useColorScheme()
  const resolvedMode = (mode === 'system' ? systemMode : mode) || 'light'
  const [accent, setAccent] = useState(PRESETS[0])
  const [reducedMotion, setReducedMotion] = useState(false)
  const [playing, setPlaying] = useState(null)
  const portraits = useMemo(portraitsFromAddress, [])

  // The dialog renders in a portal, so the accent goes on the document for as long as this page is open.
  useEffect(() => {
    const primary = generateColorScheme(accent.color)[resolvedMode].primary
    const root = document.documentElement
    for (const key of PRIMARY_KEYS) root.style.setProperty(`--joy-palette-primary-${key}`, primary[key])
    return () => {
      for (const key of PRIMARY_KEYS) root.style.removeProperty(`--joy-palette-primary-${key}`)
    }
  }, [accent, resolvedMode])

  return (
    <Container maxWidth='lg' sx={{ py: 4 }}>
      <Stack spacing={4}>
        <Stack spacing={1}>
          <Typography level='h2' component='h1'>
            Evolution reveal
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            Development only. Nothing here is saved or sent.
          </Typography>
        </Stack>

        <Stack spacing={1.5}>
          <Typography level='title-md'>Accent and mode</Typography>
          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
            {PRESETS.map((preset) => (
              <Button
                key={preset.key}
                size='sm'
                variant={preset.key === accent.key ? 'solid' : 'soft'}
                color={preset.key === accent.key ? 'primary' : 'neutral'}
                aria-pressed={preset.key === accent.key}
                onClick={() => setAccent(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </Stack>
          <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
            {MODES.map((option) => (
              <Button
                key={option}
                size='sm'
                variant={resolvedMode === option ? 'solid' : 'soft'}
                color='neutral'
                aria-pressed={resolvedMode === option}
                onClick={() => setMode(option)}
              >
                {option}
              </Button>
            ))}
            <Checkbox
              size='sm'
              label='Reduced motion'
              checked={reducedMotion}
              onChange={(event) => setReducedMotion(event.target.checked)}
            />
          </Stack>
        </Stack>

        <Stack spacing={1.5}>
          <Typography level='title-md'>Replay</Typography>
          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
            {REPLAYS.map((replay) => (
              <Button key={replay.label} size='sm' variant='soft' color='neutral' onClick={() => setPlaying(replay)}>
                {replay.label}
              </Button>
            ))}
          </Stack>
        </Stack>

        <Stack spacing={1.5}>
          <Typography level='title-md'>The spiral on its ground, every accent, both modes</Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {`The line is the accent's plain colour on the dialog's ground. A graphic needs ${NON_TEXT_CONTRAST}:1.`}
          </Typography>
          {MODES.map((option) => (
            <Stack key={option} direction='row' spacing={2} flexWrap='wrap' useFlexGap>
              {PRESETS.map((preset) => (
                <ContrastTile key={preset.key} preset={preset} mode={option} />
              ))}
            </Stack>
          ))}
        </Stack>
      </Stack>

      {playing && (
        <EvolutionReveal
          key={`${playing.label}-${accent.key}-${reducedMotion}`}
          kind={playing.kind}
          fromStage={playing.fromStage}
          toStage={playing.toStage}
          level={playing.level}
          generationsRemaining={playing.generationsRemaining}
          reducedMotion={reducedMotion}
          onClose={() => setPlaying(null)}
          // Each form shaded from the accent by its stage, as the companion panel draws it.
          renderForm={(stage, side) => {
            const url = playing.kind === EVOLUTION_KIND.stage ? null : portraits[side]
            if (!url) return <CompanionArt stage={stage} accent={resolveColor(accent.color, stage)} size={FRAME_PX} />
            return (
              <Box
                component='img'
                src={url}
                alt=''
                sx={{ width: FRAME_PX, height: FRAME_PX, borderRadius: 'full', objectFit: 'cover', display: 'block' }}
              />
            )
          }}
        />
      )}
    </Container>
  )
}

export default EvolutionPreview

import React, { useEffect, useId, useState } from 'react'
import { Box, Button, Modal, ModalDialog, Typography } from '@mui/joy'
import { useTheme } from '@mui/joy/styles'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { MOTION } from '@nowry/core/tokens/tokens'
import { earnedGold } from '@nowry/core/tokens/colorSystem'
import {
  EVOLUTION_DONE,
  EVOLUTION_KIND,
  beatDuration,
  evolutionVariant,
  firstBeat,
  formatGenerationReset,
  generationResetAt,
  nextBeat,
  showsGenerationsLeft,
  showsNewForm
} from '@nowry/core/domain/petEvolution'
import SpiralEffect from './SpiralEffect'

/**
 * The moment the companion evolves (EVO-003, ADR-052), staged (ADR-075).
 *
 * It used to be the level-up toast: 220px, an emoji, gone in 3.6 seconds, and
 * identical whether the companion had changed form or only gained a level. The
 * evolution is what the whole XP loop builds toward, so it gets the screen.
 *
 * The sequence is `petEvolution`'s: a spiral of light draws around the old
 * form, turns and tightens, closes into a flash of earned gold under which the
 * form is swapped, and opens again as the new form arrives. While the spiral
 * moves the companion holds still; its own entrance comes after. Every length
 * is the timeline's, in the motion scale's steps. A tap skips to the end;
 * under reduced motion the new form is simply there.
 *
 * `kind` says what happened and so which variant plays (ADR-075 §4):
 *   stage      a form earned by level — the full sequence
 *   generated  a new portrait — the full sequence, then how many are left
 *   worn       a portrait already made — the short one, which closes itself
 *
 * `renderForm(stage, side)` draws a form at the reveal's frame size; `side` is
 * `'from'` or `'to'`, for a caller whose two forms are one stage's portraits.
 */
export const FRAME_PX = 200
const seconds = (ms) => ms / 1000
const ENTER = { duration: seconds(MOTION.duration.slow), ease: [0.2, 0, 0, 1] }
/** How long the short variant rests on the new portrait before closing itself. */
const REST_MS = 3 * MOTION.duration.slow

const EvolutionReveal = ({
  kind = EVOLUTION_KIND.stage,
  fromStage,
  toStage,
  level,
  generationsRemaining,
  renderForm,
  onClose,
  reducedMotion = false
}) => {
  const { t, i18n } = useTranslation()
  // The system's setting, or the preview's switch standing in for it (EVO-015).
  const reduceMotion = useReducedMotion() || reducedMotion
  const gold = earnedGold(useTheme().palette.mode)
  const titleId = useId()
  const variant = evolutionVariant(kind)
  const [beat, setBeat] = useState(reduceMotion ? EVOLUTION_DONE : firstBeat(variant))
  const done = beat === EVOLUTION_DONE
  const closesItself = kind === EVOLUTION_KIND.worn

  useEffect(() => {
    if (done) return undefined
    const timer = setTimeout(() => setBeat(nextBeat(variant, beat)), beatDuration(variant, beat))
    return () => clearTimeout(timer)
  }, [beat, done, variant])

  // The short variant confirms a choice already made; it does not ask for a press.
  useEffect(() => {
    if (!done || !closesItself) return undefined
    const timer = setTimeout(onClose, REST_MS)
    return () => clearTimeout(timer)
  }, [done, closesItself, onClose])

  const toName = t(`pet.stage.${toStage}.name`)
  const fromName = t(`pet.stage.${fromStage}.name`)
  const isStage = kind === EVOLUTION_KIND.stage
  const newForm = showsNewForm(beat)
  const skip = () => {
    if (!done) setBeat(EVOLUTION_DONE)
  }
  const countLine = () => {
    if (!showsGenerationsLeft(kind, generationsRemaining)) return null
    if (generationsRemaining > 0) return t('pet.evolution.generationsLeft', { count: generationsRemaining })
    const date = formatGenerationReset(generationResetAt(), i18n?.language)
    return `${t('pet.evolution.generationsNone')} ${t('pet.evolution.resetsOn', { date })}`
  }

  return (
    <Modal open onClose={onClose}>
      <ModalDialog
        aria-labelledby={titleId}
        data-evolution-phase={beat}
        data-evolution-kind={kind}
        onClick={skip}
        sx={{
          width: { xs: 'calc(100% - 32px)', sm: 420 },
          alignItems: 'center',
          textAlign: 'center',
          gap: 1.5,
          p: 4,
          borderRadius: 'xl',
          bgcolor: 'background.surface'
        }}
      >
        <Typography level='body-sm' sx={{ color: 'text.tertiary', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {isStage ? t('pet.evolution.eyebrow') : t('pet.evolution.portraitEyebrow')}
        </Typography>

        <Box sx={{ position: 'relative', width: FRAME_PX, height: FRAME_PX, display: 'grid', placeItems: 'center' }}>
          {/*
            The forms and the flash share one cell and cross: the flash lights as
            the old form fades, and the new form arrives as it goes, so the swap
            happens under the gold (ADR-075). The flash follows the old form in the
            cell, so it paints over it. Waiting for each exit dropped the flash,
            whose beat is shorter than the old form's exit.
          */}
          <AnimatePresence initial={false}>
            {!newForm && beat !== 'flash' && (
              <Box
                key='from'
                component={motion.div}
                data-evolution-form={fromStage}
                data-evolution-side='from'
                exit={{ opacity: 0, scale: 0.9 }}
                transition={ENTER}
                sx={{ gridArea: '1 / 1' }}
              >
                {renderForm(fromStage, 'from')}
              </Box>
            )}
            {beat === 'flash' && (
              <Box
                key='flash'
                component={motion.div}
                aria-hidden='true'
                data-evolution-flash=''
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: seconds(MOTION.duration.base) }}
                sx={{
                  gridArea: '1 / 1',
                  width: FRAME_PX * 0.8,
                  height: FRAME_PX * 0.8,
                  borderRadius: 'full',
                  background: `radial-gradient(circle, ${gold} 0%, transparent 70%)`
                }}
              />
            )}
            {newForm && (
              <Box
                key='to'
                component={motion.div}
                data-evolution-form={toStage}
                data-evolution-side='to'
                initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={ENTER}
                sx={{ gridArea: '1 / 1' }}
              >
                {renderForm(toStage, 'to')}
              </Box>
            )}
          </AnimatePresence>
          {/* The one moving thing while it is here (ADR-075 §3). Not drawn under reduced motion. */}
          {!reduceMotion && !done && <SpiralEffect beat={beat} variant={variant} size={FRAME_PX} />}
        </Box>

        <Box
          component={motion.div}
          initial={false}
          animate={{ opacity: done ? 1 : 0 }}
          transition={{ duration: seconds(MOTION.duration.base) }}
          sx={{ display: 'grid', gap: 0.5 }}
        >
          <Typography id={titleId} level='h2'>
            {closesItself ? t('pet.evolution.portraitWorn') : done || !isStage ? toName : t('pet.evolution.evolving', { name: fromName })}
          </Typography>
          {isStage && (
            <>
              <Typography level='body-md' sx={{ color: 'text.secondary' }}>
                {t('pet.evolution.became', { from: fromName, to: toName })}
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                {t('pet.levelUp.reached', { level })}
              </Typography>
            </>
          )}
          {countLine() && (
            <Typography level='body-sm' data-testid='evolution-generations-left' sx={{ color: 'text.secondary' }}>
              {countLine()}
            </Typography>
          )}
        </Box>

        {/* Said while the sequence runs, in the place the key will take, so nothing moves when it ends. */}
        {closesItself ? null : (
          <Box sx={{ display: 'grid', placeItems: 'center', mt: 1, minHeight: 48 }}>
            {done ? (
              <Button onClick={onClose} sx={{ minWidth: 160 }}>
                {isStage ? t('pet.evolution.continue', { name: toName }) : t('common.close')}
              </Button>
            ) : (
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {t('pet.evolution.skip')}
              </Typography>
            )}
          </Box>
        )}
      </ModalDialog>
    </Modal>
  )
}

export default EvolutionReveal

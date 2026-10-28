import React, { useEffect, useId, useState } from 'react'
import { Box, Button, Modal, ModalDialog, Typography } from '@mui/joy'
import { useTheme } from '@mui/joy/styles'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { MOTION } from '@nowry/core/tokens/tokens'
import { earnedGold } from '@nowry/core/tokens/colorSystem'

/**
 * The moment the companion evolves (EVO-003, ADR-052).
 *
 * It used to be the level-up toast: 220px, an emoji, gone in 3.6 seconds, and
 * identical whether the companion had changed form or only gained a level. The
 * evolution is what the whole XP loop builds toward, so it gets the screen.
 *
 * One moving thing per moment (MOTION.md §5): the old form is shown, it gives
 * way to a flash of earned gold, the new form arrives — larger, because each
 * form fills more of its frame — and only then its name. Every step is a token
 * duration; the holds between them are pauses, not motion. Under reduced
 * motion the new form is simply there.
 *
 * `renderForm(stage)` draws a form at the reveal's frame size; the caller knows
 * whether that is Nowry's art or the learner's own portrait.
 */
export const FRAME_PX = 200
const HOLD_MS = { from: 900, flash: MOTION.duration.base }
const seconds = (ms) => ms / 1000
const ENTER = { duration: seconds(MOTION.duration.slow), ease: [0.2, 0, 0, 1] }

const EvolutionReveal = ({ fromStage, toStage, level, renderForm, onClose }) => {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const gold = earnedGold(useTheme().palette.mode)
  const titleId = useId()
  const [phase, setPhase] = useState(reduceMotion || fromStage === toStage ? 'to' : 'from')

  useEffect(() => {
    if (phase === 'to') return undefined
    const next = phase === 'from' ? 'flash' : 'to'
    const timer = setTimeout(() => setPhase(next), HOLD_MS[phase])
    return () => clearTimeout(timer)
  }, [phase])

  const toName = t(`pet.stage.${toStage}.name`)
  const fromName = t(`pet.stage.${fromStage}.name`)

  return (
    <Modal open onClose={onClose}>
      <ModalDialog
        aria-labelledby={titleId}
        data-evolution-phase={phase}
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
          {t('pet.evolution.eyebrow')}
        </Typography>

        <Box sx={{ position: 'relative', width: FRAME_PX, height: FRAME_PX, display: 'grid', placeItems: 'center' }}>
          <AnimatePresence mode='wait' initial={false}>
            {phase === 'from' && (
              <Box
                key='from'
                component={motion.div}
                data-evolution-form={fromStage}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={ENTER}
                sx={{ gridArea: '1 / 1' }}
              >
                {renderForm(fromStage)}
              </Box>
            )}
            {phase === 'flash' && (
              <Box
                key='flash'
                component={motion.div}
                aria-hidden='true'
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
            {phase === 'to' && (
              <Box
                key='to'
                component={motion.div}
                data-evolution-form={toStage}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={ENTER}
                sx={{ gridArea: '1 / 1' }}
              >
                {renderForm(toStage)}
              </Box>
            )}
          </AnimatePresence>
        </Box>

        <Box
          component={motion.div}
          initial={false}
          animate={{ opacity: phase === 'to' ? 1 : 0 }}
          transition={{ duration: seconds(MOTION.duration.base) }}
          sx={{ display: 'grid', gap: 0.5 }}
        >
          <Typography id={titleId} level='h2'>
            {phase === 'to' ? toName : t('pet.evolution.evolving', { name: fromName })}
          </Typography>
          <Typography level='body-md' sx={{ color: 'text.secondary' }}>
            {t('pet.evolution.became', { from: fromName, to: toName })}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            {t('pet.levelUp.reached', { level })}
          </Typography>
        </Box>

        <Button onClick={onClose} sx={{ mt: 1, minWidth: 160 }}>
          {t('pet.evolution.continue', { name: toName })}
        </Button>
      </ModalDialog>
    </Modal>
  )
}

export default EvolutionReveal

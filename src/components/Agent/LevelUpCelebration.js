/**
 * LevelUpCelebration — Tamagotchi evolution toast
 *
 * Portal-rendered alongside the pet orb. Uses inline styles only (no Joy UI)
 * to stay isolated from the host page's theme context.
 *
 * Auto-dismisses after 3.6 s. Clicking anywhere on the card dismisses early.
 */
import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

// Slim stage config — emoji only (full config lives in StudyPet.js)
const STAGE_CONFIG = {
  1: { emoji: '✨' },
  2: { emoji: '🌟' },
  3: { emoji: '🔮' },
  4: { emoji: '🌙' },
  5: { emoji: '🌌' },
  6: { emoji: '☀️' }
}

const STAGE_NAMES = {
  1: 'Wisp',
  2: 'Sprite',
  3: 'Scout',
  4: 'Sage',
  5: 'Oracle',
  6: 'Luminary'
}

const LevelUpCelebration = ({ levelUpData, stage, onDismiss }) => {
  const { t } = useTranslation()

  useEffect(() => {
    const timer = setTimeout(onDismiss, 3600)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const config = STAGE_CONFIG[stage] ?? STAGE_CONFIG[1]

  return (
    <motion.div
      onClick={onDismiss}
      style={{
        position: 'absolute',
        bottom: 68,
        right: 0,
        zIndex: 10000,
        cursor: 'pointer',
        pointerEvents: 'auto'
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.6, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 10 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        style={{
          width: 220,
          background: 'linear-gradient(160deg, rgba(16,16,32,0.97) 0%, rgba(22,14,42,0.97) 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(164,69,255,0.2)',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center'
        }}
      >
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.4, 1.0] }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{ fontSize: 44, lineHeight: 1 }}
        >
          {config.emoji}
        </motion.span>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e8e8f5' }}
        >
          {t(`pet.stage.${stage}.name`, STAGE_NAMES[stage])}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          style={{ margin: 0, fontSize: 11, color: 'rgba(164, 69, 255, 0.9)', fontWeight: 500 }}
        >
          {t('pet.levelUp.reached', { level: levelUpData.newLevel })}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          style={{ margin: '4px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}
        >
          {t('pet.levelUp.dismiss')}
        </motion.p>
      </motion.div>
    </motion.div>
  )
}

export default LevelUpCelebration

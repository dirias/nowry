/**
 * PetRevealCelebration — Study Buddy contextual first-reveal toast
 *
 * Portal-rendered alongside the pet orb. Uses inline styles only (no Joy UI)
 * to stay isolated from the host page's theme context — same treatment as
 * LevelUpCelebration, which this is a structural clone of.
 *
 * Fires once, the first time a new account completes a study session and the
 * pet mounts for the first time (see StudySession's sessionComplete effect
 * and AgentContext's revealPet action).
 *
 * Auto-dismisses after 3.6 s. Clicking anywhere on the card dismisses early.
 */
import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

// Slim species → idle emoji map — full config lives in StudyPet.js. Duplicated
// here (as LevelUpCelebration duplicates STAGE_CONFIG) to avoid a circular
// import, since StudyPet.js imports this component.
const SPECIES_IDLE_EMOJI = {
  owl: '🦉',
  fox: '🦊',
  cat: '🐱',
  dragon: '🐉',
  robot: '🤖',
  star: '⭐',
  phoenix: '🔥',
  crystal: '💎',
  leaf: '🌿',
  music: '🎵'
}

// Stage-1 fallback emoji, matching STAGE_CONFIG[1] in StudyPet.js/LevelUpCelebration.
const STAGE_1_EMOJI = '✨'

const PetRevealCelebration = ({ species, cardsReviewed, onDismiss }) => {
  const { t } = useTranslation()

  useEffect(() => {
    const timer = setTimeout(onDismiss, 3600)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const emoji = (species && SPECIES_IDLE_EMOJI[species]) || STAGE_1_EMOJI

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
          {emoji}
        </motion.span>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e8e8f5' }}
        >
          {t('pet.reveal.title')}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          style={{ margin: 0, fontSize: 12, color: 'rgba(164, 69, 255, 0.9)', fontWeight: 500 }}
        >
          {t('pet.reveal.subtitle', { count: cardsReviewed ?? 0 })}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}
        >
          {t('pet.reveal.dismiss')}
        </motion.p>
      </motion.div>
    </motion.div>
  )
}

export default PetRevealCelebration

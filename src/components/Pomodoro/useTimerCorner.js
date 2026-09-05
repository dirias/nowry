import { usePet } from '../../context/AgentContext'
import { useIsMobile } from '../../hooks/useIsMobile'

export const CORNER_INSET = 24
export const MOBILE_INSET = 16
// The Study Buddy's largest form is 80px plus its halo, anchored 24px up. A
// sheet whose bottom edge sits here clears both.
export const PET_CLEARANCE = 136

/**
 * Where the timer lives: the corner the Study Buddy is not in.
 *
 * The pet rests bottom-right and moves bottom-left for a study session
 * (StudyPet.js), so the timer mirrors it — left by default, right during a
 * session, and simply bottom-right when there is no pet. On mobile a `width`
 * makes the widget a full-width sheet raised above the pet, because a 390px
 * screen has no second corner to give it.
 *
 * @param {{ width?: number }} [options] — the widget's desktop width; omit for the chip
 * @returns {object} an `sx` fragment: `position: 'fixed'` plus its offsets
 */
export const useTimerCorner = ({ width } = {}) => {
  const { isActive: petActive, isInStudySession } = usePet()
  const isMobile = useIsMobile()
  const petOnRight = petActive && !isInStudySession

  if (isMobile && width) {
    return {
      position: 'fixed',
      left: MOBILE_INSET,
      right: MOBILE_INSET,
      bottom: petActive ? PET_CLEARANCE : MOBILE_INSET,
      width: 'auto'
    }
  }

  return {
    position: 'fixed',
    bottom: CORNER_INSET,
    ...(petOnRight ? { left: CORNER_INSET } : { right: CORNER_INSET }),
    ...(width && { width, maxWidth: `calc(100vw - ${CORNER_INSET * 2}px)` })
  }
}

export default useTimerCorner

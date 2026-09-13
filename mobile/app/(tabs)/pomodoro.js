/**
 * `/pomodoro` — kept as an address, no longer a page (MOB-104).
 *
 * Focus is the full-screen `FocusScreen`, raised over whichever tab you are on.
 * The route stays because the end-of-session notification opens it and it is
 * the web's own path. Arriving here raises the timer and lands on Home beneath
 * it, which is where closing the timer then leaves you.
 */
import { useEffect } from 'react'
import { Redirect } from 'expo-router'
import { usePomodoro } from '@nowry/core/context/PomodoroContext'

export default function FocusRoute() {
  const { setShowWidget } = usePomodoro()

  useEffect(() => {
    setShowWidget(true)
  }, [setShowWidget])

  return <Redirect href='/' />
}

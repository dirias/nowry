import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { userService } from '../api/services'
import { useAuth } from './AuthContext'

const PomodoroContext = createContext()
const STORAGE_KEY = 'NOWRY_POMODORO_STATE'

export const usePomodoro = () => {
  return useContext(PomodoroContext)
}

export const PomodoroProvider = ({ children }) => {
  const { user } = useAuth()

  // Settings (Defaults)
  const [settings, setSettings] = useState({
    work: 25,
    shortBreak: 5,
    longBreak: 15,
    autoStart: false,
    enabled: false
  })

  // Timer State
  const [mode, setMode] = useState('work')
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isActive, setIsActive] = useState(false)
  const [showWidget, setShowWidget] = useState(false)
  const [endTime, setEndTime] = useState(null)

  const timerRef = useRef(null)
  const hasLoadedRef = useRef(false)
  const isRestoringRef = useRef(true)

  // Load state from localStorage on mount - ONCE
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY)

    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)

        // Restore mode and widget
        setMode(parsed.mode || 'work')
        setShowWidget(parsed.showWidget || false)

        if (parsed.isActive && parsed.endTime) {
          const remaining = Math.ceil((parsed.endTime - Date.now()) / 1000)

          if (remaining > 0) {
            setEndTime(parsed.endTime)
            setTimeLeft(remaining)
            // Delay activation to ensure state is settled
            setTimeout(() => {
              setIsActive(true)
              isRestoringRef.current = false
            }, 0)
            return // Early return, isRestoringRef will be cleared in setTimeout
          } else {
            setTimeLeft(0)
          }
        } else if (parsed.pausedTimeLeft !== undefined) {
          setTimeLeft(parsed.pausedTimeLeft)
        }
      } catch (error) {
        console.error('❌ [Pomodoro] Parse error:', error)
      }
    }

    isRestoringRef.current = false
    hasLoadedRef.current = true
  }, [])

  // Save state to localStorage
  useEffect(() => {
    if (!hasLoadedRef.current) {
      return
    }

    const stateToSave = {
      mode,
      showWidget,
      isActive,
      endTime: isActive ? endTime : null,
      pausedTimeLeft: !isActive ? timeLeft : null
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
  }, [mode, showWidget, isActive, endTime, timeLeft])

  // Load user preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      if (user) {
        try {
          const profile = await userService.getProfile()
          if (profile.preferences) {
            setSettings({
              work: profile.preferences.pomodoro_work_minutes || 25,
              shortBreak: profile.preferences.pomodoro_short_break_minutes || 5,
              longBreak: profile.preferences.pomodoro_long_break_minutes || 15,
              autoStart: profile.preferences.pomodoro_auto_start || false,
              enabled: profile.preferences.pomodoro_enabled || false
            })
          }
        } catch (error) {
          console.error('Failed to load pomodoro preferences', error)
        }
      }
    }
    fetchPreferences()
  }, [user])

  // Timer tick logic
  useEffect(() => {
    if (isRestoringRef.current) {
      console.log('⏸️ [Pomodoro] Timer blocked - restoring')
      return
    }

    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        if (endTime) {
          const remaining = Math.ceil((endTime - Date.now()) / 1000)
          if (remaining <= 0) {
            setTimeLeft(0)
          } else {
            setTimeLeft(remaining)
          }
        }
      }, 100)
    } else if (timeLeft === 0 && isActive) {
      handleTimerComplete()
    }

    return () => clearInterval(timerRef.current)
  }, [isActive, timeLeft, endTime])

  const handleTimerComplete = () => {
    clearInterval(timerRef.current)
    setIsActive(false)
    setEndTime(null)
  }

  const toggleTimer = () => {
    if (!isActive) {
      const newEndTime = Date.now() + timeLeft * 1000
      setEndTime(newEndTime)
      setIsActive(true)
    } else {
      setIsActive(false)
      setEndTime(null)
    }
  }

  const resetTimer = () => {
    setIsActive(false)
    setEndTime(null)
    if (mode === 'work') setTimeLeft(settings.work * 60)
    if (mode === 'shortBreak') setTimeLeft(settings.shortBreak * 60)
    if (mode === 'longBreak') setTimeLeft(settings.longBreak * 60)
  }

  const changeMode = (newMode) => {
    setMode(newMode)
    setIsActive(false)
    setEndTime(null)
    if (newMode === 'work') setTimeLeft(settings.work * 60)
    if (newMode === 'shortBreak') setTimeLeft(settings.shortBreak * 60)
    if (newMode === 'longBreak') setTimeLeft(settings.longBreak * 60)

    if (settings.autoStart) {
      const duration = newMode === 'work' ? settings.work : newMode === 'shortBreak' ? settings.shortBreak : settings.longBreak
      const newEndTime = Date.now() + duration * 60 * 1000
      setEndTime(newEndTime)
      setIsActive(true)
    }
  }

  return (
    <PomodoroContext.Provider
      value={{
        timeLeft,
        isActive,
        mode,
        showWidget,
        setShowWidget,
        toggleTimer,
        resetTimer,
        changeMode,
        settings
      }}
    >
      {children}
    </PomodoroContext.Provider>
  )
}

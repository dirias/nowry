import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { CssVarsProvider, CssBaseline } from '@mui/joy'
import './index.css'
import './i18n' // Initialize i18n

// Suppress benign ResizeObserver error to prevent runtime crash overlay
const resizeObserverLoopErr = /ResizeObserver loop completed with undelivered notifications/
window.addEventListener('error', (e) => {
  if (resizeObserverLoopErr.test(e.message)) {
    e.stopImmediatePropagation()
  }
})

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <CssVarsProvider defaultMode='system' disableTransitionOnChange>
      <CssBaseline />
      <App />
    </CssVarsProvider>
  </React.StrictMode>
)

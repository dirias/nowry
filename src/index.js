import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { CssVarsProvider, CssBaseline } from '@mui/joy'
import './index.css'
import './i18n' // Initialize i18n

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <CssVarsProvider defaultMode='system' disableTransitionOnChange>
      <CssBaseline />
      <App />
    </CssVarsProvider>
  </React.StrictMode>
)

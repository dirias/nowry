import React, { useRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography, useColorScheme } from '@mui/joy'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import mermaid from 'mermaid'
import DOMPurify from 'dompurify'

export default function MermaidRenderer({ code }) {
  const { t } = useTranslation()
  const { mode } = useColorScheme()
  const ref = useRef(null)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (code && ref.current) {
      // Re-initialize with correct theme before each render so light/dark
      // mode changes are reflected in the SVG output (T-6-12 DOMPurify still applied)
      mermaid.initialize({
        startOnLoad: false,
        theme: mode === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'Inter, sans-serif',
        // Mermaid v10+ defaults to htmlLabels:true for flowchart/mindmap/ER,
        // rendering node text as <foreignObject> HTML. DOMPurify strips
        // <foreignObject> (XSS vector), leaving boxes with no visible text.
        // Force SVG-native <text> elements so all diagram types render correctly.
        htmlLabels: false
      })
      setSvg('')
      setError(null)
      const id = `mermaid-${Date.now()}`
      mermaid
        .render(id, code)
        .then((result) => {
          setSvg(result.svg)
          setError(null)
        })
        .catch(() => {
          setError(t('aiMagic.diagram.renderError'))
        })
    }
  }, [code, mode, t])

  if (error) {
    return (
      <Box
        sx={{
          p: 4,
          textAlign: 'center',
          color: 'danger.plainColor',
          bgcolor: 'danger.softBg',
          borderRadius: 'md'
        }}
      >
        <Typography level='title-md' sx={{ mb: 1 }} startDecorator={<WarningAmberRoundedIcon />}>
          {t('aiMagic.diagram.renderError')}
        </Typography>
      </Box>
    )
  }

  return (
    <div
      ref={ref}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(svg) }}
      style={{ width: '100%', overflow: 'auto', textAlign: 'center' }}
    />
  )
}

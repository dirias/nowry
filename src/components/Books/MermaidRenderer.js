import React, { useRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography } from '@mui/joy'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import mermaid from 'mermaid'
import DOMPurify from 'dompurify'

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
})

export default function MermaidRenderer({ code }) {
  const { t } = useTranslation()
  const ref = useRef(null)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (code && ref.current) {
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
  }, [code, t])

  if (error) {
    return (
      <Box
        sx={{
          p: 4,
          textAlign: 'center',
          color: 'danger.plainColor',
          bgcolor: 'danger.softBg',
          borderRadius: 'md',
        }}
      >
        <Typography
          level="title-md"
          sx={{ mb: 1 }}
          startDecorator={<WarningAmberRoundedIcon />}
        >
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

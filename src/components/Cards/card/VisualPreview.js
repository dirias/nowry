import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography } from '@mui/joy'

/**
 * The rendered diagram — the validation surface of variant D (CARDS.md §4.8, §7.4).
 *
 * With no code it renders nothing and occupies nothing. The shipped pane
 * reserved `minHeight: 300` unconditionally and filled it with "Enter Mermaid
 * code to see preview": 300px of announced emptiness on open, on the surface
 * with the least room once a keyboard is up. The single largest reclaim in the
 * phase.
 *
 * The one exception is the `xs` Preview tab, where the panel is what the user
 * asked to see — an empty tab body would read as a broken one, so the hint
 * renders there and only there.
 *
 * A syntax error is reported here, in the pane, and never blocks Save: a draft
 * diagram that does not yet render is savable, exactly as a goal with no
 * milestones is savable.
 */
const VisualPreview = ({ svg, message, status, showEmptyHint = false }) => {
  const { t } = useTranslation()

  if (status === 'idle') {
    if (!showEmptyHint) return null
    return (
      <Typography level='body-sm' sx={{ color: 'text.tertiary', py: 2 }}>
        {t('cards.visual.previewEmpty')}
      </Typography>
    )
  }

  return (
    <Box
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: status === 'error' ? 'danger.outlinedBorder' : 'divider',
        borderRadius: 'sm',
        bgcolor: 'background.level1',
        overflow: 'auto'
      }}
    >
      {status === 'error' ? (
        <>
          <Typography level='body-sm' sx={{ color: 'danger.plainColor' }}>
            {t('cards.visual.syntaxError')}
          </Typography>
          {message && (
            <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 0.5, wordBreak: 'break-word' }}>
              {message}
            </Typography>
          )}
        </>
      ) : (
        // Sanitized in useMermaidPreview, on every path that reaches here.
        <Box sx={{ '& svg': { maxWidth: '100%', height: 'auto' } }} dangerouslySetInnerHTML={{ __html: svg }} />
      )}
    </Box>
  )
}

export default VisualPreview

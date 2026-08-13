import React from 'react'
import { Box, Typography } from '@mui/joy'

/**
 * EmptyState — shared empty-state visual shell for Annual Planning tab views
 * (Goals, Reports, Overview, Priorities). Pure presentational: each caller
 * keeps its own conditional logic for *what* goes in the icon/action slots
 * (e.g. Reports' closable-quarter button vs. countdown text), this component
 * only owns the shared layout — centered column, consistent spacing.
 *
 * - `icon` — an already-styled icon element (fontSize/color/opacity are the
 *   caller's choice, kept per-surface). Omit entirely for a text-only empty state.
 * - `bodyMaxWidth` — constrains the body copy's line length on wide screens.
 *   Omit for full-width centered text.
 * - `action` — optional trailing element (Button, countdown Typography, etc.).
 *   Callers own its own spacing (e.g. `sx={{ mt: 2 }}`) since it varies by case.
 */
const EmptyState = ({ icon, title, body, bodyMaxWidth, py = 8, action }) => (
  <Box sx={{ py, textAlign: 'center' }}>
    {icon}
    <Typography level='title-md' sx={{ mb: 0.5, color: 'text.secondary' }}>
      {title}
    </Typography>
    <Typography level='body-sm' sx={{ color: 'text.tertiary', ...(bodyMaxWidth ? { maxWidth: bodyMaxWidth, mx: 'auto' } : {}) }}>
      {body}
    </Typography>
    {action}
  </Box>
)

export default EmptyState

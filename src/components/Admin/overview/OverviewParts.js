import React from 'react'
import { Box, Sheet, Typography } from '@mui/joy'
import { TITLE_MARK } from './adminLogText'

/**
 * The pieces the Overview and the admin log share (boards A and K): the card
 * every Overview block sits in, its heading with the quiet aside, and a
 * sentence whose title is set bold.
 */

/** A card on the surface ground (board A); a region named by its heading's title, the aside left out of the name. */
export const AdminCard = ({ id, title, aside, children }) => (
  <Sheet
    component='section'
    variant='outlined'
    aria-labelledby={id}
    sx={{
      bgcolor: 'background.surface',
      borderRadius: 'lg',
      p: { xs: 1.75, sm: 2.25 },
      display: 'flex',
      flexDirection: 'column',
      gap: 1.5,
      minWidth: 0
    }}
  >
    <Typography component='h2' level='title-md' sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
      <span id={id}>{title}</span>
      {aside && (
        <Typography component='span' level='body-sm' sx={{ color: 'text.tertiary', fontWeight: 'md' }}>
          {aside}
        </Typography>
      )}
    </Typography>
    {children}
  </Sheet>
)

/** A sentence from `adminLogText`, its title bold where the mark stands (board A). */
export const ActionText = ({ line, bold = true }) => {
  const parts = line.text.split(TITLE_MARK)
  if (parts.length === 1) return line.text
  return parts.map((part, index) => (
    <React.Fragment key={index}>
      {part}
      {index < parts.length - 1 && (
        <Box component={bold ? 'b' : 'span'} sx={bold ? { fontWeight: 'lg', color: 'text.primary' } : undefined}>
          {line.title}
        </Box>
      )}
    </React.Fragment>
  ))
}

import React from 'react'
import { Box, Button, Card, CardContent, CardOverflow, Divider, IconButton, Stack, Tooltip, Typography } from '@mui/joy'
import { BookOpen, RotateCcw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { focusRing, oneLine } from '../Common/Form/formStyles'

/**
 * One entry in the generated-card curation grid (CURATE-002).
 *
 * A discarded card **collapses in place** rather than leaving the grid. That is
 * the point of the whole component: a card that vanishes takes its slot with
 * it, every card after it jumps a position, and discarding a second card means
 * re-finding the batch first. Dropping four cards out of twelve should feel
 * like four small decisions, not like the grid fighting back (PRD A3).
 *
 * Discarding also moves off the card body and onto an explicit control here,
 * which is what frees the body click for the in-place editor in CURATE-003 —
 * the whole card was previously one selection target, so there was no click
 * left to spend (PRD E3).
 */

// Room reserved for the action cluster so the title never runs underneath it.
// Reserved permanently rather than only while the cluster is visible: a title
// that reflows the moment the pointer arrives reads as a rendering bug.
const TITLE_GUTTER = 5

const actionCluster = {
  position: 'absolute',
  top: 8,
  right: 8,
  zIndex: 1,
  opacity: 0,
  transition: 'opacity 0.15s ease',
  // Touch has no hover to reveal anything, so the control is simply always
  // there. Keyed off the input device rather than a width breakpoint, because
  // this is a question about the pointer, not about the viewport.
  '@media (hover: none)': { opacity: 1 },
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
}

function DiscardedStrip({ entry, onRestore }) {
  const { t } = useTranslation()

  return (
    <Stack
      direction='row'
      spacing={1}
      alignItems='center'
      sx={{
        minHeight: 56,
        px: 1.5,
        py: 1,
        borderRadius: 'lg',
        border: '1px dashed',
        borderColor: 'neutral.outlinedBorder',
        bgcolor: 'background.level1'
      }}
    >
      <Typography level='body-sm' sx={{ ...oneLine, flex: 1, color: 'text.tertiary', textDecoration: 'line-through' }}>
        {entry.title}
      </Typography>
      <Button
        size='sm'
        variant='plain'
        color='primary'
        onClick={onRestore}
        startDecorator={<RotateCcw size={14} />}
        aria-label={t('cards.generatedCards.restoreCardAria', { title: entry.title })}
        sx={{ flexShrink: 0, ...focusRing }}
      >
        {t('cards.generatedCards.undo')}
      </Button>
    </Stack>
  )
}

export default function GeneratedCard({ entry, onDiscard, onRestore }) {
  const { t } = useTranslation()

  if (!entry.kept) return <DiscardedStrip entry={entry} onRestore={onRestore} />

  return (
    <Card
      variant='outlined'
      sx={{
        position: 'relative',
        minHeight: 180,
        display: 'flex',
        bgcolor: 'background.body',
        borderColor: 'neutral.outlinedBorder',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': { boxShadow: 'sm' },
        // `focus-within` matters as much as hover: the cluster holds the only
        // control on the card, so a keyboard user must be able to reveal it.
        '&:hover .gc-card-actions, &:focus-within .gc-card-actions': { opacity: 1 },
        // Fade-in for incrementally streamed cards
        '@keyframes gcCardIn': {
          from: { opacity: 0, transform: 'translateY(4px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        },
        '@keyframes gcCardInFade': {
          from: { opacity: 0 },
          to: { opacity: 1 }
        },
        animation: 'gcCardIn 200ms ease-out',
        '@media (prefers-reduced-motion: reduce)': {
          // No transform for reduced-motion users — opacity only
          animation: 'gcCardInFade 200ms ease-out',
          transition: 'none'
        }
      }}
    >
      <Box className='gc-card-actions' sx={actionCluster}>
        <Tooltip title={t('cards.generatedCards.discardCard')} variant='soft' size='sm'>
          <IconButton
            size='sm'
            variant='plain'
            color='neutral'
            onClick={onDiscard}
            aria-label={t('cards.generatedCards.discardCardAria', { title: entry.title })}
            sx={{ '&:hover': { bgcolor: 'danger.softBg', color: 'danger.plainColor' }, ...focusRing }}
          >
            <X size={16} />
          </IconButton>
        </Tooltip>
      </Box>

      <CardOverflow sx={{ px: 2, pt: 2 }}>
        <Typography level='title-md' startDecorator={<BookOpen size={16} />} sx={{ pr: TITLE_GUTTER }}>
          {entry.title}
        </Typography>
      </CardOverflow>
      <Divider />
      <CardContent>
        <Typography level='body-sm' color='neutral'>
          {entry.content}
        </Typography>
      </CardContent>
    </Card>
  )
}

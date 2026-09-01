/**
 * DeckSelector
 *
 * Renders inside the quiz setup flow — lets the user pick which deck to practice.
 *
 * States:
 *   Loading — 3 Skeleton rectangular placeholders
 *   Success — Header + vertical list of rich deck cards
 *   Error   — Error message + Retry button
 *   Empty   — "No decks yet" message + CTA to /study
 *
 * Props:
 *   decks    {Array<{ id: string, name: string, due_count: number, new_count: number }>}
 *   onSelect {function(deck)} - Called when user picks a deck
 *   loading  {boolean}
 *   error    {string|null}
 *   onRetry  {function}
 */
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Button, Chip, Divider, Sheet, Skeleton, Stack, Typography } from '@mui/joy'
import { ChevronRightRounded, LibraryBooksRounded, SchoolRounded } from '@mui/icons-material'

const focusVisibleSx = {
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'primary.outlinedBorder',
    outlineOffset: '2px'
  }
}

const DeckSelector = ({ decks, onSelect, loading, error, onRetry }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // ── Header — shared across all states ─────────────────────────────────────
  const header = (
    <Stack direction='row' alignItems='flex-start' gap={1} sx={{ mb: 0.5 }}>
      <SchoolRounded sx={{ fontSize: 16, color: 'primary.plainColor', mt: '2px', flexShrink: 0 }} />
      <Box>
        <Typography level='title-sm' sx={{ color: 'text.primary', lineHeight: 1.3 }}>
          {t('quiz.choose_deck_title')}
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t('quiz.choose_deck_subtitle')}
        </Typography>
      </Box>
    </Stack>
  )

  // ── Loading state — 3 skeleton cards ──────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {header}
        <Divider />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant='rectangular' height={48} sx={{ borderRadius: 'md' }} />
        ))}
      </Box>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {header}
        <Divider />
        <Typography level='body-sm' sx={{ color: 'danger.plainColor' }}>
          {error}
        </Typography>
        <Button size='sm' variant='outlined' color='neutral' onClick={onRetry} sx={{ alignSelf: 'flex-start', ...focusVisibleSx }}>
          {t('quiz.retry')}
        </Button>
      </Box>
    )
  }

  // ── Empty state — no decks ─────────────────────────────────────────────────
  if (!decks || decks.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {header}
        <Divider />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <LibraryBooksRounded sx={{ fontSize: 16, color: 'text.tertiary' }} />
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('quiz.no_decks')}
          </Typography>
        </Box>
        <Button
          size='sm'
          variant='soft'
          color='primary'
          onClick={() => navigate('/study')}
          sx={{ alignSelf: 'flex-start', ...focusVisibleSx }}
        >
          {t('quiz.go_to_study')}
        </Button>
      </Box>
    )
  }

  // ── Success state — vertical rich deck cards ───────────────────────────────
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {header}
      <Divider />
      {decks.map((deck) => (
        <Sheet
          key={deck.id ?? deck.deck_id}
          onClick={() => onSelect(deck)}
          tabIndex={0}
          role='button'
          aria-label={t('quiz.select_deck_aria', { name: deck.name })}
          onKeyDown={(e) => e.key === 'Enter' && onSelect(deck)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 1.5,
            py: 1.25,
            borderRadius: 'md',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.level1',
            cursor: 'pointer',
            transition: 'all 0.15s',
            '&:hover': {
              borderColor: 'primary.outlinedBorder',
              bgcolor: 'primary.softBg'
            },
            '&:active': {
              transform: 'scale(0.98)'
            },
            ...focusVisibleSx
          }}
        >
          {/* Left accent bar */}
          <Box
            sx={{
              width: 3,
              height: 28,
              borderRadius: 'xs',
              bgcolor: 'primary.solidBg',
              flexShrink: 0
            }}
          />

          {/* Deck name */}
          <Typography level='title-sm' sx={{ flex: 1, color: 'text.primary' }}>
            {deck.name}
          </Typography>

          {/* Stats chips */}
          <Stack direction='row' gap={0.5} alignItems='center'>
            {deck.due_count > 0 && (
              <Chip size='sm' variant='soft' color='warning'>
                {deck.due_count} {t('quiz.due')}
              </Chip>
            )}
            {deck.new_count > 0 && (
              <Chip size='sm' variant='soft' color='neutral'>
                {deck.new_count} {t('quiz.new')}
              </Chip>
            )}
          </Stack>

          <ChevronRightRounded sx={{ fontSize: 16, color: 'text.tertiary', flexShrink: 0 }} />
        </Sheet>
      ))}
    </Box>
  )
}

export default DeckSelector

/**
 * Rest, on the web's session header and card rows (SR-003, ADR-043).
 *
 * A labelled menu button beside the mark: "Rest" awake, "Resting" while the
 * card rests, with the four lengths the phone offers and Wake once resting.
 * The optimism and the rollback live in `useCardRest` in the shared package,
 * the same hook the phone will use, so the two clients cannot disagree about
 * what a rest is. Ground and label carry the state, never a hue (ADR-010's
 * rule for the mark applies here for the same reason).
 */
import React from 'react'
import { Dropdown, ListDivider, Menu, MenuButton, MenuItem } from '@mui/joy'
import BedtimeRounded from '@mui/icons-material/BedtimeRounded'
import BedtimeOutlined from '@mui/icons-material/BedtimeOutlined'
import { useTranslation } from 'react-i18next'

import { useCardRest } from '@nowry/core/hooks/useCardRest'
import { REST_PRESETS, untilFromPreset } from '@nowry/core/domain/cardRest'

const FOCUS_RING = {
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'primary.outlinedBorder',
    outlineOffset: '2px'
  }
}

export default function RestToggle({ card, onRestChange, size = 'sm', sx }) {
  const { t } = useTranslation()
  const { cardId, resting, pending, rest, wake } = useCardRest(card, onRestChange)

  if (!cardId) return null

  const ground = resting ? 'background.level2' : 'background.level1'
  const groundVar = resting ? 'var(--joy-palette-background-level2)' : 'var(--joy-palette-background-level1)'

  return (
    <Dropdown>
      <MenuButton
        size={size}
        variant='plain'
        color='neutral'
        disabled={pending}
        aria-pressed={resting}
        data-testid='rest-toggle'
        startDecorator={resting ? <BedtimeRounded fontSize='small' /> : <BedtimeOutlined fontSize='small' />}
        onClick={(event) => event.stopPropagation()}
        sx={{
          borderRadius: 'md',
          minHeight: { xs: 44, sm: 36 },
          px: 1.5,
          bgcolor: ground,
          color: resting ? 'text.primary' : 'text.secondary',
          '--variant-plainHoverBg': groundVar,
          '--variant-plainActiveBg': groundVar,
          ...FOCUS_RING,
          ...sx
        }}
      >
        {resting ? t('cards.rest.actionOn') : t('cards.rest.action')}
      </MenuButton>
      <Menu placement='bottom-end' sx={{ minWidth: 200, borderRadius: 'md', p: 0.5 }}>
        {resting && (
          <>
            <MenuItem onClick={() => wake()} sx={{ borderRadius: 'sm', ...FOCUS_RING }}>
              {t('cards.rest.wake')}
            </MenuItem>
            <ListDivider />
          </>
        )}
        {REST_PRESETS.map((preset) => (
          <MenuItem key={preset.key} onClick={() => rest(untilFromPreset(preset.key))} sx={{ borderRadius: 'sm', ...FOCUS_RING }}>
            {t(`cards.rest.${preset.key}`)}
          </MenuItem>
        ))}
      </Menu>
    </Dropdown>
  )
}

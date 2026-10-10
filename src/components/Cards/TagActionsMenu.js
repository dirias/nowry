import React from 'react'
import { Dropdown, IconButton, ListDivider, ListItemDecorator, Menu, MenuButton, MenuItem } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import MoreVertRounded from '@mui/icons-material/MoreVertRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import CallMergeRounded from '@mui/icons-material/CallMergeRounded'
import LabelOffRounded from '@mui/icons-material/LabelOffRounded'
import BedtimeRounded from '@mui/icons-material/BedtimeRounded'
import WbSunnyRounded from '@mui/icons-material/WbSunnyRounded'
import { REST_PRESETS, untilFromPreset } from '@nowry/core/domain/cardRest'
import { focusRing } from '../Common/Form/formStyles'

const menuSx = { minWidth: 232, borderRadius: 'md', p: 0.5 }
const itemSx = { borderRadius: 'sm', ...focusRing }

/**
 * A tag group's kebab (PRD D17, US-010): Rename, Merge into…, then Remove
 * from all N cards after a hairline. Only a tag has it — Struggling and
 * Marked are derived groups and are not managed (ADR-023 point 3). It sits
 * after the Study key as a secondary of the same material; the verbs it
 * offers act on the tag, not on the list, so it is its own object (§15.2).
 */
export default function TagActionsMenu({ tag, count = 0, onRename, onMerge, onRemove, resting = false, onRest, onWake }) {
  const { t } = useTranslation()
  return (
    <Dropdown>
      <MenuButton
        slots={{ root: IconButton }}
        slotProps={{
          root: {
            variant: 'soft',
            color: 'neutral',
            'aria-label': t('groups.tagActionsAria', { tag }),
            'data-testid': 'tag-actions',
            sx: focusRing
          }
        }}
      >
        <MoreVertRounded />
      </MenuButton>
      <Menu placement='bottom-end' sx={menuSx}>
        <MenuItem onClick={onRename} sx={itemSx}>
          <ListItemDecorator>
            <EditRounded />
          </ListItemDecorator>
          {t('groups.rename')}
        </MenuItem>
        <MenuItem onClick={onMerge} sx={itemSx}>
          <ListItemDecorator>
            <CallMergeRounded />
          </ListItemDecorator>
          {t('groups.mergeInto')}
        </MenuItem>
        {/* The tag rests (SR-003, ADR-043): every card carrying it leaves play,
            schedule kept; Wake while it rests. The same four lengths as the phone. */}
        {onRest && (
          <>
            <ListDivider />
            {resting && (
              <MenuItem onClick={onWake} sx={itemSx}>
                <ListItemDecorator>
                  <WbSunnyRounded />
                </ListItemDecorator>
                {t('cards.rest.wake')}
              </MenuItem>
            )}
            {REST_PRESETS.map((preset) => (
              <MenuItem key={preset.key} onClick={() => onRest(untilFromPreset(preset.key))} sx={itemSx}>
                <ListItemDecorator>
                  <BedtimeRounded />
                </ListItemDecorator>
                {`${t('cards.rest.action')} · ${t(`cards.rest.${preset.key}`)}`}
              </MenuItem>
            ))}
          </>
        )}
        <ListDivider />
        <MenuItem onClick={onRemove} color='danger' sx={itemSx}>
          <ListItemDecorator>
            <LabelOffRounded />
          </ListItemDecorator>
          {t('groups.removeFromAll', { count })}
        </MenuItem>
      </Menu>
    </Dropdown>
  )
}

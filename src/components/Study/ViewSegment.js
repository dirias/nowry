import React from 'react'
import { Button, Sheet } from '@mui/joy'
import { segment, segmentedGroup } from '../Common/Form/formStyles'

/**
 * One segmented object for switching a view (DESIGN_GUIDELINES §15.2, BUTTONS.md §5).
 *
 * `options` are `{ value, label, readout? }`; the readout renders as tabular
 * text beside the label ("Decks 12") and is never a chip (§15.11). Engaged =
 * level2 ground plus the key's underline, both from `segment()`; on a phone the
 * object stretches rail to rail and each segment takes an equal share.
 */
export default function ViewSegment({ options, value, onChange, ariaLabel, testId }) {
  return (
    <Sheet
      variant='outlined'
      role='group'
      aria-label={ariaLabel}
      data-testid={testId}
      sx={{ ...segmentedGroup, width: { xs: '100%', sm: 'auto' } }}
    >
      {options.map((option, index) => {
        const active = option.value === value
        return (
          <Button
            key={option.value}
            variant='plain'
            color='neutral'
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            sx={{ ...segment(active, index === 0), flex: { xs: 1, sm: 'none' }, gap: 0.75 }}
          >
            {option.label}
            {option.readout != null && (
              <span style={{ color: 'var(--joy-palette-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{option.readout}</span>
            )}
          </Button>
        )
      })}
    </Sheet>
  )
}

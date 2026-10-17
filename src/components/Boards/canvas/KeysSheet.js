import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Stack, Typography } from '@mui/joy'
import FormSheet from '../../Common/Form/FormSheet'

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '')

/*
 * Every row of the grammar (PRD D3), in the Grammar board's five groups. A key
 * is a cap: a word cap is translated (`boards.keys.cap.*`), a letter, digit or
 * symbol is printed as it is on the key.
 */
const WORD_CAPS = ['mod', 'space', 'tab', 'enter', 'esc', 'delete', 'drag', 'click', 'doubleClick', 'wheel', 'type']
const GLYPHS = { shift: '⇧', arrows: '← ↑ → ↓' }

export const KEY_GROUPS = [
  {
    id: 'move',
    rows: [
      ['pan', [['drag'], ['space', 'drag'], ['H']]],
      [
        'zoom',
        [
          ['mod', 'wheel'],
          ['mod', '+'],
          ['mod', '−']
        ]
      ],
      ['fitBoard', [['shift', '1']]],
      ['fitSelection', [['shift', '2']]]
    ]
  },
  {
    id: 'make',
    rows: [
      ['note', [['doubleClick'], ['N', 'click']]],
      ['child', [['tab']]],
      ['sibling', [['mod', 'enter']]],
      ['text', [['T']]],
      ['frame', [['F']]]
    ]
  },
  {
    id: 'edit',
    rows: [
      ['edit', [['enter'], ['type']]],
      ['finish', [['esc']]],
      ['label', [['doubleClick']]],
      ['remove', [['delete']]],
      ['copy', [['mod', 'C']]],
      ['cut', [['mod', 'X']]],
      ['paste', [['mod', 'V']]],
      ['duplicate', [['mod', 'D']]],
      ['frameSelection', [['mod', 'G']]],
      ['nudge', [['arrows'], ['shift', 'arrows']]]
    ]
  },
  {
    id: 'select',
    rows: [
      ['selectTool', [['V']]],
      ['addToSelection', [['shift', 'click']]],
      ['selectBox', [['shift', 'drag']]],
      ['selectAll', [['mod', 'A']]]
    ]
  },
  {
    id: 'history',
    rows: [
      ['undo', [['mod', 'Z']]],
      ['redo', [['mod', 'shift', 'Z']]],
      ['keys', [['?']]]
    ]
  }
]

const Cap = ({ children }) => (
  <Box
    component='kbd'
    sx={{
      fontFamily: 'code',
      fontSize: 'xs',
      fontWeight: 'lg',
      lineHeight: 1.6,
      px: 0.75,
      borderRadius: 'xs',
      bgcolor: 'background.level2',
      color: 'text.primary',
      whiteSpace: 'nowrap'
    }}
  >
    {children}
  </Box>
)

/** The keys, listed (PRD D3: "? lists the keys"). On the shared sheet at `simple` width. */
export default function KeysSheet({ open, onClose }) {
  const { t } = useTranslation()
  const mac = isMac()
  const capText = (cap) => {
    if (cap === 'mod' && mac) return '⌘'
    if (WORD_CAPS.includes(cap)) return t(`boards.keys.cap.${cap}`)
    return GLYPHS[cap] ?? cap
  }

  return (
    <FormSheet open={open} onClose={onClose} titleKey='boards.keys.title' width='simple'>
      <Stack spacing={3}>
        {KEY_GROUPS.map((group) => (
          <Box key={group.id} component='section'>
            <Typography level='title-sm' component='h5' sx={{ mb: 1 }}>
              {t(`boards.keys.groups.${group.id}`)}
            </Typography>
            <Box component='dl' sx={{ m: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', columnGap: 2, rowGap: 0.75 }}>
              {group.rows.map(([row, alternatives]) => (
                <React.Fragment key={row}>
                  <Typography component='dt' level='body-sm' sx={{ color: 'text.secondary' }}>
                    {t(`boards.keys.rows.${row}`)}
                  </Typography>
                  <Box
                    component='dd'
                    sx={{ m: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5 }}
                  >
                    {alternatives.map((caps, index) => (
                      <React.Fragment key={caps.join('+')}>
                        {index > 0 && (
                          <Typography component='span' level='body-xs' aria-hidden='true' sx={{ color: 'text.tertiary' }}>
                            ·
                          </Typography>
                        )}
                        {caps.map((cap) => (
                          <Cap key={cap}>{capText(cap)}</Cap>
                        ))}
                      </React.Fragment>
                    ))}
                  </Box>
                </React.Fragment>
              ))}
            </Box>
          </Box>
        ))}
      </Stack>
    </FormSheet>
  )
}

import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Input, Skeleton, Stack, Typography } from '@mui/joy'
import SearchRounded from '@mui/icons-material/SearchRounded'
import { useFocusOnMount } from './useFocusOnMount'
import FormSheet from '../../Common/Form/FormSheet'
import ItemGlyph, { areaColorOf } from '../ItemGlyph'
import { searchItems } from '../itemReading'
import { useBoardLinks } from '../boardLinksContext'
import { oneLine } from '../../Common/Form/formStyles'

const EMPTY = []

function PickerSkeleton() {
  return (
    <Stack spacing={1.5} data-testid='item-picker-loading' sx={{ py: 1 }}>
      {[0, 1, 2].map((row) => (
        <Stack key={row} direction='row' spacing={1.25} alignItems='center'>
          <Skeleton variant='rectangular' width={28} height={28} sx={{ borderRadius: 'sm' }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant='text' level='title-sm' width='60%' />
          </Box>
        </Stack>
      ))}
    </Stack>
  )
}

/**
 * The `I` picker (BOARD-005, PRD D6): one search over tasks (open first),
 * milestones and goals, grouped. The field keeps focus; the arrows move
 * through the rows, Enter places the active one, Esc closes. A click places
 * too. `onPick({ ref, title })`.
 */
export default function ItemPicker({ open, onClose, onPick }) {
  const searchRef = useRef(null)
  useFocusOnMount(searchRef)
  const { t } = useTranslation()
  const links = useBoardLinks()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef(null)

  const tasks = links?.tasks ?? EMPTY
  const goals = links?.goals ?? EMPTY
  const groups = useMemo(() => searchItems(query, { tasks, goals }), [query, tasks, goals])
  const rows = useMemo(() => groups.flatMap((g) => g.rows), [groups])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
    }
  }, [open])

  useEffect(() => setActive(0), [query])

  const optionId = (index) => `${listId}-option-${index}`

  useEffect(() => {
    const el = listRef.current?.querySelector?.(`[data-index="${active}"]`)
    el?.scrollIntoView?.({ block: 'nearest' })
  }, [active])

  const pick = (row) => row && onPick({ ref: row.ref, title: row.title })

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => (rows.length ? (index + 1) % rows.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => (rows.length ? (index - 1 + rows.length) % rows.length : 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      pick(rows[active])
    }
  }

  const loading = Boolean(links?.loading)
  const failed = !loading && Boolean(links?.error) && !rows.length
  const nothingAtAll = !loading && !failed && !tasks.length && !goals.length

  let index = -1
  return (
    <FormSheet open={open} onClose={onClose} titleKey='boards.picker.title' subtitleKey='boards.picker.hint' width='simple'>
      <Input
        size='lg'
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t('boards.picker.search')}
        startDecorator={<SearchRounded />}
        slotProps={{
          input: {
            ref: searchRef,
            role: 'combobox',
            'aria-label': t('boards.picker.search'),
            'aria-expanded': rows.length > 0,
            'aria-controls': listId,
            'aria-autocomplete': 'list',
            'aria-activedescendant': rows.length ? optionId(active) : undefined
          }
        }}
      />
      <Box sx={{ mt: 2 }}>
        {loading && <PickerSkeleton />}
        {failed && (
          <Typography level='body-sm' role='alert' sx={{ color: 'text.secondary' }}>
            {t('boards.picker.loadError')}
          </Typography>
        )}
        {nothingAtAll && (
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            {t('boards.picker.none')}
          </Typography>
        )}
        {!loading && !failed && !nothingAtAll && !rows.length && (
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            {t('boards.picker.empty', { query })}
          </Typography>
        )}
        {!loading && rows.length > 0 && (
          <Box id={listId} role='listbox' aria-label={t('boards.picker.title')} ref={listRef}>
            {groups.map((group) => (
              <Box key={group.kind} role='group' aria-label={t(`boards.picker.groups.${group.kind}`)} sx={{ mb: 1.5 }}>
                <Typography level='body-xs' sx={{ color: 'text.tertiary', fontWeight: 'lg', px: 1, py: 0.5 }} aria-hidden='true'>
                  {t(`boards.picker.groups.${group.kind}`)}
                </Typography>
                {group.rows.map((row) => {
                  index += 1
                  const mine = index
                  const on = mine === active
                  const meta = [row.goalTitle, row.done ? t('boards.picker.done') : null].filter(Boolean).join(' · ')
                  return (
                    <Box
                      key={row.key}
                      id={optionId(mine)}
                      data-index={mine}
                      role='option'
                      aria-selected={on}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseMove={() => setActive(mine)}
                      onClick={() => pick(row)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        minHeight: 44,
                        px: 1,
                        borderRadius: 'sm',
                        cursor: 'pointer',
                        bgcolor: on ? 'background.level1' : 'transparent',
                        boxShadow: on ? 'inset 2px 0 0 0 var(--joy-palette-primary-solidBg)' : 'none'
                      }}
                    >
                      <ItemGlyph kind={group.kind} color={areaColorOf(row.areaId, links?.areas ?? [])} />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          level='body-md'
                          sx={{
                            ...oneLine,
                            color: row.done ? 'text.tertiary' : 'text.primary',
                            textDecoration: row.done ? 'line-through' : 'none'
                          }}
                        >
                          {row.title}
                        </Typography>
                        {meta && (
                          <Typography level='body-xs' sx={{ ...oneLine, color: 'text.tertiary' }}>
                            {meta}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </FormSheet>
  )
}

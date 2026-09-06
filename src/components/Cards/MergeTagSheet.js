import React, { useMemo, useState } from 'react'
import { Box, Button, Input, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import SearchRounded from '@mui/icons-material/SearchRounded'
import LocalOfferRounded from '@mui/icons-material/LocalOfferRounded'
import FormSheet from '../Common/Form/FormSheet'
import { focusRing, listRow, oneLine, readout, tabularNums } from '../Common/Form/formStyles'

const searchSx = {
  '--Input-radius': 'var(--joy-radius-md)',
  bgcolor: 'background.level1',
  boxShadow: 'none',
  '&::before': { boxShadow: 'none' },
  '&:focus-within': focusRing['&:focus-visible']
}

/**
 * Merge a tag into another (PRD D17, US-010): the shared sheet, a search
 * over the user's other tags as rows of the one anatomy (§15.11 — glyph ·
 * name · "N cards" readout), one solid that says its number. The merge is a
 * rename onto the chosen tag (FR-011), so `onMerge(target)` is all it reports.
 *
 * `initialTarget` is the name an inline rename landed on: a rename onto an
 * existing tag is a merge, and it arrives here already picked so the user
 * only confirms. Mounted only while asked for, so the pick never outlives it.
 */
export default function MergeTagSheet({ open, tag, count = 0, tags = [], initialTarget = null, onClose, onMerge, pending = false }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [target, setTarget] = useState(initialTarget)

  const others = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return tags.filter((row) => row.tag !== tag && (!needle || row.tag.toLowerCase().includes(needle)))
  }, [tags, tag, query])
  const noneAtAll = tags.filter((row) => row.tag !== tag).length === 0

  const row = ({ tag: name, cards }) => {
    const active = target === name
    const pick = () => setTarget(name)
    return (
      <Box
        key={name}
        role='button'
        tabIndex={0}
        aria-pressed={active}
        aria-label={t('groups.merge.targetAria', { tag: name })}
        data-testid='merge-target'
        onClick={pick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            pick()
          }
        }}
        sx={{
          ...listRow,
          gap: 1.5,
          cursor: 'pointer',
          ...(active ? { bgcolor: 'background.level2', '&:hover': { bgcolor: 'background.level2' } } : {})
        }}
      >
        <LocalOfferRounded sx={{ fontSize: 'md', color: 'text.tertiary' }} aria-hidden='true' />
        <Typography level='title-sm' sx={{ flex: 1, ...oneLine }}>
          {name}
        </Typography>
        <Typography level='body-sm' sx={{ ...readout, flexShrink: 0, ...tabularNums }}>
          {t('cards.manage_content.cardCount', { count: cards })}
        </Typography>
      </Box>
    )
  }

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      width='simple'
      titleKey='groups.merge.title'
      titleValues={{ tag }}
      subtitleText={t('groups.merge.subtitle', { count })}
      footer={
        <Stack direction='row' spacing={1.5} justifyContent='flex-end'>
          <Button variant='soft' color='neutral' onClick={onClose} disabled={pending} sx={focusRing}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => onMerge?.(target)} disabled={!target} loading={pending} sx={{ ...tabularNums, ...focusRing }}>
            {t('groups.merge.confirm', { count })}
          </Button>
        </Stack>
      }
    >
      <Input
        size='sm'
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('groups.searchPlaceholder')}
        aria-label={t('groups.merge.searchAria')}
        startDecorator={<SearchRounded sx={{ color: 'text.tertiary' }} />}
        variant='soft'
        color='neutral'
        sx={searchSx}
      />
      <Box sx={{ mt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        {others.length > 0 ? (
          others.map(row)
        ) : (
          <Typography level='body-sm' sx={{ color: 'text.tertiary', py: 1.5 }}>
            {t(noneAtAll ? 'groups.merge.empty' : 'groups.merge.noMatch')}
          </Typography>
        )}
      </Box>
    </FormSheet>
  )
}

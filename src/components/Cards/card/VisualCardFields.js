import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Stack, Tab, TabList, TabPanel, Tabs } from '@mui/joy'

import FormTextArea from '../../Common/Form/FormTextArea'
import FormTextField from '../../Common/Form/FormTextField'
import { focusRing } from '../../Common/Form/formStyles'
import useIsMobile from '../../../hooks/useIsMobile'
import CardDetailRail from './CardDetailRail'
import VisualCodeField from './VisualCodeField'
import VisualPreview from './VisualPreview'
import useMermaidPreview from './useMermaidPreview'

/**
 * Variant D — a required artifact with a live preview (UX-CONTRACT §4.5, CARDS.md §4.3).
 *
 * The 900px side-by-side layout is genuinely justified at a desk and genuinely
 * impossible on a phone: stacked, a ten-row monospace editor above a preview
 * is roughly 620px of content in the ~400px a keyboard leaves. So at `xs` the
 * two become tabs, and desktop is the relaxation of that when both panes fit —
 * mobile leads here, rather than being the degradation of a desktop design.
 *
 * The Preview tab carries a status dot so the state of the pane the user is
 * not looking at is legible from the one they are. Colour is never the only
 * signal: the same fact is in the tab's accessible name. And a successful
 * render never moves the user to that tab — auto-switching would yank focus
 * out of the code they are still typing.
 */
const tabSx = {
  flex: 1,
  minHeight: 44,
  borderRadius: 'lg',
  '&[aria-selected="true"]': { bgcolor: 'background.surface', boxShadow: 'sm' },
  ...focusRing
}

const StatusDot = ({ status }) =>
  status === 'idle' ? null : (
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        flexShrink: 0,
        bgcolor: status === 'error' ? 'danger.solidBg' : 'success.solidBg'
      }}
    />
  )

const VisualCardFields = ({ values, setField, errors, revealed, availableChips, onReveal, decks, refFor, tagInputRef }) => {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [tab, setTab] = useState('code')

  const preview = useMermaidPreview(values.diagramCode)

  const previewNameKey = {
    ok: 'cards.visual.previewOkAria',
    error: 'cards.visual.previewErrorAria',
    idle: 'cards.visual.tabPreview'
  }[preview.status]

  const codeField = (
    <VisualCodeField
      value={values.diagramCode}
      onChange={(value) => setField('diagramCode', value)}
      errorKey={errors.diagramCode}
      textareaRef={refFor('diagramCode')}
    />
  )

  return (
    <Stack spacing={2.5}>
      <FormTextField
        labelKey='cards.visual.titleLabel'
        placeholderKey='cards.visual.titlePlaceholder'
        value={values.title}
        onChange={(value) => setField('title', value)}
        errorKey={errors.title}
        required
        autoFocus
        inputRef={refFor('title')}
      />

      {isMobile ? (
        <Tabs value={tab} onChange={(_event, next) => setTab(next)} sx={{ bgcolor: 'transparent' }}>
          <TabList disableUnderline sx={{ bgcolor: 'background.level1', borderRadius: 'xl', p: 0.5, gap: 0.5 }}>
            <Tab value='code' disableIndicator sx={tabSx}>
              {t('cards.visual.tabCode')}
            </Tab>
            <Tab value='preview' disableIndicator aria-label={t(previewNameKey)} sx={tabSx}>
              <StatusDot status={preview.status} />
              {t('cards.visual.tabPreview')}
            </Tab>
          </TabList>

          <TabPanel value='code' sx={{ p: 0, pt: 2 }}>
            {codeField}
          </TabPanel>
          <TabPanel value='preview' sx={{ p: 0, pt: 2 }}>
            <VisualPreview {...preview} showEmptyHint />
          </TabPanel>
        </Tabs>
      ) : (
        <Stack direction='row' spacing={2} alignItems='flex-start'>
          {codeField}
          {/* No wrapper of its own: an empty preview must occupy nothing, and a
              flex child with padding would still hold a column open. */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <VisualPreview {...preview} />
          </Box>
        </Stack>
      )}

      {revealed.has('description') && (
        <FormTextArea
          labelKey='cards.visual.descriptionLabel'
          placeholderKey='cards.visual.explanationPlaceholder'
          value={values.content}
          onChange={(value) => setField('content', value)}
          minRows={2}
          textareaRef={refFor('content')}
        />
      )}

      <CardDetailRail
        values={values}
        setField={setField}
        revealed={revealed}
        availableChips={availableChips}
        onReveal={onReveal}
        decks={decks}
        tagInputRef={tagInputRef}
        refFor={refFor}
      />
    </Stack>
  )
}

export default VisualCardFields

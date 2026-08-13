import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Chip, Skeleton, Stack, Typography } from '@mui/joy'
import { GraphicEq, MenuBook, Public, Tune } from '@mui/icons-material'

import FormErrorBanner from '../Common/Form/FormErrorBanner'
import FormSheet from '../Common/Form/FormSheet'
import useIsMobile from '../../hooks/useIsMobile'
import useDeckSettings from '../../hooks/useDeckSettings'
import DeckAudioSection from './deck/DeckAudioSection'
import DeckIdentitySection from './deck/DeckIdentitySection'
import DeckPublishSheet from './DeckPublishSheet'
import DeckPublishingSection from './deck/DeckPublishingSection'
import DeckSettingsNav from './deck/DeckSettingsNav'
import DeckStudySection from './deck/DeckStudySection'
import { getDeckAccent } from './deck/deckAccent'

/**
 * Deck settings — Variant E, the partial adopter (UX-CONTRACT §3, DECKS.md §3).
 *
 * It takes the shell, the state core, the error surface, the density doctrine
 * and the accessibility baseline. It takes neither the disclosure rail nor the
 * title-first shape, and that is stated rather than worked around: nothing here
 * is required, every setting already holds a value, and there is no creation
 * moment to protect.
 *
 * What the shell buys it: `100dvh` at `xs` instead of `maxHeight: '85vh'`
 * reserving 85% of the viewport for three short fields, a full-bleed sheet
 * instead of a centred dialog Joy pads inward at the breakpoint with the least
 * room, and a footer outside the scroll region — which is also the first place
 * the autosave result has ever been visible at `xs`, since the shipped
 * indicator lived in a nav list that renders only from `sm` up.
 *
 * There is no Save button and there should not be. The state core owns the
 * debounce, one timer per service method (§11.1).
 */
const SECTIONS = [
  { key: 'identity', Icon: Tune },
  { key: 'study', Icon: MenuBook },
  { key: 'audio', Icon: GraphicEq },
  { key: 'publishing', Icon: Public }
]

export default function DeckSettingsModal({ open, onClose, deckId, onSaved, initialSection = 'study' }) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [publishOpen, setPublishOpen] = useState(false)
  const settings = useDeckSettings({ open, deckId, initialSection, onSaved, onClose })

  const { loading, deck, activeSection } = settings
  const { color: accent, Icon: AccentIcon } = getDeckAccent(deck?.deck_type)

  const statusKey = (settings.savingSection && 'deckSettings.saving') || (settings.savedSection && 'deckSettings.saved') || null

  return (
    <>
      <FormSheet
        // NN/g: do not stack bottom sheets. At `xs` the publish sheet replaces
        // this one; from `sm` up a centred dialog over a centred dialog is a
        // conventional desktop pattern and the stack is left alone (§4.4).
        open={open && !(isMobile && publishOpen)}
        onClose={settings.close}
        titleText={loading ? <Skeleton loading variant='text' width={180} /> : deck?.name}
        width='simple'
        headerAccessory={
          !loading &&
          deck && (
            // Colour, icon and text for one fact, kept deliberately (§6.4).
            <Chip
              size='sm'
              variant='soft'
              color={accent}
              startDecorator={<AccentIcon sx={{ fontSize: 14 }} />}
              sx={{ flexShrink: 0, alignSelf: 'center' }}
            >
              {t(`study.types.${deck.deck_type}s`)}
            </Chip>
          )
        }
        banner={
          settings.saveError ? (
            // With no Save button the user has no reason to suspect a failure,
            // so the retry has to be offered rather than implied.
            <FormErrorBanner
              titleKey='deckSettings.saveFailed'
              detailText={settings.saveError}
              action={{ labelKey: 'deckSettings.retry', onClick: settings.retry }}
            />
          ) : null
        }
        footer={
          // Always mounted, empty at rest: a live region added at the moment
          // its content appears is a live region screen readers do not announce.
          <Typography level='body-xs' aria-live='polite' sx={{ color: 'text.tertiary', minHeight: '1rem' }}>
            {statusKey ? t(statusKey) : ''}
          </Typography>
        }
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={{ xs: 2, sm: 3 }}>
          <DeckSettingsNav
            sections={SECTIONS}
            active={activeSection}
            onChange={settings.setActiveSection}
            savingSection={settings.savingSection}
            savedSection={settings.savedSection}
          />

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {activeSection === 'identity' && (
              <DeckIdentitySection
                loading={loading}
                identity={settings.identity}
                errorKey={settings.identityError}
                onChange={settings.setIdentityField}
              />
            )}

            {activeSection === 'study' && <DeckStudySection loading={loading} config={settings.config} onChange={settings.saveConfig} />}

            {activeSection === 'audio' && (
              <DeckAudioSection
                loading={loading}
                side={settings.audioSide}
                onSideChange={settings.setAudioSide}
                voiceSettings={settings.voiceSettings}
                voices={settings.availableVoices}
                onChange={settings.saveVoice}
              />
            )}

            {activeSection === 'publishing' && (
              <DeckPublishingSection loading={loading} deck={deck} onManage={() => setPublishOpen(true)} />
            )}
          </Box>
        </Stack>
      </FormSheet>

      <DeckPublishSheet
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        deckId={deckId}
        deck={deck}
        onPublished={() => {
          setPublishOpen(false)
          settings.markSaved()
          onSaved?.()
          settings.refreshPublishState()
        }}
      />
    </>
  )
}

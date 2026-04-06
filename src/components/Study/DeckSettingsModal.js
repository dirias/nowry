import React, { useState, useEffect, useRef } from 'react'
import {
  Modal,
  ModalDialog,
  ModalClose,
  Stack,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  FormControl,
  FormLabel,
  FormHelperText,
  RadioGroup,
  Radio,
  Input,
  Slider,
  Select,
  Option,
  Switch,
  Textarea,
  Sheet,
  CircularProgress,
  Skeleton,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  tabClasses
} from '@mui/joy'
import { MenuBook, GraphicEq, Public, Style, Quiz as QuizIcon, AccountTree, Check } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { decksService } from '../../api/services'

const SECTIONS = [
  { key: 'study', Icon: MenuBook },
  { key: 'audio', Icon: GraphicEq },
  { key: 'publishing', Icon: Public }
]

const PACE_DEFAULTS = {
  relaxed: { new_per_day: 10, max_reviews_per_day: 50 },
  balanced: { new_per_day: 20, max_reviews_per_day: 100 },
  intensive: { new_per_day: 40, max_reviews_per_day: 200 }
}

const DEFAULT_CONFIG = { pace_mode: 'balanced', new_per_day: 20, max_reviews_per_day: 100 }
const DEFAULT_VOICE_SIDE = { voice_name: null, voice_lang: null, rate: 1.0, pitch: 1.0, auto_play: false }
const DEFAULT_VOICE_SETTINGS = { front: { ...DEFAULT_VOICE_SIDE }, back: { ...DEFAULT_VOICE_SIDE } }

function getDeckAccent(deckType) {
  if (deckType === 'quiz') return { color: 'warning', Icon: QuizIcon }
  if (deckType === 'visual') return { color: 'success', Icon: AccountTree }
  return { color: 'primary', Icon: Style }
}

export default function DeckSettingsModal({ open, onClose, deckId, onSaved }) {
  const { t } = useTranslation()

  const [loading, setLoading] = useState(false)
  const [deck, setDeck] = useState(null)
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [voiceSettings, setVoiceSettings] = useState(DEFAULT_VOICE_SETTINGS)
  const [availableVoices, setAvailableVoices] = useState([])
  const [activeSection, setActiveSection] = useState('study')
  const [audioSide, setAudioSide] = useState('front')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedSection, setSavedSection] = useState(null)

  const debounceTimer = useRef(null)
  const savedOnceRef = useRef(false)

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis?.getVoices() || []
      setAvailableVoices(voices)
    }
    loadVoices()
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [])

  // Load deck data when opened
  useEffect(() => {
    if (!open || !deckId) return
    let cancelled = false
    setLoading(true)
    setActiveSection('study')
    decksService
      .getById(deckId)
      .then((data) => {
        if (cancelled) return
        setDeck(data)
        setConfig(data.config || { ...DEFAULT_CONFIG })
        setVoiceSettings(
          data.voice_settings || {
            front: { ...DEFAULT_VOICE_SIDE },
            back: { ...DEFAULT_VOICE_SIDE }
          }
        )
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, deckId])

  const debouncedSave = (payload) => {
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(async () => {
      try {
        setSaving(true)
        await decksService.updateSettings(deckId, payload)
        savedOnceRef.current = true
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
      } catch (e) {
        console.error('Settings save failed', e)
      } finally {
        setSaving(false)
      }
    }, 600)
  }

  const handleClose = () => {
    clearTimeout(debounceTimer.current)
    if (savedOnceRef.current || saved) {
      onSaved?.()
    }
    // Reset state
    setDeck(null)
    setConfig(DEFAULT_CONFIG)
    setVoiceSettings(DEFAULT_VOICE_SETTINGS)
    setSaving(false)
    setSaved(false)
    setSavedSection(null)
    savedOnceRef.current = false
    onClose()
  }

  const { color: accentColor, Icon: DeckTypeIcon } = deck ? getDeckAccent(deck.deck_type) : { color: 'primary', Icon: Style }

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalDialog
        size='lg'
        layout='center'
        sx={{
          width: { xs: '100%', sm: 580 },
          maxHeight: '85vh',
          p: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <ModalClose sx={{ zIndex: 10 }} />

        {/* Header */}
        <Box
          sx={{
            px: 3,
            pt: 2.5,
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            flexShrink: 0
          }}
        >
          <Stack direction='row' alignItems='center' gap={1.5}>
            {loading ? (
              <Skeleton variant='text' width={200} height={24} />
            ) : (
              <>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 'md',
                    bgcolor: `${accentColor}.softBg`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <DeckTypeIcon sx={{ fontSize: 16, color: `${accentColor}.plainColor` }} />
                </Box>
                <Box>
                  <Typography level='title-md' fontWeight={700}>
                    {deck?.name}
                  </Typography>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                    {deck ? t(`study.types.${deck.deck_type}s`) : null}
                  </Typography>
                </Box>
              </>
            )}
          </Stack>
        </Box>

        {/* Body */}
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ flex: 1, overflow: 'hidden' }}>
          {/* Left Nav — desktop only */}
          <Box
            sx={{
              width: 152,
              flexShrink: 0,
              borderRight: '1px solid',
              borderColor: 'divider',
              p: 1.5,
              display: { xs: 'none', sm: 'flex' },
              flexDirection: 'column'
            }}
          >
            <List size='sm' sx={{ gap: 0.25 }}>
              {SECTIONS.map(({ key, Icon }) => (
                <ListItem key={key} disablePadding>
                  <ListItemButton
                    selected={activeSection === key}
                    onClick={() => setActiveSection(key)}
                    sx={{ borderRadius: 'sm', gap: 1 }}
                  >
                    <Icon sx={{ fontSize: 16 }} />
                    <Typography level='body-sm' sx={{ flex: 1 }}>
                      {t(`deckSettings.nav.${key}`)}
                    </Typography>
                    {saving && activeSection === key && savedSection === key && (
                      <CircularProgress size='sm' sx={{ '--CircularProgress-size': '14px' }} />
                    )}
                    {saved && savedSection === key && <Check sx={{ fontSize: 14, color: 'success.plainColor' }} />}
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>

          {/* Right Content */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, sm: 3 } }}>
            {/* xs only: horizontal tabs */}
            <Tabs
              value={activeSection}
              onChange={(_, val) => setActiveSection(val)}
              sx={{ display: { xs: 'block', sm: 'none' }, mb: 2, bgcolor: 'transparent' }}
            >
              <TabList
                disableUnderline
                sx={{
                  bgcolor: 'background.level1',
                  borderRadius: 'xl',
                  p: 0.5,
                  gap: 0.5,
                  [`& .${tabClasses.root}`]: {
                    borderRadius: 'lg',
                    fontWeight: 500,
                    fontSize: '0.75rem'
                  },
                  [`& .${tabClasses.root}[aria-selected="true"]`]: {
                    bgcolor: 'background.surface',
                    boxShadow: 'sm'
                  }
                }}
              >
                {SECTIONS.map(({ key }) => (
                  <Tab key={key} disableIndicator value={key}>
                    {t(`deckSettings.nav.${key}`)}
                  </Tab>
                ))}
              </TabList>
            </Tabs>

            {/* Study Section */}
            {activeSection === 'study' && (
              <Stack gap={3}>
                <FormControl>
                  <FormLabel>{t('deckSettings.study.paceMode')}</FormLabel>
                  {loading ? (
                    <Skeleton variant='rectangular' height={32} sx={{ borderRadius: 'sm' }} />
                  ) : (
                    <>
                      <RadioGroup
                        orientation='horizontal'
                        value={config.pace_mode}
                        onChange={(e) => {
                          const mode = e.target.value
                          const newConfig = { ...config, pace_mode: mode, ...PACE_DEFAULTS[mode] }
                          setConfig(newConfig)
                          debouncedSave({ config: newConfig })
                          setSavedSection('study')
                        }}
                        sx={{ gap: 2, flexWrap: 'wrap' }}
                      >
                        <Radio value='relaxed' label={t('deckSettings.pace.relaxed')} size='sm' />
                        <Radio value='balanced' label={t('deckSettings.pace.balanced')} size='sm' />
                        <Radio value='intensive' label={t('deckSettings.pace.intensive')} size='sm' />
                      </RadioGroup>
                      <FormHelperText>{t(`deckSettings.pace.${config.pace_mode}Hint`)}</FormHelperText>
                    </>
                  )}
                </FormControl>

                <FormControl>
                  <FormLabel>{t('deckSettings.study.newPerDay')}</FormLabel>
                  {loading ? (
                    <Skeleton variant='rectangular' height={32} sx={{ borderRadius: 'sm' }} />
                  ) : (
                    <Input
                      type='number'
                      size='sm'
                      value={config.new_per_day ?? 20}
                      slotProps={{ input: { min: 1, max: 500 } }}
                      endDecorator={
                        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                          {t('deckSettings.study.cardsPerDay')}
                        </Typography>
                      }
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(500, parseInt(e.target.value) || 1))
                        const newConfig = { ...config, new_per_day: val }
                        setConfig(newConfig)
                        debouncedSave({ config: newConfig })
                        setSavedSection('study')
                      }}
                    />
                  )}
                </FormControl>

                <FormControl>
                  <FormLabel>{t('deckSettings.study.maxReviews')}</FormLabel>
                  {loading ? (
                    <Skeleton variant='rectangular' height={32} sx={{ borderRadius: 'sm' }} />
                  ) : (
                    <Input
                      type='number'
                      size='sm'
                      value={config.max_reviews_per_day ?? 100}
                      slotProps={{ input: { min: 1, max: 1000 } }}
                      endDecorator={
                        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                          {t('deckSettings.study.reviewsPerDay')}
                        </Typography>
                      }
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(1000, parseInt(e.target.value) || 1))
                        const newConfig = { ...config, max_reviews_per_day: val }
                        setConfig(newConfig)
                        debouncedSave({ config: newConfig })
                        setSavedSection('study')
                      }}
                    />
                  )}
                </FormControl>
              </Stack>
            )}

            {/* Audio Section */}
            {activeSection === 'audio' && (
              <Stack gap={2.5}>
                {/* Front / Back toggle */}
                <Stack direction='row' gap={0.5} sx={{ alignSelf: 'flex-start' }}>
                  {['front', 'back'].map((side) => (
                    <Box
                      key={side}
                      role='button'
                      aria-pressed={audioSide === side}
                      onClick={() => setAudioSide(side)}
                      sx={{
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 'sm',
                        cursor: 'pointer',
                        bgcolor: audioSide === side ? 'primary.softBg' : 'transparent',
                        color: audioSide === side ? 'primary.plainColor' : 'text.tertiary',
                        fontWeight: audioSide === side ? 700 : 400,
                        fontSize: '0.8rem',
                        transition: 'all 0.15s',
                        border: '1px solid',
                        borderColor: audioSide === side ? 'primary.outlinedBorder' : 'transparent',
                        '&:hover': { color: 'text.primary' }
                      }}
                    >
                      {t(`common.${side}`)}
                    </Box>
                  ))}
                </Stack>

                {/* Autoplay */}
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                  <Typography level='body-sm' fontWeight={500}>
                    {t('deckSettings.audio.autoplay')}
                  </Typography>
                  {loading ? (
                    <Skeleton variant='rectangular' width={32} height={18} sx={{ borderRadius: 'sm' }} />
                  ) : (
                    <Switch
                      size='sm'
                      checked={voiceSettings[audioSide]?.auto_play ?? false}
                      onChange={(e) => {
                        const updated = { ...voiceSettings, [audioSide]: { ...voiceSettings[audioSide], auto_play: e.target.checked } }
                        setVoiceSettings(updated)
                        debouncedSave({ voice_settings: updated })
                        setSavedSection('audio')
                      }}
                    />
                  )}
                </Stack>

                {/* Voice */}
                <FormControl>
                  <FormLabel>{t('deckSettings.audio.voice')}</FormLabel>
                  {loading ? (
                    <Skeleton variant='rectangular' height={32} sx={{ borderRadius: 'sm' }} />
                  ) : (
                    <Select
                      size='sm'
                      value={voiceSettings[audioSide]?.voice_name || ''}
                      placeholder={t('deckSettings.audio.systemDefault')}
                      onChange={(_, val) => {
                        const selectedVoice = availableVoices.find((v) => v.name === val)
                        const updated = {
                          ...voiceSettings,
                          [audioSide]: { ...voiceSettings[audioSide], voice_name: val || null, voice_lang: selectedVoice?.lang || null }
                        }
                        setVoiceSettings(updated)
                        debouncedSave({ voice_settings: updated })
                        setSavedSection('audio')
                      }}
                    >
                      <Option value=''>{t('deckSettings.audio.systemDefault')}</Option>
                      {availableVoices.map((v) => (
                        <Option key={v.name} value={v.name}>
                          {v.name} ({v.lang})
                        </Option>
                      ))}
                    </Select>
                  )}
                </FormControl>

                {/* Speed + Pitch side by side */}
                <Stack direction='row' gap={2}>
                  <FormControl sx={{ flex: 1 }}>
                    <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 0.5 }}>
                      <FormLabel sx={{ mb: 0 }}>{t('deckSettings.audio.rate')}</FormLabel>
                      <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                        {voiceSettings[audioSide]?.rate ?? 1.0}x
                      </Typography>
                    </Stack>
                    {loading ? (
                      <Skeleton variant='rectangular' height={20} sx={{ borderRadius: 'sm' }} />
                    ) : (
                      <Slider
                        size='sm'
                        min={0.5}
                        max={2}
                        step={0.1}
                        value={voiceSettings[audioSide]?.rate ?? 1.0}
                        onChange={(_, val) => {
                          const updated = { ...voiceSettings, [audioSide]: { ...voiceSettings[audioSide], rate: val } }
                          setVoiceSettings(updated)
                          debouncedSave({ voice_settings: updated })
                          setSavedSection('audio')
                        }}
                      />
                    )}
                  </FormControl>

                  <FormControl sx={{ flex: 1 }}>
                    <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 0.5 }}>
                      <FormLabel sx={{ mb: 0 }}>{t('deckSettings.audio.pitch')}</FormLabel>
                      <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                        {voiceSettings[audioSide]?.pitch ?? 1.0}x
                      </Typography>
                    </Stack>
                    {loading ? (
                      <Skeleton variant='rectangular' height={20} sx={{ borderRadius: 'sm' }} />
                    ) : (
                      <Slider
                        size='sm'
                        min={0}
                        max={2}
                        step={0.1}
                        value={voiceSettings[audioSide]?.pitch ?? 1.0}
                        onChange={(_, val) => {
                          const updated = { ...voiceSettings, [audioSide]: { ...voiceSettings[audioSide], pitch: val } }
                          setVoiceSettings(updated)
                          debouncedSave({ voice_settings: updated })
                          setSavedSection('audio')
                        }}
                      />
                    )}
                  </FormControl>
                </Stack>
              </Stack>
            )}

            {/* Publishing Section */}
            {activeSection === 'publishing' && (
              <Stack gap={2.5}>
                <Sheet variant='outlined' sx={{ borderRadius: 'md', p: 2 }}>
                  <Stack direction='row' justifyContent='space-between' alignItems='flex-start' gap={2}>
                    <Box>
                      <Typography level='title-sm' fontWeight={600}>
                        {t('deckSettings.publish.title')}
                      </Typography>
                      <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 0.5 }}>
                        {t('deckSettings.publish.description')}
                      </Typography>
                    </Box>
                    {loading ? (
                      <Skeleton variant='rectangular' width={32} height={18} sx={{ borderRadius: 'sm' }} />
                    ) : (
                      <Switch
                        checked={deck?.is_public || false}
                        onChange={(e) => {
                          const updated = { ...deck, is_public: e.target.checked }
                          setDeck(updated)
                          decksService
                            .updateSettings(deckId, { is_public: e.target.checked })
                            .then(() => {
                              savedOnceRef.current = true
                              setSaved(true)
                              setSavedSection('publishing')
                              setTimeout(() => setSaved(false), 1500)
                            })
                            .catch(console.error)
                        }}
                      />
                    )}
                  </Stack>
                </Sheet>

                {deck?.is_public && (
                  <FormControl>
                    <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 0.5 }}>
                      <FormLabel sx={{ mb: 0 }}>{t('deckSettings.publish.publicDescription')}</FormLabel>
                      <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                        {(deck?.public_metadata?.description || '').length}/280
                      </Typography>
                    </Stack>
                    <Textarea
                      size='sm'
                      minRows={2}
                      maxRows={4}
                      value={deck?.public_metadata?.description || ''}
                      onChange={(e) => {
                        const desc = e.target.value.slice(0, 280)
                        const updated = {
                          ...deck,
                          public_metadata: { ...(deck.public_metadata || {}), description: desc }
                        }
                        setDeck(updated)
                        debouncedSave({ public_metadata: { description: desc } })
                        setSavedSection('publishing')
                      }}
                    />
                  </FormControl>
                )}

                {deck?.published_at && (
                  <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                    {t('deckSettings.publish.publishedOn', {
                      date: new Date(deck.published_at).toLocaleDateString()
                    })}
                  </Typography>
                )}
              </Stack>
            )}
          </Box>
        </Stack>
      </ModalDialog>
    </Modal>
  )
}

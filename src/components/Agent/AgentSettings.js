/**
 * AgentSettings — Dedicated Study Buddy Configuration Page
 *
 * Route: /settings/agent
 *
 * Allows the user to configure every aspect of their Study Buddy's personality:
 *   - Conciseness (Concise / Balanced / Detailed)
 *   - Tone (Friendly / Professional / Strict / Socratic)
 *   - Knowledge Access toggle
 *   - Proactive Nudging toggle
 *
 * Live Preview: A static mock conversation updates in real-time as the user
 * changes settings, so they know exactly what to expect before saving.
 */
import React, { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  Sheet,
  Slider,
  Snackbar,
  Stack,
  Switch,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Typography
} from '@mui/joy'
import { useTranslation } from 'react-i18next'
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import LockOpenRounded from '@mui/icons-material/LockOpenRounded'
import NotificationsActiveRounded from '@mui/icons-material/NotificationsActiveRounded'
import PetsRounded from '@mui/icons-material/PetsRounded'
import FormatSizeRounded from '@mui/icons-material/FormatSizeRounded'
import RecordVoiceOverRounded from '@mui/icons-material/RecordVoiceOverRounded'
import QuizRounded from '@mui/icons-material/QuizRounded'
import { agentService } from '../../api/services/agent.service'
import { userService } from '../../api/services'
import { usePet } from '../../context/AgentContext'
import { useSubscription } from '../../hooks/useSubscription'
import { useSubscriptionContext } from '../../context/SubscriptionContext'
import CompanionTab from './CompanionTab'
import OrbPreviewPanel from './OrbPreviewPanel'
import petService from '../../api/services/petService'
import { suggestFromInterests } from '../../utils/petColor'

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const SPECIES_EMOJI = {
  dragon: '🐉',
  fox: '🦊',
  cat: '🐱'
}

const CONCISENESS_OPTIONS = (t) => [
  {
    key: 'concise',
    label: t('agent.settings.personality.conciseness.concise.label'),
    icon: '⚡',
    description: t('agent.settings.personality.conciseness.concise.description'),
    preview: t('agent.settings.personality.conciseness.concise.preview')
  },
  {
    key: 'balanced',
    label: t('agent.settings.personality.conciseness.balanced.label'),
    icon: '⚖️',
    description: t('agent.settings.personality.conciseness.balanced.description'),
    preview: t('agent.settings.personality.conciseness.balanced.preview')
  },
  {
    key: 'detailed',
    label: t('agent.settings.personality.conciseness.detailed.label'),
    icon: '📖',
    description: t('agent.settings.personality.conciseness.detailed.description'),
    preview: t('agent.settings.personality.conciseness.detailed.preview')
  }
]

const TONE_OPTIONS = (t) => [
  {
    key: 'friendly',
    label: t('agent.settings.personality.toneOptions.friendly.label'),
    icon: '😊',
    description: t('agent.settings.personality.toneOptions.friendly.description'),
    preview: t('agent.settings.personality.toneOptions.friendly.preview')
  },
  {
    key: 'professional',
    label: t('agent.settings.personality.toneOptions.professional.label'),
    icon: '🎓',
    description: t('agent.settings.personality.toneOptions.professional.description'),
    preview: t('agent.settings.personality.toneOptions.professional.preview')
  },
  {
    key: 'strict',
    label: t('agent.settings.personality.toneOptions.strict.label'),
    icon: '🏋️',
    description: t('agent.settings.personality.toneOptions.strict.description'),
    preview: t('agent.settings.personality.toneOptions.strict.preview')
  },
  {
    key: 'socratic',
    label: t('agent.settings.personality.toneOptions.socratic.label'),
    icon: '🦉',
    description: t('agent.settings.personality.toneOptions.socratic.description'),
    preview: t('agent.settings.personality.toneOptions.socratic.preview')
  }
]

const FREQUENCY_OPTIONS = (t) => [
  {
    key: 'conservative',
    label: t('agent.settings.interventions.frequency.conservative'),
    description: t('agent.settings.interventions.frequency.conservativeDesc')
  },
  {
    key: 'balanced',
    label: t('agent.settings.interventions.frequency.balanced'),
    description: t('agent.settings.interventions.frequency.balancedDesc')
  },
  {
    key: 'frequent',
    label: t('agent.settings.interventions.frequency.frequent'),
    description: t('agent.settings.interventions.frequency.frequentDesc')
  }
]

const INTERVENTION_TYPE_OPTIONS = (t) => [
  {
    key: 'wrong_answer',
    label: t('agent.settings.interventions.types.wrongAnswer'),
    description: t('agent.settings.interventions.types.wrongAnswerDesc')
  },
  {
    key: 'session_summary',
    label: t('agent.settings.interventions.types.sessionSummary'),
    description: t('agent.settings.interventions.types.sessionSummaryDesc')
  },
  {
    key: 'pre_session',
    label: t('agent.settings.interventions.types.preSession'),
    description: t('agent.settings.interventions.types.preSessionDesc')
  },
  {
    key: 're_engagement',
    label: t('agent.settings.interventions.types.reEngagement'),
    description: t('agent.settings.interventions.types.reEngagementDesc')
  },
  {
    key: 'streak_milestone',
    label: t('agent.settings.interventions.types.streakMilestone'),
    description: t('agent.settings.interventions.types.streakMilestoneDesc')
  }
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A selectable style card (for conciseness or tone) */
const StyleCard = ({ option, selected, onSelect }) => (
  <Card
    id={`agent-style-card-${option.key}`}
    variant={selected ? 'solid' : 'outlined'}
    color={selected ? 'primary' : 'neutral'}
    onClick={() => onSelect(option.key)}
    sx={{
      cursor: 'pointer',
      flex: 1,
      minWidth: 0,
      p: 1.5,
      gap: 0.5,
      transition: 'all 0.18s ease',
      borderWidth: selected ? 2 : 1,
      '&:hover': {
        borderColor: selected ? 'primary.solidBg' : 'primary.outlinedBorder',
        transform: 'translateY(-2px)',
        boxShadow: 'md'
      }
    }}
  >
    <Stack direction='row' alignItems='center' spacing={1}>
      <Typography sx={{ fontSize: 20, lineHeight: 1 }}>{option.icon}</Typography>
      <Typography level='title-sm' fontWeight={600}>
        {option.label}
      </Typography>
      {selected && <CheckRounded sx={{ fontSize: 16, ml: 'auto', flexShrink: 0 }} />}
    </Stack>
    <Typography level='body-xs' sx={{ color: selected ? 'primary.solidColor' : 'text.secondary', mt: 0.25 }}>
      {option.description}
    </Typography>
  </Card>
)

/** Selectable frequency/type card — no icon variant used in the Interventions tab */
const FrequencyCard = ({ label, description, selected, onSelect }) => (
  <Card
    variant={selected ? 'solid' : 'outlined'}
    color={selected ? 'primary' : 'neutral'}
    onClick={onSelect}
    sx={{
      cursor: 'pointer',
      flex: 1,
      minWidth: 0,
      p: 1.5,
      gap: 0.5,
      transition: 'all 0.18s ease',
      borderWidth: selected ? 2 : 1,
      '&:hover': {
        borderColor: selected ? 'primary.solidBg' : 'primary.outlinedBorder',
        transform: 'translateY(-2px)',
        boxShadow: 'md'
      }
    }}
  >
    <Stack direction='row' alignItems='center' spacing={1}>
      <Typography level='title-sm' fontWeight={600}>
        {label}
      </Typography>
      {selected && <CheckRounded sx={{ fontSize: 16, ml: 'auto', flexShrink: 0 }} />}
    </Stack>
    <Typography level='body-xs' sx={{ color: selected ? 'primary.solidColor' : 'text.secondary', mt: 0.25 }}>
      {description}
    </Typography>
  </Card>
)

/** Chat bubble mock for the live preview */
const PreviewBubble = ({ role, content }) => {
  const isUser = role === 'user'
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 1
      }}
    >
      <Box
        sx={{
          maxWidth: '85%',
          px: 1.5,
          py: 1,
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          bgcolor: isUser ? 'primary.solidBg' : 'background.level2',
          color: isUser ? 'primary.solidColor' : 'text.primary',
          fontSize: 12,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
      >
        {content}
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AgentSettings() {
  const { t } = useTranslation()
  const {
    updateAgentPrefs,
    knowledgeAccessEnabled,
    proactiveNudgingEnabled,
    isRoamingEnabled,
    isActive: isPetActive,
    setPetActive,
    petName: ctxPetName,
    petSpecies: ctxPetSpecies,
    updatePetCustomization,
    tier,
    avatarUrl,
    avatarStage,
    avatarRegenPending,
    avatarGenerating,
    avatarError,
    generationsRemaining,
    generateAvatar,
    animationUrl,
    animationGenerating,
    animationError,
    generateAnimation
  } = usePet()
  const { tier: subscriptionTier } = useSubscription()
  const { openUpgradeModal } = useSubscriptionContext()
  // Use subscriptionTier as fallback if context tier is not yet populated
  const effectiveTier = tier || subscriptionTier || 'free'

  // Local state — loaded from backend on mount
  const [conciseness, setConciseness] = useState('balanced')
  const [tone, setTone] = useState('friendly')
  const [knowledgeAccess, setKnowledgeAccess] = useState(knowledgeAccessEnabled)
  const [proactiveNudging, setProactiveNudging] = useState(proactiveNudgingEnabled)
  const [roamingEnabled, setRoamingEnabled] = useState(isRoamingEnabled)
  const [interventionFrequency, setInterventionFrequency] = useState('balanced')
  const [focusModeEnabled, setFocusModeEnabled] = useState(false)
  const [interventionTypes, setInterventionTypes] = useState({
    wrong_answer: true,
    session_summary: true,
    pre_session: true,
    re_engagement: true,
    streak_milestone: true
  })
  const [quizQuestionCount, setQuizQuestionCount] = useState(10)
  const [agentLevel, setAgentLevel] = useState(1)
  const [messagesUsed, setMessagesUsed] = useState(0)
  const [messagesLimit, setMessagesLimit] = useState(50)
  const [xpForNextLevel, setXpForNextLevel] = useState(50)
  // 0–1 toward the next level, from the server. The bar previously derived
  // its own percentage as current_xp / (current_xp + xp_for_next_level), which
  // measures against TOTAL xp rather than the current level's span — so it sat
  // near-full at every level (80% at the exact moment level 3 begins) and
  // barely moved. See _level_progress() in agent.py.
  const [levelProgress, setLevelProgress] = useState(0)

  // PersonalityGenerationCounter state
  const [generationsUsed, setGenerationsUsed] = useState(0)
  const [generationsLimit, setGenerationsLimit] = useState(effectiveTier === 'pro' ? 3 : 1)
  const [resetDate, setResetDate] = useState(null)
  const [regeneratingPersonality, setRegeneratingPersonality] = useState(false)
  const [personalityError, setPersonalityError] = useState(null)
  const [personalitySuccess, setPersonalitySuccess] = useState(false)

  const [saving, setSaving] = useState(null)
  const [saved, setSaved] = useState(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  // Companion tab state
  const [activeTab, setActiveTab] = useState('personality')
  const [petName, setPetName] = useState('')
  const [petSpecies, setPetSpecies] = useState(null)
  const [petError, setPetError] = useState(false)
  const [hasSuggestion, setHasSuggestion] = useState(false)
  const [suggestedSpecies, setSuggestedSpecies] = useState(null)

  // Load current preferences from the backend
  useEffect(() => {
    const load = async () => {
      let interests = []
      try {
        const [prefs, state] = await Promise.all([userService.getGeneralPreferences(), agentService.getState()])
        setConciseness(prefs.agent_conciseness || 'balanced')
        setTone(prefs.agent_tone || 'friendly')
        setKnowledgeAccess(prefs.agent_knowledge_access ?? false)
        setProactiveNudging(prefs.agent_proactive_nudging ?? false)
        setRoamingEnabled(state.agent_roaming_enabled ?? true)
        setQuizQuestionCount(prefs.agent_ai_quiz_question_count ?? 10)
        setInterventionFrequency(prefs.agent_intervention_frequency || 'balanced')
        setFocusModeEnabled(prefs.agent_focus_mode ?? false)
        setInterventionTypes({
          wrong_answer: prefs.agent_intervention_wrong_answer ?? true,
          session_summary: prefs.agent_intervention_session_summary ?? true,
          pre_session: prefs.agent_intervention_pre_session ?? true,
          re_engagement: prefs.agent_intervention_re_engagement ?? true,
          streak_milestone: prefs.agent_intervention_streak_milestone ?? true
        })
        setAgentLevel(state.level)
        setMessagesUsed(state.messages_used)
        setMessagesLimit(state.messages_limit)
        setXpForNextLevel(state.xp_for_next_level ?? 50)
        setLevelProgress(state.level_progress ?? 0)
        // Load personality generation counter
        setGenerationsUsed(state.personality_generations_used || 0)
        setGenerationsLimit(state.personality_generation_limit || (effectiveTier === 'pro' ? 3 : 1))
        setResetDate(state.personality_generation_reset_date || null)
        interests = prefs.interests || []
      } catch (err) {
        setLoadError(true)
      } finally {
        setPageLoading(false)
      }

      // Load pet preferences — non-fatal if endpoint is unavailable
      try {
        const pref = await petService.getPetPreferences()
        setPetName(pref.pet_name || '')
        setPetSpecies(pref.pet_species || null)
        // Auto-suggest only if no existing customization and interests are available
        if (!pref.pet_species && interests.length > 0) {
          const suggestion = suggestFromInterests(interests)
          setSuggestedSpecies(suggestion.species)
          setPetSpecies(suggestion.species)
          setHasSuggestion(true)
        }
      } catch (_) {
        // Pet prefs load failure is non-fatal — settings still work
      }
    }
    load()
  }, [effectiveTier])

  const save = useCallback(
    async (key, value) => {
      setSaving(key)
      setSaved(null)
      try {
        await agentService.updatePreferences({ [key]: value })
        // Sync AgentContext global state for toggles that affect behaviour
        if (key === 'agent_knowledge_access' || key === 'agent_proactive_nudging' || key === 'agent_roaming_enabled') {
          updateAgentPrefs({
            knowledgeAccessEnabled: key === 'agent_knowledge_access' ? value : knowledgeAccess,
            proactiveNudgingEnabled: key === 'agent_proactive_nudging' ? value : proactiveNudging,
            isRoamingEnabled: key === 'agent_roaming_enabled' ? value : roamingEnabled
          })
        }
        if (key === 'agent_intervention_frequency' || key === 'agent_focus_mode' || key.startsWith('agent_intervention_')) {
          updateAgentPrefs({
            interventionFrequency: key === 'agent_intervention_frequency' ? value : interventionFrequency,
            focusModeEnabled: key === 'agent_focus_mode' ? value : focusModeEnabled,
            interventionTypes:
              key.startsWith('agent_intervention_') && key !== 'agent_intervention_frequency'
                ? { ...interventionTypes, [key.replace('agent_intervention_', '')]: value }
                : interventionTypes
          })
        }
        setSaved(key)
        setTimeout(() => setSaved(null), 2000)
      } catch {
        // Revert on failure
        if (key === 'agent_conciseness') setConciseness(conciseness)
        if (key === 'agent_tone') setTone(tone)
        if (key === 'agent_knowledge_access') setKnowledgeAccess(!value)
        if (key === 'agent_proactive_nudging') setProactiveNudging(!value)
        if (key === 'agent_roaming_enabled') setRoamingEnabled(!value)
      } finally {
        setSaving(null)
      }
    },
    [
      conciseness,
      tone,
      knowledgeAccess,
      proactiveNudging,
      roamingEnabled,
      interventionFrequency,
      focusModeEnabled,
      interventionTypes,
      updateAgentPrefs
    ]
  )

  // Handlers
  const handleConciseness = (val) => {
    setConciseness(val)
    save('agent_conciseness', val)
  }
  const handleTone = (val) => {
    setTone(val)
    save('agent_tone', val)
  }
  const handleKnowledgeAccess = (val) => {
    setKnowledgeAccess(val)
    if (!val) {
      // Cascade: disable nudging if knowledge access is turned off
      setProactiveNudging(false)
      save('agent_proactive_nudging', false)
    }
    save('agent_knowledge_access', val)
  }
  const handleNudging = (val) => {
    setProactiveNudging(val)
    save('agent_proactive_nudging', val)
  }
  const handleRoaming = (val) => {
    setRoamingEnabled(val)
    save('agent_roaming_enabled', val)
  }
  const handlePetActive = async (val) => {
    setSaving('pet_active')
    setSaved(null)
    await setPetActive(val)
    setSaved('pet_active')
    setSaving(null)
    setTimeout(() => setSaved(null), 2000)
  }
  const handleQuizQuestionCount = (val) => {
    setQuizQuestionCount(val)
    save('agent_ai_quiz_question_count', val)
  }

  // ── Interventions tab handlers ─────────────────────────────────────────────

  const handleFrequency = (val) => {
    setInterventionFrequency(val)
    save('agent_intervention_frequency', val)
  }
  const handleFocusMode = (val) => {
    setFocusModeEnabled(val)
    save('agent_focus_mode', val)
  }
  const handleInterventionType = (key, val) => {
    setInterventionTypes((prev) => ({ ...prev, [key]: val }))
    save(`agent_intervention_${key}`, val)
  }

  // ── Companion tab handlers ─────────────────────────────────────────────────

  const handleNameBlur = async () => {
    try {
      const result = await petService.updatePetPreferences({ pet_name: petName || null })
      updatePetCustomization({ petName: result.pet_name, petSpecies })
    } catch (_) {
      setPetError(true)
      setTimeout(() => setPetError(false), 4000)
    }
  }

  const handleSpeciesSelect = async (slug) => {
    const next = petSpecies === slug ? null : slug
    setPetSpecies(next)
    try {
      const result = await petService.updatePetPreferences({ pet_species: next })
      updatePetCustomization({ petName, petSpecies: result.pet_species })
    } catch (_) {
      setPetSpecies(petSpecies)
      setPetError(true)
      setTimeout(() => setPetError(false), 4000)
    }
  }

  // ── Personality generation handler ────────────────────────────────────────

  const handleRegeneratePersonality = async () => {
    setRegeneratingPersonality(true)
    setPersonalityError(null)
    try {
      const result = await agentService.generatePersonality(null, petSpecies)
      setGenerationsUsed(result.generations_used)
      setGenerationsLimit(result.generations_limit)
      setPersonalitySuccess(true)
      setTimeout(() => setPersonalitySuccess(false), 3000)
    } catch (err) {
      if (err.response?.status === 402) {
        if (effectiveTier !== 'pro') openUpgradeModal(t('agent.settings.personality.upgrade'))
      } else if (err.response?.status === 422) {
        setPersonalityError(t('agent.personality.error.blocked'))
      } else {
        setPersonalityError(t('agent.personality.error.failed'))
      }
    } finally {
      setRegeneratingPersonality(false)
    }
  }

  // Build the live preview conversation
  const previewUserMessage = t('agent.settings.previewMessage')
  const previewBotMessage =
    CONCISENESS_OPTIONS(t).find((o) => o.key === conciseness)?.preview || TONE_OPTIONS(t).find((o) => o.key === tone)?.preview || '...'

  const SaveStatus = ({ field }) => {
    if (saving === field) return <CircularProgress sx={{ '--CircularProgress-size': '16px' }} />
    if (saved === field) return <CheckRounded sx={{ color: 'success.plainColor', fontSize: 16 }} />
    return null
  }

  return (
    <Container maxWidth='lg' sx={{ py: { xs: 3, md: 5 } }}>
      {/* ── Back link ──────────────────────────────────────────────────────── */}
      <Button
        component={RouterLink}
        to='/settings'
        variant='plain'
        color='neutral'
        size='sm'
        startDecorator={<ArrowBackRounded sx={{ fontSize: 16 }} />}
        sx={{ mb: 3, px: 0 }}
      >
        {t('agent.settings.backToSettings')}
      </Button>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 1 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            overflow: 'hidden',
            flexShrink: 0,
            bgcolor: 'background.level2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={petName || t('agent.defaultName')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : petSpecies ? (
            (SPECIES_EMOJI[petSpecies] ?? '🤖')
          ) : (
            '🤖'
          )}
        </Box>
        <Box>
          <Typography level='h2' sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {petName || t('agent.defaultName')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('agent.settingsSubtitle')}
          </Typography>
        </Box>
        {/* XP + Level block */}
        <Box sx={{ ml: 'auto', textAlign: 'right', flexShrink: 0, minWidth: 120 }}>
          <Stack direction='row' spacing={1} alignItems='center' justifyContent='flex-end' sx={{ mb: 0.5 }}>
            <Chip size='sm' variant='soft' color='primary' startDecorator={<AutoAwesomeRounded sx={{ fontSize: 14 }} />}>
              {t('agent.settings.levelLabel', { level: agentLevel })}
            </Chip>
          </Stack>
          {/* XP Progress Bar */}
          <Box
            sx={{
              width: '100%',
              height: 4,
              borderRadius: 2,
              bgcolor: 'background.level2',
              overflow: 'hidden',
              mb: 0.5
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${Math.min(100, Math.max(0, Math.round(levelProgress * 100)))}%`,
                bgcolor: 'primary.solidBg',
                borderRadius: 2,
                transition: 'width 0.6s ease'
              }}
            />
          </Box>
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            {t('agent.settings.xpToNextLevel', { count: xpForNextLevel })}
          </Typography>
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            {messagesLimit === -1 ? '∞' : `${messagesUsed} / ${messagesLimit}`} {t('agent.settings.sparks')}
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ my: 3 }} />

      <Tabs value={activeTab} onChange={(_, v) => v && setActiveTab(v)} sx={{ bgcolor: 'transparent' }}>
        <TabList sx={{ mb: 3 }}>
          <Tab value='personality'>{t('agent.tabs.personality')}</Tab>
          <Tab value='companion'>{t('agent.tabs.companion')}</Tab>
          <Tab value='interventions'>{t('agent.tabs.interventions')}</Tab>
        </TabList>

        {/* ── Personality tab — existing settings ─────────────────────────── */}
        <TabPanel value='personality' sx={{ p: 0 }}>
          <Grid container spacing={3}>
            {/* Left column: settings */}
            <Grid xs={12} md={7}>
              <Stack spacing={4}>
                {/* Section: Conciseness */}
                <Box>
                  <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 0.5 }}>
                    <FormatSizeRounded sx={{ fontSize: 18, color: 'primary.plainColor' }} />
                    <Typography level='title-md' fontWeight={700}>
                      {t('agent.settings.personality.replyLength.title')}
                    </Typography>
                  </Stack>
                  <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 2 }}>
                    {t('agent.settings.personality.replyLength.desc')}
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    {CONCISENESS_OPTIONS(t).map((opt) => (
                      <StyleCard key={opt.key} option={opt} selected={conciseness === opt.key} onSelect={handleConciseness} />
                    ))}
                  </Stack>
                  {saved === 'agent_conciseness' && (
                    <Stack direction='row' spacing={0.5} alignItems='center' sx={{ mt: 1 }}>
                      <CheckRounded sx={{ fontSize: 14, color: 'success.plainColor' }} />
                      <Typography level='body-xs' sx={{ color: 'success.plainColor' }}>
                        {t('agent.settings.personality.saved')}
                      </Typography>
                    </Stack>
                  )}
                </Box>

                <Divider />

                {/* Section: Tone */}
                <Box>
                  <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 0.5 }}>
                    <RecordVoiceOverRounded sx={{ fontSize: 18, color: 'primary.plainColor' }} />
                    <Typography level='title-md' fontWeight={700}>
                      {t('agent.settings.personality.tone.title')}
                    </Typography>
                  </Stack>
                  <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 2 }}>
                    {t('agent.settings.personality.tone.desc')}
                  </Typography>
                  <Grid container spacing={1.5}>
                    {TONE_OPTIONS(t).map((opt) => (
                      <Grid key={opt.key} xs={12} sm={6}>
                        <StyleCard option={opt} selected={tone === opt.key} onSelect={handleTone} />
                      </Grid>
                    ))}
                  </Grid>
                  {saved === 'agent_tone' && (
                    <Stack direction='row' spacing={0.5} alignItems='center' sx={{ mt: 1 }}>
                      <CheckRounded sx={{ fontSize: 14, color: 'success.plainColor' }} />
                      <Typography level='body-xs' sx={{ color: 'success.plainColor' }}>
                        {t('agent.settings.personality.saved')}
                      </Typography>
                    </Stack>
                  )}
                </Box>

                <Divider />

                {/* Section: Privacy */}
                <Box>
                  <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 0.5 }}>
                    <LockOpenRounded sx={{ fontSize: 18, color: 'primary.plainColor' }} />
                    <Typography level='title-md' fontWeight={700}>
                      {t('agent.settings.personality.knowledge.title')}
                    </Typography>
                  </Stack>
                  <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 2.5 }}>
                    {t('agent.settings.personality.knowledge.desc')} <strong>{t('agent.settings.personality.knowledge.descBold')}</strong>{' '}
                    {t('agent.settings.personality.knowledge.descSuffix')}
                  </Typography>

                  <Stack spacing={2.5}>
                    {/* Knowledge access toggle */}
                    <Stack direction='row' justifyContent='space-between' alignItems='center'>
                      <Box>
                        <Typography level='title-sm'>{t('agent.settings.personality.knowledge.libraryToggleLabel')}</Typography>
                        <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                          {t('agent.settings.personality.knowledge.libraryToggleDesc')}
                        </Typography>
                      </Box>
                      <Stack direction='row' spacing={1} alignItems='center'>
                        <SaveStatus field='agent_knowledge_access' />
                        <Switch
                          id='agent-knowledge-access-toggle'
                          checked={knowledgeAccess}
                          onChange={(e) => handleKnowledgeAccess(e.target.checked)}
                          disabled={saving === 'agent_knowledge_access'}
                          color={knowledgeAccess ? 'primary' : 'neutral'}
                        />
                      </Stack>
                    </Stack>

                    {/* Proactive nudging toggle */}
                    <Stack direction='row' justifyContent='space-between' alignItems='center'>
                      <Box sx={{ flex: 1, pr: 2 }}>
                        <Stack direction='row' spacing={1} alignItems='center'>
                          <Typography level='title-sm'>{t('agent.settings.personality.knowledge.nudgesLabel')}</Typography>
                          <NotificationsActiveRounded sx={{ fontSize: 14, color: 'text.tertiary' }} />
                        </Stack>
                        <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                          {t('agent.settings.personality.knowledge.nudgesDesc')}
                          {!knowledgeAccess && t('agent.settings.personality.knowledge.nudgesRequires')}
                        </Typography>
                      </Box>
                      <Stack direction='row' spacing={1} alignItems='center'>
                        <SaveStatus field='agent_proactive_nudging' />
                        <Switch
                          id='agent-proactive-nudging-toggle'
                          checked={proactiveNudging}
                          onChange={(e) => handleNudging(e.target.checked)}
                          disabled={saving === 'agent_proactive_nudging' || !knowledgeAccess}
                          color={proactiveNudging ? 'primary' : 'neutral'}
                        />
                      </Stack>
                    </Stack>

                    {!knowledgeAccess && (
                      <Alert color='neutral' variant='soft' size='sm' startDecorator={<LockOpenRounded sx={{ fontSize: 16 }} />}>
                        {t('agent.settings.personality.knowledge.unlockAlert')}
                      </Alert>
                    )}

                    {/* Study buddy activation toggle */}
                    <Stack direction='row' justifyContent='space-between' alignItems='center'>
                      <Box sx={{ flex: 1, pr: 2 }}>
                        <Stack direction='row' spacing={1} alignItems='center'>
                          <Typography level='title-sm'>{t('agent.settings.activation.label')}</Typography>
                          <PetsRounded sx={{ fontSize: 14, color: 'text.tertiary' }} />
                        </Stack>
                        <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                          {t('agent.settings.activation.description')}
                        </Typography>
                      </Box>
                      <Stack direction='row' spacing={1} alignItems='center'>
                        <SaveStatus field='pet_active' />
                        <Switch
                          id='agent-pet-active-toggle'
                          aria-label={t('agent.settings.activation.ariaLabel')}
                          checked={isPetActive}
                          onChange={(e) => handlePetActive(e.target.checked)}
                          disabled={saving === 'pet_active'}
                          color={isPetActive ? 'primary' : 'neutral'}
                        />
                      </Stack>
                    </Stack>

                    {/* Roaming toggle */}
                    <Stack direction='row' justifyContent='space-between' alignItems='center'>
                      <Box sx={{ flex: 1, pr: 2 }}>
                        <Stack direction='row' spacing={1} alignItems='center'>
                          <Typography level='title-sm'>{t('agent.settings.personality.knowledge.roamingLabel')}</Typography>
                          <PetsRounded sx={{ fontSize: 14, color: 'text.tertiary' }} />
                        </Stack>
                        <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                          {t('agent.settings.personality.knowledge.roamingDesc')}
                        </Typography>
                      </Box>
                      <Stack direction='row' spacing={1} alignItems='center'>
                        <SaveStatus field='agent_roaming_enabled' />
                        <Switch
                          id='agent-roaming-toggle'
                          checked={roamingEnabled}
                          onChange={(e) => handleRoaming(e.target.checked)}
                          disabled={saving === 'agent_roaming_enabled'}
                          color={roamingEnabled ? 'primary' : 'neutral'}
                        />
                      </Stack>
                    </Stack>

                    {/* Quiz question count — plus/pro only */}
                    {(tier === 'plus' || tier === 'pro') && (
                      <Box>
                        <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 0.5 }}>
                          <QuizRounded sx={{ fontSize: 14, color: 'text.tertiary' }} />
                          <Typography level='title-sm'>{t('settings.quiz.question_count')}</Typography>
                          <Stack direction='row' spacing={1} alignItems='center' sx={{ ml: 'auto' }}>
                            <SaveStatus field='agent_ai_quiz_question_count' />
                            <Typography
                              level='body-xs'
                              sx={{ color: 'primary.plainColor', fontWeight: 600, minWidth: 20, textAlign: 'right' }}
                            >
                              {quizQuestionCount}
                            </Typography>
                          </Stack>
                        </Stack>
                        <Slider
                          id='quiz-question-count-slider'
                          aria-label={t('settings.quiz.question_count')}
                          min={5}
                          max={20}
                          step={1}
                          value={quizQuestionCount}
                          onChange={(_, val) => setQuizQuestionCount(val)}
                          onChangeCommitted={(_, val) => handleQuizQuestionCount(val)}
                          color='primary'
                          size='sm'
                          sx={{
                            '--Slider-thumbSize': '14px',
                            '--Slider-trackSize': '4px',
                            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
                          }}
                        />
                        <Stack direction='row' justifyContent='space-between'>
                          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                            5
                          </Typography>
                          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                            20
                          </Typography>
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Box>

                <Divider />

                {/* Section: PersonalityGenerationCounter — inline sub-component */}
                <Box>
                  <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 0.5 }}>
                    <AutoAwesomeRounded sx={{ fontSize: 18, color: 'primary.plainColor' }} />
                    <Typography level='title-md' fontWeight={700}>
                      {t('agent.settings.personality.regenerate')}
                    </Typography>
                  </Stack>
                  {effectiveTier === 'free' ? (
                    // Free: show locked placeholder
                    <Chip
                      size='sm'
                      variant='outlined'
                      color='neutral'
                      startDecorator={<LockOpenRounded sx={{ fontSize: 14 }} />}
                      sx={{ mt: 1, cursor: 'default' }}
                      aria-label={t('agent.settings.personality.customPersonalityLocked')}
                    >
                      {t('agent.settings.personality.customPersonalityLocked')}
                    </Chip>
                  ) : (
                    <Box sx={{ mt: 2 }}>
                      <Stack direction='row' alignItems='center' gap={1.5} flexWrap='wrap'>
                        <Button
                          size='sm'
                          variant='solid'
                          loading={regeneratingPersonality}
                          disabled={generationsUsed >= generationsLimit}
                          onClick={handleRegeneratePersonality}
                          aria-label={t('agent.settings.personality.regenerateButton')}
                        >
                          {t('agent.settings.personality.regenerateButton')}
                        </Button>
                        <Chip
                          size='sm'
                          variant='soft'
                          aria-live='polite'
                          color={generationsUsed >= generationsLimit ? 'danger' : 'neutral'}
                        >
                          {generationsUsed} / {generationsLimit} {t('agent.settings.personality.used')}
                        </Chip>
                      </Stack>
                      {generationsUsed >= generationsLimit && effectiveTier !== 'pro' && (
                        <Typography level='body-sm' sx={{ mt: 0.5, color: 'danger.plainColor' }}>
                          <Button
                            size='sm'
                            variant='plain'
                            color='danger'
                            onClick={() => openUpgradeModal(t('agent.settings.personality.upgrade'))}
                          >
                            {t('agent.upgrade.morePersonality')}
                          </Button>
                        </Typography>
                      )}
                      {generationsUsed >= generationsLimit && effectiveTier === 'pro' && resetDate && (
                        <Typography level='body-sm' sx={{ mt: 0.5, color: 'text.tertiary' }}>
                          {t('agent.settings.personality.resetDate', { date: resetDate })}
                        </Typography>
                      )}
                      {personalityError && (
                        <Alert color='warning' variant='soft' size='sm' sx={{ mt: 1 }}>
                          {personalityError}
                        </Alert>
                      )}
                      {personalitySuccess && (
                        <Alert color='success' variant='soft' size='sm' sx={{ mt: 1 }}>
                          {t('agent.personality.success')}
                        </Alert>
                      )}
                    </Box>
                  )}
                </Box>
              </Stack>
            </Grid>

            {/* Right column: live preview */}
            <Grid xs={12} md={5}>
              <Box sx={{ position: { md: 'sticky' }, top: { md: 24 } }}>
                <Typography
                  level='title-sm'
                  fontWeight={700}
                  sx={{ mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem' }}
                >
                  {t('agent.settings.personality.preview.title')}
                </Typography>
                <Sheet
                  variant='outlined'
                  sx={{
                    borderRadius: 'xl',
                    overflow: 'hidden',
                    bgcolor: 'background.level1',
                    borderColor: 'divider'
                  }}
                >
                  {/* Mock header */}
                  <Box
                    sx={{
                      px: 2,
                      py: 1.5,
                      bgcolor: 'background.level2',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        bgcolor: 'background.level1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        flexShrink: 0
                      }}
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={petName || t('agent.defaultName')}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : petSpecies ? (
                        (SPECIES_EMOJI[petSpecies] ?? '🤖')
                      ) : (
                        '🤖'
                      )}
                    </Box>
                    <Box>
                      <Typography sx={{ color: 'text.primary', fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>
                        {petName || t('agent.defaultName')}
                      </Typography>
                      <Typography sx={{ color: 'primary.plainColor', fontSize: 'xs', fontWeight: 500 }}>
                        {TONE_OPTIONS(t).find((o) => o.key === tone)?.label ?? tone} ·{' '}
                        {CONCISENESS_OPTIONS(t).find((o) => o.key === conciseness)?.label ?? conciseness}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Mock chat */}
                  <Box sx={{ p: 2, minHeight: 160 }}>
                    <PreviewBubble role='user' content={previewUserMessage} />
                    <PreviewBubble role='model' content={previewBotMessage} />
                  </Box>
                </Sheet>

                <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 1.5, textAlign: 'center' }}>
                  {t('agent.settings.personality.preview.caption')}
                  <br />
                  {t('agent.settings.personality.preview.captionSave')}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>

        {/* ── Companion tab — species, color, name ─────────────────────────── */}
        <TabPanel value='companion' sx={{ p: 0 }}>
          <Grid container spacing={3}>
            <Grid xs={12} md={7}>
              <CompanionTab
                petName={petName}
                setPetName={setPetName}
                onNameBlur={handleNameBlur}
                error={petError}
                tier={tier}
                avatarUrl={avatarUrl}
                avatarStage={avatarStage}
                avatarGenerating={avatarGenerating}
                avatarError={avatarError}
                generationsRemaining={generationsRemaining}
                onGenerateAvatar={generateAvatar}
                animationUrl={animationUrl}
                animationGenerating={animationGenerating}
                animationError={animationError}
                onGenerateAnimation={generateAnimation}
              />
            </Grid>
            <Grid xs={12} md={5}>
              <OrbPreviewPanel petSpecies={petSpecies} petName={petName} avatarUrl={avatarUrl} />
            </Grid>
          </Grid>
        </TabPanel>

        {/* ── Interventions tab — frequency, focus mode, message types ─────── */}
        <TabPanel value='interventions' sx={{ p: 0 }}>
          <Grid container spacing={3}>
            <Grid xs={12} md={7}>
              <Stack spacing={4}>
                {/* Alert when proactive nudging is off */}
                {!proactiveNudging && (
                  <Alert color='neutral' variant='soft'>
                    <Typography level='body-sm'>{t('agent.settings.interventions.requiresNudging')}</Typography>
                  </Alert>
                )}

                <Box sx={{ opacity: proactiveNudging ? 1 : 0.45, pointerEvents: proactiveNudging ? 'auto' : 'none' }}>
                  <Stack spacing={4}>
                    {/* Section: Frequency */}
                    <Box>
                      <Typography level='title-md' fontWeight={700} mb={0.5}>
                        {t('agent.settings.interventions.frequency.sectionTitle')}
                      </Typography>
                      <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 2 }}>
                        {t('agent.settings.interventions.frequency.sectionDesc')}
                      </Typography>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                        {FREQUENCY_OPTIONS(t).map((opt) => (
                          <FrequencyCard
                            key={opt.key}
                            selected={interventionFrequency === opt.key}
                            onSelect={() => handleFrequency(opt.key)}
                            label={opt.label}
                            description={opt.description}
                          />
                        ))}
                      </Stack>
                    </Box>

                    <Divider />

                    {/* Section: Focus Mode */}
                    <Box>
                      <Stack direction='row' justifyContent='space-between' alignItems='center'>
                        <Box>
                          <Typography level='title-sm' fontWeight={600}>
                            {t('agent.settings.interventions.focusMode.label')}
                          </Typography>
                          <Typography level='body-xs' sx={{ color: 'text.secondary', mt: 0.25 }}>
                            {t('agent.settings.interventions.focusMode.desc')}
                          </Typography>
                        </Box>
                        <Stack direction='row' spacing={1} alignItems='center'>
                          <SaveStatus field='agent_focus_mode' />
                          <Switch
                            id='agent-focus-mode-toggle'
                            aria-label={t('agent.settings.interventions.focusMode.label')}
                            checked={focusModeEnabled}
                            onChange={(e) => handleFocusMode(e.target.checked)}
                            color={focusModeEnabled ? 'primary' : 'neutral'}
                          />
                        </Stack>
                      </Stack>
                    </Box>

                    <Divider />

                    {/* Section: Message Types */}
                    <Box>
                      <Typography level='title-md' fontWeight={700} mb={0.5}>
                        {t('agent.settings.interventions.types.sectionTitle')}
                      </Typography>
                      <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 2 }}>
                        {t('agent.settings.interventions.types.sectionDesc')}
                      </Typography>
                      <Stack spacing={2.5}>
                        {INTERVENTION_TYPE_OPTIONS(t).map((opt) => (
                          <Stack key={opt.key} direction='row' justifyContent='space-between' alignItems='center'>
                            <Box sx={{ flex: 1, pr: 2 }}>
                              <Typography level='title-sm'>{opt.label}</Typography>
                              <Typography level='body-xs' sx={{ color: 'text.secondary', mt: 0.25 }}>
                                {opt.description}
                              </Typography>
                            </Box>
                            <Stack direction='row' spacing={1} alignItems='center'>
                              <SaveStatus field={`agent_intervention_${opt.key}`} />
                              <Switch
                                id={`agent-intervention-${opt.key}`}
                                aria-label={opt.label}
                                checked={interventionTypes[opt.key]}
                                onChange={(e) => handleInterventionType(opt.key, e.target.checked)}
                                color={interventionTypes[opt.key] ? 'primary' : 'neutral'}
                              />
                            </Stack>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
              </Stack>
            </Grid>
            <Grid xs={12} md={5}>
              <OrbPreviewPanel petSpecies={petSpecies} petName={petName} avatarUrl={avatarUrl} />
            </Grid>
          </Grid>
        </TabPanel>
      </Tabs>

      <Snackbar
        open={!!loadError}
        autoHideDuration={4000}
        onClose={() => setLoadError(null)}
        color='danger'
        variant='soft'
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {t('agent.errors.settingsLoadFailed')}
      </Snackbar>
    </Container>
  )
}

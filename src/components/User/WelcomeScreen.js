import React, { useCallback, useEffect, useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, Option, Radio, RadioGroup, Select, Sheet, Stack, Tooltip, Typography } from '@mui/joy'
import CheckRounded from '@mui/icons-material/CheckRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded'
import LanguageRounded from '@mui/icons-material/LanguageRounded'

import { ACTION_PHASE, PREFERENCE_FIELD } from '../../hooks/useProgressivePreferences'
import { getColorPresets } from '../../theme/colorSchemeGenerator'
import { useThemePreferences } from '../../theme/DynamicThemeProvider'
import FormErrorBanner from '../Common/Form/FormErrorBanner'
import { focusRing, touchTarget } from '../Common/Form/formStyles'
import OnboardingPageShell from './OnboardingPageShell'
import { overlayFocusRing } from './taxonomySelectorStyles'

/**
 * WelcomeScreen — the first onboarding screen (ONB-009).
 *
 * WHAT THIS SCREEN IS FOR
 *
 * It asks nothing (FR-002). It says in two lines what the journey does and what
 * the user walks away with, offers begin and postpone (FR-008, FR-009), and
 * carries two optional controls that are *not* steps: the language switch
 * (FR-010, FR-011) and the accent presets (FR-012). There is deliberately no
 * light/dark question — the operating system already answered it and
 * `CssVarsProvider defaultMode='system'` already honours the answer (FR-014).
 *
 * The superseded wizard opened with a three-item benefits list — "Quick &
 * Easy", "Tailored for You", "Always Changeable". That is advertising copy
 * shown to somebody who has already signed up, so it is gone rather than
 * translated; the step count is stated as a number instead of "just a few".
 *
 * INSTANT UI, HONEST SAVE STATE
 *
 * `useProgressivePreferences` deliberately does not apply anything — it never
 * calls `i18n.changeLanguage` and never touches the theme (ONB-006). Applying
 * is this screen's job, and it is done in two places on purpose:
 *
 *   1. the click handler applies immediately, so the response to a tap never
 *      depends on a hook's internal short-circuit or on a round trip;
 *   2. an effect reconciles against `preferences.values` — the draft-or-
 *      confirmed view — so a value that arrives from the *server* (a locale
 *      saved on another device, restored by the initial read) is applied too.
 *
 * `values` and not `confirmed` is the input to both, which is what separates
 * the two halves of FR-040: the screen repaints the instant the user chooses,
 * while `fields[f].isConfirmed` — never the visible value — decides whether the
 * words "Saved" may appear next to it. A failed write keeps the choice on
 * screen, names the field as unsaved and offers a retry (FR-039).
 *
 * POSTPONE WAITS FOR THE SERVER
 *
 * The 24-hour grace period is computed server-side from `postponed_at`
 * (FR-041, FR-042). Navigating Home before that write lands would promise the
 * user a quiet Home they may not get, so the navigation is `await`ed on the
 * PATCH and happens only on `ok`. A failure keeps the user exactly where they
 * are, announces itself assertively — they asked for a navigation and did not
 * get one — and offers a retry when the code is recoverable.
 *
 * WHAT IS DISABLED, AND WHAT IS NOT
 *
 * Only genuinely incompatible duplicates (FR-047): while the postpone PATCH is
 * in flight, postpone is `loading` (Joy disables it) and Begin is disabled,
 * because beginning would carry the user forward under a postponement that is
 * still being recorded. The language and accent controls stay live throughout —
 * their writes are independently queued and coalesced per field, so disabling
 * them would fight the user for no gain.
 *
 * @param {object}   props
 * @param {object}   props.shell       Shell props from `OnboardingRoute`; spread, never rebuilt.
 * @param {object}   props.journey     The route's single `useOnboardingJourney` instance.
 * @param {object}   props.preferences The route's single `useProgressivePreferences` instance.
 * @param {Function} props.onNext      Advance to Personalization.
 * @param {Function} props.onExit      Leave the journey without claiming completion.
 */

/**
 * The five supported locales (FR-011), each named in itself.
 *
 * Endonyms are deliberately not routed through `t()`: a switcher that renders
 * "Spanish" in Japanese is unreadable to the one person looking for it, and
 * every shipping language picker in the product already lists them this way.
 * The control's own accessible name *is* translated — that is the string a
 * screen-reader user needs in their current language.
 */
export const ONBOARDING_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ja', label: '日本語' }
]

const SUPPORTED_CODES = new Set(ONBOARDING_LANGUAGES.map((language) => language.code))

/**
 * Normalize whatever i18next reports into one of the five codes.
 *
 * `i18n.js` sets `load: 'languageOnly'`, so `es-MX` should already have
 * collapsed to `es` — the split is a guard against a detector or a stored
 * preference that predates that setting, not a second detection path. FR-010
 * is satisfied before this component renders at all: the detector runs at app
 * boot, so the detected language is already the active one.
 */
const resolveLanguage = (candidate) => {
  const base = String(candidate || '').split('-')[0]
  return SUPPORTED_CODES.has(base) ? base : 'en'
}

/** Presets are pure and stable; computing them once keeps swatch identity stable. */
const ACCENT_PRESETS = getColorPresets()

/**
 * Localized names for the shipped presets, keyed by the preset's own color.
 *
 * The generator's `label` is an English string, and NFR-008 does not exempt an
 * accessible name from the five locales. A color the map does not know falls
 * back to that English label rather than to a raw key (NFR-012) — a preset
 * added later is then merely untranslated, never broken.
 */
const ACCENT_NAME_KEYS = {
  '#2a6971': 'oceanTeal',
  '#0b6bcb': 'skyBlue',
  '#9c27b0': 'royalPurple',
  '#e91e63': 'rosePink',
  '#f44336': 'crimsonRed',
  '#ff9800': 'sunsetOrange',
  '#4caf50': 'forestGreen',
  '#795548': 'earthBrown'
}

/**
 * Map a hook error code to a sentence. The hooks publish machine codes and no
 * copy at all (ONB-005, ONB-006), precisely so that a server code nobody has
 * translated yet cannot reach the screen as English.
 */
const FAILURE_KEYS = {
  network_error: 'onboarding.failure.network',
  validation_error: 'onboarding.failure.rejected'
}

const failureKey = (error) => FAILURE_KEYS[error?.code] ?? 'onboarding.failure.unknown'

/** A field the hook has not reported on yet. */
const IDLE_FIELD = { phase: ACTION_PHASE.IDLE, error: null, isSaving: false, isConfirmed: true, justSaved: false, canRetry: false }

/**
 * The save state of one preference, in words and in a glyph.
 *
 * Always mounted, so its later changes are actually announced; polite, because
 * nothing here interrupts what the user is doing — unlike the postpone banner,
 * which stopped a navigation they explicitly asked for and is therefore an
 * `alert`. Every state pairs an icon with text, so none of them is carried by
 * color (NFR-004).
 */
const FieldSaveState = ({ id, state, onRetry }) => {
  const { t } = useTranslation()
  const isError = state.phase === ACTION_PHASE.ERROR

  return (
    <Box id={id} role='status' aria-live='polite' sx={{ minWidth: 0 }}>
      {state.isSaving && (
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t('onboarding.welcome.save.saving')}
        </Typography>
      )}

      {isError && (
        <Stack direction='row' spacing={0.75} alignItems='flex-start' sx={{ flexWrap: 'wrap' }}>
          <ErrorOutlineRounded sx={{ fontSize: 16, mt: '2px', color: 'danger.plainColor', flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography level='body-xs' sx={{ color: 'danger.plainColor', fontWeight: 600 }}>
              {t('onboarding.welcome.save.unsaved')}
            </Typography>
            <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
              {t(failureKey(state.error))}
            </Typography>
          </Box>
          {state.canRetry && (
            <Button size='sm' variant='plain' color='danger' onClick={onRetry} sx={{ ...touchTarget, ...focusRing, flexShrink: 0 }}>
              {t('onboarding.welcome.save.retry')}
            </Button>
          )}
        </Stack>
      )}

      {!state.isSaving && !isError && state.justSaved && (
        <Stack direction='row' spacing={0.5} alignItems='center'>
          <CheckCircleRounded sx={{ fontSize: 16, color: 'success.plainColor', flexShrink: 0 }} />
          <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
            {t('onboarding.welcome.save.saved')}
          </Typography>
        </Stack>
      )}
    </Box>
  )
}

/**
 * One accent preset.
 *
 * This is the one place on the screen that legitimately paints a literal hex:
 * a swatch whose job is to show a color cannot show it through a semantic
 * token. Everything around it — ring, check glyph, focus — is either a token or
 * the preset's own `contrastText`, which `colorSchemeGenerator` derives from
 * luminance (`468cf7f`). Hardcoding `white` here is exactly the bug that fix
 * removed: on Sunset Orange a white check is nearly invisible.
 *
 * Selection is a glyph plus a ring in `text.primary`, never the color alone
 * (NFR-004), and the preset's name reaches assistive technology through the
 * radio's accessible name rather than through the swatch's appearance.
 */
const AccentSwatch = ({ preset, name, isSelected }) => (
  <Tooltip title={name}>
    <Sheet
      variant='outlined'
      sx={{
        position: 'relative',
        width: 44,
        height: 44,
        flexShrink: 0,
        borderRadius: 'md',
        bgcolor: preset.color,
        borderColor: isSelected ? 'text.primary' : 'transparent',
        boxShadow: isSelected ? 'inset 0 0 0 2px var(--joy-palette-background-surface)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.15s ease',
        '&:hover': { transform: 'scale(1.06)' },
        '&:active': { transform: 'scale(0.95)' },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': { transform: 'none' },
          '&:active': { transform: 'none' }
        }
      }}
    >
      <Radio
        overlay
        disableIcon
        value={preset.color}
        color='neutral'
        slotProps={{ input: { 'aria-label': name }, action: { sx: { borderRadius: 'md', ...overlayFocusRing } } }}
      />
      {isSelected && <CheckRounded aria-hidden='true' sx={{ fontSize: 22, color: preset.contrastText, pointerEvents: 'none' }} />}
    </Sheet>
  </Tooltip>
)

const WelcomeScreen = ({ shell, journey, preferences, onNext, onExit }) => {
  const { t, i18n } = useTranslation()
  const { themeColor, setThemeColor } = useThemePreferences()

  const baseId = useId()
  const languageStatusId = `${baseId}-language-status`
  const accentLabelId = `${baseId}-accent-label`
  const accentHintId = `${baseId}-accent-hint`
  const accentStatusId = `${baseId}-accent-status`

  const values = preferences?.values ?? {}
  const fields = preferences?.fields ?? {}
  const languageField = fields[PREFERENCE_FIELD.LANGUAGE] ?? IDLE_FIELD
  const accentField = fields[PREFERENCE_FIELD.ACCENT_COLOR] ?? IDLE_FIELD

  // Draft-or-confirmed, per the ONB-006 contract. The language falls back to
  // whatever i18next currently holds rather than to a constant, so a user with
  // nothing saved sees the language they were *detected* into (FR-010).
  const savedLanguage = values[PREFERENCE_FIELD.LANGUAGE] ?? null
  const savedAccent = values[PREFERENCE_FIELD.ACCENT_COLOR] ?? null
  const activeLanguage = resolveLanguage(savedLanguage ?? i18n.language)
  const activeAccent = savedAccent ?? themeColor ?? null

  const postponePhase = journey?.postponeState?.phase ?? ACTION_PHASE.IDLE
  const isPostponing = postponePhase === ACTION_PHASE.PENDING
  const postponeError = postponePhase === ACTION_PHASE.ERROR ? (journey?.postponeState?.error ?? null) : null

  // Reconcile applied state with the hook's view. This is what picks up a
  // locale or accent that came back from the *server* — the click handlers
  // below already covered the local case before this ever runs.
  useEffect(() => {
    if (!savedLanguage) return
    const next = resolveLanguage(savedLanguage)
    if (i18n.language !== next) i18n.changeLanguage(next)
  }, [savedLanguage, i18n])

  useEffect(() => {
    if (!savedAccent || savedAccent === themeColor) return
    setThemeColor(savedAccent)
  }, [savedAccent, themeColor, setThemeColor])

  const handleLanguage = useCallback(
    (nextCode) => {
      if (!nextCode || !SUPPORTED_CODES.has(nextCode)) return
      // Applied before the request, never after it: the screen must repaint on
      // the tap, and `setPreference` legitimately short-circuits when the value
      // already matches the confirmed one.
      if (i18n.language !== nextCode) i18n.changeLanguage(nextCode)
      preferences.setPreference(PREFERENCE_FIELD.LANGUAGE, nextCode)
    },
    [i18n, preferences]
  )

  const handleAccent = useCallback(
    (nextColor) => {
      if (!nextColor) return
      setThemeColor(nextColor)
      preferences.setPreference(PREFERENCE_FIELD.ACCENT_COLOR, nextColor)
    },
    [preferences, setThemeColor]
  )

  /**
   * FR-041. `postpone()` resolves only once the server has written its own
   * timestamp, and `onExit` is reached only on `ok` — so the user never lands
   * Home believing in a grace period that was never recorded. The hook treats
   * `409 onboarding_already_activated` as success and re-reads state, which is
   * also a legitimate reason to leave.
   */
  const handlePostpone = useCallback(async () => {
    const result = await journey.postpone()
    if (result?.ok) onExit()
  }, [journey, onExit])

  const accentName = useCallback(
    (preset) => {
      const key = ACCENT_NAME_KEYS[preset.color]
      return key ? t(`onboarding.welcome.accent.names.${key}`) : preset.label
    },
    [t]
  )

  const selectedPreset = useMemo(() => ACCENT_PRESETS.find((preset) => preset.color === activeAccent) ?? null, [activeAccent])

  const banner = postponeError ? (
    <FormErrorBanner
      titleKey='onboarding.welcome.postponeError.title'
      detailText={`${t('onboarding.welcome.postponeError.body')} ${t(failureKey(postponeError))}`}
      action={postponeError.recoverable ? { labelKey: 'onboarding.welcome.save.retry', onClick: handlePostpone } : null}
    />
  ) : null

  const footer = (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
      <Button onClick={handlePostpone} loading={isPostponing} variant='outlined' color='neutral' sx={{ minHeight: 44, ...focusRing }}>
        {t('onboarding.welcome.postpone')}
      </Button>
      <Button onClick={onNext} disabled={isPostponing} variant='solid' color='primary' sx={{ ml: 'auto', minHeight: 44, ...focusRing }}>
        {t('onboarding.welcome.begin')}
      </Button>
    </Box>
  )

  return (
    <OnboardingPageShell
      {...shell}
      title={t('onboarding.welcome.title')}
      subtitle={t('onboarding.welcome.lead')}
      banner={banner}
      footer={footer}
    >
      <Stack spacing={{ xs: 3, md: 4 }}>
        <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
          {t('onboarding.welcome.support')}
        </Typography>

        {/*
          The language control comes before the accent one, and that order is
          not aesthetic: a reader who cannot read this page needs the switch
          early and near the top, not below the decorative control. It stays
          discreet — a small select, no step, no question (FR-010, FR-011).
        */}
        <Stack direction='row' spacing={1.5} alignItems='center' sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          <Select
            size='sm'
            variant='outlined'
            value={activeLanguage}
            onChange={(event, next) => handleLanguage(next)}
            startDecorator={<LanguageRounded sx={{ fontSize: 18 }} />}
            aria-label={t('onboarding.welcome.language.label')}
            aria-describedby={languageStatusId}
            slotProps={{ button: { sx: { ...touchTarget, ...focusRing } }, listbox: { sx: { zIndex: 1400 } } }}
            sx={{ minWidth: 160, ...touchTarget }}
          >
            {ONBOARDING_LANGUAGES.map((language) => (
              <Option key={language.code} value={language.code} lang={language.code}>
                {language.label}
              </Option>
            ))}
          </Select>

          <FieldSaveState id={languageStatusId} state={languageField} onRetry={() => preferences.retryField(PREFERENCE_FIELD.LANGUAGE)} />
        </Stack>

        <Box>
          <Typography id={accentLabelId} level='title-sm'>
            {t('onboarding.welcome.accent.label')}
          </Typography>
          {/* FR-014 discharged as a statement of fact, not as a question. */}
          <Typography id={accentHintId} level='body-sm' sx={{ mt: 0.5, color: 'text.tertiary' }}>
            {t('onboarding.welcome.accent.hint')}
          </Typography>

          <RadioGroup
            name='onboarding-accent'
            value={activeAccent ?? ''}
            onChange={(event) => handleAccent(event.target.value)}
            aria-labelledby={accentLabelId}
            aria-describedby={`${accentHintId} ${accentStatusId}`}
            sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1.5, mt: 1.5 }}
          >
            {ACCENT_PRESETS.map((preset) => (
              <AccentSwatch key={preset.color} preset={preset} name={accentName(preset)} isSelected={activeAccent === preset.color} />
            ))}
          </RadioGroup>

          <Stack spacing={0.5} sx={{ mt: 1.5 }}>
            {/*
              The chosen accent said in words — the only channel that survives
              grayscale, and the one that tells a screen-reader user what the
              swatch grid currently holds.
            */}
            <Typography level='body-sm' role='status' aria-live='polite' sx={{ color: 'text.secondary' }}>
              {t('onboarding.welcome.accent.selected', {
                name: selectedPreset ? accentName(selectedPreset) : t('onboarding.welcome.accent.custom')
              })}
            </Typography>

            <FieldSaveState id={accentStatusId} state={accentField} onRetry={() => preferences.retryField(PREFERENCE_FIELD.ACCENT_COLOR)} />
          </Stack>
        </Box>

        {/*
          FR-046: the confirmed read is a network call like any other and owes
          the user an error state. It is a quiet one — nothing on this screen is
          blocked by it, the controls still work, and their writes still go out.
        */}
        {preferences?.phase === 'error' && (
          <Stack direction='row' spacing={1} alignItems='center' sx={{ flexWrap: 'wrap' }}>
            <ErrorOutlineRounded sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
            <Typography level='body-xs' role='status' sx={{ color: 'text.secondary' }}>
              {t('onboarding.welcome.loadError')}
            </Typography>
            <Button size='sm' variant='plain' color='neutral' onClick={() => preferences.reload()} sx={{ ...touchTarget, ...focusRing }}>
              {t('onboarding.welcome.save.retry')}
            </Button>
          </Stack>
        )}
      </Stack>
    </OnboardingPageShell>
  )
}

export default WelcomeScreen

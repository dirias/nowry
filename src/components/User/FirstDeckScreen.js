import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Button, Stack, Typography } from '@mui/joy'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import TuneRounded from '@mui/icons-material/TuneRounded'

import { TOPICS } from '../../constants/learningTaxonomy'
import { ACTION_PHASE, BROWSE_PHASE } from '../../hooks/useOnboardingJourney'
import { PREFERENCES_PHASE } from '../../hooks/useProgressivePreferences'
import FormErrorBanner from '../Common/Form/FormErrorBanner'
import { focusRing } from '../Common/Form/formStyles'
import CuratedDeckCard, { CuratedDeckCardSkeleton } from './CuratedDeckCard'
import FirstDeckEmptyState from './FirstDeckEmptyState'
import { failureKey } from './OnboardingFieldSaveState'
import OnboardingPageShell from './OnboardingPageShell'
import { visuallyHidden } from './taxonomySelectorStyles'

/**
 * FirstDeckScreen — the third onboarding screen, and the only one that gives
 * rather than asks (ONB-011).
 *
 * THE EMPTY RESULT IS THE EXPECTED RESULT
 *
 * FR-050 and FR-059 are the load-bearing requirements on this screen, not the
 * happy path. The launch catalog target is 42 curated decks; the count today is
 * zero and the pilot has not started, so `browseState.phase === 'empty'` is what
 * every real user reaches. `useOnboardingJourney` already keeps `empty` as a
 * terminal phase *separate* from `error` for exactly this reason, and this
 * screen honours the distinction all the way down: different component,
 * different tone, different semantics (`status` versus `alert`), no retry, no
 * danger palette. Calling a bare shelf a failure would be the single most
 * damaging thing this screen could do (NFR-018).
 *
 * ACTIVATION IS THE SERVER'S WORD, NOT A SCREEN TRANSITION
 *
 * The success panel renders only when `journey.isActivated` — which is set from
 * the `onboarding` block the fork endpoint emits after it has *persisted*
 * activation (ADR-006, FR-006). Reaching this screen contributes nothing.
 * Generating cards with AI contributes nothing. Even a `200` fork response
 * without that block contributes nothing, and that case is handled below rather
 * than assumed away.
 *
 * THE TWO FORK OUTCOMES THAT ARE NOT FAILURES
 *
 * - **`created: false`** is an idempotent replay of a fork this user already
 *   owns (ADR-005). It is shown exactly like a first fork, because the user
 *   asked for a deck in their library and the deck is in their library. Making
 *   a distinction here would invent a problem the server deliberately removed
 *   when it replaced `409 already_forked` with a `200`.
 * - **`500 activation_failed`** means the deck *and its cards already exist* and
 *   only the user-state write is outstanding (ONB-004). Surfacing it as "the
 *   deck wasn't added" would be false, and worse, it would invite the user to
 *   go and fork something else. It gets its own copy that says the deck is
 *   safe, and its retry is a replay under the same idempotency key, which
 *   completes the activation without copying a second deck (NFR-017).
 *
 * WHAT THE USER BROWSES FOR
 *
 * `preferences.confirmedPrimaryTopic` — the primary topic the *server* derived
 * from `interests[0]`, never the visible draft. ONB-010 refuses to advance until
 * both preference fields are confirmed precisely so this value exists, and a
 * draft cannot support the claim "these are the decks for your topic".
 *
 * @param {object}   props
 * @param {object}   props.shell       Shell props from `OnboardingRoute`; spread, never rebuilt.
 * @param {object}   props.journey     The route's single `useOnboardingJourney` instance.
 * @param {object}   props.preferences The route's single `useProgressivePreferences` instance.
 * @param {Function} props.onBack      Return to Personalization.
 * @param {Function} props.onExit      Finish for now — leaves without claiming completion.
 */

/** The views this screen can be in. Exactly one is true at a time. */
export const FIRST_DECK_VIEW = {
  LOADING: 'loading',
  OPTIONS: 'options',
  EMPTY: 'empty',
  BROWSE_ERROR: 'browseError',
  MISSING_TOPIC: 'missingTopic',
  PREFERENCES_ERROR: 'preferencesError',
  SUCCESS: 'success'
}

/**
 * Fork codes → sentences. The hook publishes codes and no copy at all (ONB-005),
 * so a server code nobody has translated yet cannot reach the screen as raw
 * English. Anything unmapped falls through to ONB-010's shared vocabulary rather
 * than to a third one.
 */
const FORK_FAILURE_KEYS = {
  fork_in_progress: 'onboarding.firstDeck.forkError.inProgress',
  fork_failed: 'onboarding.firstDeck.forkError.copyFailed',
  source_not_official: 'onboarding.firstDeck.forkError.notOfficial',
  cannot_fork_own_content: 'onboarding.firstDeck.forkError.ownContent',
  public_content_not_found: 'onboarding.firstDeck.forkError.notFound'
}

/**
 * @param   {{code?: string}|null} error Classified fork error.
 * @returns {string}                     A translation key that always resolves.
 */
export const forkFailureKey = (error) => FORK_FAILURE_KEYS[error?.code] ?? failureKey(error)

/** Canonical topic → the browse category the public catalog is keyed by. */
const deckCategoryFor = (topic) => TOPICS.find((entry) => entry.value === topic)?.deckCategory ?? topic ?? null

/** Canonical topic → the label the user already saw on Personalization. */
const topicLabelKeyFor = (topic) => TOPICS.find((entry) => entry.value === topic)?.i18nKey ?? null

/**
 * How many cards the fallback produced, when that is knowable.
 *
 * `/card/generate` is an existing endpoint this screen does not own, so its
 * envelope is read defensively and a shape we do not recognise yields `null` —
 * which selects a countless confirmation rather than an invented number.
 */
export const generatedCardCount = (result) => {
  if (Array.isArray(result)) return result.length
  if (Array.isArray(result?.cards)) return result.cards.length
  return null
}

/**
 * A load that failed, stated plainly and with the retry attached.
 *
 * `role='alert'` and a danger-toned glyph, which is precisely what the empty
 * state does *not* get: FR-049 asks that an error be visually and semantically
 * distinct from an empty result, and this pair is where that distinction is
 * actually drawn.
 */
const InlineFailure = ({ titleKey, bodyKey, onRetry }) => {
  const { t } = useTranslation()
  return (
    <Box sx={{ py: { xs: 4, md: 6 }, textAlign: 'center' }}>
      <ErrorOutlineRounded sx={{ fontSize: 40, color: 'danger.plainColor', mb: 2 }} />
      <Typography level='title-md' role='alert' sx={{ mb: 0.5, color: 'text.primary' }}>
        {t(titleKey)}
      </Typography>
      <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
        {t(bodyKey)}
      </Typography>
      <Button onClick={onRetry} size='sm' variant='outlined' color='neutral' sx={{ mt: 2, minHeight: 44, ...focusRing }}>
        {t('onboarding.shell.retry')}
      </Button>
    </Box>
  )
}

const FirstDeckScreen = ({ shell, journey, preferences, onBack, onExit }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const browseState = journey?.browseState ?? null
  const forkState = journey?.forkState ?? null
  const fallbackState = journey?.fallbackState ?? null
  const isActivated = journey?.isActivated === true

  // The server's derived primary topic (FR-024). Never `preferences.values`.
  const primaryTopic = preferences?.confirmedPrimaryTopic ?? null
  const category = deckCategoryFor(primaryTopic)
  const topicLabelKey = topicLabelKeyFor(primaryTopic)
  const topicLabel = topicLabelKey ? t(topicLabelKey) : primaryTopic

  const readPhase = preferences?.phase ?? PREFERENCES_PHASE.IDLE
  const isReadingPreferences = readPhase === PREFERENCES_PHASE.IDLE || readPhase === PREFERENCES_PHASE.LOADING

  const loadOfficialDecks = journey?.loadOfficialDecks
  const requestedCategoryRef = useRef(null)

  /**
   * One browse per topic, page 1, page size 3 — the adapter fixes the paging
   * and the `official=true&sort_by=curated` pair, so this only decides *when*.
   * `loadOfficialDecks` is a dependency-free `useCallback`, so the ref guard is
   * about the topic changing, not about the hook's identity churning.
   */
  useEffect(() => {
    if (!category || typeof loadOfficialDecks !== 'function') return
    if (requestedCategoryRef.current === category) return
    requestedCategoryRef.current = category
    loadOfficialDecks(category)
  }, [category, loadOfficialDecks])

  const browsePhase = browseState?.phase ?? BROWSE_PHASE.IDLE
  const forkPhase = forkState?.phase ?? ACTION_PHASE.IDLE
  const forkError = forkPhase === ACTION_PHASE.ERROR ? (forkState?.error ?? null) : null

  /**
   * The deck exists; the activation write does not. Two routes reach it: the
   * documented `500 activation_failed`, and a `200` that carried no `onboarding`
   * block (which the hook correctly refuses to treat as activation). Both are
   * repaired by repeating the identical request, so they share one message.
   */
  const activationIncomplete = forkPhase === ACTION_PHASE.SUCCEEDED && !isActivated
  const isActivationFailure = forkError?.code === 'activation_failed' || activationIncomplete

  const view = useMemo(() => {
    // FR-028: only the server's activation may show the success panel.
    if (forkPhase === ACTION_PHASE.SUCCEEDED && isActivated) return FIRST_DECK_VIEW.SUCCESS
    if (isReadingPreferences) return FIRST_DECK_VIEW.LOADING
    if (!category) {
      return readPhase === PREFERENCES_PHASE.ERROR ? FIRST_DECK_VIEW.PREFERENCES_ERROR : FIRST_DECK_VIEW.MISSING_TOPIC
    }
    if (browsePhase === BROWSE_PHASE.ERROR) return FIRST_DECK_VIEW.BROWSE_ERROR
    if (browsePhase === BROWSE_PHASE.EMPTY) return FIRST_DECK_VIEW.EMPTY
    if (browsePhase === BROWSE_PHASE.READY) return FIRST_DECK_VIEW.OPTIONS
    return FIRST_DECK_VIEW.LOADING
  }, [browsePhase, category, forkPhase, isActivated, isReadingPreferences, readPhase])

  const decks = Array.isArray(browseState?.items) ? browseState.items : []
  const forkedDeck = forkState?.forkedDeck ?? null
  const selectedDeckId = forkState?.deckId ?? null
  const isForking = forkPhase === ACTION_PHASE.PENDING

  const handleFork = useCallback(
    (deckId) => {
      // Same deck id ⇒ same stable idempotency key inside the hook, which is
      // what makes pressing this again a replay rather than a second fork.
      journey?.forkOfficialDeck?.(deckId)
    },
    [journey]
  )

  const handleRetryFork = useCallback(() => {
    journey?.retryFork?.()
  }, [journey])

  /**
   * FR-032: the fallback has exactly one trigger, and this is it. Nothing calls
   * it from an effect, from the empty state's mount, or from the browse
   * settling — the requirement is about what *cannot* happen, so the only
   * caller is a button's `onClick`.
   */
  const handleRequestAi = useCallback(() => {
    journey?.requestAiFallback?.(topicLabel)
  }, [journey, topicLabel])

  /**
   * FR-028's "action to open the added deck". `/study/:deckId` is the existing
   * deck-addressable route; no new one is invented (architecture, Library). A
   * missing id falls back to the library itself rather than to a broken URL.
   */
  const handleOpenDeck = useCallback(() => {
    const deckId = forkedDeck?._id
    navigate(deckId ? `/study/${deckId}` : '/study')
  }, [forkedDeck, navigate])

  /**
   * One live region for the whole screen, mounted for its life so its changes
   * are announced rather than swapped in silently. Errors are excluded: they
   * are announced by their own `alert`, and saying it twice is worse than once.
   */
  const statusText = useMemo(() => {
    switch (view) {
      case FIRST_DECK_VIEW.LOADING:
        return t('onboarding.firstDeck.status.loading')
      case FIRST_DECK_VIEW.OPTIONS:
        return t('onboarding.firstDeck.status.ready', { count: decks.length })
      case FIRST_DECK_VIEW.EMPTY:
        return t('onboarding.firstDeck.status.empty', { topic: topicLabel })
      case FIRST_DECK_VIEW.SUCCESS:
        return t('onboarding.firstDeck.status.added')
      default:
        return ''
    }
  }, [decks.length, t, topicLabel, view])

  /**
   * The banner slot, in the order the user was most recently stopped.
   *
   * The activation case is checked first and deliberately does not say the fork
   * failed, because it did not — see the module note.
   */
  const banner = isActivationFailure ? (
    <FormErrorBanner
      titleKey='onboarding.firstDeck.activationError.title'
      detailText={t('onboarding.firstDeck.activationError.body')}
      action={{ labelKey: 'onboarding.save.retry', onClick: handleRetryFork }}
    />
  ) : forkError ? (
    <FormErrorBanner
      titleKey='onboarding.firstDeck.forkError.title'
      detailText={`${t('onboarding.firstDeck.forkError.body')} ${t(forkFailureKey(forkError))}`}
      // Retry only where repeating the request is genuinely the fix. A
      // `source_not_official` deck can never activate, so offering a retry
      // would be an invitation to fail again identically.
      action={forkError.recoverable ? { labelKey: 'onboarding.save.retry', onClick: handleRetryFork } : null}
    />
  ) : fallbackState?.phase === ACTION_PHASE.ERROR ? (
    <FormErrorBanner
      titleKey='onboarding.firstDeck.fallback.error.title'
      detailText={`${t('onboarding.firstDeck.fallback.error.body')} ${t(failureKey(fallbackState.error))}`}
      action={fallbackState.error?.recoverable ? { labelKey: 'onboarding.save.retry', onClick: handleRequestAi } : null}
    />
  ) : null

  /**
   * The footer carries the exit in every state (NFR-014), and the primary
   * emphasis moves with the state (NFR-019, one primary action per state):
   * on the options view the cards own it, so finishing is quiet; on the empty
   * view finishing *is* the honest forward action, so it is solid; on success
   * the primary is opening the deck the user just earned.
   */
  const footer =
    view === FIRST_DECK_VIEW.SUCCESS ? (
      <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between' }}>
        <Button onClick={onExit} variant='plain' color='neutral' sx={{ minHeight: 44, ...focusRing }}>
          {t('onboarding.firstDeck.success.later')}
        </Button>
        <Button
          onClick={handleOpenDeck}
          variant='solid'
          color='primary'
          startDecorator={<PlayArrowRounded sx={{ fontSize: 18 }} />}
          sx={{ minHeight: 44, height: 'auto', maxWidth: '100%', whiteSpace: 'normal', textAlign: 'center', ...focusRing }}
        >
          {t('onboarding.firstDeck.success.open')}
        </Button>
      </Stack>
    ) : (
      <Stack spacing={1.5}>
        {/* What finishing costs, said before it is pressed: nothing. FR-035 is
            a promise about preferences and re-entry, and a user cannot rely on
            a promise nobody made to them. */}
        <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
          {t('onboarding.firstDeck.finishHint')}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            onClick={onExit}
            variant={view === FIRST_DECK_VIEW.EMPTY ? 'solid' : 'outlined'}
            color={view === FIRST_DECK_VIEW.EMPTY ? 'primary' : 'neutral'}
            sx={{ minHeight: 44, height: 'auto', maxWidth: '100%', whiteSpace: 'normal', textAlign: 'center', ...focusRing }}
          >
            {t('onboarding.firstDeck.finish')}
          </Button>
        </Box>
      </Stack>
    )

  const subtitle = view === FIRST_DECK_VIEW.OPTIONS || view === FIRST_DECK_VIEW.LOADING ? t('onboarding.firstDeck.lead') : null

  return (
    <OnboardingPageShell {...shell} title={t('onboarding.firstDeck.title')} subtitle={subtitle} banner={banner} footer={footer}>
      <Typography level='body-xs' role='status' sx={visuallyHidden}>
        {statusText}
      </Typography>

      {view === FIRST_DECK_VIEW.LOADING && (
        // Three placeholders because three is what the page size asks for, so
        // the column does not resize when the real options arrive (§7).
        <Stack spacing={2}>
          {[0, 1, 2].map((index) => (
            <CuratedDeckCardSkeleton key={index} />
          ))}
        </Stack>
      )}

      {view === FIRST_DECK_VIEW.OPTIONS && (
        <Stack spacing={2}>
          {decks.map((deck) => (
            <CuratedDeckCard
              key={deck?._id}
              deck={deck}
              onFork={handleFork}
              isPending={isForking && selectedDeckId === deck?._id}
              isSelected={selectedDeckId === deck?._id && (isForking || forkPhase === ACTION_PHASE.ERROR)}
              hasFailed={forkPhase === ACTION_PHASE.ERROR && selectedDeckId === deck?._id}
              disabled={isForking && selectedDeckId !== deck?._id}
            />
          ))}
        </Stack>
      )}

      {view === FIRST_DECK_VIEW.EMPTY && (
        <FirstDeckEmptyState
          topicLabel={topicLabel}
          fallbackState={fallbackState}
          onRequestAi={handleRequestAi}
          generatedCount={generatedCardCount(fallbackState?.cards)}
        />
      )}

      {view === FIRST_DECK_VIEW.BROWSE_ERROR && (
        <InlineFailure
          titleKey='onboarding.firstDeck.browseError.title'
          bodyKey='onboarding.firstDeck.browseError.body'
          onRetry={() => journey?.retryOfficialDecks?.()}
        />
      )}

      {view === FIRST_DECK_VIEW.PREFERENCES_ERROR && (
        <InlineFailure
          titleKey='onboarding.firstDeck.preferencesError.title'
          bodyKey='onboarding.firstDeck.preferencesError.body'
          onRetry={() => preferences?.reload?.()}
        />
      )}

      {view === FIRST_DECK_VIEW.MISSING_TOPIC && (
        // Not an error and not an empty catalog: the catalog was never asked.
        // Saying "no decks for your topic" when there is no topic would be the
        // dishonest shortcut, so this state names the real gap and its fix.
        <Box sx={{ py: { xs: 4, md: 6 }, textAlign: 'center' }}>
          <TuneRounded sx={{ fontSize: 48, color: 'text.tertiary', opacity: 0.5, mb: 2 }} />
          <Typography level='title-md' sx={{ mb: 0.5, color: 'text.secondary' }}>
            {t('onboarding.firstDeck.missingTopic.title')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            {t('onboarding.firstDeck.missingTopic.body')}
          </Typography>
          <Button onClick={onBack} size='sm' variant='outlined' color='neutral' sx={{ mt: 2, minHeight: 44, ...focusRing }}>
            {t('onboarding.firstDeck.missingTopic.action')}
          </Button>
        </Box>
      )}

      {view === FIRST_DECK_VIEW.SUCCESS && (
        // FR-048: confirm the *material* result — the deck, by name — not that
        // an operation ended. A replay (`created: false`) lands here unchanged
        // and unremarked, because the user's library contains what they asked
        // for either way.
        <Box sx={{ py: { xs: 3, md: 4 }, textAlign: 'center' }}>
          <CheckCircleRounded sx={{ fontSize: 48, color: 'success.plainColor', mb: 2 }} />
          <Typography level='title-md' sx={{ mb: 0.5, color: 'text.primary' }}>
            {t('onboarding.firstDeck.success.title')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {forkedDeck?.name
              ? t('onboarding.firstDeck.success.body', { name: forkedDeck.name })
              : t('onboarding.firstDeck.success.bodyNoName')}
          </Typography>
        </Box>
      )}
    </OnboardingPageShell>
  )
}

export default FirstDeckScreen

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, Skeleton, Stack, Typography } from '@mui/joy'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded'
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded'

import { MAX_TOPICS } from '../../constants/learningTaxonomy'
import { ACTION_PHASE, PREFERENCES_PHASE, PREFERENCE_FIELD } from '../../hooks/useProgressivePreferences'
import FormErrorBanner from '../Common/Form/FormErrorBanner'
import { focusRing, touchTarget } from '../Common/Form/formStyles'
import OnboardingFieldSaveState, { IDLE_FIELD, failureKey } from './OnboardingFieldSaveState'
import OnboardingPageShell from './OnboardingPageShell'
import { ONBOARDING_SCREEN } from './onboardingScreens'
import StudyGoalSelector from './StudyGoalSelector'
import TopicSelector from './TopicSelector'
import { visuallyHidden } from './taxonomySelectorStyles'

/**
 * PersonalizationScreen — the second onboarding screen (ONB-010).
 *
 * THE ONLY SCREEN THAT ASKS FOR ANYTHING
 *
 * FR-003 gives this screen the whole of the journey's data collection, and
 * FR-015..FR-020 say exactly what that is: the fourteen canonical topics in
 * selection order, and one study goal. Both controls arrive finished from
 * ONB-007 — the cap, the ordinal badges, the non-colour selected affordance and
 * the primary-position announcement are theirs, not this screen's. What is left
 * here is what a controlled selector cannot own: when a choice is persisted,
 * when it is complete, and what the one action at the bottom does.
 *
 * There is deliberately no primary-topic control (FR-019) and no learning-style
 * question (FR-023). Position *is* the answer to the first, and the second is a
 * remnant of abandoned scope. `PersonalizationScreen.test.js` asserts both
 * absences, because an absence is the one requirement nobody notices regressing.
 *
 * THE PRIMARY ACTION HAS TWO MODES, AND THE ZERO-SELECTION ONE IS NOT AN ERROR
 *
 * A5 and FR-021 are the load-bearing decision on this screen. With nothing
 * selected, the primary action stays **enabled** and becomes an explicit skip
 * that exits to Home with onboarding incomplete. It is not a greyed-out
 * "Continue", and the difference is the whole point: a required-field gate on
 * the only question in a funnel that currently produces no activation converts a
 * soft exit into a hard abandonment. So the action never dims — it changes what
 * it says it will do, and a line above it says what happens afterwards, which is
 * the information a disabled button withholds.
 *
 * Once *anything* is selected the skip is gone and the action means "continue",
 * because FR-021 also requires 1–5 interests **and** a goal to reach First Deck.
 * Pressing it then produces one of three distinct messages (FR-022) — missing
 * interests, too many interests, missing goal — never one generic "invalid".
 *
 * PROCEEDING DEPENDS ON THE SERVER'S COPY, NOT THE SCREEN'S
 *
 * `preferences.values` is what the user sees; `fields[f].isConfirmed` is whether
 * the server has echoed it (FR-040). First Deck is reached only after both
 * fields are confirmed *and* the `first_deck` point PATCH succeeds — in that
 * order, because a resume point that outruns the preferences it implies is how a
 * returning user lands on First Deck with no primary topic to browse for. A
 * press made while writes are still in flight is not refused; it is remembered,
 * and the effect below completes it when the echoes land (FR-047).
 *
 * Any failure on that path keeps the user here with every selection visible and
 * a retry attached to the specific thing that failed (FR-039, FR-049).
 *
 * @param {object}   props
 * @param {object}   props.shell       Shell props from `OnboardingRoute`; spread, never rebuilt.
 * @param {object}   props.journey     The route's single `useOnboardingJourney` instance.
 * @param {object}   props.preferences The route's single `useProgressivePreferences` instance.
 * @param {Function} props.onNext      Advance to First Deck.
 * @param {Function} props.onExit      Leave for Home without claiming completion.
 */

const EMPTY_INTERESTS = []
const EMPTY_FIELDS = {}
const EMPTY_CONFIRMED = {}

/** The three states FR-022 requires this screen to tell apart. */
export const PERSONALIZATION_ISSUE = {
  MISSING_INTERESTS: 'missingInterests',
  TOO_MANY_INTERESTS: 'tooManyInterests',
  MISSING_GOAL: 'missingGoal'
}

/**
 * What, if anything, stops this selection from reaching First Deck.
 *
 * Returns one issue rather than a list, and the order is chosen so that only one
 * of them can ever be true at a time in practice: an empty *and* goalless
 * selection is the zero state, which is a skip and never reaches here at all.
 * The single genuine overlap — more than five topics and no goal yet — reports
 * the excess first, because it is the one the user must undo rather than add.
 *
 * The cap is checked and not enforced: `TopicSelector` already refuses a sixth,
 * so the only way past five is a value the server sent us. Client-side taxonomy
 * validation stays out of this — the backend owns which values are legal.
 *
 * @param   {string[]|null|undefined} interests  Ordered interests
 * @param   {string|null|undefined}   goal       Study goal
 * @param   {number}                  [maxTopics]
 * @returns {string|null}                        A `PERSONALIZATION_ISSUE`, or null when complete
 */
export const evaluateSelection = (interests, goal, maxTopics = MAX_TOPICS) => {
  const chosen = Array.isArray(interests) ? interests : EMPTY_INTERESTS
  if (chosen.length > maxTopics) return PERSONALIZATION_ISSUE.TOO_MANY_INTERESTS
  if (chosen.length === 0) return PERSONALIZATION_ISSUE.MISSING_INTERESTS
  if (!goal) return PERSONALIZATION_ISSUE.MISSING_GOAL
  return null
}

/** A pulse is motion too (NFR-007). */
const calmSkeleton = { '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }

/** Chip widths that look like fourteen wrapped topics rather than a grey slab. */
const SKELETON_CHIP_WIDTHS = [132, 104, 88, 124, 96, 112, 100, 140, 84, 108]

/**
 * The selectors before their values are known.
 *
 * Not a full-page gate, and not the real selectors either: rendering
 * `TopicSelector` during the confirmed read would show a returning user "0 of 5
 * selected" and then correct itself, which is worse than showing nothing. The
 * shape is preserved so nothing jumps when the values arrive.
 */
const SelectionSkeleton = ({ label }) => (
  <Stack spacing={{ xs: 3, md: 4 }}>
    <Typography level='body-sm' role='status' sx={visuallyHidden}>
      {label}
    </Typography>
    {[0, 1].map((group) => (
      <Box key={group} aria-hidden='true'>
        <Skeleton variant='rectangular' sx={{ width: 140, height: 18, borderRadius: 'sm', ...calmSkeleton }} />
        <Skeleton variant='rectangular' sx={{ width: '70%', height: 14, mt: 1, borderRadius: 'sm', ...calmSkeleton }} />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
          {(group === 0 ? SKELETON_CHIP_WIDTHS : SKELETON_CHIP_WIDTHS.slice(0, 5)).map((width, index) => (
            <Skeleton key={index} variant='rectangular' sx={{ width, maxWidth: '100%', height: 40, borderRadius: 'lg', ...calmSkeleton }} />
          ))}
        </Box>
      </Box>
    ))}
  </Stack>
)

const PersonalizationScreen = ({ shell, journey, preferences, onNext, onExit }) => {
  const { t } = useTranslation()

  const [submitted, setSubmitted] = useState(false)
  const [awaitingSaves, setAwaitingSaves] = useState(false)
  const advancingRef = useRef(false)

  const values = preferences?.values ?? {}
  // Memoized rather than defaulted inline: both feed hook dependency arrays, and
  // a fresh `{}` on every render would re-run the advance effect continuously.
  const fields = useMemo(() => preferences?.fields ?? EMPTY_FIELDS, [preferences?.fields])
  const confirmed = useMemo(() => preferences?.confirmed ?? EMPTY_CONFIRMED, [preferences?.confirmed])

  // Draft-or-confirmed, per the ONB-006 contract: the controls show what the
  // user chose, and the save state beside them says separately whether it
  // stuck. Binding the selectors to `confirmed` instead would make every tap
  // wait for a round trip before it appeared.
  const interests = Array.isArray(values[PREFERENCE_FIELD.INTERESTS]) ? values[PREFERENCE_FIELD.INTERESTS] : EMPTY_INTERESTS
  const goal = values[PREFERENCE_FIELD.STUDY_GOAL] ?? null

  const interestsField = fields[PREFERENCE_FIELD.INTERESTS] ?? IDLE_FIELD
  const goalField = fields[PREFERENCE_FIELD.STUDY_GOAL] ?? IDLE_FIELD

  const readPhase = preferences?.phase ?? PREFERENCES_PHASE.IDLE
  const isReading = readPhase === PREFERENCES_PHASE.IDLE || readPhase === PREFERENCES_PHASE.LOADING

  /**
   * The zero state — and the only state in which the primary action is a skip
   * (FR-021). It is read from the *visible* selection, because a user who has
   * just picked a topic has made a selection whether or not the echo has landed.
   */
  const hasSelection = interests.length > 0 || Boolean(goal)

  /**
   * Live after the first press, absent before it.
   *
   * Validating on every keystroke would scold a user mid-selection; validating
   * only on press would leave a stale message standing after they fixed it. So
   * the first press turns it on and it tracks the selection from then. The zero
   * state is excluded outright: FR-022 requires skipping to read as a valid
   * choice, never as an error.
   */
  const validationIssue = submitted && hasSelection ? evaluateSelection(interests, goal) : null

  /** The point write this screen owns. The route records `personalization`
      through the same slice, so anything about that point is not ours to
      report — filtering on `unsavedPoint` is what keeps the two apart. */
  const pointState = journey?.pointState ?? null
  const ownsPoint = pointState?.unsavedPoint === ONBOARDING_SCREEN.FIRST_DECK
  const isRecordingPoint = ownsPoint && pointState?.phase === ACTION_PHASE.PENDING
  const pointError = ownsPoint && pointState?.phase === ACTION_PHASE.ERROR ? pointState.error : null

  /** Fields the user's press is waiting on that have failed instead (FR-039). */
  const blockedFields = useMemo(
    () =>
      [PREFERENCE_FIELD.INTERESTS, PREFERENCE_FIELD.STUDY_GOAL].filter(
        (field) => (fields[field] ?? IDLE_FIELD).phase === ACTION_PHASE.ERROR
      ),
    [fields]
  )
  const saveBlocked = submitted && blockedFields.length > 0
  const saveRetryable = blockedFields.every((field) => fields[field]?.error?.recoverable)

  const handleInterests = useCallback(
    (next) => {
      // Order is the payload, not a detail: `next[0]` is the primary topic the
      // server will derive (FR-018), and `TopicSelector` has already put the
      // array in the order the user's taps imply.
      preferences.setPreference(PREFERENCE_FIELD.INTERESTS, next)
    },
    [preferences]
  )

  const handleGoal = useCallback(
    (next) => {
      preferences.setPreference(PREFERENCE_FIELD.STUDY_GOAL, next)
    },
    [preferences]
  )

  /**
   * FR-037. The point is recorded only once the preferences it describes are
   * confirmed, and First Deck is reached only if the PATCH itself succeeds — a
   * user who is told they advanced and then reloads onto Personalization has
   * been lied to about both.
   */
  const advance = useCallback(async () => {
    if (advancingRef.current) return
    advancingRef.current = true
    try {
      const result = await journey.recordPoint(ONBOARDING_SCREEN.FIRST_DECK)
      if (result?.ok) onNext()
    } finally {
      advancingRef.current = false
    }
  }, [journey, onNext])

  /**
   * Complete the press once the writes it depends on have answered.
   *
   * The gate reads `confirmed`, not `values`: "1–5 interests and one goal" is a
   * claim about what the server holds, and First Deck browses for the primary
   * topic the server derived. A draft that has not landed cannot support either.
   */
  useEffect(() => {
    if (!awaitingSaves) return

    // Still in flight — keep waiting rather than refusing the press.
    if (interestsField.isSaving || goalField.isSaving) return

    // A failure is reported beside the field and in the banner; the press is
    // released so the button stops claiming to be working.
    if (interestsField.phase === ACTION_PHASE.ERROR || goalField.phase === ACTION_PHASE.ERROR) {
      setAwaitingSaves(false)
      return
    }

    setAwaitingSaves(false)
    if (!interestsField.isConfirmed || !goalField.isConfirmed) return
    if (evaluateSelection(confirmed[PREFERENCE_FIELD.INTERESTS], confirmed[PREFERENCE_FIELD.STUDY_GOAL])) return

    void advance()
  }, [awaitingSaves, interestsField, goalField, confirmed, advance])

  /**
   * One button, two meanings (FR-021).
   *
   * Zero selections: leave for Home, incomplete, writing nothing. Nothing is
   * recorded on the way out — the user answered nothing, and a journey point
   * asserting otherwise would be a fabricated preference.
   */
  const handlePrimary = useCallback(() => {
    if (!hasSelection) {
      onExit()
      return
    }

    setSubmitted(true)
    if (evaluateSelection(interests, goal)) return
    setAwaitingSaves(true)
  }, [goal, hasSelection, interests, onExit])

  /** Retry the writes and finish the press the user already made. */
  const handleRetrySaves = useCallback(() => {
    const retried = preferences.retryUnsaved()
    if (retried.length > 0) setAwaitingSaves(true)
  }, [preferences])

  const isBusy = isReading || awaitingSaves || isRecordingPoint

  /**
   * One banner slot, three things that could fill it, in the order of how
   * recently the user was stopped by them. They cannot genuinely overlap:
   * validation runs before any write is awaited, and the point PATCH is only
   * attempted once the writes have succeeded.
   */
  const banner = pointError ? (
    <FormErrorBanner
      titleKey='onboarding.personalization.advanceError.title'
      detailText={`${t('onboarding.personalization.advanceError.body')} ${t(failureKey(pointError))}`}
      action={pointError.recoverable ? { labelKey: 'onboarding.welcome.save.retry', onClick: advance } : null}
    />
  ) : saveBlocked ? (
    <FormErrorBanner
      titleKey='onboarding.personalization.saveError.title'
      detailText={t('onboarding.personalization.saveError.body')}
      action={saveRetryable ? { labelKey: 'onboarding.welcome.save.retry', onClick: handleRetrySaves } : null}
    />
  ) : validationIssue ? (
    <FormErrorBanner
      titleKey='onboarding.personalization.validation.title'
      detailText={t(`onboarding.personalization.validation.${validationIssue}`, {
        count: interests.length,
        excess: Math.max(interests.length - MAX_TOPICS, 0),
        max: MAX_TOPICS
      })}
    />
  ) : null

  const footer = (
    <Stack spacing={1.5}>
      {/*
        Mounted for the life of the screen so the switch into the zero state is
        announced rather than silently swapped. It is what makes the skip legible
        as a deliberate exit: the label says what the button does, this says
        where it leaves the user and that they can come back. In every other
        state it is empty, because the label already answers "continue to what?".
      */}
      <Box role='status' aria-live='polite' sx={{ minWidth: 0 }}>
        {!hasSelection && !isReading && (
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            {t('onboarding.personalization.skipHint')}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          onClick={handlePrimary}
          loading={isBusy}
          variant='solid'
          color='primary'
          endDecorator={hasSelection ? <ArrowForwardRounded sx={{ fontSize: 18 }} /> : <ArrowOutwardRounded sx={{ fontSize: 18 }} />}
          // Never `disabled`, in either mode: the zero state is a valid answer,
          // and a dimmed control is exactly the hard gate A5 removed. `height:
          // auto` plus wrapping keeps the longer localizations readable at 200%
          // text zoom instead of truncating the one action on the screen.
          sx={{
            minHeight: 44,
            height: 'auto',
            maxWidth: '100%',
            whiteSpace: 'normal',
            textAlign: 'center',
            ...focusRing
          }}
        >
          {hasSelection ? t('onboarding.personalization.continue') : t('onboarding.personalization.skip')}
        </Button>
      </Box>
    </Stack>
  )

  return (
    <OnboardingPageShell
      {...shell}
      title={t('onboarding.personalization.title')}
      subtitle={t('onboarding.personalization.lead')}
      banner={banner}
      footer={footer}
    >
      {isReading ? (
        <SelectionSkeleton label={t('onboarding.personalization.loading')} />
      ) : (
        <Stack spacing={{ xs: 3, md: 4 }}>
          <Box>
            <TopicSelector value={interests} onChange={handleInterests} />
            <OnboardingFieldSaveState
              state={interestsField}
              onRetry={() => preferences.retryField(PREFERENCE_FIELD.INTERESTS)}
              sx={{ mt: 1 }}
            />
          </Box>

          <Box>
            <StudyGoalSelector value={goal} onChange={handleGoal} />
            <OnboardingFieldSaveState
              state={goalField}
              onRetry={() => preferences.retryField(PREFERENCE_FIELD.STUDY_GOAL)}
              sx={{ mt: 1 }}
            />
          </Box>
        </Stack>
      )}

      {/*
        FR-046: the confirmed read is a network call and owes the user an error
        state. Quiet, and non-blocking — the selectors still work and their
        writes still go out; what is lost is only our knowledge of what was
        already saved, which is what the retry goes back for.
      */}
      {readPhase === PREFERENCES_PHASE.ERROR && (
        <Stack direction='row' spacing={1} alignItems='center' sx={{ mt: 3, flexWrap: 'wrap' }}>
          <ErrorOutlineRounded sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
          <Typography level='body-xs' role='status' sx={{ color: 'text.secondary' }}>
            {t('onboarding.personalization.loadError')}
          </Typography>
          <Button size='sm' variant='plain' color='neutral' onClick={() => preferences.reload()} sx={{ ...touchTarget, ...focusRing }}>
            {t('onboarding.welcome.save.retry')}
          </Button>
        </Stack>
      )}
    </OnboardingPageShell>
  )
}

export default PersonalizationScreen

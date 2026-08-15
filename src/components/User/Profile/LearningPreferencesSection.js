import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Box, Button, IconButton, Sheet, Skeleton, Stack, Tooltip, Typography } from '@mui/joy'
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded'
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded'
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded'

import { MAX_TOPICS, TOPICS } from '../../../constants/learningTaxonomy'
import useProgressivePreferences, { PREFERENCES_PHASE, PREFERENCE_FIELD } from '../../../hooks/useProgressivePreferences'
import { focusRing, touchTarget } from '../../Common/Form/formStyles'
import OnboardingFieldSaveState, { IDLE_FIELD } from '../OnboardingFieldSaveState'
import StudyGoalSelector from '../StudyGoalSelector'
import TopicSelector from '../TopicSelector'
import { visuallyHidden } from '../taxonomySelectorStyles'

/**
 * LearningPreferencesSection — topics, their order, and the study goal, in
 * Account Settings (ONB-013).
 *
 * WHY THIS IS NOT A SECOND IMPLEMENTATION
 *
 * Phase 1 shipped a bug with a very specific shape: the wizard wrote lowercase
 * snake_case interests while Settings declared its own Title-Case array, so a
 * user who finished onboarding opened Settings and saw *none* of their topics
 * selected. `learningTaxonomy.js` is the single source of truth now, but a
 * shared constant only prevents half of that drift — the two surfaces could
 * still disagree about what selection *means*. So this section renders the same
 * `TopicSelector` and `StudyGoalSelector` the Personalization screen renders
 * (ONB-007), writes through the same `useProgressivePreferences` queues
 * (ONB-006), and reports saves in the same words as `OnboardingFieldSaveState`
 * (ONB-010). Nothing about the fourteen topics, the five goals, the cap, the
 * ordinal badges or the non-colour selected affordance is restated here.
 *
 * THE ONE DELIBERATE DIFFERENCE FROM ONBOARDING
 *
 * Personalization accepts **zero** interests: A5 makes the empty selection a
 * legitimate skip out of a funnel that otherwise has a hard abandonment point.
 * Settings has no funnel and no skip — A3 and FR-052 set a real range of 1 to
 * `MAX_TOPICS`. A change that would leave the account outside that range is
 * therefore **refused before it is sent**: the previous selection stays on
 * screen and an assertive message says why. That is what "prevented" means
 * here; nothing invalid is ever written and then apologised for.
 *
 * ORDER IS A CONTROL, NOT A GESTURE
 *
 * `interests[0]` is the primary topic (FR-018) — it drives the AI persona and
 * the news feed — so reordering has to be a first-class operation. Selection
 * order alone would mean re-picking every topic just to promote the fourth one.
 * The move-earlier/move-later buttons below are plain `<button>`s: keyboard and
 * assistive technology reach them exactly like every other control, with no
 * pointer-only path anywhere (NFR-001). Drag was not added; if it ever is, it
 * is an addition to these and never a replacement.
 */

/**
 * Settings' minimum, and deliberately local. It is a property of *this* surface
 * (A3), not of the taxonomy: onboarding reads the same `TOPICS` and legitimately
 * permits zero. Putting a minimum in `learningTaxonomy.js` would quietly claim
 * it applies everywhere, which is the mistake this whole task exists to undo.
 */
export const MIN_INTERESTS = 1

/** The two ways a selection can fall outside the range FR-052 requires. */
export const INTEREST_RANGE_ISSUE = {
  TOO_FEW: 'tooFew',
  TOO_MANY: 'tooMany'
}

const EMPTY_INTERESTS = []

/**
 * Whether a candidate selection may be saved.
 *
 * Range only. Which *values* are legal is the backend's to decide — the route
 * enforces the canonical fourteen through a Pydantic `Literal`, and duplicating
 * that list as a client-side guard is how the two copies drift apart again.
 *
 * @param   {string[]|null|undefined} interests  Candidate ordered interests
 * @param   {object}                  [bounds]
 * @param   {number}                  [bounds.min]
 * @param   {number}                  [bounds.max]
 * @returns {string|null}                        An `INTEREST_RANGE_ISSUE`, or null when saveable
 */
export const evaluateInterestsRange = (interests, { min = MIN_INTERESTS, max = MAX_TOPICS } = {}) => {
  const chosen = Array.isArray(interests) ? interests : EMPTY_INTERESTS
  if (chosen.length > max) return INTEREST_RANGE_ISSUE.TOO_MANY
  if (chosen.length < min) return INTEREST_RANGE_ISSUE.TOO_FEW
  return null
}

/**
 * Move one entry, keeping every other entry's relative order.
 *
 * @param   {string[]} list Ordered interests
 * @param   {number}   from Index being moved
 * @param   {number}   to   Destination index
 * @returns {string[]}      A new array; the input is never mutated
 */
export const reorder = (list, from, to) => {
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/** A pulse is motion too (NFR-007). */
const calmSkeleton = { '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }

/** Square at `xs` so the arrows clear 44×44 on touch, compact from `sm` up. */
const moveButton = {
  ...focusRing,
  ...touchTarget,
  minWidth: { xs: 44, sm: 32 },
  flexShrink: 0
}

/**
 * The section before the confirmed read lands.
 *
 * Not the real selectors: rendering them against an empty confirmed snapshot
 * would tell a returning user "0 of 5 selected" and then correct itself, which
 * is worse than showing nothing.
 */
const LearningSkeleton = ({ label }) => (
  <Stack spacing={3}>
    <Typography level='body-sm' role='status' sx={visuallyHidden}>
      {label}
    </Typography>
    {[0, 1].map((group) => (
      <Box key={group} aria-hidden='true'>
        <Skeleton variant='rectangular' sx={{ width: 140, height: 18, borderRadius: 'sm', ...calmSkeleton }} />
        <Skeleton variant='rectangular' sx={{ width: '70%', height: 14, mt: 1, borderRadius: 'sm', ...calmSkeleton }} />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
          {(group === 0 ? [132, 104, 88, 124, 96, 112, 100] : [96, 112, 88]).map((width, index) => (
            <Skeleton key={index} variant='rectangular' sx={{ width, maxWidth: '100%', height: 40, borderRadius: 'lg', ...calmSkeleton }} />
          ))}
        </Box>
      </Box>
    ))}
  </Stack>
)

const LearningPreferencesSection = () => {
  const { t } = useTranslation()
  const preferences = useProgressivePreferences()

  /** The refusal message for the last change that fell outside 1–`MAX_TOPICS`. */
  const [rangeIssue, setRangeIssue] = useState(null)
  /** The last position change, in words. Polite: a reorder interrupts nothing. */
  const [orderMessage, setOrderMessage] = useState('')

  const values = preferences.values ?? {}
  const interests = Array.isArray(values[PREFERENCE_FIELD.INTERESTS]) ? values[PREFERENCE_FIELD.INTERESTS] : EMPTY_INTERESTS
  const goal = values[PREFERENCE_FIELD.STUDY_GOAL] ?? null

  const interestsField = preferences.fields?.[PREFERENCE_FIELD.INTERESTS] ?? IDLE_FIELD
  const goalField = preferences.fields?.[PREFERENCE_FIELD.STUDY_GOAL] ?? IDLE_FIELD

  const readPhase = preferences.phase ?? PREFERENCES_PHASE.IDLE
  const isReading = readPhase === PREFERENCES_PHASE.IDLE || readPhase === PREFERENCES_PHASE.LOADING

  /** Canonical value → the label the user actually sees, for the announcements. */
  const labelOf = useCallback(
    (value) => {
      const topic = TOPICS.find((entry) => entry.value === value)
      return topic ? t(topic.i18nKey) : value
    },
    [t]
  )

  /**
   * Persist a selection, or refuse it.
   *
   * `TopicSelector` already refuses a sixth topic, so in practice the only
   * reachable violation is emptying the list — but the check is written as a
   * range because a legacy account can arrive holding more than five, and a
   * silent write of an unsaveable value is exactly what FR-052 forbids.
   */
  const commitInterests = useCallback(
    (next) => {
      const issue = evaluateInterestsRange(next)
      if (issue) {
        setRangeIssue(issue)
        return false
      }
      setRangeIssue(null)
      preferences.setPreference(PREFERENCE_FIELD.INTERESTS, next)
      return true
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
   * Move one topic by one place, and say so.
   *
   * A position change with no announcement is invisible to a screen-reader user
   * — the list re-renders and nothing tells them what happened (NFR-005). At
   * either end the button is `aria-disabled` rather than `disabled`: repeatedly
   * pressing "move later" until an item reaches the bottom would otherwise
   * destroy the focus the user was navigating with, and the refusal still gets
   * a sentence.
   *
   * The message is purely positional. Whether the moved topic is now primary is
   * `TopicSelector`'s own live region to announce, and duplicating it here would
   * queue two announcements for one keypress.
   */
  const move = useCallback(
    (index, delta) => {
      const total = interests.length
      const target = index + delta
      const topic = labelOf(interests[index])

      if (target < 0) {
        setOrderMessage(t('settings.learning.order.alreadyFirst', { topic }))
        return
      }
      if (target >= total) {
        setOrderMessage(t('settings.learning.order.alreadyLast', { topic }))
        return
      }

      // A move cannot change the count, so it can never breach the range.
      setRangeIssue(null)
      preferences.setPreference(PREFERENCE_FIELD.INTERESTS, reorder(interests, index, target))
      setOrderMessage(t('settings.learning.order.moved', { topic, position: target + 1, total }))
    },
    [interests, labelOf, preferences, t]
  )

  /**
   * Put a field back to the last thing the server acknowledged.
   *
   * The escape hatch beside "Retry" for a change that will never be accepted —
   * a rejected value, say. It re-asserts the confirmed value through the same
   * endpoint rather than clearing the draft locally, because a draft cleared
   * without a round trip is another way of claiming a persistence nobody
   * confirmed. Until that write is acknowledged the field still reads as
   * unsaved, which is the truth.
   */
  const discard = useCallback(
    (field) => {
      if (field === PREFERENCE_FIELD.INTERESTS) setRangeIssue(null)
      preferences.setPreference(field, preferences.confirmed?.[field] ?? (field === PREFERENCE_FIELD.INTERESTS ? EMPTY_INTERESTS : null))
    },
    [preferences]
  )

  const rangeText = useMemo(() => {
    if (rangeIssue === INTEREST_RANGE_ISSUE.TOO_FEW) {
      return t('settings.learning.range.tooFew', { count: MIN_INTERESTS })
    }
    if (rangeIssue === INTEREST_RANGE_ISSUE.TOO_MANY) {
      return t('settings.learning.range.tooMany', { count: MAX_TOPICS })
    }
    return null
  }, [rangeIssue, t])

  if (isReading) return <LearningSkeleton label={t('settings.learning.loading')} />

  return (
    <Stack spacing={3}>
      <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
        {t('settings.learning.lead')}
      </Typography>

      <Box>
        <TopicSelector value={interests} onChange={commitInterests} onLimitReached={() => setRangeIssue(INTEREST_RANGE_ISSUE.TOO_MANY)} />

        {/*
          Assertive, unlike the save badge: this one refused something the user
          just asked for, and they need to know before they carry on assuming it
          took. Mounted only while it has something to say — an inserted
          `role='alert'` is announced, and an always-mounted one would make the
          two adjacent live regions compete on every keystroke. The icon carries
          the same meaning as the colour (NFR-004).
        */}
        {!!rangeText && (
          <Alert
            role='alert'
            variant='soft'
            color='danger'
            startDecorator={<ErrorOutlineRounded sx={{ fontSize: 18 }} />}
            sx={{ mt: 1.5, alignItems: 'flex-start' }}
          >
            <Typography level='body-sm' sx={{ color: 'text.primary' }}>
              {rangeText}
            </Typography>
          </Alert>
        )}

        <TopicOrderList interests={interests} labelOf={labelOf} onMove={move} />

        <FieldSaveRow
          state={interestsField}
          onRetry={() => preferences.retryField(PREFERENCE_FIELD.INTERESTS)}
          onDiscard={() => discard(PREFERENCE_FIELD.INTERESTS)}
          discardLabel={t('settings.learning.discardTopics')}
        />
      </Box>

      {/* Always mounted, so entering a new order is announced rather than
          silently swapped in. Named, because `TopicSelector` publishes a status
          region of its own and the two are easier to tell apart — for a test
          and for a screen-reader user reviewing regions — when they are. */}
      <Box role='status' aria-live='polite' aria-label={t('settings.learning.order.label')} sx={visuallyHidden}>
        {orderMessage}
      </Box>

      <Box>
        <StudyGoalSelector value={goal} onChange={handleGoal} />
        <FieldSaveRow
          state={goalField}
          onRetry={() => preferences.retryField(PREFERENCE_FIELD.STUDY_GOAL)}
          onDiscard={() => discard(PREFERENCE_FIELD.STUDY_GOAL)}
          discardLabel={t('settings.learning.discardGoal')}
        />
      </Box>

      {/*
        The confirmed read is a network call and owes the user an error state.
        Non-blocking: the selectors still work and their writes still go out —
        what was lost is only our knowledge of what was already saved.
      */}
      {readPhase === PREFERENCES_PHASE.ERROR && (
        <Stack direction='row' spacing={1} alignItems='center' sx={{ flexWrap: 'wrap' }}>
          <ErrorOutlineRounded sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
          <Typography level='body-xs' role='status' sx={{ color: 'text.secondary' }}>
            {t('settings.learning.loadError')}
          </Typography>
          <Button size='sm' variant='plain' color='neutral' onClick={() => preferences.reload()} sx={{ ...touchTarget, ...focusRing }}>
            {t('common.retry')}
          </Button>
        </Stack>
      )}
    </Stack>
  )
}

/**
 * The ordered list of chosen topics, with the two move controls.
 *
 * Hidden below two entries: with one topic there is nothing to reorder, and
 * `TopicSelector` already states which topic is primary. Two disabled-looking
 * arrows next to a single row is visual load carrying no information (NFR-019).
 *
 * @param {object}                              props
 * @param {string[]}                            props.interests Ordered interests
 * @param {(value: string) => string}           props.labelOf   Canonical value → visible label
 * @param {(index: number, delta: number) => void} props.onMove Move by one place
 */
const TopicOrderList = ({ interests, labelOf, onMove }) => {
  const { t } = useTranslation()
  if (interests.length < 2) return null

  const total = interests.length

  return (
    <Box sx={{ mt: 2.5 }}>
      <Typography level='title-sm'>{t('settings.learning.order.label')}</Typography>
      <Typography level='body-sm' sx={{ mt: 0.5, color: 'text.tertiary' }}>
        {t('settings.learning.order.hint')}
      </Typography>

      <Stack component='ol' spacing={1} sx={{ listStyle: 'none', p: 0, mt: 1.5, mb: 0 }}>
        {interests.map((value, index) => {
          const position = index + 1
          const topic = labelOf(value)
          const isFirst = index === 0
          const isLast = index === total - 1

          return (
            <Sheet
              key={value}
              component='li'
              variant='outlined'
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1,
                borderRadius: 'lg',
                borderColor: 'neutral.outlinedBorder',
                bgcolor: 'background.surface'
              }}
            >
              {/* The numeral is decorative here — every row states its own
                  position inside the two buttons' accessible names. */}
              <Box
                aria-hidden='true'
                sx={{
                  minWidth: 24,
                  height: 24,
                  px: 0.5,
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid',
                  borderColor: 'text.primary',
                  bgcolor: isFirst ? 'text.primary' : 'transparent'
                }}
              >
                <Typography level='body-xs' sx={{ fontWeight: 600, lineHeight: 1, color: isFirst ? 'background.surface' : 'text.primary' }}>
                  {position}
                </Typography>
              </Box>

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography level='body-md' sx={{ fontWeight: isFirst ? 600 : 400 }}>
                  {topic}
                </Typography>
                {isFirst && (
                  <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                    {t('settings.learning.order.primary')}
                  </Typography>
                )}
              </Box>

              <Tooltip title={t('settings.learning.order.moveEarlier')}>
                <IconButton
                  size='sm'
                  variant='outlined'
                  color='neutral'
                  aria-disabled={isFirst || undefined}
                  aria-label={t('settings.learning.order.moveEarlierFor', { topic, position, total })}
                  onClick={() => onMove(index, -1)}
                  sx={{ ...moveButton, opacity: isFirst ? 0.5 : 1 }}
                >
                  <ArrowUpwardRounded sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title={t('settings.learning.order.moveLater')}>
                <IconButton
                  size='sm'
                  variant='outlined'
                  color='neutral'
                  aria-disabled={isLast || undefined}
                  aria-label={t('settings.learning.order.moveLaterFor', { topic, position, total })}
                  onClick={() => onMove(index, 1)}
                  sx={{ ...moveButton, opacity: isLast ? 0.5 : 1 }}
                >
                  <ArrowDownwardRounded sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Sheet>
          )
        })}
      </Stack>
    </Box>
  )
}

/**
 * The shared save badge, plus the one action it does not carry.
 *
 * `OnboardingFieldSaveState` owns "Saving… / Saved / Not saved + reason +
 * Retry" — reusing it is what keeps Settings and onboarding from inventing a
 * fifth vocabulary for the same fact. Retry alone leaves a rejected value with
 * no exit, though, so discard sits beside it whenever a draft is on screen and
 * not currently in flight.
 *
 * @param {object}   props
 * @param {object}   props.state        One entry of `preferences.fields`
 * @param {Function} props.onRetry      Re-queue the visible draft
 * @param {Function} props.onDiscard    Restore the last confirmed value
 * @param {string}   props.discardLabel Accessible name naming the field
 */
const FieldSaveRow = ({ state, onRetry, onDiscard, discardLabel }) => {
  const { t } = useTranslation()
  const canDiscard = !state?.isConfirmed && !state?.isSaving

  return (
    <Stack direction='row' spacing={1} alignItems='center' sx={{ mt: 1, flexWrap: 'wrap' }}>
      <OnboardingFieldSaveState state={state} onRetry={onRetry} />
      {canDiscard && (
        <Button
          size='sm'
          variant='plain'
          color='neutral'
          onClick={onDiscard}
          aria-label={discardLabel}
          sx={{ ...touchTarget, ...focusRing, flexShrink: 0 }}
        >
          {t('settings.learning.discard')}
        </Button>
      )}
    </Stack>
  )
}

export default LearningPreferencesSection

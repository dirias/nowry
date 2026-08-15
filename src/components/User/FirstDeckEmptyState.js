import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, Stack, Typography } from '@mui/joy'
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded'
import CollectionsBookmarkRounded from '@mui/icons-material/CollectionsBookmarkRounded'

import { ACTION_PHASE } from '../../hooks/useOnboardingJourney'
import { focusRing } from '../Common/Form/formStyles'

/**
 * FirstDeckEmptyState — the outcome every real user gets on day one (ONB-011).
 *
 * THIS IS NOT THE UNHAPPY PATH
 *
 * FR-050 says the empty state is an expected, actionable outcome rather than an
 * exception, and FR-059 says missing coverage must not block the launch. Those
 * are not hedges. The catalog target is 42 curated decks, three per topic; the
 * count today is zero and the three-deck pilot has not started. So this
 * component — not the deck list — is what the first cohort of beta users will
 * see, and it is built as a first-class state: a calm shelf glyph, a heading
 * that states the fact in the topic's own name, and a sentence explaining that
 * Nowry publishes topic by topic and this one is not covered yet.
 *
 * Everything that makes a screen read as broken is deliberately absent. No
 * `role='alert'`, no danger palette, no warning triangle, no "something went
 * wrong", no retry — a retry implies the emptiness is a fault that pressing a
 * button might undo, and it is not. The load *succeeded*; the shelf is bare
 * (NFR-018: a catalog without decks is "empty", never an "error"). The body copy
 * also confirms the preferences are saved, because the one thing a user in this
 * state might reasonably fear is that answering the questions was wasted.
 *
 * THE AI ACTION EXISTS AND IS NOT RECOMMENDED
 *
 * FR-031 gives this state exactly two actions: request an AI deck, or finish for
 * now. They live in different regions — AI here beside the explanation it needs,
 * finish-for-now in the shell's pinned footer where an exit belongs (NFR-014) —
 * so neither is duplicated (§11).
 *
 * The AI button is `outlined neutral` on purpose. A solid accent button would
 * read as the recommended path, and A4/D1 are explicit that AI is a fallback
 * which must never displace curated content. Nothing fires on mount (FR-032):
 * the only route to `requestAiFallback` is this button's `onClick`.
 *
 * THE CONFIRMATION MUST NOT SOUND LIKE COMPLETION
 *
 * FR-033: the request is confirmed, and onboarding stays incomplete. The
 * endpoint returns generated cards, not a saved library deck, and activation is
 * owned solely by a verified official fork (ADR-006). So the success copy states
 * three things and no more — the request went through, nothing was added to the
 * library, the journey is still open. No checkmark-and-confetti, no "you're all
 * set", no navigation that would imply a deck exists somewhere.
 *
 * @param {object}   props
 * @param {string}   props.topicLabel   The user's primary topic, already localized.
 * @param {object}   props.fallbackState `journey.fallbackState`.
 * @param {Function} props.onRequestAi  Explicit user request — the only caller.
 * @param {number|null} [props.generatedCount] Cards the request produced, when countable.
 */
const FirstDeckEmptyState = ({ topicLabel, fallbackState, onRequestAi, generatedCount = null }) => {
  const { t } = useTranslation()

  const phase = fallbackState?.phase ?? ACTION_PHASE.IDLE
  const isRequesting = phase === ACTION_PHASE.PENDING
  const hasGenerated = phase === ACTION_PHASE.SUCCEEDED

  return (
    <Box>
      <Box sx={{ py: { xs: 4, md: 6 }, textAlign: 'center' }}>
        <CollectionsBookmarkRounded sx={{ fontSize: 48, color: 'text.tertiary', opacity: 0.5, mb: 2 }} />
        <Typography level='title-md' sx={{ mb: 0.5, color: 'text.secondary' }}>
          {t('onboarding.firstDeck.empty.title', { topic: topicLabel })}
        </Typography>
        <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
          {t('onboarding.firstDeck.empty.body', { topic: topicLabel })}
        </Typography>
      </Box>

      <Box sx={{ pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography level='title-sm' sx={{ color: 'text.primary' }}>
          {t('onboarding.firstDeck.empty.fallbackTitle')}
        </Typography>
        <Typography level='body-sm' sx={{ color: 'text.tertiary', mt: 0.5 }}>
          {t('onboarding.firstDeck.empty.fallbackBody')}
        </Typography>

        <Stack spacing={1.5} sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex' }}>
            <Button
              onClick={onRequestAi}
              loading={isRequesting}
              variant='outlined'
              color='neutral'
              startDecorator={<AutoAwesomeRounded sx={{ fontSize: 18 }} />}
              sx={{ minHeight: 44, height: 'auto', maxWidth: '100%', whiteSpace: 'normal', textAlign: 'center', ...focusRing }}
            >
              {t('onboarding.firstDeck.empty.fallbackAction')}
            </Button>
          </Box>

          {/*
            Always mounted so entering either state is announced rather than
            silently swapped, and polite because the user is not blocked. The
            failure case is not here — it goes to the shell's banner slot with
            `role='alert'`, because a request the user explicitly made and did
            not get is the one thing that earns an interruption.
          */}
          <Box role='status' aria-live='polite' sx={{ minWidth: 0 }}>
            {isRequesting && (
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {t('onboarding.firstDeck.fallback.pending')}
              </Typography>
            )}

            {hasGenerated && (
              <Box>
                <Typography level='body-sm' sx={{ color: 'text.primary', fontWeight: 600 }}>
                  {t('onboarding.firstDeck.fallback.success.title')}
                </Typography>
                <Typography level='body-sm' sx={{ color: 'text.secondary', mt: 0.25 }}>
                  {generatedCount === null
                    ? t('onboarding.firstDeck.fallback.success.bodyNoCount')
                    : t('onboarding.firstDeck.fallback.success.body', { count: generatedCount, topic: topicLabel })}
                </Typography>
              </Box>
            )}
          </Box>
        </Stack>
      </Box>
    </Box>
  )
}

export default FirstDeckEmptyState

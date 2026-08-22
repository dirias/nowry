import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, Card, Skeleton, Stack, Typography } from '@mui/joy'
import LibraryAddRounded from '@mui/icons-material/LibraryAddRounded'

import { TOPICS } from '../../constants/learningTaxonomy'
import { focusRing } from '../Common/Form/formStyles'
import OfficialMark from './OfficialMark'
import { selectedOption, visuallyHidden } from './taxonomySelectorStyles'

/**
 * CuratedDeckCard — one curated option, and the single action that takes it.
 *
 * WHAT FR-025 ASKS FOR, AND WHY IT IS ALL HERE
 *
 * Title, short description, official publisher, official mark, and "enough
 * content information to support a choice". The last phrase is the interesting
 * one: a name and a card count do not let anyone choose between three decks, so
 * the learning outcome — the editorially reviewed sentence ONB-002 requires
 * before a deck may be approved (FR-057) — is given its own block rather than
 * being buried in the metadata line. It is the field that answers "what will I
 * actually be able to do afterwards", which is the question a first deck has to
 * answer.
 *
 * THE OFFICIAL MARK IS RENDERED FROM ONE STRICT BOOLEAN
 *
 * `deck.is_official === true`, never `Boolean(...)` and never inferred from the
 * publisher's name. The server computes that projection from five clauses
 * (ADR-004) precisely so a client cannot mistake "published by the Nowry
 * account" for "passed editorial review" (FR-058). A missing or absent field
 * therefore renders no mark at all, which is the safe direction to fail.
 *
 * SELECTION IS A RING AND A WORD, NOT A COLOUR
 *
 * A fork that failed keeps its deck selected (FR-029), and that selection is
 * carried by ONB-007's `selectedOption` — an inset hairline in `text.primary`
 * plus a localized "Selected" for assistive technology. Same reasoning as the
 * topic chips: a primary tint measures ~1.01:1 against this very surface, so it
 * is decoration and cannot be the message (NFR-004).
 *
 * @param {object}   props
 * @param {object}   props.deck        One item from the curated browse page.
 * @param {Function} props.onFork      Called with the deck id.
 * @param {boolean}  [props.isPending] This deck's fork is in flight.
 * @param {boolean}  [props.isSelected] This deck is the user's current choice.
 * @param {boolean}  [props.hasFailed] The last attempt on this deck failed.
 * @param {boolean}  [props.disabled]  Another deck's fork is in flight.
 */

/**
 * The card's own geometry, shared with the skeleton so nothing shifts when the
 * real options replace it (FR-046, §7). Defined once because a skeleton that
 * does not match the thing it stands in for is worse than no skeleton at all.
 */
const cardShape = {
  p: { xs: 2, md: 2.5 },
  gap: 1.5,
  bgcolor: 'background.surface',
  borderColor: 'divider'
}

/**
 * Canonical topic value → the label the user already saw on Personalization.
 * Read from the shipped taxonomy, never re-declared: a second copy of these
 * values is exactly how the casing mismatch shipped once before.
 */
const topicLabelKey = (topic) => TOPICS.find((entry) => entry.value === topic)?.i18nKey ?? null

/** A pulse is motion too (NFR-007). */
const calmSkeleton = { '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }

/** A dot between two facts, spoken by nobody. */
const Separator = () => (
  <Typography aria-hidden='true' level='body-xs' sx={{ color: 'text.tertiary' }}>
    ·
  </Typography>
)

const CuratedDeckCard = ({ deck, onFork, isPending = false, isSelected = false, hasFailed = false, disabled = false }) => {
  const { t } = useTranslation()

  const topic = deck?.curation?.topic ?? deck?.public_metadata?.category ?? null
  const labelKey = topicLabelKey(topic)
  const topicLabel = labelKey ? t(labelKey) : topic
  const outcome = deck?.curation?.learning_outcome ?? null
  const publisher = deck?.publisher?.name ?? null
  const cardCount = Number.isFinite(deck?.total_cards) ? deck.total_cards : null

  return (
    <Card
      variant='outlined'
      sx={(theme) => ({
        ...cardShape,
        // Elevation on hover only (§5): the card is not a button, but its one
        // action is inside it and the lift says the card is live.
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
        '&:hover': { boxShadow: 'sm' },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        ...(isSelected ? selectedOption(theme) : {})
      })}
    >
      <Stack direction='row' spacing={1} alignItems='flex-start' useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Typography level='title-md' sx={{ flex: 1, minWidth: 0 }}>
          {deck?.name}
          {isSelected && (
            <Typography component='span' sx={visuallyHidden}>
              {` ${t('onboarding.firstDeck.card.selected')}`}
            </Typography>
          )}
        </Typography>

        {/* Strictly the server's verdict — see the module note. */}
        {deck?.is_official === true && <OfficialMark publisher={publisher} />}
      </Stack>

      <Stack direction='row' spacing={0.75} alignItems='center' useFlexGap sx={{ flexWrap: 'wrap' }}>
        {topicLabel && (
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            {topicLabel}
          </Typography>
        )}
        {topicLabel && cardCount !== null && <Separator />}
        {cardCount !== null && (
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            {t('onboarding.firstDeck.card.count', { count: cardCount })}
          </Typography>
        )}
      </Stack>

      {deck?.description && (
        <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
          {deck.description}
        </Typography>
      )}

      {outcome && (
        // The background sits on the Box, never on the Typography (§4.2).
        <Box sx={{ bgcolor: 'background.level1', borderRadius: 'sm', px: 1.5, py: 1.25 }}>
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            {t('onboarding.firstDeck.card.outcomeLabel')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.primary', mt: 0.25 }}>
            {outcome}
          </Typography>
        </Box>
      )}

      {publisher && (
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t('onboarding.firstDeck.card.publisher', { publisher })}
        </Typography>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          onClick={() => onFork?.(deck?._id)}
          loading={isPending}
          // FR-027/FR-047: the pending action prevents its own duplicate (Joy
          // disables a loading button), and a *different* deck's action is
          // disabled too — starting a second fork while the first is unresolved
          // is the incompatible action, not merely a duplicate one.
          disabled={disabled}
          variant='solid'
          color='primary'
          startDecorator={<LibraryAddRounded sx={{ fontSize: 18 }} />}
          sx={{ minHeight: 44, height: 'auto', maxWidth: '100%', whiteSpace: 'normal', textAlign: 'center', ...focusRing }}
        >
          {hasFailed ? t('onboarding.firstDeck.card.retry') : t('onboarding.firstDeck.card.add')}
        </Button>
      </Box>
    </Card>
  )
}

/**
 * The same card with its values not yet known.
 *
 * Deliberately not a rectangle of the right height: the block structure is
 * reproduced — title row, metadata line, two description lines, outcome block,
 * action — so that when the real options land nothing below them moves. That is
 * the whole justification for a skeleton over a spinner (§7), and it only holds
 * if the placeholder is shaped like the content.
 */
export const CuratedDeckCardSkeleton = () => (
  <Card variant='outlined' aria-hidden='true' sx={cardShape}>
    <Skeleton variant='rectangular' sx={{ width: '65%', height: 20, borderRadius: 'sm', ...calmSkeleton }} />
    <Skeleton variant='rectangular' sx={{ width: 140, height: 12, borderRadius: 'sm', ...calmSkeleton }} />
    <Box>
      <Skeleton variant='rectangular' sx={{ width: '100%', height: 12, borderRadius: 'sm', ...calmSkeleton }} />
      <Skeleton variant='rectangular' sx={{ width: '80%', height: 12, mt: 0.75, borderRadius: 'sm', ...calmSkeleton }} />
    </Box>
    <Skeleton variant='rectangular' sx={{ width: '100%', height: 56, borderRadius: 'sm', ...calmSkeleton }} />
    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Skeleton variant='rectangular' sx={{ width: 168, height: 44, borderRadius: 'md', ...calmSkeleton }} />
    </Box>
  </Card>
)

export default CuratedDeckCard

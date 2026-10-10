/**
 * "Resting" or "Resting until Nov 2", from a rest read by `restOf` (SR-003).
 * The phone has the same helper beside its RestSheet; the words are the bundle's.
 */
export const restLabel = (t, rest, language) => {
  if (!rest?.resting) return null
  if (rest.indefinite || !rest.until) return t('cards.rest.resting')
  const date = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' }).format(rest.until)
  return t('cards.rest.restingUntil', { date })
}

export default restLabel

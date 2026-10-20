/**
 * The queue sheet's words, as plain functions (MOB-117), so they are tested
 * without a React Native runtime (see `jest.config.js`).
 */

/**
 * What the sheet holds, as its title (MOB-117): the day's count, or the deck
 * and what this scope counts. "Queue" named the mechanism, not the cards.
 */
export function sheetTitle(t, { daily, scope, deckName, count }) {
  if (daily || !deckName) return t('cards.session.queue.titleDaily', { count })
  return t(scope === 'all' ? 'cards.session.queue.titleAll' : 'cards.session.queue.titleDue', { deck: deckName, count })
}

/**
 * The one footer key (MOB-117). A Tags or Decks list open: back to the cards,
 * saying how many the choice left. The due queue narrowed: close, saying how
 * many will be studied. Otherwise it closes. There was a "Done" row above a
 * "Close" key — two exits in two shapes.
 *
 * @returns {'show' | 'study' | 'close'}
 */
export function sheetFooter({ menu, narrowed, scope, count }) {
  if (menu) return 'show'
  if (narrowed && scope === 'due' && count > 0) return 'study'
  return 'close'
}

/**
 * Which sections of a document need cards, and what a saved card owes its
 * source (MOB-057, `docs/prd-book-cards.md` D1, D5).
 *
 * Both rules lived inside web components — the first in the sheet that lists
 * sections, the second in the modal that saves what came back. Neither is about
 * a view: the first decides what a default press covers, and the second is the
 * link the whole book→cards PRD exists to create. A phone that stamped a card
 * differently would break the one connection between a failing card and the
 * paragraph that would fix it.
 */

/**
 * D5 — a section needs cards when it has none, or when its text changed after
 * the cards were made. The default press covers the gap and regenerates
 * nothing the learner did not ask for.
 */
export const needsCards = (section) => section?.cards === 0 || Boolean(section?.changed)

/** The sections a freshly opened sheet arrives with ticked. */
export const preTicked = (sections = []) => sections.filter(needsCards).map((section) => section.index)

/** What the server says a run will produce, for the sections chosen. */
export const estimateFor = (sections = [], ticked = []) =>
  sections.filter((section) => ticked.includes(section.index)).reduce((sum, section) => sum + (section.estimate ?? 0), 0)

/**
 * D1 — the stamp every card saved from a document carries. A card generated
 * from a particular section keeps its own section over the run's; a card with
 * no source gets nothing rather than an empty string.
 */
export const sourceFieldsFor = (card, source) =>
  source?.source_book_id
    ? {
        source_book_id: source.source_book_id,
        source_book_title: source.source_book_title ?? null,
        source_section: card?.source_section ?? source.source_section ?? null
      }
    : {}

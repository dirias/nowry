/**
 * The five things that can land on a day, as data (MOB-043).
 *
 * A calendar event is a task's deadline, a priority's target date, a goal's
 * target date, a milestone's due date, or one occurrence of a habit. Which
 * glyph each wears and what each is called are product decisions, and they were
 * only ever written down inside a web component — the same shape that made
 * `DECK_TYPES` the web's private property until the phone drew every deck the
 * same colour.
 *
 * A shared module never returns a component (ADR-031, MOB-003B). Each entry
 * hands out an icon KEY and each client maps it to its own set: Material on the
 * web, lucide on the phone.
 */
export const EVENT_TYPES = {
  task: { iconKey: 'task', labelKey: 'calendarPage.agenda.type.task' },
  priority: { iconKey: 'priority', labelKey: 'calendarPage.agenda.type.priority' },
  goal: { iconKey: 'goal', labelKey: 'calendarPage.agenda.type.goal' },
  // Every milestone is a measurable step (CAL-005), so one diamond.
  milestone: { iconKey: 'milestone', labelKey: 'calendarPage.agenda.type.milestone' },
  activity: { iconKey: 'activity', labelKey: 'calendarPage.agenda.type.activity' }
}

/** A goal is the fallback: an unknown dated thing is a thing you are aiming at. */
export const eventType = (type) => EVENT_TYPES[type] ?? EVENT_TYPES.goal

export const EVENT_TYPE_NAMES = Object.keys(EVENT_TYPES)

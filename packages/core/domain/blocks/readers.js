/**
 * The API's block documents, read into the shape the clients use.
 *
 * The mobile client refuses a screen that spells an API field (its
 * `apiFields` rule), so the field names stop here: everything past this file
 * is camelCase, and writing goes back through `toApiBlock`.
 */

export const SOURCE_TYPES = ['routine', 'study', 'focus', 'goal', 'task', 'free']
export const LOG_STATUSES = ['kept', 'skipped', 'partial']
export const REMINDER_OPTIONS = [null, 0, 5, 15, 30]

export const readBlock = (doc) =>
  doc
    ? {
        id: String(doc.id ?? doc._id ?? ''),
        title: doc.title ?? '',
        source: { type: doc.source?.type ?? 'free', id: doc.source?.id ?? null },
        start: doc.start ?? '07:00',
        lengthMin: Number(doc.length_min ?? doc.lengthMin ?? 5),
        daysOfWeek: doc.days_of_week ?? doc.daysOfWeek ?? [],
        date: doc.date ?? null,
        reminderMin: doc.reminder_min ?? doc.reminderMin ?? null,
        afterBlockId: doc.after_block_id ?? doc.afterBlockId ?? null,
        areaId: doc.area_id ?? doc.areaId ?? null,
        migrated: Boolean(doc.migrated_from),
        deletedAt: doc.deleted_at ?? null
      }
    : null

export const readLog = (doc) =>
  doc
    ? {
        id: String(doc.id ?? doc._id ?? ''),
        blockId: String(doc.block_id ?? doc.blockId ?? ''),
        date: doc.date,
        status: doc.status,
        startedAt: doc.started_at ?? doc.startedAt ?? null,
        endedAt: doc.ended_at ?? doc.endedAt ?? null,
        minutes: Number(doc.minutes ?? 0),
        record: doc.record ? { studySessionId: doc.record.study_session_id ?? null, cards: doc.record.cards ?? null } : null
      }
    : null

/** A client-side block (camelCase) → the API's body; only the keys present travel. */
export const toApiBlock = (block) => {
  const out = {}
  if ('title' in block) out.title = block.title
  if ('source' in block) out.source = { type: block.source?.type ?? 'free', id: block.source?.id ?? null }
  if ('start' in block) out.start = block.start
  if ('lengthMin' in block) out.length_min = block.lengthMin
  if ('daysOfWeek' in block) out.days_of_week = block.daysOfWeek
  if ('date' in block) out.date = block.date
  if ('reminderMin' in block) out.reminder_min = block.reminderMin
  if ('afterBlockId' in block) out.after_block_id = block.afterBlockId
  if ('areaId' in block) out.area_id = block.areaId
  return out
}

export const toApiLog = ({ status, startedAt = null, endedAt = null, minutes = 0, record = null }) => ({
  status,
  started_at: startedAt instanceof Date ? startedAt.toISOString() : startedAt,
  ended_at: endedAt instanceof Date ? endedAt.toISOString() : endedAt,
  minutes,
  record: record ? { study_session_id: record.studySessionId ?? null, cards: record.cards ?? null } : null
})

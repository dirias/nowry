/**
 * The API's board documents, read into the shape the clients use (BOARD-002).
 *
 * The field names stop here: everything past this file is camelCase, and
 * writing goes back through `toApiNode` / `toApiLink`.
 */

const num = (value, fallback = 0) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const numOrNull = (value) => (value === null || value === undefined ? null : num(value, null))

const readRef = (ref) =>
  ref
    ? {
        kind: ref.kind,
        id: String(ref.id ?? ''),
        goalId: ref.goal_id ?? ref.goalId ?? null
      }
    : null

export const readNode = (doc) => ({
  id: String(doc.id ?? ''),
  kind: doc.kind ?? 'note',
  x: num(doc.x),
  y: num(doc.y),
  w: numOrNull(doc.w),
  h: numOrNull(doc.h),
  z: num(doc.z),
  text: doc.text ?? null,
  color: doc.color ?? null,
  size: doc.size ?? null,
  title: doc.title ?? null,
  ref: readRef(doc.ref),
  cardIds: (doc.card_ids ?? doc.cardIds ?? []).map(String)
})

export const readLink = (doc) => ({
  id: String(doc.id ?? ''),
  from: String(doc.from ?? ''),
  to: String(doc.to ?? ''),
  label: doc.label ?? ''
})

export const readViewport = (doc) => ({
  x: num(doc?.x),
  y: num(doc?.y),
  zoom: num(doc?.zoom, 1) || 1
})

export const readBoard = (doc) =>
  doc
    ? {
        id: String(doc.id ?? doc._id ?? ''),
        name: doc.name ?? '',
        ownerId: doc.owner_user_id ?? null,
        collaborators: doc.collaborators ?? [],
        collaboratorNames: doc.collaborator_names ?? {},
        rev: num(doc.rev),
        nodes: (doc.nodes ?? []).map(readNode),
        links: (doc.links ?? []).map(readLink),
        viewport: readViewport(doc.viewport),
        updatedAt: doc.updated_at ?? null
      }
    : null

const readOutlineRect = (rect) => ({
  x: num(rect.x),
  y: num(rect.y),
  w: num(rect.w),
  h: num(rect.h),
  kind: rect.kind ?? 'note',
  color: rect.color ?? null
})

/** A row of `GET /blackboards`: what a tile on the boards page shows. */
export const readBoardSummary = (doc) =>
  doc
    ? {
        id: String(doc.id ?? doc._id ?? ''),
        name: doc.name ?? '',
        ownerId: doc.owner_user_id ?? null,
        ownerName: doc.owner_name ?? '',
        collaborators: doc.collaborators ?? [],
        collaboratorNames: doc.collaborator_names ?? {},
        isOwner: Boolean(doc.is_owner),
        updatedAt: doc.updated_at ?? null,
        counts: {
          notes: num(doc.counts?.notes),
          links: num(doc.counts?.links),
          items: num(doc.counts?.items),
          cards: num(doc.counts?.cards)
        },
        outline: (doc.outline ?? []).map(readOutlineRect)
      }
    : null

/** A client node → the API's node; every field travels (the server merges by id, whole nodes). */
export const toApiNode = (node) => ({
  id: node.id,
  kind: node.kind,
  x: node.x,
  y: node.y,
  w: node.w ?? null,
  h: node.h ?? null,
  z: node.z ?? 0,
  text: node.text ?? null,
  color: node.color ?? null,
  size: node.size ?? null,
  title: node.title ?? null,
  ref: node.ref ? { kind: node.ref.kind, id: node.ref.id, goal_id: node.ref.goalId ?? null } : null,
  card_ids: node.cardIds ?? []
})

export const toApiLink = (link) => ({
  id: link.id,
  from: link.from,
  to: link.to,
  label: link.label ?? ''
})

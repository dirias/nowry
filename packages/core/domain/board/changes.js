/**
 * Saves are changes (PRD D5, ADR-047 §4). A change is the nodes and links that
 * were made or altered (whole objects, upserted by id) and the ids of those
 * that went:
 *
 *   { upsertNodes: [node], deleteNodes: [id], upsertLinks: [link], deleteLinks: [id] }
 *
 * The server merges by id, so two collaborators editing different notes both
 * keep their work.
 */
import { MAX_CHANGES } from './kinds'
import { toApiLink, toApiNode } from './readers'

export const emptyChange = () => ({ upsertNodes: [], deleteNodes: [], upsertLinks: [], deleteLinks: [] })

export const deepEqual = (a, b) => {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]))
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  return keys.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]))
}

const diffById = (prev = [], next = []) => {
  const before = new Map(prev.map((x) => [x.id, x]))
  const after = new Set(next.map((x) => x.id))
  const upserts = next.filter((x) => !before.has(x.id) || !deepEqual(before.get(x.id), x))
  const deletes = prev.filter((x) => !after.has(x.id)).map((x) => x.id)
  return { upserts, deletes }
}

/** The change that turns `prev` into `next` (both `{ nodes, links }`). */
export const diffBoard = (prev, next) => {
  const nodes = diffById(prev?.nodes, next?.nodes)
  const links = diffById(prev?.links, next?.links)
  return { upsertNodes: nodes.upserts, deleteNodes: nodes.deletes, upsertLinks: links.upserts, deleteLinks: links.deletes }
}

export const countChanges = (change) =>
  (change?.upsertNodes?.length ?? 0) +
  (change?.deleteNodes?.length ?? 0) +
  (change?.upsertLinks?.length ?? 0) +
  (change?.deleteLinks?.length ?? 0)

export const isEmptyChange = (change) => countChanges(change) === 0

const mergeKind = (aUpserts = [], aDeletes = [], bUpserts = [], bDeletes = []) => {
  // One entry per id; the later operation replaces the earlier one in place.
  const ops = new Map()
  const record = (id, op) => {
    ops.delete(id)
    ops.set(id, op)
  }
  aUpserts.forEach((x) => record(x.id, { upsert: x }))
  aDeletes.forEach((id) => record(id, { remove: true }))
  bUpserts.forEach((x) => record(x.id, { upsert: x }))
  bDeletes.forEach((id) => record(id, { remove: true }))
  const upserts = []
  const deletes = []
  ops.forEach((op, id) => (op.remove ? deletes.push(id) : upserts.push(op.upsert)))
  return { upserts, deletes }
}

/**
 * Two changes as one, `b` after `a`: the later operation on an id wins, so an
 * upsert then a delete is a delete, and a delete then an upsert an upsert.
 */
export const mergeChanges = (a, b) => {
  const nodes = mergeKind(a?.upsertNodes, a?.deleteNodes, b?.upsertNodes, b?.deleteNodes)
  const links = mergeKind(a?.upsertLinks, a?.deleteLinks, b?.upsertLinks, b?.deleteLinks)
  return { upsertNodes: nodes.upserts, deleteNodes: nodes.deletes, upsertLinks: links.upserts, deleteLinks: links.deletes }
}

/**
 * The first `max` operations of a change, and the rest. Operations are taken
 * links-deleted, nodes-deleted, nodes-upserted, links-upserted, so a batch
 * never carries a link whose new end is still waiting in the rest.
 */
export const splitChanges = (change, max = MAX_CHANGES) => {
  let room = max
  const take = (list = []) => {
    const head = list.slice(0, Math.max(0, room))
    room -= head.length
    return [head, list.slice(head.length)]
  }
  const [deleteLinks, restDeleteLinks] = take(change?.deleteLinks)
  const [deleteNodes, restDeleteNodes] = take(change?.deleteNodes)
  const [upsertNodes, restUpsertNodes] = take(change?.upsertNodes)
  const [upsertLinks, restUpsertLinks] = take(change?.upsertLinks)
  return {
    batch: { upsertNodes, deleteNodes, upsertLinks, deleteLinks },
    rest: { upsertNodes: restUpsertNodes, deleteNodes: restDeleteNodes, upsertLinks: restUpsertLinks, deleteLinks: restDeleteLinks }
  }
}

/**
 * The PATCH body. Only what is present travels: an empty list, an unchanged
 * name or viewport is left out.
 */
export const toApiChanges = (change, { rev, name, viewport } = {}) => {
  const body = { rev: rev ?? 0 }
  if (name !== undefined && name !== null) body.name = name
  if (viewport) body.viewport = { x: viewport.x, y: viewport.y, zoom: viewport.zoom }
  if (change?.upsertNodes?.length) body.upsert_nodes = change.upsertNodes.map(toApiNode)
  if (change?.deleteNodes?.length) body.delete_nodes = [...change.deleteNodes]
  if (change?.upsertLinks?.length) body.upsert_links = change.upsertLinks.map(toApiLink)
  if (change?.deleteLinks?.length) body.delete_links = [...change.deleteLinks]
  return body
}

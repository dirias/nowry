/**
 * Blocks service — the one object for time (PLAN-002, ADR-045).
 *
 * Every document crosses `readBlock` / `readLog` on the way in and
 * `toApiBlock` / `toApiLog` on the way out, so the API's field names live in
 * `domain/blocks/readers.js` and nowhere else.
 */
import { apiClient } from '../client'
import { ENDPOINTS } from '../utils/endpoints'
import { readBlock, readLog, toApiBlock, toApiLog } from '../../domain/blocks/readers'

/** The React Query key family: `['blocks', userId]` invalidates every range. */
export const blocksKey = (userId, from, to) => ['blocks', userId, from, to]

const readOccurrence = (row) => ({
  date: row.date,
  blockId: String(row.block_id),
  start: row.start,
  lengthMin: Number(row.length_min),
  title: row.title ?? '',
  log: readLog(row.log)
})

export const blocksService = {
  /** Blocks and their occurrences between two local date keys, inclusive. */
  async list({ from, to }) {
    const { data } = await apiClient.get(ENDPOINTS.blocks.list, { params: { from, to } })
    const blocks = (data?.blocks ?? []).map(readBlock)
    const byId = new Map(blocks.map((b) => [b.id, b]))
    const occurrences = (data?.occurrences ?? []).map(readOccurrence).map((o) => {
      const block = byId.get(o.blockId) ?? null
      return { ...o, block, title: o.title || block?.title || '' }
    })
    return { blocks, occurrences, migrated: data?.migrated ?? null }
  },

  async create(block) {
    const { data } = await apiClient.post(ENDPOINTS.blocks.create, toApiBlock(block))
    return readBlock(data)
  },

  async update(id, changes) {
    const { data } = await apiClient.patch(ENDPOINTS.blocks.byId(id), toApiBlock(changes))
    return readBlock(data)
  },

  async remove(id) {
    const { data } = await apiClient.delete(ENDPOINTS.blocks.byId(id))
    return data
  },

  /** Record a day's outcome; a second call on the same day replaces the first. */
  async setLog(id, date, log) {
    const { data } = await apiClient.put(ENDPOINTS.blocks.log(id, date), toApiLog(log))
    return readLog(data)
  },

  async clearLog(id, date) {
    const { data } = await apiClient.delete(ENDPOINTS.blocks.log(id, date))
    return data
  },

  async summary({ from, to }) {
    const { data } = await apiClient.get(ENDPOINTS.blocks.summary, { params: { from, to } })
    return {
      planned: data?.planned ?? 0,
      kept: data?.kept ?? 0,
      skipped: data?.skipped ?? 0,
      partial: data?.partial ?? 0,
      minutes: data?.minutes ?? 0,
      bySource: data?.by_source ?? {},
      byArea: data?.by_area ?? {}
    }
  }
}

export default blocksService

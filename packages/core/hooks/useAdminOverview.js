/**
 * The admin Overview and the admin log (ADMIN-007c, FR-011, boards A and K), for any client.
 *
 * - `useAdminOverview()` — what needs the admin, today's email meters and the
 *   last week's actions, in one read.
 * - `useAdminLog({kind})` — the log, newest first, one kind or all; older
 *   pages follow `next_before`.
 */
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ADMIN_LOG_PAGE, adminOverviewService } from '../api/services/adminOverview.service'
import { isLogKind } from '../domain/adminLog'

/** The React Query family the Overview and the log sit under. */
export const ADMIN_OVERVIEW_KEY = ['admin', 'overview']

export function useAdminOverview() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ADMIN_OVERVIEW_KEY,
    queryFn: () => adminOverviewService.getOverview()
  })
  return { overview: data ?? null, loading: isLoading, error: error ?? null, retry: refetch }
}

export function useAdminLog({ kind } = {}) {
  const filter = isLogKind(kind) ? kind : undefined
  const query = useInfiniteQuery({
    queryKey: [...ADMIN_OVERVIEW_KEY, 'log', filter ?? 'all'],
    queryFn: ({ pageParam }) => adminOverviewService.listActions({ kind: filter, before: pageParam, limit: ADMIN_LOG_PAGE }),
    initialPageParam: undefined,
    getNextPageParam: (page) => page?.next_before || undefined
  })
  return {
    actions: (query.data?.pages ?? []).flatMap((page) => page?.actions ?? []),
    loading: query.isLoading,
    error: query.error ?? null,
    retry: query.refetch,
    hasOlder: Boolean(query.hasNextPage),
    loadOlder: query.fetchNextPage,
    loadingOlder: query.isFetchingNextPage
  }
}
